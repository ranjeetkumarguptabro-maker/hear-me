"""
Step 2 — Extract MediaPipe Holistic-style landmarks from WLASL videos.

Uses PoseLandmarker + HandLandmarker (MediaPipe Tasks API, mediapipe >= 0.10).
Matches the browser @mediapipe/holistic feature layout exactly.

Feature vector per frame: pose(132) + left_hand(63) + right_hand(63) = 258 dims
  - pose: 33 landmarks × (x,y,z,vis), normalized to shoulder midpoint + scale
  - each hand: 21 × (x,y,z), normalized to shoulder midpoint + scale
  - scale = shoulder-to-shoulder distance (camera-distance invariant)

Output: .npy files of shape (30, 258) per video.

Usage:
  python asl_training/step2_extract_landmarks.py
  python asl_training/step2_extract_landmarks.py --dry-run
"""

import argparse
import json
import math
import ssl
import sys
import urllib.request
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
VIDEOS_DIR = SCRIPT_DIR / "videos"
LANDMARKS_DIR = SCRIPT_DIR / "landmarks"
LABEL_MAP_PATH = SCRIPT_DIR / "label_map.json"

HAND_MODEL_PATH = SCRIPT_DIR / "hand_landmarker.task"
POSE_MODEL_PATH = SCRIPT_DIR / "pose_landmarker_lite.task"

FRAMES_PER_CLIP = 30
POSE_DIMS = 33 * 4    # x,y,z,visibility
HAND_DIMS = 21 * 3    # x,y,z
FEATURE_DIM = POSE_DIMS + HAND_DIMS * 2   # 132 + 63 + 63 = 258

HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
)
POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)

_SSL = ssl.create_default_context()
_SSL.check_hostname = False
_SSL.verify_mode = ssl.CERT_NONE


