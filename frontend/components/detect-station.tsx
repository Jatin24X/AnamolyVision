"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  ChartNoAxesCombined,
  Cpu,
  PlayCircle,
  Radio,
  Upload,
  Video
} from "lucide-react";
import type { DetectionResult } from "@/lib/types";
import { collectTelemetry } from "@/lib/telemetry";
import {
  loadUiSettings,
} from "@/lib/ui-settings";
import {
  clearDetectionSessionState,
  getDetectionSessionState,
  runDetectionRequest,
  setDetectionCameraUrl,
  setDetectionInputFile,
  subscribeDetectionSession
} from "@/lib/detection-session-manager";

const PROCESS_STEPS = [
  "Input validation",
  "Frame extraction",
  "Gradient generation",
  "Inference execution",
  "Result assembly"
];

function formatSeconds(value: number) {
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (clamped % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function estimateThreshold(points: DetectionResult["points"]) {
  if (points.length === 0) {
    return 0.7;
  }
  const values = points.map((point) => point.score);
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    Math.max(values.length, 1);
  const std = Math.sqrt(variance);
  return Math.min(0.92, Math.max(0.62, mean + std * 0.65));
}

function buildIntervals(points: DetectionResult["points"]) {
  const threshold = estimateThreshold(points);
  const intervals: Array<{ start: number; end: number; maxScore: number }> = [];

  let activeStart: number | null = null;
  let activeEnd: number | null = null;
  let activeMax = 0;

  for (const point of points) {
    if (point.score >= threshold) {
      if (activeStart === null) {
        activeStart = point.timeSeconds;
        activeMax = point.score;
      }
      activeEnd = point.timeSeconds;
      activeMax = Math.max(activeMax, point.score);
      continue;
    }

    if (activeStart !== null && activeEnd !== null) {
      intervals.push({ start: activeStart, end: activeEnd, maxScore: activeMax });
      activeStart = null;
      activeEnd = null;
      activeMax = 0;
    }
  }

  if (activeStart !== null && activeEnd !== null) {
    intervals.push({ start: activeStart, end: activeEnd, maxScore: activeMax });
  }

  return intervals
    .sort((a, b) => b.maxScore - a.maxScore)
    .slice(0, 3)
    .sort((a, b) => a.start - b.start);
}

function createPointString(
  points: DetectionResult["points"],
  width: number,
  height: number,
  soft: boolean
) {
  const normalized = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - point.score * (height - 12) - 6;
    return { x, y };
  });

  if (!soft || normalized.length < 3) {
    return normalized.map((point) => `${point.x},${point.y}`).join(" ");
  }

  const smoothed = normalized.map((point, index, arr) => {
    const prev = arr[Math.max(0, index - 1)];
    const next = arr[Math.min(arr.length - 1, index + 1)];
    return {
      x: point.x,
      y: (prev.y + point.y + next.y) / 3
    };
  });

  return smoothed.map((point) => `${point.x},${point.y}`).join(" ");
}

