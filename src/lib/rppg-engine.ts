/**
 * Client-side rPPG signal processing engine.
 *
 * Implements the POS (Plane-Orthogonal-to-Skin) algorithm for heart rate
 * estimation from face RGB traces, plus bandpass filtering and FFT-based
 * peak detection.  Runs entirely in the browser — no server required.
 *
 * Reference: Wang et al. "Algorithmic Principles of Remote PPG" (2017)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RGBSample {
  r: number;
  g: number;
  b: number;
  timestamp: number; // ms since start
}

export interface HRResult {
  bpm: number;
  confidence: "high" | "medium" | "low";
  snr: number;
  waveform: number[];     // filtered rPPG signal
  psd: number[];          // power spectral density
  freqsBpm: number[];     // frequency axis in BPM
  waveformTimes: number[]; // time axis in seconds
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FS = 30;                // target sampling rate (Hz)
const BANDPASS_LOW = 0.65;    // 39 BPM
const BANDPASS_HIGH = 3.0;    // 180 BPM
const FILTER_ORDER = 2;

// ---------------------------------------------------------------------------
// POS algorithm
// ---------------------------------------------------------------------------

/**
 * Extract rPPG pulse signal from face RGB time-series using POS method.
 *
 * The POS algorithm projects the normalized RGB signals onto a plane
 * orthogonal to the skin-tone direction, isolating the blood volume
 * pulse from motion / illumination artefacts.
 */
export function posAlgorithm(samples: RGBSample[]): number[] {
  const N = samples.length;
  if (N < 32) return new Array(N).fill(0);

  // Temporal normalization window (1.6 seconds ≈ 48 frames at 30 fps)
  const winLen = Math.min(Math.round(1.6 * FS), N);

  const H = new Float64Array(N);

  for (let start = 0; start <= N - winLen; start++) {
    // Compute mean RGB in window
    let mR = 0, mG = 0, mB = 0;
    for (let j = start; j < start + winLen; j++) {
      mR += samples[j].r;
      mG += samples[j].g;
      mB += samples[j].b;
    }
    mR /= winLen;
    mG /= winLen;
    mB /= winLen;

    if (mR < 1 || mG < 1 || mB < 1) continue;

    // Temporal normalization: Cn(t) = C(t) / mean(C)
    const S = new Float64Array(winLen);
    for (let j = 0; j < winLen; j++) {
      const rn = samples[start + j].r / mR;
      const gn = samples[start + j].g / mG;
      const bn = samples[start + j].b / mB;

      // POS projection:  S1 = Gn - Bn,  S2 = Gn + Bn - 2*Rn
      const s1 = gn - bn;
      const s2 = gn + bn - 2 * rn;

      // Combine: P = S1 + alpha * S2  where alpha = std(S1) / std(S2)
      S[j] = s1; // will adjust after computing std
    }

    // Compute S1 and S2 arrays for std ratio
    const S1 = new Float64Array(winLen);
    const S2 = new Float64Array(winLen);
    for (let j = 0; j < winLen; j++) {
      const rn = samples[start + j].r / mR;
      const gn = samples[start + j].g / mG;
      const bn = samples[start + j].b / mB;
      S1[j] = gn - bn;
      S2[j] = gn + bn - 2 * rn;
    }

    const std1 = std(S1);
    const std2 = std(S2);
    const alpha = std2 > 1e-10 ? std1 / std2 : 1.0;

    // Overlap-add the windowed pulse
    for (let j = 0; j < winLen; j++) {
      H[start + j] += S1[j] + alpha * S2[j];
    }
  }

  return Array.from(H);
}

// ---------------------------------------------------------------------------
// Signal processing utilities
// ---------------------------------------------------------------------------

function std(arr: Float64Array): number {
  const n = arr.length;
  if (n < 2) return 0;
  let sum = 0, sum2 = 0;
  for (let i = 0; i < n; i++) {
    sum += arr[i];
    sum2 += arr[i] * arr[i];
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
}

/** Resample signal to target length using linear interpolation. */
export function resample(signal: number[], targetLen: number): number[] {
  const n = signal.length;
  if (n === targetLen) return signal;
  const out = new Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    const srcIdx = (i / (targetLen - 1)) * (n - 1);
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, n - 1);
    const frac = srcIdx - lo;
    out[i] = signal[lo] * (1 - frac) + signal[hi] * frac;
  }
  return out;
}

/**
 * 2nd-order Butterworth bandpass filter (forward-backward for zero phase).
 */
export function butterworthBandpass(
  sig: number[],
  lowHz: number,
  highHz: number,
  fs: number
): number[] {
  // Design 2nd-order Butterworth via bilinear transform
  const nyq = fs / 2;
  const wl = Math.tan((Math.PI * lowHz) / fs);
  const wh = Math.tan((Math.PI * highHz) / fs);

  // Use cascaded biquad sections for numerical stability
  // For a simple 2nd-order bandpass, one biquad section suffices
  const bw = wh - wl;
  const w0 = Math.sqrt(wl * wh);
  const Q = w0 / bw;

  // Digital biquad coefficients (BPF via bilinear transform)
  const w0d = 2 * Math.atan(w0); // pre-warped center freq
  const alpha = Math.sin(w0d) / (2 * Q);
  const cosw0 = Math.cos(w0d);

  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  // Normalize
  const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0;
  const na1 = a1 / a0, na2 = a2 / a0;

  // Forward pass
  const fwd = applyBiquad(sig, nb0, nb1, nb2, na1, na2);
  // Backward pass (reverse, filter, reverse)
  fwd.reverse();
  const result = applyBiquad(fwd, nb0, nb1, nb2, na1, na2);
  result.reverse();

  return result;
}

