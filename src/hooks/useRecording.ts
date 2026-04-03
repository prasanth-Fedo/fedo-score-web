"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RGBSample, SnapshotData } from "@/lib/types";
import type { FaceDetector, FaceROI } from "@/lib/face-detector";
import { initAGCState, compensateAGC, computeFrameQuality } from "@/lib/frame-quality";
import type { AGCState } from "@/lib/frame-quality";
import { initMotionState, computeMotionScore } from "@/lib/motion-filter";
import type { MotionState } from "@/lib/motion-filter";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const RECORD_DURATIONS = [12, 30, 60, 120] as const;
const DEFAULT_RECORD_SECONDS = 30;
const COUNTDOWN_SECONDS = 3;

export type AppState = "idle" | "countdown" | "recording" | "processing" | "result";
export type MotionLevel = "none" | "mild" | "severe";

export interface RecordingResult {
  samples: RGBSample[];
  fps: number;
  durationSeconds: number;
  snapshot: SnapshotData | null;
  metadata: {
    recordingQuality: number;
    motionScoreMean: number;
    framesAccepted: number;
    framesRejected: number;
  };
}

interface UseRecordingParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  overlayRef: React.RefObject<HTMLCanvasElement | null>;
  detectorRef: React.RefObject<FaceDetector | null>;
  cameraReady: boolean;
  onRecordingComplete: (result: RecordingResult) => void;
}

export function useRecording({
  videoRef,
  hiddenCanvasRef,
  overlayRef,
  detectorRef,
  cameraReady,
  onRecordingComplete,
}: UseRecordingParams) {
  const [appState, setAppState] = useState<AppState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(DEFAULT_RECORD_SECONDS);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [recordProgress, setRecordProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [motionLevel, setMotionLevel] = useState<MotionLevel>("none");
  const [signalBadge, setSignalBadge] = useState<"good" | "fair" | "poor">("good");

  const samplesRef = useRef<RGBSample[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const snapshotRef = useRef<SnapshotData | null>(null);
  const snapshotTakenRef = useRef(false);

  const agcStateRef = useRef<AGCState>(initAGCState());
  const motionStateRef = useRef<MotionState>(initMotionState());
  const motionScoresRef = useRef<number[]>([]);
  const frameQualityEmaRef = useRef(1.0);
  const framesAcceptedRef = useRef(0);
  const framesRejectedRef = useRef(0);

  // Stable ref to onRecordingComplete so it doesn't trigger re-renders
  const onCompleteRef = useRef(onRecordingComplete);
  onCompleteRef.current = onRecordingComplete;

  // Stable ref to appState for the main loop
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  const recordSecondsRef = useRef(recordSeconds);
  recordSecondsRef.current = recordSeconds;

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
        // Landmarks
        ctx.fillStyle = "rgba(251, 146, 60, 0.35)"; // warm-400
        for (const lm of roi.landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * overlay.width, lm.y * overlay.height, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Bounding box
        const [bx, by, bw, bh] = roi.bbox;
        ctx.strokeStyle = appStateRef.current === "recording" ? "#ef4444" : "#FB923C";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
      }
    },
    [overlayRef, videoRef]
  );

  const finishRecording = useCallback(() => {
    const samples = samplesRef.current;
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const actualFps = samples.length / elapsed;
    const motionMean =
      motionScoresRef.current.length > 0
        ? motionScoresRef.current.reduce((a, b) => a + b, 0) / motionScoresRef.current.length
        : 0;

    setAppState("processing");

    onCompleteRef.current({
      samples,
      fps: actualFps,
      durationSeconds: elapsed,
      snapshot: snapshotRef.current,
      metadata: {
        recordingQuality: frameQualityEmaRef.current,
        motionScoreMean: motionMean,
        framesAccepted: framesAcceptedRef.current,
        framesRejected: framesRejectedRef.current,
      },
    });
  }, []);

  // Main detection + recording loop
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

        if (roi) {
          // AGC Compensation
          const agcResult = compensateAGC(roi.rgb, agcStateRef.current);
          agcStateRef.current = agcResult.state;
          const correctedRGB = agcResult.corrected;

          // Motion Scoring
          const motionResult = computeMotionScore(correctedRGB, motionStateRef.current);
          motionStateRef.current = motionResult.state;
          setMotionLevel(motionResult.result.warningLevel);
        }

        if (appStateRef.current === "recording" && roi) {
          const elapsed = (now - startTimeRef.current) / 1000;

          // AGC-corrected RGB
          const agcResult = compensateAGC(roi.rgb, agcStateRef.current);
          const correctedRGB = { ...agcResult.corrected, timestamp: roi.rgb.timestamp };

          // Frame Quality Gate
          const quality = computeFrameQuality(
            hidden
              .getContext("2d", { willReadFrequently: true })!
              .getImageData(0, 0, hidden.width, hidden.height).data,
            hidden.width,
            hidden.height,
            roi.bbox,
            roi.faceConfidence,
            agcResult.agcDelta
          );

          // Motion Check
          const motionResult = computeMotionScore(correctedRGB, motionStateRef.current);
          motionStateRef.current = motionResult.state;

          // Signal quality badge (EMA)
          frameQualityEmaRef.current =
            0.9 * frameQualityEmaRef.current + 0.1 * quality.overallScore;
          const qEma = frameQualityEmaRef.current;
          setSignalBadge(qEma > 0.7 ? "good" : qEma > 0.5 ? "fair" : "poor");

          // Push sample if quality passes
          if (quality.accepted && !motionResult.result.isCorrupted) {
            samplesRef.current.push(correctedRGB);
            motionScoresRef.current.push(motionResult.result.score);
            framesAcceptedRef.current++;
          } else {
            framesRejectedRef.current++;
          }

          setRecordProgress(Math.min(elapsed / recordSecondsRef.current, 1));

          // Capture snapshot at midpoint
          if (
            !snapshotTakenRef.current &&
            elapsed >= recordSecondsRef.current / 2 &&
            roi.landmarks.length > 0
          ) {
            const ctx = hidden.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              const imgData = ctx.getImageData(0, 0, hidden.width, hidden.height);
              snapshotRef.current = { imageData: imgData, landmarks: [...roi.landmarks] };
              snapshotTakenRef.current = true;
            }
          }

          if (elapsed >= recordSecondsRef.current) {
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
  }, [cameraReady, drawOverlay, finishRecording]);

  // Countdown timer
  useEffect(() => {
    if (appState !== "countdown") return;
    if (countdown <= 0) {
      samplesRef.current = [];
      startTimeRef.current = performance.now();
      setAppState("recording");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [appState, countdown]);

  const startMeasurement = useCallback(() => {
    snapshotRef.current = null;
    snapshotTakenRef.current = false;
    setCountdown(COUNTDOWN_SECONDS);
    setRecordProgress(0);
    // Reset robustness state
    agcStateRef.current = initAGCState();
    motionStateRef.current = initMotionState();
    motionScoresRef.current = [];
    framesAcceptedRef.current = 0;
    framesRejectedRef.current = 0;
    frameQualityEmaRef.current = 1.0;
    setSignalBadge("good");
    setAppState("countdown");
  }, []);

  const reset = useCallback(() => {
    setAppState("idle");
  }, []);

  const setProcessingDone = useCallback(() => {
    setAppState("result");
  }, []);

  return {
    appState,
    setAppState,
    recordSeconds,
    setRecordSeconds,
    countdown,
    recordProgress,
    faceDetected,
    motionLevel,
    signalBadge,
    startMeasurement,
    reset,
    setProcessingDone,
  };
}
