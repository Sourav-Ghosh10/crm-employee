import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Sparkles, PartyPopper, Cake, Heart, X } from "lucide-react";

interface BirthdayCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
}

const BirthdayCelebrationModal: React.FC<BirthdayCelebrationModalProps> = ({
  open,
  onClose,
  userName,
}) => {
  const showerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play a soft joyful chime using Web Audio API
  const playJoyfulChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.55);
      });
    } catch {
      // Audio autoplay policy might silently block before user gesture
    }
  };

  // Big cannon pop
  const blastConfettiCannons = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 99999,
      colors: [
        "#ff0a54",
        "#ff477e",
        "#ff70a6",
        "#ffd166",
        "#06d6a0",
        "#118ab2",
        "#8338ec",
        "#3a86ff",
        "#f72585",
        "#4cc9f0",
      ],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  // Continuous falling paper shower (ঝরে ঝরে পড়া চিকমিক করা কাগজের কুচি)
  const startFallingConfettiShower = () => {
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    showerIntervalRef.current = setInterval(() => {
      if (Date.now() > end) {
        if (showerIntervalRef.current) {
          clearInterval(showerIntervalRef.current);
          showerIntervalRef.current = null;
        }
        return;
      }

      // Left corner shower
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.3 },
        zIndex: 99999,
        colors: ["#ffd166", "#06d6a0", "#ff0a54", "#3a86ff", "#f72585"],
        shapes: ["square", "circle"],
      });

      // Right corner shower
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.3 },
        zIndex: 99999,
        colors: ["#ffd166", "#06d6a0", "#ff0a54", "#3a86ff", "#f72585"],
        shapes: ["square", "circle"],
      });

      // Sky rain shower
      confetti({
        particleCount: 4,
        angle: 90,
        spread: 120,
        origin: { x: Math.random(), y: 0 },
        gravity: 0.8,
        ticks: 200,
        zIndex: 99999,
        colors: ["#ff0a54", "#ffd166", "#06d6a0", "#8338ec", "#ffffff"],
      });
    }, 200);
  };

  useEffect(() => {
    if (open) {
      blastConfettiCannons();
      startFallingConfettiShower();
      playJoyfulChime();
    } else {
      if (showerIntervalRef.current) {
        clearInterval(showerIntervalRef.current);
        showerIntervalRef.current = null;
      }
    }

    return () => {
      if (showerIntervalRef.current) {
        clearInterval(showerIntervalRef.current);
        showerIntervalRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Celebration Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface border-2 border-primary/20 shadow-2xl transition-all transform scale-100 animate-in zoom-in-95 duration-300">
        {/* Festive decorative gradient top header */}
        <div className="relative h-44 bg-gradient-to-br from-amber-500 via-pink-500 to-purple-600 flex flex-col items-center justify-center text-white overflow-hidden p-6 text-center">
          {/* Animated decorative floating orbs */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-yellow-300/20 rounded-full blur-lg"></div>

          {/* Close button in top-right */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Floating Cake & Sparkle Badge */}
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
              <Cake className="w-10 h-10 text-yellow-200 drop-shadow-md animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-2 bg-yellow-400 text-yellow-950 p-1.5 rounded-full shadow-md animate-spin-slow">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight drop-shadow-md">
            Happy Birthday! 🎂
          </h2>
          <p className="text-xs font-medium text-white/90 mt-0.5 tracking-wider uppercase">
            A Special Day for a Special Colleague
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Wishing You a Fantastic Day,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600">
                {userName}!
              </span>{" "}
              🎉
            </h3>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              May your year ahead be packed with exciting milestones, good health, boundless joy,
              and remarkable achievements. We are so delighted to celebrate this special day with
              you!
            </p>
          </div>

          {/* Festive Ribbon Banner */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center gap-3 text-pink-600 dark:text-pink-400 font-medium text-xs sm:text-sm">
            <PartyPopper className="w-5 h-5 shrink-0 animate-pulse text-amber-500" />
            <span>Have an unforgettable birthday celebration today! 🎈</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                blastConfettiCannons();
                playJoyfulChime();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-primary/20 bg-muted/60 hover:bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Celebrate Again 🎈
            </button>
            <button
              onClick={() => {
                blastConfettiCannons();
                setTimeout(() => {
                  onClose();
                }, 300);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 fill-white" />
              Thank You! 🎉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BirthdayCelebrationModal;