function applyBiquad(
  x: number[],
  b0: number, b1: number, b2: number,
  a1: number, a2: number
): number[] {
  const n = x.length;
  const y = new Array(n).fill(0);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    y[i] = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i];
    y2 = y1; y1 = y[i];
  }
  return y;
}

/**
 * FFT-based heart rate estimation.
 *
 * Computes the power spectrum via radix-2 FFT, windows with Hann,
 * finds the dominant peak in the valid HR band (40–180 BPM).
 */
export function estimateHeartRate(
  signal: number[],
  fs: number
): { bpm: number; snr: number; psd: number[]; freqsBpm: number[] } {
  // Zero-pad to next power of 2
  let N = 1;
  while (N < signal.length) N <<= 1;
  N = Math.max(N, 256); // minimum FFT size

  // Apply Hann window
  const windowed = new Array(N).fill(0);
  for (let i = 0; i < signal.length; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (signal.length - 1)));
    windowed[i] = signal[i] * w;
  }

  // FFT
  const { real, imag } = fft(windowed);

  // Power spectral density (one-sided)
  const halfN = N / 2 + 1;
  const psd = new Array(halfN);
  const freqsHz = new Array(halfN);
  const freqsBpm = new Array(halfN);
  for (let i = 0; i < halfN; i++) {
    psd[i] = real[i] * real[i] + imag[i] * imag[i];
    freqsHz[i] = (i * fs) / N;
    freqsBpm[i] = freqsHz[i] * 60;
  }

  // Find peak in valid HR band
  const lowBin = Math.ceil((BANDPASS_LOW * N) / fs);
  const highBin = Math.floor((BANDPASS_HIGH * N) / fs);

  let peakIdx = lowBin;
  let peakVal = -1;
  for (let i = lowBin; i <= Math.min(highBin, halfN - 1); i++) {
    if (psd[i] > peakVal) {
      peakVal = psd[i];
      peakIdx = i;
    }
  }

  // Parabolic interpolation for sub-bin accuracy
  let peakFreqHz = freqsHz[peakIdx];
  if (peakIdx > lowBin && peakIdx < highBin) {
    const a = psd[peakIdx - 1];
    const b = psd[peakIdx];
    const c = psd[peakIdx + 1];
    const denom = 2 * (2 * b - a - c);
    if (Math.abs(denom) > 1e-10) {
      const delta = (a - c) / denom;
      peakFreqHz = freqsHz[peakIdx] + delta * (fs / N);
    }
  }

  // Harmonics check: if peak is ~2x a strong sub-peak, prefer the fundamental
  let bpm = peakFreqHz * 60;
  const halfBpm = bpm / 2;
  const halfBin = Math.round((halfBpm / 60) * N / fs);
  if (
    halfBin >= lowBin && halfBin <= highBin &&
    psd[halfBin] > 0.3 * peakVal &&
    Math.abs(freqsBpm[halfBin] * 2 - bpm) < 10
  ) {
    bpm = freqsBpm[halfBin];
  }

  // SNR: signal power around peak (±5 BPM) vs rest
  const peakBpmLow = bpm - 5;
  const peakBpmHigh = bpm + 5;
  let sigPower = 0, noisePower = 0;
  for (let i = lowBin; i <= Math.min(highBin, halfN - 1); i++) {
    if (freqsBpm[i] >= peakBpmLow && freqsBpm[i] <= peakBpmHigh) {
      sigPower += psd[i];
    } else {
      noisePower += psd[i];
    }
  }
  const snr = 10 * Math.log10((sigPower + 1e-10) / (noisePower + 1e-10));

  return { bpm, snr, psd, freqsBpm };
}

// ---------------------------------------------------------------------------
// Radix-2 FFT (in-place, Cooley-Tukey)
// ---------------------------------------------------------------------------

function fft(input: number[]): { real: number[]; imag: number[] } {
  const N = input.length;
  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  // Bit-reversal permutation
  for (let i = 0; i < N; i++) {
    real[bitReverse(i, N)] = input[i];
  }

  // Butterfly stages
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

  return { real: Array.from(real), imag: Array.from(imag) };
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
// Full pipeline
// ---------------------------------------------------------------------------

/**
 * Run the complete rPPG pipeline on collected RGB samples.
 *
 * 1. Resample to 30 fps (if actual fps differs)
 * 2. POS algorithm → raw rPPG signal
 * 3. Butterworth bandpass filter (0.65–3.0 Hz)
 * 4. FFT peak detection → heart rate
 * 5. SNR-based confidence scoring
 */
export function processRPPG(
  samples: RGBSample[],
  actualFps: number
): HRResult {
  if (samples.length < 60) {
    throw new Error("Need at least 2 seconds of data");
  }

  // 1. POS algorithm on raw samples
  let raw = posAlgorithm(samples);

  // 2. Resample to target FS if camera fps differs
  const targetLen = Math.round((samples.length / actualFps) * FS);
  if (Math.abs(actualFps - FS) > 1) {
    raw = resample(raw, targetLen);
  }

  // 3. Bandpass filter
  const filtered = butterworthBandpass(raw, BANDPASS_LOW, BANDPASS_HIGH, FS);

  // 4. HR estimation
  const { bpm, snr, psd, freqsBpm } = estimateHeartRate(filtered, FS);

  // 5. Confidence
  let confidence: "high" | "medium" | "low";
  if (snr >= 8) confidence = "high";
  else if (snr >= 3) confidence = "medium";
  else confidence = "low";

  // Time axis
  const waveformTimes = filtered.map((_, i) => i / FS);

  return {
    bpm,
    confidence,
    snr,
    waveform: filtered,
    psd,
    freqsBpm,
    waveformTimes,
  };
}