export function DetectStation() {
  const [sessionState, setSessionState] = useState(getDetectionSessionState());
  const [settingsSoftChart, setSettingsSoftChart] = useState(true);
  const [showFallbackHints, setShowFallbackHints] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const {
    selectedFile,
    videoUrl,
    result,
    statusText,
    isAnalyzing,
    stepIndex,
    cameraUrl,
    progressPercent
  } = sessionState;

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const applySettings = () => {
      const settings = loadUiSettings();
      setSettingsSoftChart(settings.softChart);
      setShowFallbackHints(settings.fallbackHints);
    };

    applySettings();
    const onUiSettingsChanged = () => applySettings();
    window.addEventListener("aed-ui-settings-changed", onUiSettingsChanged);
    return () => window.removeEventListener("aed-ui-settings-changed", onUiSettingsChanged);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDetectionSession(() => {
      setSessionState(getDetectionSessionState());
    });
    setSessionState(getDetectionSessionState());
    return unsubscribe;
  }, []);

  const points = result?.points ?? [];
  const rankedHighlights = useMemo(() => {
    return [...(result?.highlights ?? [])].sort((a, b) => b.score - a.score);
  }, [result]);
  const abnormalIntervals = useMemo(() => buildIntervals(points), [points]);
  const anomalySummaryText = useMemo(() => {
    if (!result || abnormalIntervals.length === 0) {
      return "No abnormal interval summary yet. Run detection to generate interval insights.";
    }

    const parts = abnormalIntervals.map(
      (item) => `${formatClock(item.start)}-${formatClock(item.end)}`
    );
    const joined =
      parts.length > 1
        ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
        : parts[0];

    return `${abnormalIntervals.length} abnormal event${
      abnormalIntervals.length > 1 ? "s" : ""
    } detected between ${joined}`;
  }, [abnormalIntervals, result]);

  const chartPoints = createPointString(points, 860, 260, settingsSoftChart);
  const spikeMarkers = useMemo(() => {
    if (!result || points.length === 0 || result.highlights.length === 0) {
      return [];
    }

    return result.highlights.map((highlight) => {
      let nearest = points[0];
      let nearestDiff = Math.abs(points[0].timeSeconds - highlight.timeSeconds);
      for (const point of points) {
        const diff = Math.abs(point.timeSeconds - highlight.timeSeconds);
        if (diff < nearestDiff) {
          nearest = point;
          nearestDiff = diff;
        }
      }

      const x = (nearest.frame / Math.max(points.length - 1, 1)) * 860;
      const y = 260 - nearest.score * (260 - 12) - 6;
      return {
        x,
        y,
        score: nearest.score,
        label: highlight.label,
      };
    });
  }, [result, points]);

  const handleFile = (file: File) => {
    setDetectionInputFile(file);
  };

  const runDetection = async () => {
    await runDetectionRequest();
  };

  return (
    <main className="space-y-6">
      <section className="glass-panel tech-frame rounded-[30px] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Detection Bay</p>
            <h2 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">Video Upload and Anomaly Detection</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              Main production lane is upload-driven detection. Live camera route is visible for roadmap continuity and backend wiring later.
            </p>
          </div>
          <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-sm text-fuchsia-100">
            Live Feed Lane: Coming Soon
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Input Sources" eyebrow="Capture and Upload" icon={Upload}>
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  handleFile(file);
                }
              }}
              className={`w-full cursor-pointer rounded-[24px] border p-5 text-left transition ${
                dragActive
                  ? "border-cyan-200 bg-[linear-gradient(130deg,rgba(56,189,248,0.34),rgba(30,41,59,0.9))]"
                  : "border-cyan-300/35 bg-[linear-gradient(130deg,rgba(56,189,248,0.2),rgba(30,41,59,0.8))] hover:border-cyan-200/60"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100">Upload Video</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Primary detection path</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Drag-drop or browse to upload surveillance style footage and run AnomalyVision AI anomaly scoring.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
                Drop file here or click to browse
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200">Live Camera</p>
                  <p className="mt-1 text-sm text-slate-300">Visible option for future RTSP wiring</p>
                </div>
                <Camera className="h-5 w-5 text-fuchsia-200" />
              </div>
              <input
                value={cameraUrl}
                onChange={(event) => setDetectionCameraUrl(event.target.value)}
                placeholder="rtsp://camera-address/stream"
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled
                className="mt-3 w-full cursor-not-allowed rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2 text-sm font-semibold text-fuchsia-100 opacity-70"
              >
                Connect Live Feed (Not Enabled Yet)
              </button>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Selected file</p>
              <p className="mt-2 text-lg font-semibold text-white break-all">{selectedFile?.name ?? "No file selected"}</p>
              <p className="mt-2 text-sm text-slate-400">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "Supported: MP4, AVI, MOV, MKV"}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={runDetection}
                  disabled={!selectedFile || isAnalyzing}
                  className="flex-1 rounded-xl bg-[linear-gradient(90deg,#38bdf8,#2dd4bf)] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? "Detecting..." : "Run Detection"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearDetectionSessionState();
                  }}
                  className="rounded-xl border border-white/15 bg-slate-900/75 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  Reset
                </button>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-300">{statusText}</p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/avi,video/quicktime,video/x-msvideo,video/x-matroska"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleFile(file);
              }
            }}
          />
        </Panel>

        <Panel title="Runtime and Preview" eyebrow="Pipeline" icon={ChartNoAxesCombined}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75">
              {videoUrl ? (
                <video src={videoUrl} controls className="aspect-video h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-slate-500">
                  Upload a video to activate preview and chart rendering.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Process Stages</p>
              <div className="mt-3 space-y-3">
                {PROCESS_STEPS.map((step, index) => {
                  const active = result ? true : index <= stepIndex && isAnalyzing;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" : "bg-slate-700"}`} />
                      <span className={active ? "text-white" : "text-slate-500"}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
                <p>Mode: <span className="font-semibold text-white">{result?.backendMode?.toUpperCase() ?? "STANDBY"}</span></p>
                <p className="mt-1">
                  Progress: <span className="font-semibold text-cyan-100">{isAnalyzing ? `${progressPercent}%` : result ? "100%" : "0%"}</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#2dd4bf,#f97316)] transition-all"
                    style={{ width: `${isAnalyzing ? progressPercent : result ? 100 : 0}%` }}
                  />
                </div>
                {showFallbackHints && result?.backendMode !== "live" ? (
                  <p className="mt-2 text-xs leading-6 text-amber-200">
                    Non-live mode detected. Results may be generated by fallback normalization if backend is unavailable.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Anomaly Timeline" eyebrow="Signal Analysis" icon={Activity}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <svg viewBox="0 0 860 280" className="h-[280px] w-full">
              <defs>
                <linearGradient id="lineTone" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="55%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              {Array.from({ length: 5 }).map((_, idx) => (
                <line
                  key={`line-${idx}`}
                  x1="0"
                  y1={28 + idx * 56}
                  x2="860"
                  y2={28 + idx * 56}
                  stroke="rgba(255,255,255,0.09)"
                  strokeDasharray="6 8"
                />
              ))}
              {points.length > 0 ? (
                <>
                  <polyline fill="none" stroke="url(#lineTone)" strokeWidth="4" points={chartPoints} />
                  <polyline fill="rgba(34,211,238,0.12)" stroke="transparent" points={`0,270 ${chartPoints} 860,270`} />
                  {spikeMarkers.map((marker, idx) => (
                    <g key={`${marker.label}-${idx}`}>
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r="6"
                        fill="#f97316"
                        stroke="#fff"
                        strokeWidth="1.2"
                      />
                      <text
                        x={Math.min(marker.x + 8, 760)}
                        y={Math.max(marker.y - 10, 20)}
                        fill="#fbbf24"
                        fontSize="11"
                      >
                        {marker.label}
                      </text>
                    </g>
                  ))}
                </>
              ) : (
                <text x="430" y="140" textAnchor="middle" fill="#7b8aa3" fontSize="18">
                  Detection output will render anomaly signal here.
                </text>
              )}
            </svg>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <MetricCard label="Peak Score" value={result ? `${Math.round(result.summary.peakScore * 100)}%` : "--"} />
            <MetricCard label="Peak Time" value={result ? formatSeconds(result.summary.peakTimeSeconds) : "--"} />
            <MetricCard label="Frames" value={result ? `${result.summary.analyzedFrames}` : "--"} />
            <MetricCard label="Latency" value={result ? `${result.summary.processingTimeSeconds}s` : "--"} />
          </div>
        </Panel>

        <Panel title="Context Intel" eyebrow="Telemetry" icon={Cpu}>
          <TelemetryIntel />
        </Panel>
      </section>

      <Panel title="Summary Panel" eyebrow="Auto Generated" icon={AlertTriangle}>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total anomalies detected"
            value={result ? `${abnormalIntervals.length}` : "--"}
          />
          <MetricCard
            label="Highest anomaly score"
            value={result ? `${Math.round(result.summary.peakScore * 100)}%` : "--"}
          />
          <MetricCard
            label="Abnormal intervals"
            value={result ? `${abnormalIntervals.length}` : "--"}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-100">
          {result
            ? `"${anomalySummaryText}"`
            : "Run detection to generate auto-summary and abnormal time intervals."}
        </div>
      </Panel>

      <Panel title="Anomaly Highlights" eyebrow="Frame Mentions" icon={Video}>
        <div className="grid gap-4 md:grid-cols-3">
          {rankedHighlights.length > 0 ? (
            rankedHighlights.map((frame, index) => {
              const rank = index === 0 ? "Critical" : index === 1 ? "Elevated" : "Observed";
              return (
                <article key={frame.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                  <div className="aspect-video overflow-hidden bg-slate-900">
                    {frame.imageUrl ? (
                      <img src={frame.imageUrl} alt={frame.label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">Preview pending</div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">{rank}</p>
                      <p className="text-xs text-slate-400">{formatSeconds(frame.timeSeconds)}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{frame.label}</p>
                    <p className="text-sm text-slate-300">Anomaly confidence {Math.round(frame.score * 100)}%</p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-8 text-center text-slate-400">
              Highlighted anomaly frames appear after detection completes.
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Automated Mentions</p>
          {(rankedHighlights.length > 0) ? (
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
              {rankedHighlights.map((item) => (
                <li key={`mention-${item.id}`} className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 text-amber-300" />
                  <span>
                    {item.label} around {formatSeconds(item.timeSeconds)} with confidence {Math.round(item.score * 100)}%.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No anomaly mentions yet. Run detection to generate highlighted findings.</p>
          )}
        </div>
      </Panel>
    </main>
  );
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  children
}: {
  title: string;
  eyebrow: string;
  icon: typeof Activity;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel tech-frame rounded-[30px] p-5 lg:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200">{eyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function TelemetryIntel() {
  const [cpuCores, setCpuCores] = useState<string>("--");
  const [memory, setMemory] = useState<string>("--");
  const [gpu, setGpu] = useState<string>("Unknown");

  useEffect(() => {
    const telemetry = collectTelemetry();
    setCpuCores(telemetry.cpuCores ? `${telemetry.cpuCores}` : "--");
    setMemory(telemetry.deviceMemoryGb ? `${telemetry.deviceMemoryGb} GB` : "--");
    setGpu(telemetry.gpuRenderer ?? "Unavailable");
  }, []);

  return (
    <div className="space-y-3">
      <IntelRow icon={Cpu} label="CPU cores" value={cpuCores} />
      <IntelRow icon={PlayCircle} label="Device memory" value={memory} />
      <IntelRow icon={Radio} label="GPU renderer" value={gpu} />
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs leading-6 text-slate-400">
        True GPU utilization and thermal sensors require backend runtime telemetry endpoint, not available in browser-only mode.
      </div>
    </div>
  );
}

function IntelRow({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-cyan-200" />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-semibold text-white break-all">{value}</span>
      </div>
    </div>
  );
}
