/**
 * Frame quality assessment and camera auto-gain compensation.
 *
 * Addresses two major signal corruption sources:
 *   1. Camera AGC (auto-gain control) — the camera adjusts exposure/gain
 *      frame-to-frame, injecting low-frequency brightness shifts that
 *      masquerade as pulse signals.
 *   2. Ambient light flicker — 50/60Hz power line frequency creates
 *      periodic brightness modulation that aliases into the rPPG band.
 *
 * Also provides per-frame quality scoring so corrupted frames can be
 * excluded before they contaminate the RGB trace.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameQualityScore {
  brightness: number;       // mean luminance 0-255
  brightnessScore: number;  // 0-1 (1 = ideal range 60-200)
  sharpness: number;        // Laplacian variance proxy (higher = sharper)
  sharpnessScore: number;   // 0-1
  faceConfidence: number;   // 0-1 from face detector
  agcDelta: number;         // magnitude of brightness jump from AGC
  overallScore: number;     // 0-1 composite
  accepted: boolean;        // passes quality threshold
}

export interface AGCState {
  prevMeanBrightness: number;
  emaGain: number;
  frameCount: number;
}

// ---------------------------------------------------------------------------
// AGC Compensation
// ---------------------------------------------------------------------------

const AGC_EMA_ALPHA = 0.95; // slow EMA — true lighting changes pass, fast AGC jumps are corrected
const AGC_WARMUP_FRAMES = 5; // frames before AGC correction kicks in

export function initAGCState(): AGCState {
  return { prevMeanBrightness: -1, emaGain: 1.0, frameCount: 0 };
}

/**
 * Compensate for camera auto-gain shifts by normalizing RGB to a
 * slowly-adapting brightness reference.
 *
 * Returns corrected RGB values and the magnitude of the AGC shift detected.
 */
export function compensateAGC(
  rgb: { r: number; g: number; b: number },
  state: AGCState
): { corrected: { r: number; g: number; b: number }; state: AGCState; agcDelta: number } {
  // Perceived luminance (ITU-R BT.709)
  const currentBrightness = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

  if (state.prevMeanBrightness < 0 || state.frameCount < AGC_WARMUP_FRAMES) {
    // Warmup: just track brightness, no correction
    return {
      corrected: rgb,
      state: {
        prevMeanBrightness: currentBrightness,
        emaGain: 1.0,
        frameCount: state.frameCount + 1,
      },
      agcDelta: 0,
    };
  }

  // EMA of brightness as the reference level
  const emaBrightness = AGC_EMA_ALPHA * state.prevMeanBrightness + (1 - AGC_EMA_ALPHA) * currentBrightness;

  // Gain correction factor: bring current frame to the EMA reference
  const gainFactor = emaBrightness > 1 ? emaBrightness / (currentBrightness + 1e-6) : 1.0;

  // Clamp gain to avoid extreme corrections (max ±30%)
  const clampedGain = Math.max(0.7, Math.min(1.3, gainFactor));

  // AGC delta: how much the brightness jumped (normalized)
  const agcDelta = Math.abs(currentBrightness - state.prevMeanBrightness) / (emaBrightness + 1e-6);

  return {
    corrected: {
      r: rgb.r * clampedGain,
      g: rgb.g * clampedGain,
      b: rgb.b * clampedGain,
    },
    state: {
      prevMeanBrightness: emaBrightness,
      emaGain: clampedGain,
      frameCount: state.frameCount + 1,
    },
    agcDelta,
  };
}

// ---------------------------------------------------------------------------
// Ambient Light Flicker Detection
// ---------------------------------------------------------------------------

/**
 * Detect 50Hz or 60Hz power line flicker from the brightness trace.
 *
 * At 30fps, the mains fundamentals alias as follows:
 *   - 50Hz → |50 - 30| = 20Hz (above Nyquist at 15Hz, further aliases to 10Hz)
 *   - 60Hz → |60 - 2*30| = 0Hz (DC, hard to detect directly)
 *   - 100Hz (2nd harmonic of 50Hz) → |100 - 3*30| = 10Hz
 *   - 120Hz (2nd harmonic of 60Hz) → |120 - 4*30| = 0Hz
 *
 * In practice, rolling shutter cameras see flicker as amplitude modulation
 * that creates energy around ~10Hz for 50Hz mains. For 60Hz mains, the
 * artifact is closer to DC and harder to distinguish. We look for peaks
 * at specific alias frequencies.
 */
export function detectFlickerFrequency(
  brightnessHistory: number[],
  fs: number
): 50 | 60 | null {
  const N = brightnessHistory.length;
  if (N < 64) return null; // need at least ~2 seconds

  // Zero-pad to power of 2
  let fftLen = 1;
  while (fftLen < N) fftLen <<= 1;

  // Remove DC and apply Hann window
  const mean = brightnessHistory.reduce((a, b) => a + b, 0) / N;
  const windowed = new Array(fftLen).fill(0);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    windowed[i] = (brightnessHistory[i] - mean) * w;
  }

  // Compute power spectrum
  const psd = computePSD(windowed, fftLen);

  // Check for 50Hz alias signature (~10Hz at 30fps)
  const bin10Hz = Math.round((10 * fftLen) / fs);
  const bin5Hz = Math.round((5 * fftLen) / fs);

  // Compute mean noise floor
  const halfN = fftLen / 2;
  let noiseFloor = 0;
  for (let i = 1; i < halfN; i++) noiseFloor += psd[i];
  noiseFloor /= halfN;

  // Check for strong peak at ~10Hz (50Hz flicker alias)
  if (bin10Hz > 0 && bin10Hz < halfN) {
    const peakPower = Math.max(
      psd[Math.max(1, bin10Hz - 1)],
      psd[bin10Hz],
      psd[Math.min(halfN - 1, bin10Hz + 1)]
    );
    if (peakPower > noiseFloor * 8) return 50;
  }

  // Check for 60Hz signature (~5Hz beat with frame rate harmonics)
  if (bin5Hz > 0 && bin5Hz < halfN) {
    const peakPower = Math.max(
      psd[Math.max(1, bin5Hz - 1)],
      psd[bin5Hz],
      psd[Math.min(halfN - 1, bin5Hz + 1)]
    );
    if (peakPower > noiseFloor * 8) return 60;
  }

  return null;
}

