"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UnifiedResult, RGBSample, SnapshotData, RecordingMetadata } from "@/lib/types";

// Raw scan data captured by the camera before API call
export interface RawScanData {
  samples: RGBSample[];
  fps: number;
  durationSeconds: number;
  snapshot: SnapshotData | null;
  metadata: RecordingMetadata;
}

// Lifestyle inputs for the questionnaire
export interface LifestyleInputs {
  age: number;
  gender: number; // 1=M, 2=F
  height: number; // meters
  weight: number; // kg
  smoker: number; // 0=never, 1=former, 2=some days, 3=daily
  exercise: number; // 0=active, 1=inactive
  drink: number; // 0=never, 1=occasional, 2=regular
  sleep_hours: number;
  family_history: number[];
  conditions: number[];
}

interface VitalsContextValue {
  // Scan data (set after camera recording)
  rawScanData: RawScanData | null;
  setRawScanData: (data: RawScanData) => void;

  // Lifestyle inputs (set after questionnaire)
  lifestyle: LifestyleInputs | null;
  setLifestyle: (data: LifestyleInputs) => void;

  // API results (set after scoring)
  results: UnifiedResult | null;
  setResults: (data: UnifiedResult) => void;

  // Recording duration preference
  recordDuration: number;
  setRecordDuration: (seconds: number) => void;

  // Scan timestamp
  scanTimestamp: Date | null;

  // Reset everything
  clearAll: () => void;
}

const VitalsContext = createContext<VitalsContextValue | null>(null);

export function VitalsProvider({ children }: { children: ReactNode }) {
  const [rawScanData, setRawScanDataState] = useState<RawScanData | null>(null);
  const [lifestyle, setLifestyleState] = useState<LifestyleInputs | null>(null);
  const [results, setResultsState] = useState<UnifiedResult | null>(null);
  const [recordDuration, setRecordDuration] = useState(30);
  const [scanTimestamp, setScanTimestamp] = useState<Date | null>(null);

  const setRawScanData = useCallback((data: RawScanData) => {
    setRawScanDataState(data);
    setScanTimestamp(new Date());
  }, []);

  const setLifestyle = useCallback((data: LifestyleInputs) => {
    setLifestyleState(data);
  }, []);

  const setResults = useCallback((data: UnifiedResult) => {
    setResultsState(data);
  }, []);

  const clearAll = useCallback(() => {
    setRawScanDataState(null);
    setLifestyleState(null);
    setResultsState(null);
    setScanTimestamp(null);
  }, []);

  return (
    <VitalsContext.Provider
      value={{
        rawScanData,
        setRawScanData,
        lifestyle,
        setLifestyle,
        results,
        setResults,
        recordDuration,
        setRecordDuration,
        scanTimestamp,
        clearAll,
      }}
    >
      {children}
    </VitalsContext.Provider>
  );
}

export function useVitals() {
  const ctx = useContext(VitalsContext);
  if (!ctx) throw new Error("useVitals must be used within VitalsProvider");
  return ctx;
}
