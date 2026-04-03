/**
 * Shared types for the rPPG frontend.
 *
 * These types define the data structures used between the camera capture
 * layer (browser) and the API response rendering layer (browser).
 * All processing logic lives on the server — these are just data shapes.
 */

// ---------------------------------------------------------------------------
// Camera capture types (used by face-detector, motion-filter, frame-quality)
// ---------------------------------------------------------------------------

export interface RGBSample {
  r: number;
  g: number;
  b: number;
  timestamp: number; // ms since recording start
}

export interface SnapshotData {
  imageData: ImageData;
  landmarks: Array<{ x: number; y: number }>;
}

export interface RecordingMetadata {
  recordingQuality: number;
  motionScoreMean: number;
  framesAccepted: number;
  framesRejected: number;
}

// ---------------------------------------------------------------------------
// API response types (what the server returns)
// ---------------------------------------------------------------------------

export interface HeartRateResult {
  bpm: number;
  confidence: "high" | "medium" | "low";
  snr: number;
}

export interface HRVResult {
  rmssd: number;
  sdnn: number;
  pnn50: number;
  mean_ibi: number;
  ibi_count: number;
  reliable: boolean;
}

export interface SpO2Result {
  percent: number;
  confidence: "good" | "fair" | "poor";
}

export interface BloodPressureResult {
  systolic: number;
  diastolic: number;
  category: "normal" | "elevated" | "high_s1" | "high_s2";
}

export interface RespiratoryResult {
  bpm: number;
  category: string;
}

export interface GlucoseResult {
  mgdl: number;
  mmol: number;
  category: "low" | "normal" | "prediabetic" | "diabetic";
  confidence: string;
}

export interface HemoglobinResult {
  gdl: number;
  anemia_risk: "low" | "moderate" | "high" | "unknown";
  flags: string[];
}

export interface StressResult {
  index: number;
  level: "low" | "moderate" | "high";
  baevsky_si: number;
  lf_power: number;
  hf_power: number;
  lf_hf_ratio: number;
}

export interface AutonomicResult {
  sympathetic: number;
  parasympathetic: number;
  balance: number;
  vagal_tone: number;
  cardiac_load: number;
  anxiety: number;
  sleep_quality: number;
  recovery: number;
}

export interface SmokerResult {
  prediction: string;
  probability: number;
}

export interface SignalQualityResult {
  perfusion_index: number;
  pulsatile_strength: number;
  quality: "good" | "fair" | "poor";
}

export interface VitalsData {
  heart_rate: HeartRateResult;
  hrv: HRVResult;
  spo2: SpO2Result;
  blood_pressure: BloodPressureResult;
  respiratory_rate: RespiratoryResult;
  glucose: GlucoseResult;
  hemoglobin: HemoglobinResult;
  stress: StressResult;
  autonomic: AutonomicResult;
  smoker: SmokerResult;
}

export interface VitalsImpact {
  score_adjustment: number;
  affected_diseases: string[];
  note: string;
}

export interface DomainScores {
  cardiovascular: number;
  metabolic: number;
  respiratory: number;
  organ_health: number;
  lifestyle_recovery: number;
  resilience_aging: number;
}

// The unified response from POST /api/v1/score/with-vitals
export interface UnifiedResult {
  fedo_score: number;
  biological_age: number;
  chronological_age: number;
  bio_age_gap: number;
  domain_scores: DomainScores;
  disease_probabilities: Record<string, number>;
  derived_metrics: { bmi: number; gfr: number; body_fat: number };
  vitals: VitalsData;
  vitals_impact: VitalsImpact;
  improvement: {
    current_score: number;
    achievable_score: number;
    top_intervention: { factor: string; delta: number } | null;
  };
  signal_quality: SignalQualityResult;
  algorithm_used: string;
  waveform: number[];
  psd: number[];
  processing_time_ms: number;
}

// Standalone vitals response from POST /api/v1/vitals/process
export interface VitalsOnlyResult {
  vitals: VitalsData;
  signal_quality: SignalQualityResult;
  algorithm_used: string;
  waveform: number[];
  psd: number[];
  processing_time_ms: number;
}
