"use client";

import { useRouter } from "next/navigation";
import { useVitals } from "@/context/VitalsContext";
import FedoScoreHero from "@/components/results/FedoScoreHero";
import DomainScores from "@/components/results/DomainScores";
import VitalCard from "@/components/results/VitalCard";
import WellnessBanner from "@/components/results/WellnessBanner";
import AutonomicPanel from "@/components/results/AutonomicPanel";
import HemoglobinPanel from "@/components/results/HemoglobinPanel";
import AccuracyTable from "@/components/results/AccuracyTable";
import Card from "@/components/ui/Card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import WaveformChart from "@/components/ui/WaveformChart";
import PSDChart from "@/components/ui/PSDChart";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Helper: confidence → status
// ---------------------------------------------------------------------------
function confStatus(c: string): "good" | "fair" | "warning" {
  if (c === "high" || c === "good") return "good";
  if (c === "medium" || c === "fair") return "fair";
  return "warning";
}

function bpStatus(cat: string): "good" | "fair" | "warning" {
  if (cat === "normal") return "good";
  if (cat === "elevated") return "fair";
  return "warning";
}

function stressStatus(level: string): "good" | "fair" | "warning" {
  if (level === "low") return "good";
  if (level === "moderate") return "fair";
  return "warning";
}

export default function ResultsPage() {
  const router = useRouter();
  const { results, recordDuration, clearAll, scanTimestamp } = useVitals();

  // Redirect if no results
  if (!results) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const v = results.vitals;
  const waveSlice = results.waveform?.slice(0, 60) ?? [];

  function handleScanAgain() {
    clearAll();
    router.push("/scan");
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display text-xl font-bold text-cream-800">
            Your Health Report
          </h1>
          {scanTimestamp && (
            <p className="text-cream-400 text-xs">
              {scanTimestamp.toLocaleDateString()} at{" "}
              {scanTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={handleScanAgain}>
          Scan Again
        </Button>
      </div>

      {/* Fedo Score Hero */}
      <FedoScoreHero
        score={results.fedo_score}
        biologicalAge={results.biological_age}
        chronologicalAge={results.chronological_age}
        bioAgeGap={results.bio_age_gap}
        improvementTip={results.improvement.top_intervention}
      />

      {/* Domain Scores */}
      <DomainScores domains={results.domain_scores} />

      {/* Primary Vitals (2x2) */}
      <div className="grid grid-cols-2 gap-3">
        <VitalCard
          label="Heart Rate"
          value={v.heart_rate.bpm}
          unit="BPM"
          icon="heart"
          status={confStatus(v.heart_rate.confidence)}
          statusLabel={v.heart_rate.confidence}
          sparklineData={waveSlice}
          delay={3}
        />
        <VitalCard
          label="SpO2"
          value={v.spo2.percent}
          unit="%"
          icon="lungs"
          status={confStatus(v.spo2.confidence)}
          statusLabel={v.spo2.confidence}
          decimals={1}
          delay={4}
        />
        <VitalCard
          label="Blood Pressure"
          value={v.blood_pressure.systolic}
          unit={`/${v.blood_pressure.diastolic} mmHg`}
          icon="bp"
          status={bpStatus(v.blood_pressure.category)}
          statusLabel={v.blood_pressure.category}
          delay={5}
        />
        <VitalCard
          label="Glucose"
          value={v.glucose.mgdl}
          unit="mg/dL"
          icon="glucose"
          status={confStatus(v.glucose.confidence)}
          statusLabel={v.glucose.confidence}
          sub={`${v.glucose.mmol.toFixed(1)} mmol/L`}
          delay={6}
        />
      </div>

      {/* Secondary Vitals (3-col) */}
      <div className="grid grid-cols-3 gap-3">
        <VitalCard
          label="Respiratory"
          value={v.respiratory_rate.bpm}
          unit="br/min"
          icon="breath"
          status={v.respiratory_rate.bpm <= 20 ? "good" : v.respiratory_rate.bpm <= 24 ? "fair" : "warning"}
          delay={7}
        />
        <VitalCard
          label="Stress"
          value={v.stress.index}
          unit="/100"
          icon="stress"
          status={stressStatus(v.stress.level)}
          delay={8}
        />
        <VitalCard
          label="HRV"
          value={v.hrv.rmssd}
          unit="ms"
          icon="wave"
          status={v.hrv.reliable ? (v.hrv.rmssd >= 30 ? "good" : "fair") : "warning"}
          statusLabel={v.hrv.reliable ? undefined : "low IBIs"}
          delay={9}
        />
      </div>

      {/* HRV + Signal Detail Mini Cards */}
      <div className="grid grid-cols-3 gap-2 opacity-0 animate-fade-up anim-delay-500" style={{ animationFillMode: "forwards" } as any}>
        {[
          { label: "SDNN", value: `${Math.round(v.hrv.sdnn)} ms` },
          { label: "pNN50", value: `${v.hrv.pnn50.toFixed(1)}%` },
          { label: "LF/HF", value: v.stress.lf_hf_ratio.toFixed(2) },
          { label: "Algorithm", value: results.algorithm_used },
          { label: "Perfusion", value: `${(results.signal_quality.perfusion_index * 100).toFixed(2)}%` },
          { label: "Signal", value: results.signal_quality.quality },
        ].map((m) => (
          <div key={m.label} className="text-center p-2 bg-cream-50 rounded-xl">
            <span className="text-cream-400 text-[10px] block">{m.label}</span>
            <span className="font-display font-semibold text-xs text-cream-700">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Wellness Banner */}
      <WellnessBanner
        stressIndex={v.stress.index}
        stressLevel={v.stress.level}
        recoveryScore={Math.round(v.autonomic.recovery)}
      />

      {/* Autonomic Panel */}
      <AutonomicPanel data={v.autonomic} />

      {/* Hemoglobin + Smoker */}
      <HemoglobinPanel hemoglobin={v.hemoglobin} smoker={v.smoker} />

      {/* Vitals Impact Note */}
      {results.vitals_impact.score_adjustment !== 0 && (
        <Card variant="glass" className="p-4 opacity-0 animate-fade-up anim-delay-700" style={{ animationFillMode: "forwards" } as any}>
          <p className="text-cream-500 text-xs">
            <span className="font-semibold text-warm-600">Vitals Impact:</span>{" "}
            {results.vitals_impact.note}
          </p>
          <p className="text-cream-400 text-[10px] mt-1">
            Score adjustment: {results.vitals_impact.score_adjustment} pts |
            Affected: {results.vitals_impact.affected_diseases.join(", ")}
          </p>
        </Card>
      )}

      {/* Waveform */}
      {results.waveform && results.waveform.length > 10 && (
        <Card variant="elevated" className="p-4 opacity-0 animate-fade-up anim-delay-800" style={{ animationFillMode: "forwards" } as any}>
          <h3 className="font-display font-semibold text-cream-800 text-sm mb-2">
            rPPG Waveform
          </h3>
          <WaveformChart data={results.waveform} height={140} />
        </Card>
      )}

      {/* PSD */}
      {results.psd && results.psd.length > 10 && (
        <Card variant="elevated" className="p-4 opacity-0 animate-fade-up anim-delay-800" style={{ animationFillMode: "forwards" } as any}>
          <h3 className="font-display font-semibold text-cream-800 text-sm mb-2">
            Power Spectrum
          </h3>
          <PSDChart
            psd={results.psd}
            peakBpm={v.heart_rate.bpm}
            height={140}
          />
        </Card>
      )}

      {/* Accuracy Table */}
      <AccuracyTable currentDuration={recordDuration} />

      {/* Processing Time */}
      <p className="text-cream-300 text-[10px] text-center">
        Processed in {results.processing_time_ms}ms
      </p>

      {/* Disclaimer */}
      <Card variant="glass" className="p-4 opacity-0 animate-fade-up anim-delay-800" style={{ animationFillMode: "forwards" } as any}>
        <p className="text-cream-400 text-[10px] leading-relaxed">
          FedoScore uses camera-based photoplethysmography (rPPG) to estimate vital signs.
          This is not a medical device. Blood pressure and glucose estimates are experimental
          and should not be used for clinical decisions. Accuracy depends on lighting, skin tone,
          motion, and recording duration. Consult a healthcare professional for medical advice.
        </p>
      </Card>

      {/* Bottom CTA */}
      <div className="pb-8">
        <Button onClick={handleScanAgain} variant="outline" fullWidth className="rounded-full">
          Start New Scan
        </Button>
      </div>
    </main>
  );
}
