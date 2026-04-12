# pyre-ignore-all-errors
# pyright: reportMissingImports=false, reportGeneralTypeIssues=false
import glob
import os
import shutil
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from configs.configs import get_configs_avenue
from model.model_factory import mae_cvt_patch16
from util.abnormal_utils import filt


class SingleVideoDataset(torch.utils.data.Dataset):
    def __init__(self, video_path: str, args):
        self.args = args
        self.input_3d = args.input_3d

        cap = cv2.VideoCapture(video_path)
        raw_frames = []
        target_size = tuple(self.args.input_size[::-1])
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            # Immediately resize to shrink RAM footprint
            resized = cv2.resize(frame, target_size)
            raw_frames.append(resized)
        cap.release()

        if not raw_frames:
            raise ValueError("Uploaded video contains no decodable frames.")

        self.frames = raw_frames

        # Precompute motion gradients entirely in-memory
        self.gradients = []
        for i in range(len(self.frames)):
            prev_idx = max(0, i - 1)
            next_idx = min(len(self.frames) - 1, i + 1)
            prev_img = self.frames[prev_idx].astype(np.int32)
            next_img = self.frames[next_idx].astype(np.int32)
            gradient = np.abs(prev_img - next_img).astype(np.uint8)
            gradient = cv2.cvtColor(gradient, cv2.COLOR_BGR2RGB)
            self.gradients.append(gradient)

    def __len__(self):
        return len(self.frames)

    def _read_frame(self, frame_no: int, direction: int = 0):
        target_idx = max(0, min(len(self.frames) - 1, frame_no + direction))
        return self.frames[target_idx]

    def __getitem__(self, index):
        current_img = self.frames[index]
        previous_img = self._read_frame(index, direction=-3)
        next_img = self._read_frame(index, direction=3)

        img = current_img
        if self.input_3d:
            img = np.concatenate([previous_img, current_img, next_img], axis=-1)

        gradient = self.gradients[index]

        # Target generation
        mask = np.zeros((img.shape[0], img.shape[1], 1), dtype=np.uint8)
        target = np.concatenate((current_img, mask), axis=-1)

        img = img.astype(np.float32)
        gradient = gradient.astype(np.float32)
        target = target.astype(np.float32)

        # Normalize
        img = (img - 127.5) / 127.5
        target = (target - 127.5) / 127.5

        # Format layout to (Channels, Height, Width) for PyTorch
        img = np.transpose(img, (2, 0, 1))
        target = np.transpose(target, (2, 0, 1))
        gradient = np.transpose(gradient, (2, 0, 1))

        return img, gradient, target


def _resolve_checkpoint_paths() -> tuple[str, str]:
    if os.path.exists("checkpoint-best-student.pth") and os.path.exists("checkpoint-best.pth"):
        return "checkpoint-best-student.pth", "checkpoint-best.pth"

    student = "experiments/avenue/checkpoint-best-student.pth"
    teacher = "experiments/avenue/checkpoint-best.pth"
    if os.path.exists(student) and os.path.exists(teacher):
        return student, teacher

    raise FileNotFoundError(
        "Missing checkpoints. Expected checkpoint-best*.pth in project root or experiments/avenue/."
    )


def load_model():
    args = get_configs_avenue()
    args.device = "cuda" if torch.cuda.is_available() else "cpu"

    model = mae_cvt_patch16(
        norm_pix_loss=args.norm_pix_loss,
        img_size=args.input_size,
        use_only_masked_tokens_ab=args.use_only_masked_tokens_ab,
        abnormal_score_func=args.abnormal_score_func,
        masking_method=args.masking_method,
        grad_weighted_loss=args.grad_weighted_rec_loss,
    ).float()

    student_path, teacher_path = _resolve_checkpoint_paths()
    student = torch.load(student_path, map_location=args.device, weights_only=False)["model"]
    teacher = torch.load(teacher_path, map_location=args.device, weights_only=False)["model"]

    for key in student:
        if "student" in key:
            teacher[key] = student[key]

    model.load_state_dict(teacher, strict=False)
    model.to(args.device)
    model.eval()
    return model, args


MODEL, ARGS = load_model()
APP = FastAPI(title="AnomalyVision Live API", version="1.0.0")


def _fps_for_video(video_path: str) -> float:
    cap = cv2.VideoCapture(video_path)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    cap.release()
    if fps <= 1e-6:
        return 4.0
    return fps


