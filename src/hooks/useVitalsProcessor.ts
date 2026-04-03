"use client";

import { useCallback, useState } from "react";
import { scoreWithVitals } from "@/lib/api-client";
import type { UnifiedResult } from "@/lib/types";
import type { LifestyleInputs } from "@/context/VitalsContext";
import type { RecordingResult } from "./useRecording";

export function useVitalsProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processResults = useCallback(
    async (
      lifestyle: LifestyleInputs,
      recording: RecordingResult
    ): Promise<UnifiedResult | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const unified = await scoreWithVitals(
          lifestyle,
          recording.samples,
          recording.fps,
          recording.durationSeconds,
          recording.snapshot,
          {
            recordingQuality: recording.metadata.recordingQuality,
            motionScoreMean: recording.metadata.motionScoreMean,
            framesAccepted: recording.metadata.framesAccepted,
            framesRejected: recording.metadata.framesRejected,
          }
        );

        setIsProcessing(false);
        return unified;
      } catch (e: any) {
        setError(e.message || "Processing failed");
        setIsProcessing(false);
        return null;
      }
    },
    []
  );

  return { processResults, isProcessing, error };
}
