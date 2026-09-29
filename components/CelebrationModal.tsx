"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function CelebrationModal({ open, title, message, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const end = Date.now() + 1200;
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, zIndex: 9999 });
    const id = setInterval(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        zIndex: 9999,
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        zIndex: 9999,
      });
      if (Date.now() > end) clearInterval(id);
    }, 350);
    return () => clearInterval(id);
  }, [open ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-forest/70 p-4">
      <div className="pop-in w-full max-w-sm rounded-3xl bg-paper p-6 text-center shadow-xl">
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 text-2xl font-bold text-forest">{title}</h2>
        <p className="mt-2 text-sm font-medium text-ink/70">{message}</p>
        <button
          autoFocus
          onClick={onClose}
          className="tap-target mt-5 w-full rounded-2xl bg-forest px-4 py-3 text-base font-bold text-lime"
        >
          Keep the momentum 🚀
        </button>
      </div>
    </div>
  );
}
