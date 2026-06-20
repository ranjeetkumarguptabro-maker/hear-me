"""
Download specific WLASL glosses needed for sentence-level recognition.
"""
import json, ssl, sys, subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
WLASL_JSON = SCRIPT_DIR / "WLASL_v0.3.json"
VIDEOS_DIR = SCRIPT_DIR / "videos"

TARGET_WORDS = [
    'again', 'already', 'come', 'food', 'friend', 'home', 'how',
    'know', 'love', 'me', 'my', 'name', 'need', 'no', 'not', 'now',
    'please', 'ready', 'see', 'she', 'sorry', 'stop', 'they', 'time',
    'understand', 'wait', 'want', 'water', 'we', 'what', 'when',
    'where', 'why', 'work', 'you', 'your', 'yes',
]

_SSL = ssl.create_default_context()
_SSL.check_hostname = False
_SSL.verify_mode = ssl.CERT_NONE

with open(WLASL_JSON) as f:
    wlasl = {g['gloss'].lower(): g for g in json.load(f)}

for word in sorted(TARGET_WORDS):
    out_dir = VIDEOS_DIR / word
    existing = list(out_dir.glob("*.mp4")) if out_dir.exists() else []

    if word not in wlasl:
        print(f"SKIP {word}: not in WLASL")
        continue

    instances = wlasl[word]['instances']
    urls = [inst['url'] for inst in instances if inst.get('url')]

    if len(existing) >= len(urls):
        print(f"OK   {word}: {len(existing)} videos already")
        continue

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"DL   {word}: {len(existing)}/{len(urls)} videos present, downloading...")

    downloaded = 0
    for inst in instances:
        url = inst.get('url', '')
        vid_id = inst.get('video_id', inst.get('split', 'x'))
        out_path = out_dir / f"{vid_id}.mp4"
        if out_path.exists():
            continue
        try:
            result = subprocess.run(
                [sys.executable, "-m", "yt_dlp",
                 "--quiet", "--no-warnings",
                 "-f", "mp4/best[height<=480]/best",
                 "-o", str(out_path),
                 "--socket-timeout", "15",
                 "--retries", "2",
                 url],
                timeout=45, capture_output=True
            )
            if out_path.exists() and out_path.stat().st_size > 10000:
                downloaded += 1
        except Exception:
            pass
    print(f"     → {downloaded} new videos downloaded")

print("\nDone. Run step2 + step3 to retrain.")
