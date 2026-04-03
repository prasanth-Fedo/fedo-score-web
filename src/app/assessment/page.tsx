"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVitals, type LifestyleInputs } from "@/context/VitalsContext";
import { useVitalsProcessor } from "@/hooks/useVitalsProcessor";
import StepIndicator from "@/components/assessment/StepIndicator";
import NumberStepper from "@/components/assessment/NumberStepper";
import RulerPicker from "@/components/assessment/RulerPicker";
import GenderPicker from "@/components/assessment/GenderPicker";
import OptionCards, { type OptionItem } from "@/components/assessment/OptionCards";
import ToggleCards, { type ToggleItem } from "@/components/assessment/ToggleCards";
import UnitToggle from "@/components/assessment/UnitToggle";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Value mappings: questionnaire → API format
// ---------------------------------------------------------------------------

// Smoking: questionnaire values → API values (0=never,1=former,2=some days,3=daily)
const SMOKING_MAP: Record<number, number> = { 0: 0, 1: 1, 3: 2, 5: 3 };
// Drinking: questionnaire values → API values (0=never,1=occasional,2=regular)
const DRINKING_MAP: Record<number, number> = { 0: 0, 1: 1, 3: 2, 5: 2 };
// Exercise: questionnaire values → API values (0=active,1=inactive)
const EXERCISE_MAP: Record<number, number> = { 0: 1, 1: 1, 3: 0, 5: 0 };

// Conditions mapping: questionnaire → API condition codes
// inhaler=0(asthma), medication=1(cholesterol)+2(BP), insulin=3(diabetes)
const CONDITION_MAP: Record<number, number[]> = {
  0: [0],     // inhaler → asthma
  1: [1, 2],  // regular medication → cholesterol + BP
  2: [3],     // insulin/injections → diabetes
};

// Family history mapping: questionnaire → API family history codes
// cardiovascular=5(CVD), congenital heart=3(CHD), respiratory=6(COPD), diabetes=2, kidney=4
const FAMILY_MAP: Record<number, number> = {
  0: 5,  // cardiovascular → CVD
  1: 3,  // congenital heart → CHD
  2: 6,  // respiratory → COPD
  3: 2,  // diabetes
  4: 4,  // kidney
};

// ---------------------------------------------------------------------------
// Step option definitions
// ---------------------------------------------------------------------------

const SMOKING_OPTIONS: OptionItem[] = [
  { label: "Never", value: 0, icon: "\uD83C\uDF3F" },
  { label: "Former", value: 1, icon: "\u23F0" },
  { label: "Weekly", value: 3, icon: "\uD83D\uDEA9" },
  { label: "Daily", value: 5, icon: "\u26A0\uFE0F" },
];

const DRINKING_OPTIONS: OptionItem[] = [
  { label: "Never", value: 0, icon: "\uD83D\uDCA7" },
  { label: "Occasionally", value: 1, icon: "\uD83C\uDF77" },
  { label: "Weekly", value: 3, icon: "\uD83C\uDF7A" },
  { label: "Daily", value: 5, icon: "\u26A0\uFE0F" },
];

const EXERCISE_OPTIONS: OptionItem[] = [
  { label: "Sedentary", value: 0, icon: "\uD83D\uDECB\uFE0F" },
  { label: "Light", value: 1, icon: "\uD83D\uDEB6" },
  { label: "Moderate", value: 3, icon: "\uD83C\uDFC3" },
  { label: "Active", value: 5, icon: "\uD83C\uDFCB\uFE0F" },
];

const CONDITION_ITEMS: ToggleItem[] = [
  { label: "I use an inhaler", value: 0, icon: "\uD83C\uDF2C\uFE0F" },
  { label: "I take regular medication", value: 1, icon: "\uD83D\uDC8A" },
  { label: "I use insulin or injections", value: 2, icon: "\uD83D\uDC89" },
];

