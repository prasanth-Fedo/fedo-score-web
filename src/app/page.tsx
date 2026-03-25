"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RGBSample, HRResult } from "@/lib/rppg-engine";
import { processRPPG } from "@/lib/rppg-engine";
import { createCanvasDetector, FaceDetector, FaceROI } from "@/lib/face-detector";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const RECORD_SECONDS = 12;
const COUNTDOWN_SECONDS = 3;
const TARGET_FPS = 30;

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
type AppState = "idle" | "countdown" | "recording" | "processing" | "result";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const samplesRef = useRef<RGBSample[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // State
  const [appState, setAppState] = useState<AppState>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [recordProgress, setRecordProgress] = useState(0);
  const [result, setResult] = useState<HRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [motionWarning, setMotionWarning] = useState(false);

  // Motion detection
  const prevRGBRef = useRef<{ r: number; g: number; b: number } | null>(null);

  // ------------------------------------------------------------------
  // Camera init
  // ------------------------------------------------------------------
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setError("Camera access denied. Please allow camera permissions and reload.");
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Init face detector
  useEffect(() => {
    detectorRef.current = createCanvasDetector();
    return () => detectorRef.current?.destroy();
  }, []);

  // ------------------------------------------------------------------
  // Preview loop (always draws face overlay when idle / countdown)
  // ------------------------------------------------------------------
  const drawOverlay = useCallback(
    (roi: FaceROI | null) => {
      const overlay = overlayRef.current;
      const video = videoRef.current;
      if (!overlay || !video) return;
      const ctx = overlay.getContext("2d")!;
      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (roi && roi.landmarks.length > 0) {
        // Draw face mesh dots
        ctx.fillStyle = "rgba(0, 255, 170, 0.35)";
        for (const lm of roi.landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * overlay.width, lm.y * overlay.height, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bounding box
        const [bx, by, bw, bh] = roi.bbox;
        ctx.strokeStyle = appState === "recording" ? "#ef4444" : "#00ffaa";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
      }
    },
    [appState]
  );

  // ------------------------------------------------------------------
  // Main capture loop
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!cameraReady) return;
    let running = true;

    function loop() {
      if (!running) return;
      const video = videoRef.current;
      const hidden = hiddenCanvasRef.current;
      const detector = detectorRef.current;

      if (video && hidden && detector) {
        const now = performance.now();
        const roi = detector.detect(video, hidden, now);
        setFaceDetected(roi !== null && roi.landmarks.length > 0);
        drawOverlay(roi);

        // Motion detection
        if (roi) {
          const prev = prevRGBRef.current;
          if (prev) {
            const diff =
              Math.abs(roi.rgb.r - prev.r) +
              Math.abs(roi.rgb.g - prev.g) +
              Math.abs(roi.rgb.b - prev.b);
            setMotionWarning(diff > 15);
          }
          prevRGBRef.current = { r: roi.rgb.r, g: roi.rgb.g, b: roi.rgb.b };
        }

        // If recording, collect samples
        if (appState === "recording" && roi) {
          const elapsed = (now - startTimeRef.current) / 1000;
          samplesRef.current.push(roi.rgb);
          frameCountRef.current++;
          setRecordProgress(Math.min(elapsed / RECORD_SECONDS, 1));

          if (elapsed >= RECORD_SECONDS) {
            running = false;
            finishRecording();
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, appState, drawOverlay]);

  // ------------------------------------------------------------------
  // Countdown
  // ------------------------------------------------------------------
  useEffect(() => {
    if (appState !== "countdown") return;
    if (countdown <= 0) {
      // Start recording
      samplesRef.current = [];
      frameCountRef.current = 0;
      startTimeRef.current = performance.now();
      setAppState("recording");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [appState, countdown]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  function startMeasurement() {
    setError(null);
    setResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setRecordProgress(0);
    setAppState("countdown");
  }

  function finishRecording() {
    setAppState("processing");
    // Run processing in a microtask to not block the UI
    setTimeout(() => {
      try {
        const samples = samplesRef.current;
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const actualFps = samples.length / elapsed;
        const hr = processRPPG(samples, actualFps);
        setResult(hr);
        setAppState("result");
      } catch (e: any) {
        setError(e.message || "Processing failed");
        setAppState("idle");
      }
    }, 50);
  }

  function reset() {
    setAppState("idle");
    setResult(null);
    setError(null);
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <>
      {/* MediaPipe CDN scripts */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        crossOrigin="anonymous"
        async
      />

      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="text-white">rPPG</span>{" "}
            <span className="text-emerald-400">Heart Rate</span>{" "}
            <span className="text-white">Monitor</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base max-w-lg mx-auto">
            Contactless heart rate measurement using remote
            photoplethysmography. No sensors — just your camera.
          </p>
        </div>

        {/* Video + Overlay */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl w-full max-w-xl aspect-[4/3]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas ref={hiddenCanvasRef} className="hidden" />

          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge color={faceDetected ? "green" : "red"}>
              {faceDetected ? "Face detected" : "No face"}
            </Badge>
            {motionWarning && appState === "recording" && (
              <Badge color="yellow">Hold still</Badge>
            )}
          </div>

          {/* Recording indicator */}
          {appState === "recording" && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-medium">REC</span>
            </div>
          )}

          {/* Countdown overlay */}
          {appState === "countdown" && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-8xl font-bold text-white animate-ping-slow">
                {countdown}
              </span>
            </div>
          )}

          {/* Processing overlay */}
          {appState === "processing" && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <Spinner />
              <span className="text-zinc-300">Analyzing heart rate...</span>
            </div>
          )}

          {/* Progress bar */}
          {appState === "recording" && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${recordProgress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {(appState === "idle" || appState === "result") && cameraReady && (
            <button
              onClick={startMeasurement}
              className="px-8 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-lg transition-colors"
            >
              {appState === "result" ? "Measure Again" : "Start Measurement"}
            </button>
          )}
          {appState === "result" && (
            <button
              onClick={reset}
              className="px-6 py-3 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-5 py-3 text-sm max-w-md">
            {error}
          </div>
        )}

        {/* Results */}
        {result && appState === "result" && <ResultsPanel result={result} />}

        {/* Footer */}
        <p className="text-zinc-600 text-xs mt-4 text-center max-w-md">
          This is a research demo — not a medical device. Uses the POS
          algorithm (Wang et al. 2017) for pulse extraction. Best results in
          even lighting while sitting still.
        </p>
      </main>

      <style jsx global>{`
        .animate-ping-slow {
          animation: ping-slow 1s ease-in-out infinite;
        }
        @keyframes ping-slow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" }) {
  const colors = {
    green: "bg-emerald-900/80 text-emerald-300 border-emerald-700",
    red: "bg-red-900/80 text-red-300 border-red-700",
    yellow: "bg-yellow-900/80 text-yellow-300 border-yellow-700",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border backdrop-blur-sm ${colors[color]}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="w-10 h-10 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ResultsPanel({ result }: { result: HRResult }) {
  const color =
    result.confidence === "high"
      ? "text-emerald-400"
      : result.confidence === "medium"
      ? "text-yellow-400"
      : "text-red-400";

  const bgColor =
    result.confidence === "high"
      ? "border-emerald-800"
      : result.confidence === "medium"
      ? "border-yellow-800"
      : "border-red-800";

  return (
    <div className={`w-full max-w-xl border ${bgColor} rounded-2xl bg-zinc-900/50 p-6 space-y-6`}>
      {/* BPM display */}
      <div className="text-center">
        <div className={`text-7xl font-bold ${color}`}>{Math.round(result.bpm)}</div>
        <div className="text-zinc-400 text-lg mt-1">BPM</div>
        <div className={`text-sm mt-2 font-medium ${color}`}>
          {result.confidence.toUpperCase()} confidence &middot; SNR {result.snr.toFixed(1)} dB
        </div>
      </div>

      {/* Waveform (canvas) */}
      <div>
        <h3 className="text-zinc-400 text-xs uppercase tracking-wider mb-2">rPPG Waveform</h3>
        <WaveformCanvas data={result.waveform} color="#34d399" />
      </div>

      {/* PSD */}
      <div>
        <h3 className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
          Power Spectrum &middot; Peak at {result.bpm.toFixed(1)} BPM
        </h3>
        <PSDCanvas
          psd={result.psd}
          freqs={result.freqsBpm}
          peakBpm={result.bpm}
        />
      </div>

      {result.confidence === "low" && (
        <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-sm text-red-300">
          <strong>Low signal quality.</strong> Try better lighting, hold still,
          and make sure your face is clearly visible.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canvas-based charts (no dependencies)
// ---------------------------------------------------------------------------

function WaveformCanvas({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (i / 4) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Waveform
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((data[i] - min) / range) * (H - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      className="w-full h-28 rounded-lg bg-zinc-950 border border-zinc-800"
    />
  );
}

function PSDCanvas({
  psd,
  freqs,
  peakBpm,
}: {
  psd: number[];
  freqs: number[];
  peakBpm: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || psd.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Only show 30–200 BPM range
    const lo = 30, hi = 200;
    const indices: number[] = [];
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= lo && freqs[i] <= hi) indices.push(i);
    }
    if (indices.length < 2) return;

    const vals = indices.map((i) => psd[i]);
    const max = Math.max(...vals) || 1;

    // Filled area
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let j = 0; j < indices.length; j++) {
      const x = (j / (indices.length - 1)) * W;
      const y = H - (vals[j] / max) * (H - 10) - 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let j = 0; j < indices.length; j++) {
      const x = (j / (indices.length - 1)) * W;
      const y = H - (vals[j] / max) * (H - 10) - 5;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Peak marker
    const peakJ = indices.findIndex(
      (i) => Math.abs(freqs[i] - peakBpm) < 1
    );
    if (peakJ >= 0) {
      const x = (peakJ / (indices.length - 1)) * W;
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#34d399";
      ctx.font = "11px sans-serif";
      ctx.fillText(`${peakBpm.toFixed(0)} BPM`, x + 4, 14);
    }
  }, [psd, freqs, peakBpm]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      className="w-full h-28 rounded-lg bg-zinc-950 border border-zinc-800"
    />
  );
}
