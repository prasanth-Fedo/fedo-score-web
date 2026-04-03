"use client";

import { useEffect, useRef } from "react";
import { createCanvasDetector, type FaceDetector } from "@/lib/face-detector";

export function useFaceDetector() {
  const detectorRef = useRef<FaceDetector | null>(null);

  useEffect(() => {
    detectorRef.current = createCanvasDetector();
    return () => detectorRef.current?.destroy();
  }, []);

  return { detectorRef };
}
