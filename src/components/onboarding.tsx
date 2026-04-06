"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "NEURAL COMBAT ARENA",
    text: "AI vs AI. You write the combat prompt — your AI fights alone in the matrix. No button mashing. Pure strategy.",
    icon: "⚡",
  },
  {
    title: "WRITE YOUR PROMPT",
    text: "Tell your construct HOW to fight: when to attack, when to dodge, when to go all-in. The better your prompt, the smarter it fights.",
    icon: "✎",
  },
  {
    title: "PICK YOUR ZAIBATSU",
    text: "Anthropic, Google, OpenAI — each AI thinks different. Some are fast, some are creative. Choose your weapon.",
    icon: "△",
  },
  {
    title: "CRACK THE GAUNTLET",
    text: "10 levels. 10 enemy AIs. Beat them to steal their prompts and unlock new abilities. Nobody's cleared them all.",
    icon: "☠",
  },
  {
    title: "WANT THE FULL STORY?",
    text: "SYSOP has a message for you. Jack into the lore terminal — if you dare.",
    icon: "◈",
    cta: { label: "READ LORE", href: "/lore" },
  },
];

const STORAGE_KEY = "battleai_onboarding_done";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-[340px] bg-bg-panel border border-cyan/30 rounded-sm overflow-hidden"
              style={{ boxShadow: "0 0 40px rgba(0,240,255,0.1), 0 0 80px rgba(0,240,255,0.05)" }}>

              {/* Progress bar */}
              <div className="h-0.5 bg-bg-deep">
                <motion.div
                  className="h-full bg-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{current.icon}</span>
                  <div>
                    <div className="text-cyan text-[10px] font-mono tracking-widest mb-0.5">
                      STEP {step + 1}/{STEPS.length}
                    </div>
                    <h2 className="text-text-primary font-mono font-bold text-sm tracking-wide">
                      {current.title}
                    </h2>
                  </div>
                </div>

                <p className="text-text-secondary text-xs font-mono leading-relaxed mb-5">
                  {current.text}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={dismiss}
                    className="text-text-dim text-[9px] font-mono hover:text-text-secondary transition-colors"
                  >
                    SKIP
                  </button>

                  <div className="flex items-center gap-2">
                    {current.cta && (
                      <a
                        href={current.cta.href}
                        onClick={() => localStorage.setItem(STORAGE_KEY, "1")}
                        className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-sm border border-amber/50 text-amber hover:bg-amber/10 transition-all"
                      >
                        {current.cta.label}
                      </a>
                    )}
                    <button
                      onClick={next}
                      className="text-[10px] font-mono font-bold px-4 py-1.5 rounded-sm bg-cyan/10 border border-cyan/40 text-cyan hover:bg-cyan/20 transition-all"
                    >
                      {isLast ? "JACK IN" : "NEXT →"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom accent */}
              <div className="h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
