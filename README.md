<div align="center">

# 🛡️ AnomalyVision
**AI-Based Video Anomaly Detection using Masked Auto Encoders**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-amber.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg?logo=next.js)
![PyTorch](https://img.shields.io/badge/PyTorch-2.6.0-red.svg?logo=pytorch)
![Modal](https://img.shields.io/badge/Modal-Serverless-fuchsia.svg)

[Live Demonstration via Vercel](#) · [FastAPI Playground](#) · [Read the Architecture](#architecture)

</div>

---

## 📖 Overview
AnomalyVision pushes the boundary of modern video surveillance and monitoring by introducing a robust, browser-first **Video Anomaly Detection** pipeline powered by CVPR-calibre machine learning algorithms. 

Unlike traditional frame-by-frame object detection or heuristic comparisons, this system utilizes a highly specialized **Student-Teacher Masked Autoencoder (AI)** pipeline natively powered by Vision Transformers (`timm`). The primary ML engine comprehensively examines raw video patches intertwined with computed motion gradients to highlight irregularities in temporal workflows—automatically discovering unexpected human behavior, sudden motion spikes, and critical localized anomalies without explicit programming.

## ✨ Features
*   **Next.js Frontend**: A remarkably fast, strictly typed React browser application built to seamlessly accept and visualize heavy surveillance uploads using dynamic vector SVG charts.
*   **Serverless GPU Backend (Modal)**: The complex neural logic compiles into a serverless instance running on an NVIDIA T4/A100. It scales entirely to 0 zero, meaning it costs nothing when idle, but leaps into action within milliseconds during inference.
*   **Masked Autoencoder Generation**: Identifies structural oddities by reconstructing heavily "masked" patches of surveillance blocks. The discrepancy between what the "Teacher" model expects and the "Student" predicts creates a measurable L2 Anomaly Risk.
*   **Frame Highlights**: Automated timeline scrubbing identifies peak spikes globally and automatically crops out the exact sub-frames directly onto your browser UI.

---

## 🏗️ Architecture & ML Pipeline

### 1. The Watchtower Frontend (React/Next.js)
The frontend delegates massive video processing away from standard servers. It pipes `.mp4` payloads sequentially into the PyTorch cluster using asynchronous edge routes, protected by robust Vercel limits.

### 2. The ML Pipeline (Serverless GPU)
The primary execution engine is structured heavily around chronological temporal arrays:
1. **Frame Ingestion**: Raw video buffers are unpacked using OpenCV and instantly resized into uniform structural blocks entirely inside volatile RAM to maximize compute speeds.
2. **Motion Extraction**: Computes absolute gradient dynamics (`|prev_img - next_img|`) across sequential steps to cleanly eliminate static background bias.
3. **Vision Transformer Injection**: Both the normalized RGB frames and motion gradients are formatted into `(C, H, W)` PyTorch tensors and pushed into the `mae_cvt_patch16` network.
4. **Student-Teacher Decoding**: The "Teacher" model evaluates expected temporal flows based on Avenue-style surveillance, while the "Student" predicts reconstructions over heavily masked patches. 
5. **Anomaly Aggregation**: The volumetric L2 discrepancy scores are temporally smoothed via Gaussian mapping. Local maximums trigger global timeline spikes, mathematically isolating the exact abnormal sub-frames for the UI.

### 3. Serverless Integration
The FastAPI backend compiles onto a stateless ASGI thread utilizing Modal.com. It dynamically allocates transient NVIDIA T4/A100 instances during asynchronous video analysis and aggressively spins down to 0 costs immediately afterward.

---

## ⚙️ Local Development Environment

If you prefer to run the API directly on your local silicon/GPU instead of utilizing Modal Serverless:

**1. Install Python Core**
```bash
pip install -r requirements.txt
```
**2. Boot the API**
```bash
python live_backend_api.py
```
*(The FastAPI server will boot on `http://localhost:8000`)*

**3. Launch the App**
```bash
cd frontend
npm install
npm run dev
```

---

## 📥 Dataset Limitations
The inference module is optimized broadly but extensively trained specifically off standardized street/subway/surveillance parameters conceptually aligning with datasets like **Avenue**, **UCSD**, and **ShanghaiTech**. Submitting completely unrelated macro-level videos (like video game footage or animated drawings) will result in heavily skewed Teacher validations. 

---

<div align="center">
  Released under the MIT License.<br>
</div>
