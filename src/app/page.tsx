"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, isAuthenticated, logout } from "@/lib/api-client";
import SplashScreen from "@/components/splash/SplashScreen";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

// ---------------------------------------------------------------------------
// Landing page: splash → auth gate → home dashboard
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// Feature cards for the Headspace-style explore grid
const FEATURES = [
  {
    title: "Heart & HRV",
    subtitle: "Pulse variability analysis",
    icon: "heart" as const,
    bg: "bg-gradient-to-br from-warm-100 to-warm-200",
    iconColor: "text-warm-500",
  },
  {
    title: "Oxygen & Breath",
    subtitle: "SpO2 and respiratory rate",
    icon: "lungs" as const,
    bg: "bg-gradient-to-br from-sky-50 to-sky-100",
    iconColor: "text-sky-500",
  },
  {
    title: "Blood Pressure",
    subtitle: "Systolic & diastolic estimate",
    icon: "bp" as const,
    bg: "bg-gradient-to-br from-green-50 to-green-100",
    iconColor: "text-health-good",
  },
  {
    title: "Stress & Wellness",
    subtitle: "Autonomic nervous system",
    icon: "stress" as const,
    bg: "bg-gradient-to-br from-purple-50 to-purple-100",
    iconColor: "text-purple-500",
  },
];

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);

  // Splash auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  // Check auth on mount
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  async function handleAuth() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
      } else {
        await register(authEmail, authPassword);
      }
      setAuthed(true);
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // --- Splash ---
  if (showSplash) {
    return <SplashScreen onDismiss={() => setShowSplash(false)} />;
  }

  // --- Auth Screen ---
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 animate-fade-up">
          {/* Branding */}
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              <span className="text-warm-500">Fedo</span>
              <span className="text-cream-800">Score</span>
            </h1>
            <p className="text-cream-400 text-sm mt-2">
              Health scoring with contactless vitals
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-button bg-white border border-cream-200 text-cream-800 placeholder-cream-400 focus:border-warm-400 focus:ring-2 focus:ring-warm-100 outline-none transition-all"
            />
            <input
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-button bg-white border border-200 text-cream-800 placeholder-cream-400 focus:border-warm-400 focus:ring-2 focus:ring-warm-100 outline-none transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />

            {authError && (
              <p className="text-health-warning text-sm text-center">{authError}</p>
            )}

            <Button onClick={handleAuth} fullWidth disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Log In"
                  : "Create Account"}
            </Button>

            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
              className="w-full text-cream-400 text-sm hover:text-cream-600 transition-colors text-center"
            >
              {authMode === "login"
                ? "Need an account? Register"
                : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Authenticated Landing ---
  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <p className="text-cream-400 text-sm">{getGreeting()}</p>
          <h1 className="font-display text-2xl font-bold text-cream-800">
            <span className="text-warm-500">Fedo</span>Score
          </h1>
        </div>
        <button
          onClick={() => {
            logout();
            setAuthed(false);
          }}
          className="text-cream-400 text-xs hover:text-cream-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Feature Grid (Headspace Explore style) */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {FEATURES.map((f, i) => (
          <Card
            key={f.title}
            variant="colored"
            color={f.bg}
            className={`p-4 animate-fade-up opacity-0`}
            style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: "forwards" } as any}
          >
            <Icon type={f.icon} size={28} className={`${f.iconColor} mb-2`} />
            <p className="font-display font-semibold text-sm text-cream-800">
              {f.title}
            </p>
            <p className="text-xs text-cream-500 mt-0.5">{f.subtitle}</p>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="animate-fade-up opacity-0 anim-delay-500" style={{ animationFillMode: "forwards" } as any}>
        <Button
          onClick={() => router.push("/scan")}
          fullWidth
          className="py-4 text-lg rounded-full shadow-lg shadow-warm-200"
        >
          Begin Health Scan
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-cream-300 text-[10px] text-center mt-6 max-w-sm mx-auto leading-relaxed">
        FedoScore uses your camera to estimate vital signs. This is not a medical device.
        Results are for wellness purposes only and should not replace professional medical advice.
      </p>
    </main>
  );
}
