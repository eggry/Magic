'use client';

import { useState, useMemo } from 'react';
import { useGame } from './GameProvider';

interface Particle {
  width: number;
  height: number;
  left: number;
  top: number;
  opacity: number;
  duration: number;
  delay: number;
}

export default function IntroScreen() {
  const { startGame } = useGame();
  const [hovered, setHovered] = useState(false);

  // Pre-generate particle data using deterministic seeded values
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 30 }, (_, i) => {
      const seed = (n: number) => ((i * 9301 + 49297) % 233280) / 233280 * n;
      return {
        width: 2 + seed(3),
        height: 2 + seed(3),
        left: seed(100),
        top: seed(100),
        opacity: 0.2 + seed(0.4),
        duration: 5 + seed(10),
        delay: seed(5),
      };
    })
  , []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.width}px`,
              height: `${p.height}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: `rgba(201, 168, 76, ${p.opacity})`,
              animation: `float ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Sorting Hat */}
      <div className="relative mb-8">
        <div
          className="text-6xl sm:text-8xl select-none"
          style={{ animation: 'hatWobble 3s ease-in-out infinite' }}
        >
          🎩
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full"
          style={{ backgroundColor: 'rgba(201, 168, 76, 0.3)', filter: 'blur(8px)' }}
        />
      </div>

      <h1
        className="text-4xl sm:text-5xl font-bold mb-4 tracking-wider"
        style={{
          fontFamily: "'Cinzel', serif",
          color: '#c9a84c',
          textShadow: '0 0 20px rgba(201, 168, 76, 0.5), 0 0 40px rgba(201, 168, 76, 0.2)',
        }}
      >
        Sorting Ceremony
      </h1>

      <p
        className="text-lg sm:text-xl mb-2"
        style={{ fontFamily: "'Noto Serif SC', serif", color: '#e8dcc8' }}
      >
        霍格沃茨分院仪式
      </p>

      <p
        className="text-sm sm:text-base mb-8 max-w-md"
        style={{ color: '#9ca3af' }}
      >
        分院帽将透过你的咒语与魔力，洞察你灵魂深处的品质，决定你将属于哪个学院。
      </p>

      <div className="flex flex-col gap-3 mb-8 text-left max-w-sm w-full px-4">
        <div className="flex items-center gap-3" style={{ color: '#e8dcc8' }}>
          <span className="text-xl">🎤</span>
          <span className="text-sm">第一关：念出咒语 — 用你的声音展现魔力</span>
        </div>
        <div className="flex items-center gap-3" style={{ color: '#e8dcc8' }}>
          <span className="text-xl">🪄</span>
          <span className="text-sm">第二关：挥舞魔杖 — 用你的手势绘制符文</span>
        </div>
        <div className="flex items-center gap-3" style={{ color: '#e8dcc8' }}>
          <span className="text-xl">📸</span>
          <span className="text-sm">最终：分院结果 — 穿上你的学院长袍</span>
        </div>
      </div>

      <button
        onClick={startGame}
        className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
        style={{
          fontFamily: "'Cinzel', serif",
          color: '#0a0e1a',
          background: 'linear-gradient(135deg, #c9a84c 0%, #d4a017 50%, #c9a84c 100%)',
          border: 'none',
          boxShadow: hovered
            ? '0 0 30px rgba(201, 168, 76, 0.6), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 0 20px rgba(201, 168, 76, 0.4), 0 4px 12px rgba(0,0,0,0.3)',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        Begin the Ceremony
      </button>
    </div>
  );
}
