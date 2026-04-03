/**
 * Motion artifact detection and rejection for rPPG signal acquisition.
 *
 * Replaces the simple binary motion warning (RGB diff > 15) with:
 *   1. Continuous motion score (0-1) per frame
 *   2. Adaptive threshold based on recent signal statistics
 *   3. Frame-level exclusion of corrupted samples
 *   4. Linear interpolation to fill gaps from excluded frames
 *
 * Motion artifacts are the #1 source of rPPG measurement error in practice.
 * Even small head movements cause the ROI to shift across skin regions with
 * different baseline colors, creating large RGB jumps that dwarf the ~1%
 * pulsatile signal.
 */

import type { RGBSample } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MotionState {
  prevRGB: { r: number; g: number; b: number } | null;
  recentScores: number[];       // rolling window of scores for adaptive threshold
  adaptiveThreshold: number;
}

export interface MotionResult {
  /** Continuous motion score 0-1 (0 = perfectly still, 1 = heavy motion) */
  score: number;
  /** Whether this frame is too corrupted to use */
  isCorrupted: boolean;
  /** UI warning level */
  warningLevel: "none" | "mild" | "severe";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max RGB diff that saturates the score to 1.0 */
const MOTION_SATURATION = 60;

/** Rolling window size for adaptive threshold computation */
const ROLLING_WINDOW = 30;

/** Minimum absolute threshold — prevents over-rejection in very still conditions */
const ABSOLUTE_FLOOR = 0.3;

/** Multiplier for std above mean to set adaptive threshold */
const ADAPTIVE_K = 1.5;

/** Maximum fraction of frames that can be excluded (safety valve) */
const MAX_EXCLUSION_RATIO = 0.3;

// ---------------------------------------------------------------------------
// Motion Scoring
// ---------------------------------------------------------------------------

export function initMotionState(): MotionState {
  return {
    prevRGB: null,
    recentScores: [],
    adaptiveThreshold: ABSOLUTE_FLOOR,
  };
}

/**
 * Compute a continuous motion score for the current frame.
 *
 * Uses the frame-to-frame RGB difference (same basic signal as the old
 * binary check) but normalizes it to a 0-1 scale and applies adaptive
 * thresholding based on recent motion statistics.
 */
export function computeMotionScore(
  currentRGB: { r: number; g: number; b: number },
  state: MotionState
): { result: MotionResult; state: MotionState } {
  if (!state.prevRGB) {
    return {
      result: { score: 0, isCorrupted: false, warningLevel: "none" },
      state: { ...state, prevRGB: { ...currentRGB } },
    };
  }

  // Raw RGB difference (same formula as the original code)
  const diff =
    Math.abs(currentRGB.r - state.prevRGB.r) +
    Math.abs(currentRGB.g - state.prevRGB.g) +
    Math.abs(currentRGB.b - state.prevRGB.b);

  // Normalize to 0-1
  const score = Math.min(diff / MOTION_SATURATION, 1.0);

  // Update rolling window
  const newScores = [...state.recentScores, score];
  if (newScores.length > ROLLING_WINDOW) newScores.shift();

  // Compute adaptive threshold from recent history
  let adaptiveThreshold = ABSOLUTE_FLOOR;
  if (newScores.length >= 10) {
    const mean = newScores.reduce((a, b) => a + b, 0) / newScores.length;
    const std = Math.sqrt(
      newScores.reduce((a, b) => a + (b - mean) ** 2, 0) / newScores.length
    );
    adaptiveThreshold = Math.max(ABSOLUTE_FLOOR, mean + ADAPTIVE_K * std);
  }

  // Frame is corrupted if above adaptive threshold AND above absolute floor
  const isCorrupted = score > adaptiveThreshold && score > ABSOLUTE_FLOOR;

  // Warning levels for UI
  let warningLevel: "none" | "mild" | "severe";
  if (score < 0.2) warningLevel = "none";
  else if (score < 0.5) warningLevel = "mild";
  else warningLevel = "severe";

  return {
    result: { score, isCorrupted, warningLevel },
    state: {
      prevRGB: { ...currentRGB },
      recentScores: newScores,
      adaptiveThreshold,
    },
  };
}

// ---------------------------------------------------------------------------
// Post-Recording Motion Artifact Filtering
// ---------------------------------------------------------------------------

/**
 * Filter motion-corrupted frames from the RGB sample array.
 *
 * Excludes frames where the motion score exceeds the threshold,
 * then linearly interpolates the RGB values to fill the gaps.
 * If more than MAX_EXCLUSION_RATIO (30%) of frames would be excluded,
 * returns the original samples unmodified (too degraded for selective
 * filtering to help).
 */
export function filterMotionArtifacts(
  samples: RGBSample[],
  motionScores: number[],
  threshold?: number
): RGBSample[] {
  if (samples.length === 0 || motionScores.length === 0) return samples;

  const N = Math.min(samples.length, motionScores.length);

  // Compute threshold if not provided: mean + 1.5 * std of all scores
  let thresh = threshold;
  if (thresh === undefined) {
    const mean = motionScores.reduce((a, b) => a + b, 0) / motionScores.length;
    const std = Math.sqrt(
      motionScores.reduce((a, b) => a + (b - mean) ** 2, 0) / motionScores.length
    );
    thresh = Math.max(ABSOLUTE_FLOOR, mean + ADAPTIVE_K * std);
  }

  // Mark corrupted frames
  const corrupted = new Array(N).fill(false);
  let corruptedCount = 0;
  for (let i = 0; i < N; i++) {
    if (motionScores[i] > thresh && motionScores[i] > ABSOLUTE_FLOOR) {
      corrupted[i] = true;
      corruptedCount++;
    }
  }

  // Safety valve: if too many frames are corrupted, return originals
  if (corruptedCount / N > MAX_EXCLUSION_RATIO) {
    return samples;
  }

  if (corruptedCount === 0) return samples;

  // Interpolate gaps
  const result: RGBSample[] = [...samples.slice(0, N)];

  for (let i = 0; i < N; i++) {
    if (!corrupted[i]) continue;

    // Find nearest clean neighbors
    let prevClean = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (!corrupted[j]) { prevClean = j; break; }
    }
    let nextClean = -1;
    for (let j = i + 1; j < N; j++) {
      if (!corrupted[j]) { nextClean = j; break; }
    }

    if (prevClean >= 0 && nextClean >= 0) {
      // Linear interpolation
      const span = nextClean - prevClean;
      const frac = (i - prevClean) / span;
      result[i] = {
        r: samples[prevClean].r + frac * (samples[nextClean].r - samples[prevClean].r),
        g: samples[prevClean].g + frac * (samples[nextClean].g - samples[prevClean].g),
        b: samples[prevClean].b + frac * (samples[nextClean].b - samples[prevClean].b),
        timestamp: samples[prevClean].timestamp + frac * (samples[nextClean].timestamp - samples[prevClean].timestamp),
      };
    } else if (prevClean >= 0) {
      // Extrapolate from previous (hold last value)
      result[i] = { ...samples[prevClean], timestamp: samples[i].timestamp };
    } else if (nextClean >= 0) {
      // Extrapolate from next (hold next value)
      result[i] = { ...samples[nextClean], timestamp: samples[i].timestamp };
    }
    // else: all corrupted, leave as-is
  }

  return result;
}
