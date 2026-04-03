"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVitals } from "@/context/VitalsContext";
import { useCamera } from "@/hooks/useCamera";
import { useFaceDetector } from "@/hooks/useFaceDetector";
import { useRecording, RECORD_DURATIONS, type RecordingResult } from "@/hooks/useRecording";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

export default function ScanPage() {
  const router = useRouter();
  const { setRawScanData, recordDuration, setRecordDuration } = useVitals();
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const { videoRef, hiddenCanvasRef, cameraReady, error: cameraError } = useCamera();
  const { detectorRef } = useFaceDetector();

  const onRecordingComplete = useCallback(
    (result: RecordingResult) => {
      setRawScanData({
        samples: result.samples,
        fps: result.fps,
        durationSeconds: result.durationSeconds,
        snapshot: result.snapshot,
        metadata: result.metadata,
      });
      // Small delay so user sees "processing" state, then navigate
      setTimeout(() => router.push("/assessment"), 800);
    },
    [setRawScanData, router]
  );

  const {
    appState,
    recordSeconds,
    setRecordSeconds,
    countdown,
    recordProgress,
    faceDetected,
    motionLevel,
    signalBadge,
    startMeasurement,
    reset,
  } = useRecording({
    videoRef,
    hiddenCanvasRef,
    overlayRef,
    detectorRef,
    cameraReady,
    onRecordingComplete,
  });

  // Sync duration with context
  const handleDurationChange = (s: number) => {
    setRecordSeconds(s);
    setRecordDuration(s);
  };

  return (
    <>
      {/* MediaPipe CDN script */}
      <script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        crossOrigin="anonymous"
        async
      />

      <main className="min-h-screen flex flex-col items-center px-4 py-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-cream-400 text-sm hover:text-cream-600 transition-colors"
          >
            &larr; Back
          </button>
          <h1 className="font-display font-bold text-lg text-cream-800">
            Health Scan
          </h1>
          <div className="w-12" /> {/* spacer */}
        </div>

        {/* Camera Card */}
        <div className="relative w-full rounded-[24px] overflow-hidden glass-elevated shadow-lg aspect-[4/3]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
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

          {/* Status Badges (top-left) */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge status={faceDetected ? "good" : "warning"}>
              {faceDetected ? "Face Detected" : "No Face"}
            </Badge>
            {appState === "recording" && (
              <Badge
                status={
                  motionLevel === "none"
                    ? "good"
                    : motionLevel === "mild"
                      ? "fair"
                      : "warning"
                }
              >
                Motion: {motionLevel}
              </Badge>
            )}
          </div>

          {/* Signal Quality Badge (top-right) */}
          {appState === "recording" && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="rec-dot" />
              <Badge
                status={
                  signalBadge === "good"
                    ? "good"
                    : signalBadge === "fair"
                      ? "fair"
                      : "warning"
                }
              >
                Signal: {signalBadge}
              </Badge>
            </div>
          )}

          {/* Countdown Overlay */}
          {appState === "countdown" && (
            <div className="absolute inset-0 bg-warm-50/80 backdrop-blur-md flex flex-col items-center justify-center">
              <span className="font-display text-7xl font-bold text-warm-500 animate-breathe">
                {countdown}
              </span>
              <p className="text-cream-500 text-sm mt-4">
                Hold still and breathe naturally
              </p>
            </div>
          )}

          {/* Processing Overlay */}
          {appState === "processing" && (
            <div className="absolute inset-0 bg-warm-50/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
              {/* Expanding rings */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-warm-300 animate-pulse-ring" />
                <div className="absolute inset-2 rounded-full border-2 border-warm-400 animate-pulse-ring anim-delay-300" />
                <div className="absolute inset-4 rounded-full border-2 border-warm-500 animate-pulse-ring anim-delay-600" />
              </div>
              <p className="shimmer-text font-display font-semibold text-lg">
                Analyzing your health data...
              </p>
            </div>
          )}

          {/* Recording Progress Bar */}
          {appState === "recording" && (
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <ProgressBar value={recordProgress} />
              <p className="text-center text-xs text-cream-500 mt-1">
                {Math.max(0, Math.ceil(recordSeconds * (1 - recordProgress)))}s
                remaining
              </p>
            </div>
          )}
        </div>

        {/* Camera Error */}
        {cameraError && (
          <p className="text-health-warning text-sm mt-4 text-center">
            {cameraError}
          </p>
        )}

        {/* Duration Selector */}
        {(appState === "idle" || appState === "result") && (
          <div className="flex gap-2 mt-6 animate-fade-up">
            {RECORD_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => handleDurationChange(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  recordSeconds === d
                    ? "bg-warm-400 text-white shadow-md"
                    : "bg-cream-100 text-cream-500 hover:bg-cream-200"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        )}

        {/* Start / Scan Again Button */}
        {(appState === "idle" || appState === "result") && (
          <div className="mt-6 w-full animate-fade-up">
            <Button
              onClick={startMeasurement}
              fullWidth
              disabled={!cameraReady}
              className="py-4 rounded-full"
            >
              {appState === "result" ? "Scan Again" : "Start Scan"}
            </Button>
            {!faceDetected && cameraReady && (
              <p className="text-cream-400 text-xs text-center mt-2">
                Position your face in the camera to begin
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        {appState === "idle" && (
          <div className="mt-6 text-center animate-fade-up anim-delay-300 opacity-0" style={{ animationFillMode: "forwards" } as any}>
            <p className="text-cream-500 text-sm">
              Keep your face centered, stay still, and breathe naturally during the scan.
            </p>
            <p className="text-cream-400 text-xs mt-2">
              Longer scans produce more accurate results.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
