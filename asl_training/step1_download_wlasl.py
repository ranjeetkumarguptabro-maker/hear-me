"""
Step 1 — Download WLASL videos for the top-100 gloss subset.

Usage:
  python asl_training/step1_download_wlasl.py             # full run
  python asl_training/step1_download_wlasl.py --dry-run   # first 5 glosses only
"""

import argparse
import json
import os
import ssl
import subprocess
import sys
import urllib.request
from pathlib import Path

# macOS Python.org builds ship without system certs — bypass for public downloads
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
WLASL_DIR = SCRIPT_DIR / "WLASL"
VIDEOS_DIR = SCRIPT_DIR / "videos"
FAILED_LOG = SCRIPT_DIR / "failed_downloads.txt"
WLASL_JSON_URL = (
    "https://raw.githubusercontent.com/dxli94/WLASL/master/start_kit/WLASL_v0.3.json"
)
WLASL_JSON_PATH = SCRIPT_DIR / "WLASL_v0.3.json"

# Exact top-100 glosses in order
WLASL100_GLOSSES = [
    "book", "drink", "computer", "before", "chair", "go", "clothes", "who",
    "candy", "cousin", "deaf", "fine", "help", "house", "no", "thin", "walk",
    "white", "wrong", "you", "all", "black", "cool", "finish", "hot", "like",
    "many", "mother", "now", "orange", "table", "thanksgiving", "what", "bad",
    "bathroom", "blue", "bowling", "brown", "but", "can", "change", "color",
    "corn", "day", "dog", "eat", "enjoy", "family", "fish", "forget", "good",
    "have", "hello", "hurt", "i", "idea", "last", "later", "lose", "make",
    "man", "meet", "more", "morning", "name", "nice", "night", "not", "number",
    "old", "pay", "people", "pink", "play", "please", "pretty", "purple", "red",
    "right", "same", "school", "shoes", "shopping", "sorry", "stay", "student",
    "sun", "tall", "teacher", "thank you", "time", "tired", "understand", "wait",
    "want", "week", "woman", "work", "write", "yes",
]


# ---------------------------------------------------------------------------
# Requirements check
# ---------------------------------------------------------------------------
def check_requirements():
    print("Checking requirements...")
    ok = True

    checks = [
        ("yt_dlp", "yt-dlp"),
        ("urllib.request", None),
    ]
    for module, install_name in checks:
        try:
            __import__(module)
            print(f"  ✓ {module}")
        except ImportError:
            install = install_name or module
            print(f"  ✗ Missing: {module} — install with: pip install {install}")
            ok = False

    # Check yt-dlp via Python module (avoids PATH issues)
    result = subprocess.run(
        [sys.executable, "-m", "yt_dlp", "--version"], capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✓ yt-dlp ({result.stdout.strip()})")
    else:
        print("  ✗ yt-dlp not found — install with: pip install yt-dlp")
        ok = False

    if not ok:
        sys.exit(1)
    print()


# ---------------------------------------------------------------------------
# Download WLASL JSON
# ---------------------------------------------------------------------------
def download_json():
    if WLASL_JSON_PATH.exists():
        print(f"✓ WLASL JSON already present: {WLASL_JSON_PATH}")
    else:
        print(f"Downloading WLASL_v0.3.json from GitHub...")
        req = urllib.request.Request(
            WLASL_JSON_URL,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, context=_SSL_CTX) as resp:
            WLASL_JSON_PATH.write_bytes(resp.read())
        print(f"  ✓ Saved to {WLASL_JSON_PATH}")
    print()


# ---------------------------------------------------------------------------
# Download videos for a single gloss instance
# ---------------------------------------------------------------------------
def download_video(url: str, out_path: Path) -> bool:
    """
    Try to download a video to out_path using yt-dlp.
    Returns True on success, False on failure.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # yt-dlp output template (strip extension — yt-dlp adds it)
    output_template = str(out_path.with_suffix("")) + ".%(ext)s"

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--quiet",
        "--no-warnings",
        "--format", "mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", output_template,
        "--no-playlist",
        "--socket-timeout", "30",
        "--retries", "2",
        url,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        # Accept if file was created (with .mp4 extension)
        mp4_path = out_path.with_suffix(".mp4")
        if mp4_path.exists() and mp4_path.stat().st_size > 1024:
            if mp4_path != out_path:
                mp4_path.rename(out_path)
            return True
        # Fallback: look for any file with that stem
        for f in out_path.parent.glob(out_path.stem + ".*"):
            if f.stat().st_size > 1024:
                f.rename(out_path)
                return True
        return False
    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Download WLASL videos")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process only first 5 glosses (for quick testing)",
    )
    args = parser.parse_args()

    check_requirements()
    download_json()

    with open(WLASL_JSON_PATH) as f:
        wlasl_data = json.load(f)

    # Index: gloss_name -> list of instances
    gloss_map = {entry["gloss"].lower(): entry["instances"] for entry in wlasl_data}

    glosses = WLASL100_GLOSSES[:5] if args.dry_run else WLASL100_GLOSSES
    mode_label = "DRY RUN (5 glosses)" if args.dry_run else f"FULL ({len(glosses)} glosses)"
    print(f"=== Download mode: {mode_label} ===\n")

    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    failed_log = open(FAILED_LOG, "a")

    total_downloaded = 0
    total_skipped = 0
    total_failed = 0
    total_glosses_ok = 0

    for gloss_idx, gloss in enumerate(glosses):
        instances = gloss_map.get(gloss, [])
        if not instances:
            print(f"  [{gloss_idx+1}/{len(glosses)}] '{gloss}' — NOT FOUND in WLASL JSON")
            continue

        gloss_dir = VIDEOS_DIR / gloss.replace(" ", "_")
        gloss_dir.mkdir(parents=True, exist_ok=True)

        downloaded_this = 0
        failed_this = 0

        print(
            f"[{gloss_idx+1}/{len(glosses)}] Downloading gloss: '{gloss}' — {len(instances)} instances"
        )

        for inst in instances:
            video_id = inst.get("video_id", "unknown")
            url = inst.get("url", "")
            out_path = gloss_dir / f"{video_id}.mp4"

            if out_path.exists() and out_path.stat().st_size > 1024:
                total_skipped += 1
                continue

            if not url:
                failed_this += 1
                failed_log.write(f"{gloss}\t{video_id}\tno_url\n")
                continue

            ok = download_video(url, out_path)
            if ok:
                downloaded_this += 1
                total_downloaded += 1
                print(f"    ✓ {video_id}")
            else:
                failed_this += 1
                total_failed += 1
                failed_log.write(f"{gloss}\t{video_id}\t{url}\n")
                print(f"    ✗ {video_id} (failed — logged)")

        total_ok = len(list(gloss_dir.glob("*.mp4")))
        if total_ok > 0:
            total_glosses_ok += 1
        print(
            f"    → {total_ok} videos available, {downloaded_this} newly downloaded, {failed_this} failed\n"
        )

    failed_log.close()

    print("=" * 60)
    print("DOWNLOAD SUMMARY")
    print(f"  Glosses processed:    {len(glosses)}")
    print(f"  Glosses with videos:  {total_glosses_ok}")
    print(f"  Newly downloaded:     {total_downloaded}")
    print(f"  Already present:      {total_skipped}")
    print(f"  Failed/unavailable:   {total_failed}")
    print(f"  Failure log:          {FAILED_LOG}")
    print()
    print("Next step:")
    print("  python asl_training/step2_extract_landmarks.py")


if __name__ == "__main__":
    main()
