# rPPG Web App Redesign — Headspace-Inspired Health Dashboard

## Context

The Next.js rPPG app (`rppg-web/`) is a single 680+ line monolith (`page.tsx`) with a dark, clinical UI. The user wants a full-flow redesign inspired by **Headspace iOS** (warm, calming, card-based, whimsical) combined with a **modern health dashboard** concept (glassmorphism, animated vital cards with sparklines, personalized greeting, body conditions grid). All signal processing lives on a backend API — the frontend only captures frames and renders results.

**Design references captured:**
- Headspace: Warm orange/cream palette, rounded cards, bottom nav, category grids, personalized greetings, breathing-style animations
- Health Dashboard (video): White/light bg, glassmorphism cards, vitals row with sparklines, activity rings, "Reset & Relax" wellness banner, animated card entrances

**Key user requirement: Vital cards must be animated** (staggered entrance, value count-up, subtle hover effects).

---

## Phase 1: Foundation (Design System + Project Setup)

### 1.1 Tailwind Config (`tailwind.config.ts`)
Extend with custom design tokens:
- **Colors:** `warm` (orange range: 50-900), `cream` (neutral warm: 50-900), `health-good/fair/warning/danger`, `sky` accent
- **Fonts:** `display` (Plus Jakarta Sans), `body` (Inter)
- **Border radius:** `card` (20px), `button` (16px)
- **Animations:** `fade-up`, `breathe`, `pulse-ring`, `shimmer`, `count-up`

### 1.2 Global Styles (`globals.css`)
- Tailwind directives + glassmorphism utilities (`.glass-card`, `.glass-elevated`)
- Keyframe animations for card entrances, breathing countdown, shimmer loading
- Light theme base (warm-50 background, cream-800 text)

### 1.3 Layout (`layout.tsx`)
- Import Inter + Plus Jakarta Sans via `next/font/google`
- Light warm theme body: `bg-warm-50 text-cream-800 antialiased`
- Wrap children with `<VitalsProvider>`
- Update metadata per-app branding

### 1.4 Context (`context/VitalsContext.tsx`)
- Store: `UnifiedResult | null`, `recordDuration`, `scanTimestamp`, `lifestyle` inputs, `rawScanData` (samples + metadata from scan, held until questionnaire completes)
- Actions: `setRawScan()`, `setLifestyle()`, `setResults()`, `clearResults()`
- Flow: Scan page stores raw data → Assessment page collects lifestyle → combines both and calls API → stores UnifiedResult
- Replaces prop-drilling between pages

### 1.5 Types (`types/index.ts`)
- Re-export all types from `lib/types.ts` for clean imports

---

## Phase 2: UI Component Library (`components/ui/`)

All components use the warm design system. No external UI library.

| Component | Purpose |
|-----------|---------|
| `Card.tsx` | Glass card wrapper (variants: `glass`, `elevated`, `colored`) |
| `Button.tsx` | Warm gradient primary, outline secondary, ghost variants |
| `Badge.tsx` | Status pill (good/fair/warning/danger) with glass bg |
| `ProgressRing.tsx` | SVG circular gauge (for scores, SpO2, etc.) |
| `ProgressBar.tsx` | Linear gradient progress bar |
| `Sparkline.tsx` | Tiny canvas sparkline chart for vital cards |
| `AnimatedNumber.tsx` | Count-up animation for vital values (requestAnimationFrame-based) |
| `Icon.tsx` | Unified icon system (heart, lungs, bp, glucose, brain, wave, breath) |
| `WaveformChart.tsx` | Full waveform canvas (warm-400 stroke, warm-100 fill) |
| `PSDChart.tsx` | Power spectrum canvas (sky-400 stroke) |

---

## Phase 3: Custom Hooks (extract from monolith)

### 3.1 `hooks/useCamera.ts`
Extract camera init/cleanup from `page.tsx` lines 70-89. Returns `{ videoRef, cameraReady, error }`.

### 3.2 `hooks/useFaceDetector.ts`
Extract detector init from lines 91-94. Returns `{ detectorRef }`.

### 3.3 `hooks/useRecording.ts`
Extract the full state machine (lines 33-275): appState, countdown, recording loop, AGC/motion state, frame sampling, snapshot capture. Returns `{ appState, startMeasurement, reset, countdown, recordProgress, faceDetected, motionLevel, signalBadge, recordSeconds, setRecordSeconds }`.

### 3.4 `hooks/useVitalsProcessor.ts`
Extract `finishRecording()` logic (lines 244-275). Calls `scoreWithVitals()` API and sets results via context.

