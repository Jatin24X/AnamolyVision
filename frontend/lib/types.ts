export type Telemetry = {
  cpuCores: number | null;
  deviceMemoryGb: number | null;
  jsHeapUsedMb: number | null;
  networkDownlinkMbps: number | null;
  gpuRenderer: string | null;
};

export type AnalysisPoint = {
  frame: number;
  timeSeconds: number;
  score: number;
};

export type HighlightFrame = {
  id: string;
  timeSeconds: number;
  label: string;
  imageUrl: string;
  score: number;
};

export type DetectionSummary = {
  peakScore: number;
  peakTimeSeconds: number;
  analyzedFrames: number;
  durationSeconds: number;
  processingTimeSeconds: number;
  averageScore: number;
};

export type DetectionResult = {
  backendMode: "mock" | "live" | "fallback";
  message: string;
  points: AnalysisPoint[];
  highlights: HighlightFrame[];
  summary: DetectionSummary;
};
