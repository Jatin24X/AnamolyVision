# AnomalyVision Frontend

This folder contains the redesigned multi-page high-tech frontend for the AnomalyVision anomaly detection project.

## Pages
- `/dashboard`: mission-control dashboard with project KPIs and resource telemetry cards
- `/detect`: primary upload and anomaly detection workspace
- `/settings`: frontend-only controls (panel density, reduced motion, chart style, fallback hints)

## What Is Implemented
- Next.js App Router + TypeScript frontend
- Premium high-tech visual system with custom atmosphere, grid, glass panels, and neon accents
- Upload-first detection flow connected to `/api/analyze`
- Live camera option shown in UI as staged (not enabled yet)
- Anomaly timeline, metrics, highlighted frames, and anomaly mentions
- Local session snapshot saved from detect page and surfaced in dashboard
- Browser telemetry cards (CPU cores, memory, heap, network, GPU renderer)

## Backend Contract
No backend or AI pipeline changes are required.

Frontend integration remains exactly through:
- `app/api/analyze/route.ts`
- `AED_MAE_BACKEND_URL` environment variable (optional)

## Backend Modes
1. Mock mode
   If `AED_MAE_BACKEND_URL` is not set, `/api/analyze` returns generated demo analysis data so the UI remains fully usable.
2. Proxy mode
   If `AED_MAE_BACKEND_URL` is set, the frontend forwards uploaded video to that backend endpoint.
3. Fallback mode
   If backend response is unavailable or unsupported, frontend normalizes to fallback-safe output.

## Run Locally
```bash
cd frontend
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm start
```

## Environment Variable
Create `.env.local` in `frontend` if you want real backend connectivity:

```bash
AED_MAE_BACKEND_URL=http://localhost:8000/analyze
```

## Notes
- Live camera controls are intentionally non-functional in V1 UI.
- Browser-only telemetry is approximate; exact GPU load/temperature requires backend runtime metrics.