---

## Phase 3.5: Splash Screen (`app/loading.tsx` + `components/splash/SplashScreen.tsx`)

Animated splash screen shown on initial app load before any content renders.

### Design (Headspace-inspired)
- Full-viewport warm gradient background (warm-400 → warm-100 radial gradient)
- Centered FedoScore logo/wordmark — animated fade-in + gentle scale
- Subtle pulsing heart/pulse SVG animation below logo
- Tagline: "Your health, at a glance" — fades in after 0.5s delay
- Auto-dismisses after 2s (or when app is hydrated, whichever is later)
- Smooth fade-out transition to landing page

### Implementation
- `SplashScreen.tsx`: Full-screen overlay component with CSS animations (no framer-motion needed)
- Controlled by a `useState(true)` + `useEffect` timer in `layout.tsx` or root page
- Uses `@keyframes` from globals.css: `splash-logo` (scale 0.8→1 + opacity 0→1), `splash-fade-out` (opacity 1→0)
- Conditionally renders over children: `{showSplash ? <SplashScreen /> : children}`

### Mobile App Feel
- `<meta name="apple-mobile-web-app-capable" content="yes">` in layout for PWA splash
- Theme color meta tag matches warm-400 for native status bar blending
- Consider `manifest.json` splash screen icons for PWA install

---

## Phase 4: Auth + Landing Page (`app/page.tsx`)

### 4.1 Auth Screen (when not authenticated)
- Light warm background instead of dark
- "FedoScore" branding in warm-500 accent
- Clean form with warm-themed inputs (cream borders, warm focus ring)
- Primary CTA button with warm gradient

### 4.2 Landing Screen (when authenticated, no scan started)
**Layout:**
- Time-aware greeting: "Good Morning/Afternoon/Evening" + user-friendly subtitle
- Lifestyle input section (age, gender, height, weight) in a collapsible warm card
- 2x2 feature category grid (Headspace Explore style):
  - "Heart & HRV" — warm orange card
  - "Oxygen & Breath" — sky blue card
  - "Blood Pressure" — soft green card
  - "Stress & Wellness" — calm purple card
- Large "Begin Health Scan" CTA (rounded-full, warm gradient)
- Disclaimer in cream-400 text at bottom

---

## Phase 5: Scan Page (`app/scan/page.tsx`)

Single page with visual states driven by `useRecording` hook.

### 5.1 Idle State
- Camera preview in rounded-[24px] glass card
- Face detection overlay: warm-400 bounding box, warm-200 landmarks
- Glass pill badges: face detection, motion level
- Duration selector: pill buttons with warm-400 active state
- "Start Scan" button (warm gradient, rounded-full)

### 5.2 Countdown State
- Frosted overlay (`bg-warm-50/80 backdrop-blur-md`)
- Large numbers (3, 2, 1) with `breathe` CSS animation (scale pulse)
- "Hold still and breathe naturally" in cream-500

### 5.3 Recording State
- Warm-tinted overlay on camera
- Pulsing warm-400 recording dot + "Recording" badge
- Signal quality badges (glass style)
- Warm gradient progress bar at bottom of camera card
- "{seconds}s remaining" text

### 5.4 Processing State
- Full frosted overlay
- Concentric expanding rings animation (warm-300/400/500)
- "Analyzing your health data..." with shimmer text effect
- On completion: store raw scan data in context → navigate to `/assessment`

---

## Phase 5.5: Fedo Score Questionnaire (`app/assessment/page.tsx`)

**Placed AFTER scan, BEFORE full results.** Flow: Scan completes → raw vitals stored in context → navigate to `/assessment` → user completes health questionnaire → submit lifestyle + vitals to API → navigate to `/results` with unified score.

**All steps from the Angular app, redesigned with Headspace-style UI.**

### 5.5.1 Layout — Multi-Step Carousel
- Single page with step indicator (warm-400 dots/progress bar at top)
- Smooth slide transitions between steps (CSS transform or framer-motion)
- Back/Next buttons at bottom (warm-themed)
- Step counter: "Step 3 of 8"

### 5.5.2 Step 1: Basic Info (Age, Gender)
- **Data:** `age` (18-120), `gender` ("Male"/"Female"/"Other")
- **UI:** Large number input for age with +/- stepper buttons, gender selection as 2-3 illustrated cards (Headspace style — warm colored cards with simple icons)
- **Text:** "Let's get to know you" heading

