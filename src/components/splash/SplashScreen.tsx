"use client";

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(circle at 50% 40%, #FB923C 0%, #FFEDD5 60%, #FFF8F0 100%)",
      }}
      onAnimationEnd={onDismiss}
    >
      {/* Logo */}
      <div className="animate-splash-logo flex flex-col items-center gap-4">
        {/* Pulse icon */}
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="drop-shadow-lg">
          <circle cx="28" cy="28" r="28" fill="white" fillOpacity="0.25" />
          <path
            d="M16 28h6l3-8 5 16 4-12 3 4h5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Wordmark */}
        <h1 className="font-display text-4xl font-bold text-white drop-shadow-md tracking-tight">
          Fedo<span className="font-light">Score</span>
        </h1>

        {/* Tagline */}
        <p className="text-white/80 text-sm font-body mt-1 animate-fade-up anim-delay-500">
          Your health, at a glance
        </p>
      </div>
    </div>
  );
}
