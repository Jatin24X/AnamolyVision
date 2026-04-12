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

## 🏗️ Architecture Stack

### The Frontend (Vercel)
Built in `frontend/` powered by Next.js 15 App Router.
- **TailwindCSS** for responsive styling and glassmorphism.
- Zero local Python requirements. It purely pipes the video via Next API Router (`/api/analyze`) sequentially into the PyTorch cluster.
- `Lucide React` iconography.

### The Model Backend (Modal.com)
Housed directly in the root directory via `live_backend_api.py`.
- Computes CV2 gradient dynamics (`prev_img - next_img`), eliminating background bias.
- Leverages `mae_cvt_patch16` heavily customized through institutional benchmarks.
- Operates on a seamless FastAPI ASGI thread via `modal_deploy.py`.

---

## 🚀 Deployment Guide
You can run this full-stack ML application completely free using the Vercel & Modal hobby tiers. 

### 1. Backend (Modal)
You must have a Modal account locally linked.
```bash
# 1. Install Modal onto your machine
pip install modal

# 2. Authenticate the CLI with GitHub/Google
python -m modal setup

# 3. Request your Serverless GPU and deploy!
python -m modal deploy modal_deploy.py
```
> Modal will successfully grant you a remote API URL. Copy this link.

### 2. Frontend (Vercel)
Navigate into the `frontend` application and utilize the Vercel deployment SDK.
```bash
cd frontend

# Deploy interactively
npx vercel build
npx vercel --prod
```
> **Critical Step:** You MUST add `AED_MAE_BACKEND_URL` into your Vercel Dashboard Environment Variables mapped directly to the URL Modal instantiated for you.

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