const FAMILY_ITEMS: ToggleItem[] = [
  { label: "Cardiovascular disease", value: 0, icon: "\u2764\uFE0F" },
  { label: "Congenital heart condition", value: 1, icon: "\uD83E\uDEC0" },
  { label: "Respiratory condition", value: 2, icon: "\uD83E\uDEC1" },
  { label: "Diabetes", value: 3, icon: "\uD83E\uDE78" },
  { label: "Kidney disease", value: 4, icon: "\uD83E\uDEC5" },
];

const TOTAL_STEPS = 8;

// ---------------------------------------------------------------------------
// Assessment Page
// ---------------------------------------------------------------------------

export default function AssessmentPage() {
  const router = useRouter();
  const { rawScanData, setLifestyle, setResults } = useVitals();
  const { processResults, isProcessing, error: processingError } = useVitalsProcessor();

  const [step, setStep] = useState(0);

  // Form state (questionnaire values)
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState(1);
  const [heightCm, setHeightCm] = useState(170);
  const [heightUnit, setHeightUnit] = useState(0); // 0=cm, 1=ft'in"
  const [weightKg, setWeightKg] = useState(70);
  const [weightUnit, setWeightUnit] = useState(0); // 0=kg, 1=lbs
  const [smoking, setSmoking] = useState(0);
  const [drinking, setDrinking] = useState(0);
  const [exercise, setExercise] = useState(3);
  const [conditions, setConditions] = useState<number[]>([]);
  const [familyHistory, setFamilyHistory] = useState<number[]>([]);

  // Redirect if no scan data
  if (!rawScanData) {
    if (typeof window !== "undefined") router.replace("/scan");
    return null;
  }

  function cmToFtIn(cm: number): string {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${ft}'${inches}"`;
  }

  function kgToLbs(kg: number): string {
    return Math.round(kg * 2.205).toString();
  }

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function handleSubmit() {
    // Map questionnaire values to API format
    const mapped: LifestyleInputs = {
      age,
      gender,
      height: heightCm / 100, // cm → meters
      weight: weightKg,
      smoker: SMOKING_MAP[smoking] ?? 0,
      exercise: EXERCISE_MAP[exercise] ?? 0,
      drink: DRINKING_MAP[drinking] ?? 0,
      sleep_hours: 7, // default — could add a step for this
      family_history: familyHistory.map((v) => FAMILY_MAP[v]).filter((v) => v !== undefined),
      conditions: conditions.flatMap((v) => CONDITION_MAP[v] ?? []),
    };

    setLifestyle(mapped);

    const scan = rawScanData!;
    const result = await processResults(mapped, {
      samples: scan.samples,
      fps: scan.fps,
      durationSeconds: scan.durationSeconds,
      snapshot: scan.snapshot,
      metadata: scan.metadata,
    });

    if (result) {
      setResults(result);
      router.push("/results");
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  // ---------------------------------------------------------------------------
  // Step content renderer
  // ---------------------------------------------------------------------------

  function renderStep() {
    switch (step) {
      case 0: // Age + Gender
        return (
          <div className="space-y-8 animate-fade-up">
            <div>
              <h2 className="font-display text-2xl font-bold text-cream-800 text-center">
                Let&apos;s get to know you
              </h2>
              <p className="text-cream-400 text-sm text-center mt-1">
                Basic info helps personalize your health score
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-cream-500 block mb-3 text-center">
                  How old are you?
                </label>
                <NumberStepper value={age} onChange={setAge} min={18} max={120} unit="years" />
              </div>
              <div>
                <label className="text-sm font-medium text-cream-500 block mb-3 text-center">
                  Biological sex
                </label>
                <GenderPicker value={gender} onChange={setGender} />
              </div>
            </div>
          </div>
        );

      case 1: // Height
        return (
          <div className="space-y-8 animate-fade-up">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-cream-800">
                How tall are you?
              </h2>
              <div className="mt-3">
                <UnitToggle
                  options={["cm", "ft'in\""]}
                  value={heightUnit}
                  onChange={setHeightUnit}
                />
              </div>
            </div>
            <RulerPicker
              value={heightCm}
              onChange={setHeightCm}
              min={100}
              max={220}
              step={1}
              unit={heightUnit === 0 ? "cm" : ""}
              formatLabel={(v) => (heightUnit === 0 ? `${v}` : cmToFtIn(v))}
            />
          </div>
        );

      case 2: // Weight
        return (
          <div className="space-y-8 animate-fade-up">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-cream-800">
                What&apos;s your weight?
              </h2>
              <div className="mt-3">
                <UnitToggle
                  options={["kg", "lbs"]}
                  value={weightUnit}
                  onChange={setWeightUnit}
                />
              </div>
            </div>
            <RulerPicker
              value={weightKg}
              onChange={setWeightKg}
              min={30}
              max={200}
              step={1}
              unit={weightUnit === 0 ? "kg" : "lbs"}
              formatLabel={(v) => (weightUnit === 0 ? `${v}` : kgToLbs(v))}
            />
          </div>
        );

      case 3: // Smoking
        return (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-2xl font-bold text-cream-800 text-center">
              Do you smoke or use e-cigarettes?
            </h2>
            <OptionCards options={SMOKING_OPTIONS} selected={smoking} onChange={setSmoking} />
          </div>
        );

      case 4: // Drinking
        return (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-2xl font-bold text-cream-800 text-center">
              How often do you drink alcohol?
            </h2>
            <OptionCards options={DRINKING_OPTIONS} selected={drinking} onChange={setDrinking} />
          </div>
        );

      case 5: // Exercise
        return (
          <div className="space-y-6 animate-fade-up">
            <h2 className="font-display text-2xl font-bold text-cream-800 text-center">
              How active are you?
            </h2>
            <OptionCards options={EXERCISE_OPTIONS} selected={exercise} onChange={setExercise} />
          </div>
        );

      case 6: // Medical History (Conditions)
        return (
          <div className="space-y-6 animate-fade-up">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-cream-800">
                Are any of these part of your daily routine?
              </h2>
              <p className="text-cream-400 text-sm mt-1">Select all that apply</p>
            </div>
            <ToggleCards items={CONDITION_ITEMS} selected={conditions} onChange={setConditions} />
          </div>
        );

      case 7: // Family History
        return (
          <div className="space-y-6 animate-fade-up">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-cream-800">
                Does your family have a history of any of these?
              </h2>
              <p className="text-cream-400 text-sm mt-1">Select all that apply</p>
            </div>
            <ToggleCards items={FAMILY_ITEMS} selected={familyHistory} onChange={setFamilyHistory} />
          </div>
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Processing overlay
  // ---------------------------------------------------------------------------
  if (isProcessing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-warm-300 animate-pulse-ring" />
          <div className="absolute inset-2 rounded-full border-2 border-warm-400 animate-pulse-ring anim-delay-300" />
          <div className="absolute inset-4 rounded-full border-2 border-warm-500 animate-pulse-ring anim-delay-600" />
        </div>
        <p className="shimmer-text font-display font-semibold text-lg">
          Calculating your health score...
        </p>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => (step > 0 ? back() : router.push("/scan"))}
          className="text-cream-400 text-sm hover:text-cream-600 transition-colors"
        >
          &larr; {step > 0 ? "Back" : "Scan"}
        </button>
        <span className="text-cream-400 text-sm">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
        <div className="w-12" />
      </div>

      {/* Progress */}
      <div className="flex justify-center mb-8">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center">
        {renderStep()}
      </div>

      {/* Processing Error */}
      {processingError && (
        <p className="text-health-warning text-sm text-center mt-4">
          {processingError}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-8 pb-4">
        <Button
          onClick={isLastStep ? handleSubmit : next}
          fullWidth
          className="py-4 rounded-full"
        >
          {isLastStep ? "Get My Health Score" : "Next"}
        </Button>
      </div>
    </main>
  );
}
