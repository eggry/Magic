"use client";

import { useEffect, useMemo, useRef } from "react";

interface Candle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  flickerPhase: number;
  flickerSpeed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export default function MagicalBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);

  const candleAnim = useMemo(() => {
    return Array.from({ length: 12 }).map(() => ({
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 3,
    }));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Initialize floating candles
    candlesRef.current = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.8,
      size: 12 + Math.random() * 18,
      speed: 0.15 + Math.random() * 0.25,
      opacity: 0.4 + Math.random() * 0.5,
      flickerPhase: Math.random() * Math.PI * 2,
      flickerSpeed: 3 + Math.random() * 4,
    }));

    // Initialize stars
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.6,
      size: 1 + Math.random() * 2.5,
      opacity: 0.2 + Math.random() * 0.7,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const animate = (time: number) => {
      const t = time * 0.001;

      // Update candles
      candlesRef.current.forEach((c) => {
        c.y -= c.speed;
        if (c.y < -50) {
          c.y = h + 50;
          c.x = Math.random() * w;
        }
        c.flickerPhase += c.flickerSpeed * 0.016;
      });

      // Update stars
      starsRef.current.forEach((s) => {
        s.twinklePhase += s.twinkleSpeed * 0.016;
      });

      // Render candles
      const candleEls = container.querySelectorAll<HTMLDivElement>(".magic-candle");
      candleEls.forEach((el, i) => {
        const c = candlesRef.current[i];
        if (!c) return;
        const flicker = 0.85 + Math.sin(c.flickerPhase) * 0.15;
        el.style.transform = `translate(${c.x}px, ${c.y}px)`;
        el.style.opacity = String(c.opacity * flicker);
      });

      // Render stars
      const starEls = container.querySelectorAll<HTMLDivElement>(".magic-star");
      starEls.forEach((el, i) => {
        const s = starsRef.current[i];
        if (!s) return;
        const twinkle = 0.5 + Math.sin(s.twinklePhase) * 0.5;
        el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${twinkle})`;
        el.style.opacity = String(s.opacity);
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #0d1525 0%, #060a12 50%, #030508 100%)" }}
    >
      {/* Subtle gothic window pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(201,168,76,0.4) 80px, rgba(201,168,76,0.4) 81px),
            repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(201,168,76,0.4) 80px, rgba(201,168,76,0.4) 81px)`,
        }}
      />

      {/* Stars */}
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={`star-${i}`}
          className="magic-star absolute rounded-full"
          style={{
            width: 2,
            height: 2,
            background: "#fff8dc",
            boxShadow: "0 0 4px 1px rgba(255,248,220,0.6)",
          }}
        />
      ))}

      {/* Floating candles */}
      {candleAnim.map((anim, i) => (
        <div
          key={`candle-${i}`}
          className="magic-candle absolute"
          style={{ width: 20, height: 40 }}
        >
          {/* Candle body */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-sm"
            style={{
              width: 6,
              height: 24,
              background: "linear-gradient(to right, #8B7355, #D4C5A9, #8B7355)",
            }}
          />
          {/* Flame */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 10,
              height: 14,
              background: "radial-gradient(ellipse at 50% 30%, #fff9c4 0%, #ffc107 30%, #ff6f00 70%, transparent 100%)",
              filter: "blur(0.5px)",
              boxShadow: "0 0 12px 3px rgba(255,193,7,0.5), 0 0 30px 8px rgba(255,152,0,0.2)",
              animation: `candleFlicker ${anim.duration}s ease-in-out infinite`,
              animationDelay: `${anim.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
