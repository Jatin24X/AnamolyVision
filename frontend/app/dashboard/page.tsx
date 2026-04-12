"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Brain, Cpu, Database, Flame, Gauge, Radar, Server } from "lucide-react";
import { collectTelemetry } from "@/lib/telemetry";
import type { Telemetry } from "@/lib/types";
import { loadLastDetection, type LastDetectionSnapshot } from "@/lib/ui-settings";

function scoreToPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [lastResult, setLastResult] = useState<LastDetectionSnapshot | null>(null);
  const [clock, setClock] = useState<string>("");

  useEffect(() => {
    setTelemetry(collectTelemetry());
    setLastResult(loadLastDetection());

    const updateClock = () => {
      setClock(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }).format(new Date())
      );
    };

    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const runtimeStats = useMemo(() => {
    const heap = telemetry?.jsHeapUsedMb ?? 0;
    const downlink = telemetry?.networkDownlinkMbps ?? 0;

    const estimatedCpu = Math.min(95, Math.max(18, Math.round(15 + heap / 5 + downlink * 2)));
    const estimatedGpu = telemetry?.gpuRenderer ? Math.min(92, Math.max(22, Math.round(estimatedCpu * 0.82))) : null;
    const estimatedTemp = estimatedGpu ? Math.min(81, Math.max(44, Math.round(37 + estimatedGpu * 0.45))) : null;

    return {
      estimatedCpu,
      estimatedGpu,
      estimatedTemp
    };
  }, [telemetry]);

  return (
    <main className="space-y-6">
      <section className="glass-panel tech-frame rounded-[30px] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Mission Control</p>
            <h2 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">AI Surveillance Operations Dashboard</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              Central command view for AnomalyVision runtime readiness, device telemetry, and anomaly-detection confidence metrics.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            System Time {clock || "--:--:--"}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DataTile label="Paper Benchmark" value="87.2%" helper="Reference AUC target" icon={Brain} tone="text-cyan-200" />
        <DataTile label="Current Best" value="85.25%" helper="10-epoch checkpoint" icon={Activity} tone="text-emerald-200" />
        <DataTile label="Dataset" value="Avenue" helper="Static-camera anomaly domain" icon={Database} tone="text-sky-200" />
        <DataTile
          label="Backend Signal"
          value={lastResult ? lastResult.backendMode.toUpperCase() : "STANDBY"}
          helper="Derived from latest detect run"
          icon={Server}
          tone="text-amber-200"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel tech-frame rounded-[30px] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Resource Overlay</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Session Hardware Signals</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SignalCard title="CPU usage (estimated)" value={`${runtimeStats.estimatedCpu}%`} icon={Cpu} />
            <SignalCard
              title="GPU usage (estimated)"
              value={runtimeStats.estimatedGpu !== null ? `${runtimeStats.estimatedGpu}%` : "Unavailable"}
              icon={Radar}
            />
            <SignalCard
              title="Thermal (estimated)"
              value={runtimeStats.estimatedTemp !== null ? `${runtimeStats.estimatedTemp}°C` : "Sensor locked"}
              icon={Flame}
            />
            <SignalCard title="Network downlink" value={telemetry?.networkDownlinkMbps ? `${telemetry.networkDownlinkMbps} Mbps` : "Unknown"} icon={Gauge} />
          </div>
          <p className="mt-5 text-xs leading-6 text-slate-400">
            Note: browser telemetry can infer capability, not exact OS-level GPU sensors. Precise GPU temperature and utilization need backend agent metrics.
          </p>
        </div>

        <div className="glass-panel tech-frame rounded-[30px] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Latest Detection</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Recent Anomaly Snapshot</h3>
          {lastResult ? (
            <div className="mt-5 space-y-3">
              <ResultRow label="File" value={lastResult.fileName} />
              <ResultRow label="Peak" value={scoreToPercent(lastResult.summary.peakScore)} />
              <ResultRow label="Peak Time" value={`${Math.round(lastResult.summary.peakTimeSeconds)}s`} />
              <ResultRow label="Frames" value={`${lastResult.summary.analyzedFrames}`} />
              <ResultRow label="Processing" value={`${lastResult.summary.processingTimeSeconds}s`} />
              <ResultRow label="Highlights" value={`${lastResult.highlightCount}`} />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
              Run detection at least once from the Detect page to populate live project KPIs here.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DataTile({
  label,
  value,
  helper,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <article className="glass-panel tech-frame rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{helper}</p>
    </article>
  );
}

function SignalCard({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string;
  icon: typeof Cpu;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3 text-slate-300">
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{title}</span>
        <Icon className="h-4 w-4 text-cyan-200" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-white break-all">{value}</p>
    </div>
  );
}
