"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Cpu, Radar, Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { loadUiSettings } from "@/lib/ui-settings";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Radar
  },
  {
    href: "/detect",
    label: "Detect",
    icon: Activity
  },
  {
    href: "/about",
    label: "About / Architecture",
    icon: Waypoints
  }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const applySettings = () => {
      const settings = loadUiSettings();
      document.body.classList.toggle("ui-dense", settings.densePanels);
      document.body.classList.toggle("ui-reduced-motion", settings.reducedMotion);
    };

    applySettings();
    const onStorage = () => applySettings();
    const onUiSettingsChanged = () => applySettings();
    window.addEventListener("storage", onStorage);
    window.addEventListener("aed-ui-settings-changed", onUiSettingsChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("aed-ui-settings-changed", onUiSettingsChanged);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="app-grid-bg absolute inset-0 opacity-45" />
      <div className="app-atmo-glow absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1680px] grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[280px_1fr] lg:px-8 lg:py-8">
        <aside className="glass-panel tech-frame h-fit rounded-[28px] p-5 lg:sticky lg:top-6">
          <div className="mb-7 border-b border-white/10 pb-5">
            <h1 className="text-3xl font-bold tracking-tight text-white">AnomalyVision</h1>
            <p className="mt-3 text-xs leading-5 text-cyan-100/70 font-medium tracking-wide">
              AI-Based Video Anomaly Detection<br/>using Masked Auto Encoders
            </p>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-cyan-300/45 bg-cyan-300/10 text-white"
                      : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-cyan-200/25 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-cyan-200" : "text-slate-400"}`} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Cpu className="h-4 w-4" />
              Runtime Mode
            </div>
            <p className="mt-3 text-sm leading-6 text-cyan-50/90">
              Upload-driven anomaly analysis is active. Live camera lane is staged for next backend phase.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="glass-panel tech-frame rounded-2xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-cyan-100/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-300/15 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-200" />
                Neural runtime online
              </span>
              <span className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-slate-300">
                Upload path active
              </span>
              <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-fuchsia-200">
                Live feed staged
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
