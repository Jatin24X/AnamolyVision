import { Telemetry } from "@/lib/types";

declare global {
  interface Navigator {
    deviceMemory?: number;
    connection?: {
      downlink?: number;
    };
  }

  interface Performance {
    memory?: {
      usedJSHeapSize?: number;
    };
  }
}

function getGpuRenderer() {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!context) {
    return null;
  }

  const webgl = context as WebGLRenderingContext;
  const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) {
    return "WebGL available";
  }

  return webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
}

export function collectTelemetry(): Telemetry {
  return {
    cpuCores: navigator.hardwareConcurrency ?? null,
    deviceMemoryGb: navigator.deviceMemory ?? null,
    jsHeapUsedMb: performance.memory?.usedJSHeapSize
      ? Number((performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1))
      : null,
    networkDownlinkMbps: navigator.connection?.downlink ?? null,
    gpuRenderer: getGpuRenderer()
  };
}