### 5.5.3 Step 2: Height
- **Data:** `height` in cm (100-220), with feet/inches toggle
- **UI:** Visual vertical ruler/slider with warm-400 indicator line, unit toggle pill (cm / ft'in"), smooth scroll picker
- **Text:** "How tall are you?"

### 5.5.4 Step 3: Weight
- **Data:** `weight` in kg (30-150), with lbs toggle
- **UI:** Same visual ruler/slider as height, unit toggle pill (kg / lbs), auto-conversion
- **Text:** "What's your weight?"

### 5.5.5 Step 4: Smoking Habits
- **Data:** `smoker` (0=never, 1=former, 3=>3/week, 5=>3/day)
- **UI:** 4 warm-colored illustration cards (Headspace style):
  - Never — green-tinted card with clear lungs icon
  - Former — cream card with clock icon
  - Weekly — warm-200 card
  - Daily — warm-300 card
- **Text:** "Do you smoke or use e-cigarettes?"

### 5.5.6 Step 5: Drinking Habits
- **Data:** `drink` (0=never, 1=occasionally, 3=weekly, 5=daily)
- **UI:** 4 warm-colored illustration cards (same pattern as smoking)
- **Text:** "How often do you drink alcohol?"

### 5.5.7 Step 6: Exercise
- **Data:** `exercise` (0=sedentary, 1=light, 3=moderate, 5=active)
- **UI:** 4 illustration cards with activity level icons (couch, walking, jogging, running)
- **Text:** "How active are you?"

### 5.5.8 Step 7: Medical History
- **Data:** `conditions[]` — array of booleans for: inhaler use, regular medication, insulin/injections
- **UI:** 3 toggle cards (glass cards with warm accent, checkmark animation on select)
- **Text:** "Are any of these part of your daily routine?"
- **Multi-select** — user can pick multiple or none

### 5.5.9 Step 8: Family History
- **Data:** `family_history[]` — array of booleans for: cardiovascular, congenital heart, respiratory, diabetes, kidney
- **UI:** 5 toggle cards (glass cards, checkmark animation, warm icon per condition)
- **Text:** "Does your family have a history of any of these?"
- **Multi-select** — user can pick multiple or none

### 5.5.10 Submit + Transition
- After final step: show processing animation ("Calculating your health score...")
- Call `scoreWithVitals()` API with lifestyle data + raw scan data from context
- On success: store `UnifiedResult` in context → navigate to `/results`

### Questionnaire Components (`components/assessment/`)

| Component | Purpose |
|-----------|---------|
| `StepIndicator.tsx` | Dot/progress bar showing current step |
| `NumberStepper.tsx` | Age input with +/- buttons |
| `RulerPicker.tsx` | Visual scroll ruler for height/weight (reusable) |
| `OptionCards.tsx` | Grid of selectable illustration cards (smoking, drinking, exercise) |
| `ToggleCards.tsx` | Multi-select toggle cards (medical/family history) |
| `GenderPicker.tsx` | Illustrated gender selection cards |
| `UnitToggle.tsx` | cm/ft, kg/lbs pill toggle |

---

## Phase 6: Results Dashboard (`app/results/page.tsx`)

**The heart of the redesign — animated health dashboard.**

### 6.1 Layout
- Reads from `VitalsContext`. Redirects to `/` if no results.
- Header: "Your Health Report" + date + "Scan Again" ghost button
- Vertical scroll with staggered card entrance animations

### 6.2 Fedo Score Hero Card
- Large glass-elevated card with warm gradient accent border
- Centered score number with `AnimatedNumber` count-up (0 → actual score)
- Score color: warm gradient for good, yellow for medium, red-400 for low
- Bio Age / Chrono Age / Gap row below
- Improvement tip at bottom

### 6.3 Domain Scores Row
- 6 compact glass chips in horizontal scroll
- Each with category name + animated score value

### 6.4 Primary Vitals Row (ANIMATED)
4 glass-elevated cards in a row (2x2 on mobile, 4-col on desktop):
- **Staggered entrance**: Each card appears with `fade-up` animation, 100ms delay between each
- **AnimatedNumber**: Values count up from 0 to actual value over 1.2s with easeOutExpo
- **Sparkline**: Mini canvas chart below the value using waveform data subset
- **Status color**: Left border accent matches health status (good=green, fair=warm, warning=red)
- **Hover**: `scale-[1.02]` + elevated shadow transition
- Cards: Heart Rate, SpO2, Blood Pressure, Blood Glucose

### 6.5 Secondary Vitals Grid (ANIMATED)
3-col grid, same animated card pattern:
- Respiratory Rate, Stress Index, HRV (RMSSD)
- Smaller cards, no sparkline, same entrance + count-up animations
- Stagger offset continues from primary row

### 6.6 HRV Detail Row
6 compact mini-cards (glass, cream-100 bg):
- SDNN, pNN50, LF/HF, Algorithm, Perfusion, Signal Quality
- Simple text values, subtle fade-up entrance

### 6.7 Wellness Banner
- Wide glass card with warm-to-sky gradient left edge
- Left: ProgressRing showing overall stress score (animated fill)
- Center: Summary text based on stress level
- Warm cream background

### 6.8 Autonomic Panel
- Refactored from current `AutonomicCard`
- Glass card with warm-100 header
- 4 primary ANS metrics as large animated values
- Sympathetic/Parasympathetic balance bar (warm-to-sky gradient)
- 6 secondary mini-cards
- Composite scores (Anxiety, Sleep Quality, Recovery) as ProgressRings

### 6.9 Hemoglobin + Smoker Detection Panels
- Refactored from current inline components
- Glass cards with warm color accents
- Probability gauges use ProgressRing component

### 6.10 Charts Section
- Waveform: warm-400 stroke, warm-100 fill gradient, cream-200 grid lines
- PSD: sky-400 stroke, sky-100 fill, peak BPM indicator

### 6.11 Accuracy Table + Disclaimers
- Glass cards with warm-themed table styling
- Disclaimer in subtle cream-400 text

---

## Phase 7: Polish & Responsive

- Page transition animations (fade between routes)
- Responsive testing: 375px (mobile), 768px (tablet), 1280px (desktop)
- Ensure camera works on mobile Chrome/Safari
- Update all metadata (title, description per route)
- Remove any remaining dark theme artifacts (zinc, emerald-900, bg-black references)

---

## Critical Files

| File | Action |
|------|--------|
| `rppg-web/tailwind.config.ts` | Extend with full design system |
| `rppg-web/src/app/globals.css` | Add glassmorphism utilities + animations |
| `rppg-web/src/app/layout.tsx` | Light theme, fonts, VitalsProvider |
| `rppg-web/src/app/page.tsx` | Rewrite as auth + landing (currently 680+ line monolith) |
| `rppg-web/src/app/scan/page.tsx` | **NEW** — camera + recording flow |
| `rppg-web/src/app/assessment/page.tsx` | **NEW** — 8-step health questionnaire |
| `rppg-web/src/app/results/page.tsx` | **NEW** — animated results dashboard |
| `rppg-web/src/components/assessment/*.tsx` | **NEW** — 7 questionnaire components |
| `rppg-web/src/context/VitalsContext.tsx` | **NEW** — shared state |
| `rppg-web/src/hooks/useCamera.ts` | **NEW** — camera hook |
| `rppg-web/src/hooks/useRecording.ts` | **NEW** — state machine hook |
| `rppg-web/src/components/ui/*.tsx` | **NEW** — 10 UI components |
| `rppg-web/src/components/results/*.tsx` | **NEW** — results-specific components |
| `rppg-web/src/lib/*` | **UNTOUCHED** — all signal processing stays as-is |

---

## Implementation Order

1. Foundation (tailwind config, globals, layout, context, types)
2. UI components (Card, Button, Badge, AnimatedNumber, ProgressRing, Sparkline, Icon)
3. Hooks (useCamera, useFaceDetector, useRecording, useVitalsProcessor)
4. Landing page (auth + greeting + feature grid + CTA)
5. Scan page (camera + countdown + recording + processing states)
6. Assessment questionnaire (8-step flow: info → height → weight → smoking → drinking → exercise → medical → family)
7. Results dashboard (animated vitals cards + all panels + charts)
8. Polish (responsive, transitions, cleanup)

---

## Verification

1. `npm run build` — no TypeScript errors
2. `npm run dev` — app loads on warm light theme
3. Auth flow works (login/register)
4. Camera activates on `/scan`, face detection works
5. Recording state machine: idle → countdown → recording → processing → assessment
6. Assessment questionnaire: all 8 steps navigate correctly, data persists in context
7. Submit from assessment calls API with lifestyle + scan data → redirects to results
8. Results page shows all vitals with animated card entrances and count-up values
7. All vital values match pre-redesign output (no lib/ changes)
8. Responsive at 375px, 768px, 1280px
9. No dark theme remnants (no zinc-900, bg-black, etc.)
