import type { DetectionResult } from "@/lib/types";

export type UiSettings = {
  densePanels: boolean;
  reducedMotion: boolean;
  softChart: boolean;
  fallbackHints: boolean;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  densePanels: false,
  reducedMotion: false,
  softChart: true,
  fallbackHints: true
};

const SETTINGS_KEY = "aed_ui_settings";
const LAST_RESULT_KEY = "aed_last_result";
const DETECTION_SESSION_KEY = "aed_detection_session";

export type LastDetectionSnapshot = {
  timestamp: number;
  fileName: string;
  backendMode: "mock" | "live" | "fallback";
  summary: {
    peakScore: number;
    peakTimeSeconds: number;
    analyzedFrames: number;
    durationSeconds: number;
    processingTimeSeconds: number;
    averageScore: number;
  };
  highlightCount: number;
};

export type DetectionSession = {
  timestamp: number;
  fileName: string;
  statusText: string;
  result: DetectionResult;
};

export function loadUiSettings(): UiSettings {
  if (typeof window === "undefined") {
    return DEFAULT_UI_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_UI_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      densePanels: Boolean(parsed.densePanels),
      reducedMotion: Boolean(parsed.reducedMotion),
      softChart: parsed.softChart !== false,
      fallbackHints: parsed.fallbackHints !== false
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

export function saveUiSettings(settings: UiSettings) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("aed-ui-settings-changed"));
}

export function saveLastDetection(snapshot: LastDetectionSnapshot) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(snapshot));
}

export function loadLastDetection(): LastDetectionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LastDetectionSnapshot;
  } catch {
    return null;
  }
}

export function saveDetectionSession(session: DetectionSession) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(DETECTION_SESSION_KEY, JSON.stringify(session));
}

export function loadDetectionSession(): DetectionSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(DETECTION_SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DetectionSession;
  } catch {
    return null;
  }
}

export function clearDetectionSession() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(DETECTION_SESSION_KEY);
}
