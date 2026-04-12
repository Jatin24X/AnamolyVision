import type { AnalysisPoint, DetectionResult } from "@/lib/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildTopHighlights(points: AnalysisPoint[]) {
  if (points.length === 0) {
    return [];
  }

  const candidates: AnalysisPoint[] = [];
  for (let i = 1; i < points.length - 1; i += 1) {
    if (points[i].score >= points[i - 1].score && points[i].score >= points[i + 1].score) {
      candidates.push(points[i]);
    }
  }

  const sorted = (candidates.length > 0 ? candidates : [...points]).sort(
    (a, b) => b.score - a.score
  );

  const selected: AnalysisPoint[] = [];
  const minGap = Math.max(0.9, points.length / 90);
  for (const point of sorted) {
    if (selected.every((picked) => Math.abs(picked.timeSeconds - point.timeSeconds) >= minGap)) {
      selected.push(point);
    }
    if (selected.length >= 3) {
      break;
    }
  }

  return selected.map((point, index) => ({
    id: `highlight-${index + 1}`,
    timeSeconds: point.timeSeconds,
    label: index === 0 ? "Peak anomaly" : index === 1 ? "Secondary spike" : "Observed spike",
    imageUrl: "",
    score: point.score
  }));
}

function buildHighlightsFromSegments(segments: unknown, points: AnalysisPoint[]) {
  if (!Array.isArray(segments)) {
    return null;
  }

  const mapped = segments
    .map((segment, idx) => {
      if (typeof segment !== "object" || segment === null) {
        return null;
      }
      const item = segment as Record<string, unknown>;
      const time = item.time;
      const score = item.score;
      if (!isFiniteNumber(time) || !isFiniteNumber(score)) {
        return null;
      }
      return {
        id: typeof item.label === "string" ? `${item.label}-${idx}` : `highlight-${idx + 1}`,
        timeSeconds: Number(time.toFixed(2)),
        label: typeof item.label === "string" ? item.label : `Spike ${idx + 1}`,
        imageUrl: "",
        score: Number(clampScore(score).toFixed(3))
      };
    })
    .filter((item): item is DetectionResult["highlights"][number] => Boolean(item));

  if (mapped.length > 0) {
    return mapped.slice(0, 3);
  }

  if (points.length > 0) {
    return buildTopHighlights(points);
  }

  return null;
}

export async function normalizeBackendResponse(
  data: unknown
): Promise<DetectionResult> {
  if (typeof data !== "object" || data === null) {
    throw new Error("Backend returned empty or non-object payload.");
  }

  const obj = data as Record<string, unknown>;

  if (
    Array.isArray(obj.points) &&
    typeof obj.summary === "object" &&
    obj.summary !== null
  ) {
    const payload = obj as DetectionResult;
    return { ...payload, backendMode: "live" };
  }

  const scores = obj.anomaly_scores;
  const timestamps = obj.timestamps;

  if (Array.isArray(scores) && Array.isArray(timestamps)) {
    const points: AnalysisPoint[] = [];
    const length = Math.min(scores.length, timestamps.length);
    let total = 0;
    let peakScore = 0;
    let peakTime = 0;

    for (let index = 0; index < length; index += 1) {
      const rawScore = scores[index];
      const rawTime = timestamps[index];
      if (!isFiniteNumber(rawScore) || !isFiniteNumber(rawTime)) {
        continue;
      }
      const score = Number(clampScore(rawScore).toFixed(3));
      const timeSeconds = Number(rawTime.toFixed(2));
      total += score;
      if (score > peakScore) {
        peakScore = score;
        peakTime = timeSeconds;
      }
      points.push({ frame: index, timeSeconds, score });
    }

    if (points.length === 0) {
      throw new Error("Backend returned anomaly arrays but no valid numeric samples.");
    }

    const averageScore = Number((total / points.length).toFixed(3));
    const frameCount = isFiniteNumber(obj.frame_count) ? obj.frame_count : points.length;
    const processing = isFiniteNumber(obj.processing_time) ? obj.processing_time : 0;
    const durationSeconds = points[points.length - 1]?.timeSeconds ?? 0;
    const message = typeof obj.message === "string" ? obj.message : "Live analysis complete.";
    const highlights =
      buildHighlightsFromSegments(obj.peak_segments, points) ?? buildTopHighlights(points);

    return {
      backendMode: "live",
      message,
      points,
      highlights,
      summary: {
        peakScore: Number(peakScore.toFixed(3)),
        peakTimeSeconds: peakTime,
        analyzedFrames: Math.max(0, Math.floor(frameCount)),
        durationSeconds,
        processingTimeSeconds: Number(processing.toFixed(2)),
        averageScore
      }
    };
  }

  throw new Error("Unsupported backend response shape. Expected DetectionResult or anomaly_scores/timestamps.");
}
