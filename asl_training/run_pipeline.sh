#!/usr/bin/env bash
# Full ASL training pipeline — runs all 5 steps in sequence.
# Usage:  bash asl_training/run_pipeline.sh
# Logs:   asl_training/pipeline.log

set -e  # exit on first error
cd "$(dirname "$0")/.."   # project root

LOG="asl_training/pipeline.log"
PY=python3

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

log "===== ASL PIPELINE START ====="

log "--- Step 1: Download WLASL videos ---"
$PY asl_training/step1_download_wlasl.py 2>&1 | tee -a "$LOG"

log "--- Step 2: Extract landmarks ---"
$PY asl_training/step2_extract_landmarks.py 2>&1 | tee -a "$LOG"

log "--- Step 3: Train transformer ---"
$PY asl_training/step3_train_model.py --subset 100 2>&1 | tee -a "$LOG"

log "--- Step 4: Patch backend ---"
$PY asl_training/step4_update_backend.py 2>&1 | tee -a "$LOG"

log "--- Step 5: Patch frontend ---"
$PY asl_training/step5_update_frontend.py 2>&1 | tee -a "$LOG"

log "===== PIPELINE COMPLETE ====="
log "Model: asl_project/asl_word_transformer.keras"
log "Restart backend: cd backend && python3 main.py"