def download_if_missing(path, url, name):
    if path.exists():
        print(f"  ✓ {name} present ({path.stat().st_size // 1024} KB)")
        return
    print(f"  Downloading {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=_SSL) as resp:
        path.write_bytes(resp.read())
    print(f"  ✓ Saved {name}: {path.stat().st_size // 1024} KB")


def sample_frames(cap, n=30):
    import cv2
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frames.append(frame)
        total = len(frames)
        if not total:
            return []
        idx = np.linspace(0, total - 1, min(n, total), dtype=int)
        return [frames[i] for i in idx]
    idx = np.linspace(0, total - 1, min(n, total), dtype=int)
    out = []
    for i in idx:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ret, frame = cap.read()
        if ret:
            out.append(frame)
    return out


def extract_features(pose_result, hand_result):
    """
    Build 258-dim feature vector from PoseLandmarker + HandLandmarker results.
    Normalization matches JS extractHolisticFeatures() exactly:
      - origin = shoulder midpoint (pose[11] + pose[12]) / 2
      - scale  = shoulder-to-shoulder distance
    """
    # --- Pose ---
    pose_lms = pose_result.pose_landmarks
    if not pose_lms:
        return None   # Skip frame if no person detected

    lms = pose_lms[0]   # first detected person
    ls = lms[11]        # left shoulder
    rs = lms[12]        # right shoulder
    ox = (ls.x + rs.x) / 2
    oy = (ls.y + rs.y) / 2
    oz = (ls.z + rs.z) / 2
    scale = math.sqrt((ls.x - rs.x)**2 + (ls.y - rs.y)**2 + (ls.z - rs.z)**2)
    if scale < 1e-6:
        scale = 1.0

    pose_vec = []
    for lm in lms:
        pose_vec.extend([
            (lm.x - ox) / scale,
            (lm.y - oy) / scale,
            (lm.z - oz) / scale,
            getattr(lm, 'visibility', 1.0),
        ])  # 132 floats

    # --- Hands ---
    left_vec = [0.0] * HAND_DIMS
    right_vec = [0.0] * HAND_DIMS

    if hand_result.hand_landmarks:
        for i, hand_lms in enumerate(hand_result.hand_landmarks):
            label = None
            if hand_result.handedness and i < len(hand_result.handedness):
                cats = hand_result.handedness[i]
                if cats:
                    label = cats[0].category_name   # 'Left' or 'Right'
            vec = []
            for lm in hand_lms:
                vec.extend([(lm.x - ox) / scale, (lm.y - oy) / scale, (lm.z - oz) / scale])
            if label == "Left":
                left_vec = vec
            elif label == "Right":
                right_vec = vec
            else:
                if left_vec == [0.0] * HAND_DIMS:
                    left_vec = vec
                else:
                    right_vec = vec

    return pose_vec + left_vec + right_vec   # 258 floats


def process_video(video_path, pose_det, hand_det):
    import cv2
    import mediapipe as mp

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None

    frames = sample_frames(cap, FRAMES_PER_CLIP)
    cap.release()

    if not frames:
        return None

    sequence = []
    pose_detected = 0

    for frame in frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        pose_res = pose_det.detect(img)
        hand_res = hand_det.detect(img)

        feat = extract_features(pose_res, hand_res)
        if feat is not None:
            pose_detected += 1
            sequence.append(feat)
        else:
            sequence.append([0.0] * FEATURE_DIM)

    # Require pose detected in at least 30% of frames
    if pose_detected < max(3, FRAMES_PER_CLIP * 0.3):
        return None

    while len(sequence) < FRAMES_PER_CLIP:
        sequence.append([0.0] * FEATURE_DIM)

    return np.array(sequence[:FRAMES_PER_CLIP], dtype=np.float32)   # (30, 258)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Check requirements
    for mod, install in [("cv2", "opencv-python"), ("mediapipe", "mediapipe"), ("numpy", "numpy")]:
        try:
            __import__(mod)
        except ImportError:
            print(f"Missing: pip install {install}")
            sys.exit(1)

    print("Downloading models if needed...")
    download_if_missing(HAND_MODEL_PATH, HAND_MODEL_URL, "hand_landmarker.task")
    download_if_missing(POSE_MODEL_PATH, POSE_MODEL_URL, "pose_landmarker_lite.task")
    print()

    import mediapipe as mp
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core import base_options as bo

    gloss_dirs = sorted([d for d in VIDEOS_DIR.iterdir() if d.is_dir()])
    if not gloss_dirs:
        print(f"No gloss directories in {VIDEOS_DIR}. Run step1 first.")
        sys.exit(1)

    if args.dry_run:
        gloss_dirs = gloss_dirs[:5]
        print(f"DRY RUN — {len(gloss_dirs)} glosses\n")
    else:
        print(f"Processing {len(gloss_dirs)} glosses\n")

    LANDMARKS_DIR.mkdir(parents=True, exist_ok=True)

    all_glosses = sorted(d.name for d in sorted(VIDEOS_DIR.iterdir()) if d.is_dir())
    label_map = {g: i for i, g in enumerate(all_glosses)}

    pose_opts = vision.PoseLandmarkerOptions(
        base_options=bo.BaseOptions(model_asset_path=str(POSE_MODEL_PATH)),
        running_mode=vision.RunningMode.IMAGE,
        min_pose_detection_confidence=0.4,
        min_pose_presence_confidence=0.4,
        min_tracking_confidence=0.4,
    )
    hand_opts = vision.HandLandmarkerOptions(
        base_options=bo.BaseOptions(model_asset_path=str(HAND_MODEL_PATH)),
        num_hands=2,
        running_mode=vision.RunningMode.IMAGE,
        min_hand_detection_confidence=0.4,
        min_hand_presence_confidence=0.4,
        min_tracking_confidence=0.4,
    )

    total_new = total_skip = total_fail = 0

    with vision.PoseLandmarker.create_from_options(pose_opts) as pose_det, \
         vision.HandLandmarker.create_from_options(hand_opts) as hand_det:

        for gi, gloss_dir in enumerate(gloss_dirs):
            gloss = gloss_dir.name
            out_dir = LANDMARKS_DIR / gloss
            out_dir.mkdir(parents=True, exist_ok=True)

            videos = sorted(gloss_dir.glob("*.mp4"))
            if not videos:
                print(f"[{gi+1}/{len(gloss_dirs)}] '{gloss}' — no videos")
                continue

            new = skip = fail = 0
            for vp in videos:
                npy = out_dir / (vp.stem + ".npy")
                if npy.exists():
                    skip += 1; total_skip += 1
                    continue
                arr = process_video(vp, pose_det, hand_det)
                if arr is None:
                    fail += 1; total_fail += 1
                    continue
                np.save(npy, arr)
                new += 1; total_new += 1

            print(f"[{gi+1}/{len(gloss_dirs)}] '{gloss}' — {new} new, {skip} cached, {fail} failed")

    with open(LABEL_MAP_PATH, "w") as f:
        json.dump(label_map, f, indent=2)

    total = sum(1 for _ in LANDMARKS_DIR.rglob("*.npy"))
    print(f"\n{'='*60}")
    print(f"Total .npy: {total}  |  Feature shape: (30, {FEATURE_DIM})")
    print(f"New: {total_new}  Cached: {total_skip}  Failed: {total_fail}")
    print(f"\nNext: python asl_training/step3_train_model.py")


if __name__ == "__main__":
    main()
