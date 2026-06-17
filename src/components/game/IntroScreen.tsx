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
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
      style={{ backgroundImage: "url(/bg-main.png)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
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

      <h1 className="text-4xl sm:text-5xl font-bold mb-2 tracking-wider text-embossed-gold-lg">
        Sorting Ceremony
      </h1>

      <p className="text-lg sm:text-xl mb-2 text-embossed-gold">
        霍格沃茨分院仪式
      </p>

      <p
        className="text-base sm:text-lg mb-6 max-w-lg parchment-text"
      >
        分院帽将透过你的咒语与魔力，洞察你灵魂深处的品质，决定你将属于哪个学院。
      </p>

      {/* 入学通知书卡片 */}
      <div className="parchment-card corner-ornament-all rounded-lg p-6 mb-8 max-w-md w-full mx-auto">
        <div className="relative z-10">
          <div className="magic-divider mb-4 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "'Cinzel', serif", color: 'rgba(201,168,76,0.6)' }}>
            <span>Admission Notice</span>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { icon: '🔮', title: '第一关：念出咒语', desc: '用你的声音展现魔力' },
              { icon: '✨', title: '第二关：挥舞魔杖', desc: '用你的手势绘制符文' },
              { icon: '📜', title: '最终：分院结果', desc: '穿上你的学院长袍' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-base font-bold" style={{ color: '#c9a84c', fontFamily: "'Noto Serif SC', serif" }}>
                    {item.title}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'rgba(212,197,169,0.7)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 text-center" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
            <span className="text-xs italic" style={{ color: 'rgba(201,168,76,0.4)', fontFamily: "'Cinzel', serif" }}>
              Hogwarts School of Witchcraft and Wizardry
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        className="btn-magic px-10 py-4 rounded-lg text-lg font-bold tracking-wider cursor-pointer"
        style={{
          fontFamily: "'Cinzel', serif",
          boxShadow: hovered
            ? '0 0 30px rgba(201, 168, 76, 0.4), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 0 15px rgba(201, 168, 76, 0.2), 0 4px 12px rgba(0,0,0,0.3)',
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