/** Simple radix-2 FFT power spectrum (magnitude squared). */
function computePSD(input: number[], N: number): number[] {
  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    real[bitReverse(i, N)] = input[i];
  }

  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < half; j++) {
        const wr = Math.cos(angle * j);
        const wi = Math.sin(angle * j);
        const tr = real[i + j + half] * wr - imag[i + j + half] * wi;
        const ti = real[i + j + half] * wi + imag[i + j + half] * wr;
        real[i + j + half] = real[i + j] - tr;
        imag[i + j + half] = imag[i + j] - ti;
        real[i + j] += tr;
        imag[i + j] += ti;
      }
    }
  }

  const psd = new Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    psd[i] = real[i] * real[i] + imag[i] * imag[i];
  }
  return psd;
}

function bitReverse(x: number, N: number): number {
  const bits = Math.log2(N);
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Per-Frame Quality Scoring
// ---------------------------------------------------------------------------

const QUALITY_THRESHOLD = 0.4;

/**
 * Compute a composite quality score for a single frame.
 *
 * Factors:
 *   - Brightness: ideal range 60-200 (penalize too dark or too bright)
 *   - Sharpness: Laplacian variance proxy on the face ROI
 *   - Face detection confidence
 *   - AGC stability (penalize frames with large AGC jumps)
 */
export function computeFrameQuality(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  faceBbox: [number, number, number, number] | null,
  faceConfidence: number,
  agcDelta: number
): FrameQualityScore {
  // Brightness from face ROI
  let brightness = 128;
  let sharpness = 0;

  if (faceBbox) {
    const [bx, by, bw, bh] = faceBbox;
    const x0 = Math.max(0, Math.round(bx));
    const y0 = Math.max(0, Math.round(by));
    const x1 = Math.min(width - 1, Math.round(bx + bw));
    const y1 = Math.min(height - 1, Math.round(by + bh));

    // Sample every 4th pixel for speed
    let lumSum = 0, lumCount = 0;
    let lapSum = 0, lapCount = 0;

    for (let y = y0; y <= y1; y += 4) {
      for (let x = x0; x <= x1; x += 4) {
        const off = (y * width + x) * 4;
        const lum = 0.2126 * imageData[off] + 0.7152 * imageData[off + 1] + 0.0722 * imageData[off + 2];
        lumSum += lum;
        lumCount++;

        // Laplacian variance: compare to neighbors for sharpness
        if (x > x0 + 4 && x < x1 - 4 && y > y0 + 4 && y < y1 - 4) {
          const offUp = ((y - 4) * width + x) * 4;
          const offDown = ((y + 4) * width + x) * 4;
          const offLeft = (y * width + (x - 4)) * 4;
          const offRight = (y * width + (x + 4)) * 4;
          const lumUp = 0.2126 * imageData[offUp] + 0.7152 * imageData[offUp + 1] + 0.0722 * imageData[offUp + 2];
          const lumDown = 0.2126 * imageData[offDown] + 0.7152 * imageData[offDown + 1] + 0.0722 * imageData[offDown + 2];
          const lumLeft = 0.2126 * imageData[offLeft] + 0.7152 * imageData[offLeft + 1] + 0.0722 * imageData[offLeft + 2];
          const lumRight = 0.2126 * imageData[offRight] + 0.7152 * imageData[offRight + 1] + 0.0722 * imageData[offRight + 2];
          const lap = Math.abs(4 * lum - lumUp - lumDown - lumLeft - lumRight);
          lapSum += lap;
          lapCount++;
        }
      }
    }

    brightness = lumCount > 0 ? lumSum / lumCount : 128;
    sharpness = lapCount > 0 ? lapSum / lapCount : 0;
  }

  // Brightness score: ideal range 60-200
  let brightnessScore: number;
  if (brightness >= 60 && brightness <= 200) {
    brightnessScore = 1.0;
  } else if (brightness < 60) {
    brightnessScore = Math.max(0, brightness / 60);
  } else {
    brightnessScore = Math.max(0, 1 - (brightness - 200) / 55);
  }

  // Sharpness score: normalize (typical Laplacian variance range is 0-50)
  const sharpnessScore = Math.min(1, sharpness / 30);

  // AGC stability score
  const agcScore = 1 - Math.min(1, agcDelta / 0.15);

  // Composite
  const overallScore =
    0.25 * brightnessScore +
    0.20 * sharpnessScore +
    0.35 * faceConfidence +
    0.20 * agcScore;

  return {
    brightness,
    brightnessScore,
    sharpness,
    sharpnessScore,
    faceConfidence,
    agcDelta,
    overallScore,
    accepted: overallScore >= QUALITY_THRESHOLD,
  };
}