def _robust_scale(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values
    lo = float(np.percentile(values, 2))
    hi = float(np.percentile(values, 98))
    if hi - lo < 1e-8:
        lo = float(np.min(values))
        hi = float(np.max(values))
    scaled = (values - lo) / (hi - lo + 1e-8)
    return np.clip(scaled, 0.0, 1.0)


def _find_top_peaks(scores: np.ndarray, timestamps: list[float], max_peaks: int = 3) -> list[dict]:
    if scores.size == 0:
        return []

    # Local maxima detection with minimum spacing to avoid selecting adjacent frames.
    candidates: list[int] = []
    for i in range(1, scores.size - 1):
        if scores[i] >= scores[i - 1] and scores[i] >= scores[i + 1]:
            candidates.append(i)

    if not candidates:
        candidates = [int(np.argmax(scores))]

    min_gap = max(8, scores.size // 14)
    candidates = sorted(candidates, key=lambda idx: float(scores[idx]), reverse=True)

    selected: list[int] = []
    for idx in candidates:
        if all(abs(idx - s) >= min_gap for s in selected):
            selected.append(idx)
        if len(selected) >= max_peaks:
            break

    labels = ["Peak anomaly", "Secondary spike", "Observed spike"]
    return [
        {
            "time": timestamps[idx] if idx < len(timestamps) else 0,
            "score": round(float(scores[idx]), 6),
            "label": labels[i] if i < len(labels) else f"Spike {i + 1}",
            "frame": int(idx),
        }
        for i, idx in enumerate(selected)
    ]


def run_inference(video_path: str) -> dict:
    started = time.perf_counter()
    try:
        dataset = SingleVideoDataset(video_path, ARGS)
        # BATCH SIZE LIMIT EXPANDED FROM 4 -> 16 to vastly increase PyTorch CUDA parallelization
        loader = torch.utils.data.DataLoader(dataset, batch_size=16, num_workers=0, drop_last=False)

        predictions_teacher = []
        predictions_student_teacher = []

        with torch.no_grad():
            for samples, grads, targets in loader:
                samples = samples.to(ARGS.device)
                grads = grads.to(ARGS.device)
                targets = targets.to(ARGS.device)

                MODEL.train_TS = True
                MODEL.abnormal_score_func_TS = "L2"

                _, _, _, recon_st_tc = MODEL(
                    samples,
                    targets=targets,
                    grad_mask=grads,
                    mask_ratio=ARGS.mask_ratio,
                )

                predictions_student_teacher += list(recon_st_tc[0].detach().cpu().numpy())
                predictions_teacher += list(recon_st_tc[1].detach().cpu().numpy())

        pred_teacher = np.array(predictions_teacher, dtype=np.float32)
        pred_st = np.array(predictions_student_teacher, dtype=np.float32)
        raw_predictions = pred_teacher + pred_st

        # Keep inference genuine while preserving visible temporal spikes.
        smoothed = filt(raw_predictions, range=21, mu=7)
        smoothed = np.nan_to_num(smoothed, nan=0.0)

        base = _robust_scale(smoothed)
        slope = np.abs(np.diff(smoothed, prepend=smoothed[0]))
        slope_scaled = _robust_scale(slope)
        predictions = np.clip(0.82 * base + 0.18 * slope_scaled, 0.0, 1.0)

        fps = _fps_for_video(video_path)
        timestamps = [round(i / fps, 3) for i in range(len(predictions))]
        scores = [round(float(v), 6) for v in predictions.tolist()]
        elapsed = round(time.perf_counter() - started, 3)
        peak_segments = _find_top_peaks(predictions, timestamps, max_peaks=3)

        return {
            "status": "ok",
            "backend_state": "live",
            "model_name": "AnomalyVision",
            "message": f"Live analysis complete. Processed {len(scores)} frames.",
            "anomaly_scores": scores,
            "timestamps": timestamps,
            "frame_count": len(scores),
            "processing_time": elapsed,
            "peak_segments": peak_segments,
        }
    finally:
        pass


@APP.get("/health")
def health_check():
    return {
        "status": "ok",
        "device": ARGS.device,
        "model": "AnomalyVision",
    }


@APP.post("/analyze")
async def analyze(video: UploadFile = File(...)):
    suffix = Path(video.filename or "input.mp4").suffix.lower()
    if suffix not in {".mp4", ".avi", ".mov", ".mkv"}:
        raise HTTPException(status_code=400, detail="Unsupported video type. Use mp4/avi/mov/mkv.")

    upload_dir = tempfile.mkdtemp(prefix="aed_upload_")
    upload_path = os.path.join(upload_dir, f"input{suffix}")
    try:
        raw = await video.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        with open(upload_path, "wb") as handle:
            handle.write(raw)

        try:
            response = run_inference(upload_path)
            return JSONResponse(response)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference failure: {str(e)}")
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("live_backend_api:APP", host="0.0.0.0", port=8000, reload=False)
