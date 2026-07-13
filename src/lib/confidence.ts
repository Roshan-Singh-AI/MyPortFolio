/**
 * Shared confidence thresholds for the "Ask my work" retrieval grading.
 *
 * The same top cosine score is graded in several places -- the streaming route,
 * the non-streaming route, the client offline fallbacks, and the compose layer.
 * Keeping the thresholds and the bucketing in ONE module guarantees an identical
 * top score always buckets the same way online and offline (no "medium here,
 * low there" drift).
 *
 * Cosine scores from this small corpus cluster low, so these are calibrated to
 * it, not to 1.0. CONFIDENCE_LOW doubles as the retrieval "confidence floor":
 * below it we treat the match as "no good match".
 */

export const CONFIDENCE_HIGH = 0.14;
export const CONFIDENCE_LOW = 0.03;

/**
 * Below this cosine similarity we treat retrieval as "no good match". Same value
 * as CONFIDENCE_LOW so the grade bucket and the compose floor never disagree.
 */
export const CONFIDENCE_FLOOR = CONFIDENCE_LOW;

export type ConfidenceLabel = "high" | "medium" | "low";

/** Map a top cosine score to a confidence bucket + low-confidence flag. */
export function gradeConfidence(topScore: number): {
  confidence: number;
  label: ConfidenceLabel;
  lowConfidence: boolean;
} {
  const top = topScore ?? 0;
  const label: ConfidenceLabel =
    top >= CONFIDENCE_HIGH ? "high" : top >= CONFIDENCE_LOW ? "medium" : "low";
  return {
    confidence: Math.round(top * 1000) / 1000,
    label,
    lowConfidence: top < CONFIDENCE_LOW,
  };
}
