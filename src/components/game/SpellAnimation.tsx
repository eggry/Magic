'use client';

import { useEffect, useMemo, useCallback } from 'react';

interface SpellAnimationProps {
  spellName: string; // nameCn
  onComplete: () => void;
}

/* ───────── keyframes (injected once) ───────── */
const KEYFRAMES = `
/* ── shared ── */
@keyframes spell-fade-in { from{opacity:0} to{opacity:1} }
@keyframes spell-fade-out { from{opacity:1} to{opacity:0} }
@keyframes spell-pulse-glow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.6)} }
@keyframes spell-screen-shake { 0%,100%{transform:translate(0)} 10%{transform:translate(-4px,2px)} 30%{transform:translate(4px,-2px)} 50%{transform:translate(-2px,4px)} 70%{transform:translate(2px,-4px)} 90%{transform:translate(-2px,2px)} }
@keyframes spell-scale-in { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes spell-scale-out { from{transform:scale(1);opacity:1} to{transform:scale(0);opacity:0} }

/* ── 盔甲护身 ── */
@keyframes shield-expand { 0%{transform:scale(0);opacity:0;border-width:8px} 40%{transform:scale(1.1);opacity:1;border-width:4px} 60%{transform:scale(1);opacity:1;border-width:3px} 80%{transform:scale(1.05);opacity:0.8} 100%{transform:scale(1.5);opacity:0} }
@keyframes shield-ripple { 0%{transform:scale(0.8);opacity:0.8;border-width:2px} 100%{transform:scale(2.5);opacity:0;border-width:0.5px} }
@keyframes shield-shatter { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.8)} }

/* ── 呼神护卫 ── */
@keyframes patronus-converge { 0%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} 50%{opacity:1} 100%{transform:translate(0,0) scale(1);opacity:1} }
@keyframes patronus-charge { 0%{transform:scale(1) translateY(0);opacity:1} 100%{transform:scale(1.5) translateY(-60px);opacity:0} }
@keyframes patronus-particle { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }
@keyframes patronus-glow { 0%,100%{filter:drop-shadow(0 0 20px rgba(192,192,255,0.8))} 50%{filter:drop-shadow(0 0 40px rgba(220,220,255,1))} }

/* ── 滑稽滑稽 ── */
@keyframes confetti-burst { 0%{transform:translate(0,0) rotate(0deg) scale(0);opacity:1} 100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(1);opacity:0} }
@keyframes smoke-puff { 0%{transform:scale(0);opacity:0.8} 50%{transform:scale(1.2);opacity:0.6} 100%{transform:scale(2);opacity:0} }

/* ── 恢复如初 ── */
@keyframes crack-appear { 0%{opacity:0;stroke-dashoffset:100} 50%{opacity:1;stroke-dashoffset:0} 100%{opacity:0;stroke-dashoffset:0} }
@keyframes heal-glow { 0%{opacity:0;box-shadow:none} 50%{opacity:1;box-shadow:0 0 30px rgba(34,197,94,0.8)} 100%{opacity:0;box-shadow:none} }

/* ── 荧光闪烁 ── */
@keyframes lumos-dark { from{opacity:1} to{opacity:0} }
@keyframes lumos-burst { 0%{transform:scale(0);opacity:0} 30%{transform:scale(0.3);opacity:1} 60%{transform:scale(1);opacity:1} 80%{transform:scale(1.2);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
@keyframes lumos-ray { 0%{transform:scaleY(0);opacity:1} 50%{transform:scaleY(1);opacity:0.8} 100%{transform:scaleY(1.2);opacity:0} }
@keyframes lumos-ember { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--ex),var(--ey)) scale(0)} }

/* ── 悬浮咒 ── */
@keyframes levitate-rise { 0%{transform:translateY(100px) rotate(var(--lr));opacity:0} 40%{opacity:1} 100%{transform:translateY(var(--lh)) rotate(calc(var(--lr) + 15deg));opacity:1} }
@keyframes levitate-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes levitate-trail { 0%{opacity:0.6;transform:translateY(0)} 100%{opacity:0;transform:translateY(-30px)} }

/* ── 速速前 ── */
@keyframes accio-streak { 0%{transform:translate(500px,200px) scale(0.3);opacity:0} 30%{opacity:1} 70%{opacity:1} 100%{transform:translate(-200px,-50px) scale(1.5);opacity:0} }
@keyframes accio-trail { 0%{opacity:0.8;width:80px} 100%{opacity:0;width:200px} }

/* ── 阿拉霍洞开 ── */
@keyframes door-glow { 0%{opacity:0;transform:rotate(0deg)} 50%{opacity:1;transform:rotate(180deg)} 100%{opacity:0;transform:rotate(360deg)} }
@keyframes door-swing { 0%{transform:perspective(400px) rotateY(0deg)} 100%{transform:perspective(400px) rotateY(-80deg)} }
@keyframes door-light { 0%{opacity:0;width:0;height:100%} 100%{opacity:1;width:60%;height:100%} }

/* ── 修复如初 ── */
@keyframes repair-fly { 0%{transform:translate(var(--px),var(--py)) rotate(var(--pr));opacity:0.5} 60%{opacity:1} 100%{transform:translate(0,0) rotate(0deg);opacity:1} }
@keyframes repair-flash { 0%{opacity:0} 50%{opacity:1;box-shadow:0 0 15px rgba(201,168,76,0.8)} 100%{opacity:0} }

/* ── 除你武器 ── */
@keyframes expel-bolt { 0%{transform:translateY(100%) scaleY(0.3);opacity:1} 60%{transform:translateY(-20%) scaleY(1);opacity:1} 100%{transform:translateY(-100%) scaleY(0.5);opacity:0} }
@keyframes expel-spark { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0} }
@keyframes expel-wand-fly { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-300px) translateX(100px) rotate(720deg);opacity:0} }

/* ── 昏昏倒地 ── */
@keyframes stupefy-flash { 0%{opacity:0} 10%{opacity:1} 30%{opacity:0.3} 40%{opacity:0.6} 100%{opacity:0} }
@keyframes stupefy-wave { 0%{transform:scale(0);opacity:0.8;border-width:3px} 100%{transform:scale(3);opacity:0;border-width:1px} }

/* ── 统统石化 ── */
@keyframes petrify-spread { 0%{clip-path:inset(50% 50% 50% 50%)} 100%{clip-path:inset(0 0 0 0)} }
@keyframes petrify-rune { 0%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} 100%{opacity:0.3;transform:scale(1)} }
@keyframes petrify-crack { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.3)} }

/* ── 障碍重重 ── */
@keyframes wall-rise { 0%{transform:translateY(100%);opacity:0} 60%{transform:translateY(0);opacity:1} 100%{transform:translateY(0);opacity:0.8} }
@keyframes wall-rune-glow { 0%,100%{opacity:0.3;text-shadow:none} 50%{opacity:1;text-shadow:0 0 20px rgba(201,168,76,0.8)} }
@keyframes rubble-fall { 0%{transform:translateY(-20px);opacity:0} 30%{opacity:1} 100%{transform:translateY(60px);opacity:0} }

/* ── 神锋无影 ── */
@keyframes sectum-slash { 0%{width:0;opacity:1} 30%{width:100%;opacity:1} 100%{width:100%;opacity:0} }
@keyframes sectum-bleed { 0%{height:0;opacity:0} 30%{height:3px;opacity:0.8} 100%{height:8px;opacity:0.4} }

/* ── 尸骨再现 ── */
@keyframes morsmordre-sky { from{background:#0a0e1a} to{background:#0a1a0a} }
@keyframes morsmordre-skull { 0%{transform:scale(0) rotate(-20deg);opacity:0;filter:blur(10px)} 60%{transform:scale(1.1) rotate(5deg);opacity:1;filter:blur(0)} 100%{transform:scale(1) rotate(0deg);opacity:0.9;filter:blur(0)} }
@keyframes morsmordre-snake { 0%{transform:translateY(-30px) scaleY(0);opacity:0} 60%{transform:translateY(5px) scaleY(1);opacity:1} 100%{transform:translateY(0) scaleY(1);opacity:0.8} }
@keyframes morsmordre-glow { 0%,100%{filter:drop-shadow(0 0 15px rgba(34,197,94,0.5))} 50%{filter:drop-shadow(0 0 30px rgba(34,197,94,0.9))} }

/* ── 厉火咒 ── */
@keyframes fiendfyre-erupt { 0%{transform:scaleY(0);opacity:0} 40%{transform:scaleY(1);opacity:1} 60%{transform:scaleY(1.1) scaleX(1.05);opacity:1} 100%{transform:scaleY(1.3) scaleX(0.8);opacity:0} }
@keyframes fiendfyre-beast { 0%{transform:translateX(0) scaleX(1)} 25%{transform:translateX(40px) scaleX(-1)} 50%{transform:translateX(-30px) scaleX(1)} 75%{transform:translateX(50px) scaleX(-1)} 100%{transform:translateX(0) scaleX(1);opacity:0} }
@keyframes fiendfyre-flicker { 0%,100%{opacity:0.8;transform:scaleY(1)} 25%{opacity:1;transform:scaleY(1.1)} 75%{opacity:0.9;transform:scaleY(0.95)} }

/* ── 一忘皆空 ── */
@keyframes obliviate-fog { 0%{opacity:0;transform:scale(0.3)} 60%{opacity:0.9;transform:scale(1.5)} 100%{opacity:1;transform:scale(3)} }
@keyframes obliviate-wipe { 0%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0 0 0)} }

/* ── 钻心剜骨 ── */
@keyframes crucio-bolt { 0%{opacity:0;transform:scaleY(0)} 10%{opacity:1;transform:scaleY(1)} 30%{opacity:0.5} 50%{opacity:1} 100%{opacity:0} }
@keyframes crucio-vortex { 0%{transform:scale(0) rotate(0deg);opacity:0} 50%{transform:scale(1) rotate(180deg);opacity:0.8} 100%{transform:scale(1.5) rotate(360deg);opacity:0} }
@keyframes crucio-arc { 0%{opacity:0;transform:translate(0,0)} 30%{opacity:1} 100%{opacity:0;transform:translate(var(--ax),var(--ay))} }

/* ── 魂魄出窍 ── */
@keyframes imperio-spiral { 0%{transform:rotate(0deg) scale(0.5);opacity:0} 50%{transform:rotate(180deg) scale(1);opacity:0.7} 100%{transform:rotate(360deg) scale(1.2);opacity:0} }
@keyframes imperio-ring { 0%{transform:scale(0.3) rotate(var(--ir));opacity:0} 50%{opacity:0.6} 100%{transform:scale(1.5) rotate(calc(var(--ir) + 180deg));opacity:0} }
@keyframes imperio-eye { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:0} }

/* ── 阿瓦达索命 ── */
@keyframes avada-bolt { 0%{transform:translateY(100%) scaleY(0.5);opacity:0} 5%{opacity:1;transform:translateY(80%) scaleY(0.8)} 15%{transform:translateY(-20%) scaleY(1.2);opacity:1} 40%{opacity:0.3} 100%{opacity:0} }
@keyframes avada-flash { 0%{opacity:0} 8%{opacity:1} 30%{opacity:0.4} 100%{opacity:0} }
@keyframes avada-ember { 0%{opacity:0.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(80px) scale(0.3)} }
@keyframes avada-afterglow { 0%{opacity:0.6} 100%{opacity:0} }
`;

/* ───────── helpers ───────── */
function particles(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + seed) * 137.5 * Math.PI) / 180;
    const dist = 60 + ((i * 17 + seed * 3) % 120);
    return { i, angle, dist, delay: (i * 0.04) % 0.8, size: 3 + (i % 4) };
  });
}

/* ───────── spell renderers ───────── */
function ShieldCharm() {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Hexagonal shield */}
        <div
          className="w-[300px] h-[300px] rounded-lg border-4 border-blue-300/80"
          style={{
            animation: 'shield-expand 2s ease-out forwards',
            background: 'radial-gradient(circle, rgba(100,150,255,0.3) 0%, transparent 70%)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: '0 0 40px rgba(100,150,255,0.6), inset 0 0 40px rgba(100,150,255,0.2)',
          }}
        />
      </div>
      {/* Ripples */}
      {[0, 0.4, 0.8].map((delay, i) => (
        <div key={i} className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-[280px] h-[280px] rounded-lg border-2 border-blue-200/40"
            style={{
              animation: `shield-ripple 1.8s ease-out ${delay}s forwards`,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
        </div>
      ))}
      {/* Shatter particles */}
      {particles(12, 42).map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-2 h-2 bg-blue-200 rounded-full"
          style={{
            animation: `confetti-burst 1s ease-out 1.5s forwards`,
            '--cx': `${Math.cos(p.angle) * p.dist}px`,
            '--cy': `${Math.sin(p.angle) * p.dist}px`,
            '--cr': `${p.i * 30}deg`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function PatronusCharm() {
  const pts = useMemo(() => particles(30, 77), []);
  return (
    <>
      {/* Silver particles converge */}
      {pts.map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-white/80"
          style={{
            animation: `patronus-converge 1.2s ease-out ${p.delay}s forwards`,
            '--tx': `${Math.cos(p.angle) * p.dist * 2}px`,
            '--ty': `${Math.sin(p.angle) * p.dist * 2}px`,
            boxShadow: '0 0 8px rgba(192,192,255,0.8)',
          } as React.CSSProperties}
        />
      ))}
      {/* Silver deer silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-8xl select-none"
          style={{
            animation: 'patronus-glow 1.5s ease-in-out 0.8s forwards, spell-scale-in 0.6s ease-out 0.8s forwards, patronus-charge 1s ease-in 1.8s forwards',
            color: 'rgba(200,200,255,0.9)',
            filter: 'drop-shadow(0 0 20px rgba(192,192,255,0.8))',
            opacity: 0,
          }}
        >
          🦌
        </div>
      </div>
      {/* Dissolve sparkles */}
      {particles(16, 33).map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/70"
          style={{
            animation: `patronus-particle 1s ease-out 2s forwards`,
            '--dx': `${Math.cos(p.angle) * (p.dist + 50)}px`,
            '--dy': `${Math.sin(p.angle) * (p.dist + 50)}px`,
            boxShadow: '0 0 6px rgba(192,192,255,0.6)',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Riddikulus() {
  const confetti = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      i,
      cx: ((i * 47 + 13) % 200) - 100,
      cy: -100 - (i * 31 % 150),
      cr: (i * 67) % 360,
      color: ['#f43f5e', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'][i % 6],
      size: 6 + (i % 5) * 2,
      delay: 0.6 + (i * 0.03) % 0.5,
    })), []);
  return (
    <>
      {/* Smoke puff */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[200px] h-[200px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(60,20,80,0.7) 0%, transparent 70%)',
            animation: 'smoke-puff 0.8s ease-out forwards',
          }}
        />
      </div>
      {/* Confetti burst */}
      {confetti.map((c) => (
        <div
          key={c.i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            borderRadius: c.i % 2 === 0 ? '50%' : '2px',
            animation: `confetti-burst 1.2s ease-out ${c.delay}s forwards`,
            '--cx': `${c.cx}px`,
            '--cy': `${c.cy}px`,
            '--cr': `${c.cr}deg`,
          } as React.CSSProperties}
        />
      ))}
      {/* Sparkles */}
      {particles(8, 55).map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-1 h-1 bg-yellow-300 rounded-full"
          style={{
            animation: `confetti-burst 0.8s ease-out 0.7s forwards`,
            '--cx': `${Math.cos(p.angle) * (p.dist + 30)}px`,
            '--cy': `${Math.sin(p.angle) * (p.dist + 30)}px`,
            '--cr': '0deg',
            boxShadow: '0 0 8px rgba(250,204,21,0.8)',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Episkey() {
  const cracks = useMemo(() => [
    { x: 30, y: 20, w: 200, r: -15, delay: 0 },
    { x: 50, y: 40, w: 150, r: 30, delay: 0.15 },
    { x: 25, y: 55, w: 180, r: -5, delay: 0.3 },
    { x: 60, y: 30, w: 120, r: 45, delay: 0.1 },
  ], []);
  return (
    <>
      {/* Golden cracks */}
      {cracks.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${c.x}%`, top: `${c.y}%`, width: c.w, height: 2,
            background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
            transform: `rotate(${c.r}deg)`,
            animation: `crack-appear 1.5s ease-out ${c.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      {/* Green heal glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 60%)',
            animation: 'heal-glow 1.5s ease-in-out 0.8s forwards',
            opacity: 0,
          }}
        />
      </div>
      {/* Intact screen flash */}
      <div
        className="absolute inset-0 bg-emerald-400/10"
        style={{ animation: 'spell-fade-out 0.5s ease-out 1.5s forwards' }}
      />
    </>
  );
}

function Lumos() {
  const rays = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    i,
    angle: i * 30,
    delay: 0.3 + (i * 0.03),
  })), []);
  const embers = useMemo(() => particles(20, 99), []);
  return (
    <>
      {/* Darkness */}
      <div className="absolute inset-0 bg-black/80" style={{ animation: 'lumos-dark 2.5s ease-out 0.3s forwards' }} />
      {/* Central light burst */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[100px] h-[100px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #fff 0%, #ffd700 40%, transparent 70%)',
            boxShadow: '0 0 80px 40px rgba(255,215,0,0.6), 0 0 200px 80px rgba(255,215,0,0.3)',
            animation: 'lumos-burst 2s ease-out 0.2s forwards',
          }}
        />
      </div>
      {/* Light rays */}
      {rays.map((r) => (
        <div
          key={r.i}
          className="absolute left-1/2 top-1/2 -ml-[1px] -mt-[150px]"
          style={{
            width: 2,
            height: 150,
            background: 'linear-gradient(to top, rgba(255,215,0,0.6), transparent)',
            transformOrigin: 'bottom center',
            transform: `rotate(${r.angle}deg)`,
            animation: `lumos-ray 1.5s ease-out ${r.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      {/* Embers */}
      {embers.map((e) => (
        <div
          key={e.i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-yellow-200 rounded-full"
          style={{
            animation: `lumos-ember 1.5s ease-out 0.5s forwards`,
            '--ex': `${Math.cos(e.angle) * e.dist}px`,
            '--ey': `${Math.sin(e.angle) * e.dist}px`,
            boxShadow: '0 0 4px rgba(255,215,0,0.8)',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function WingardiumLeviosa() {
  const objects = useMemo(() => [
    { emoji: '🪶', x: 35, lh: -80, lr: '-10deg', delay: 0 },
    { emoji: '🪨', x: 55, lh: -100, lr: '20deg', delay: 0.2 },
    { emoji: '📕', x: 45, lh: -70, lr: '-5deg', delay: 0.4 },
  ], []);
  const trails = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    i,
    x: 33 + (i % 3) * 11,
    delay: (i * 0.15) % 1.2,
  })), []);
  return (
    <>
      {objects.map((obj, i) => (
        <div
          key={i}
          className="absolute text-4xl select-none"
          style={{
            left: `${obj.x}%`,
            bottom: '5%',
            animation: `levitate-rise 1s ease-out ${obj.delay}s forwards, levitate-bob 1.5s ease-in-out ${1 + obj.delay}s infinite`,
            '--lh': `${obj.lh}px`,
            '--lr': obj.lr,
          } as React.CSSProperties}
        >
          {obj.emoji}
        </div>
      ))}
      {/* Upward trails */}
      {trails.map((t) => (
        <div
          key={t.i}
          className="absolute w-0.5 h-4 bg-amber-300/50 rounded-full"
          style={{
            left: `${t.x}%`,
            bottom: '10%',
            animation: `levitate-trail 1s ease-out ${t.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function Accio() {
  return (
    <>
      {/* Streak from far right to center-left */}
      <div
        className="absolute left-1/2 top-1/2 w-3 h-3 bg-amber-300 rounded-full"
        style={{
          boxShadow: '0 0 20px 8px rgba(201,168,76,0.7), 0 0 60px 20px rgba(201,168,76,0.3)',
          animation: 'accio-streak 1.5s ease-in forwards',
        }}
      />
      {/* Motion trail */}
      <div
        className="absolute left-1/2 top-1/2 h-1 bg-gradient-to-l from-amber-300/60 to-transparent rounded-full"
        style={{
          animation: 'accio-trail 1s ease-out 0.2s forwards',
          transform: 'translate(0, -50%)',
        }}
      />
      {/* Impact sparkles */}
      {particles(10, 21).map((p) => (
        <div
          key={p.i}
          className="absolute left-1/4 top-1/2 w-1.5 h-1.5 bg-amber-200 rounded-full"
          style={{
            animation: `confetti-burst 0.8s ease-out 1s forwards`,
            '--cx': `${Math.cos(p.angle) * (p.dist * 0.5)}px`,
            '--cy': `${Math.sin(p.angle) * (p.dist * 0.5)}px`,
            '--cr': '0deg',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Alohomora() {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Door frame */}
        <div className="relative w-[180px] h-[260px] border-4 border-amber-900/70 rounded-t-lg overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #3d2b1f 0%, #5c3a21 100%)' }}>
          {/* Keyhole */}
          <div className="absolute top-1/2 left-3 -translate-y-1/2">
            <div
              className="w-4 h-4 rounded-full border-2 border-amber-400"
              style={{ animation: 'door-glow 1s ease-in-out 0.3s forwards', boxShadow: '0 0 15px rgba(201,168,76,0.6)' }}
            />
            <div className="w-1.5 h-4 bg-amber-900 mx-auto" />
          </div>
          {/* Door swings open */}
          <div
            className="absolute inset-0 origin-left"
            style={{
              background: 'linear-gradient(180deg, #3d2b1f 0%, #5c3a21 100%)',
              animation: 'door-swing 1s ease-out 0.8s forwards',
            }}
          />
          {/* Light from behind */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.1) 60%, transparent 100%)',
              animation: 'door-light 1s ease-out 0.8s forwards',
              clipPath: 'inset(0 100% 0 0)',
            }}
          />
        </div>
      </div>
      {/* Warm light flood */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 40% 50%, rgba(255,215,0,0.2) 0%, transparent 50%)',
          animation: 'spell-fade-in 0.5s ease-out 1s forwards, spell-fade-out 1s ease-out 1.8s forwards',
          opacity: 0,
        }}
      />
    </>
  );
}

function Reparo() {
  const pieces = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    i,
    px: ((i * 61 + 7) % 160) - 80,
    py: ((i * 43 + 11) % 120) - 60,
    pr: ((i * 37) % 90) - 45,
    delay: i * 0.06,
  })), []);
  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-6 h-6 border border-amber-600/40 rounded-sm"
          style={{
            background: 'rgba(201,168,76,0.15)',
            animation: `repair-fly 1s ease-out ${p.delay}s forwards`,
            '--px': `${p.px}px`,
            '--py': `${p.py}px`,
            '--pr': `${p.pr}deg`,
          } as React.CSSProperties}
        />
      ))}
      {/* Gold flash when assembled */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[80px] h-[80px] rounded-sm"
          style={{
            animation: 'repair-flash 0.5s ease-out 1s forwards',
            opacity: 0,
          }}
        />
      </div>
    </>
  );
}

function Expelliarmus() {
  const sparks = useMemo(() => particles(15, 11), []);
  return (
    <>
      {/* Red bolt */}
      <div className="absolute left-1/2 top-full w-4 -ml-2 h-[120%]">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(to top, transparent, #ef4444 30%, #ff6b6b 60%, transparent)',
            boxShadow: '0 0 30px 10px rgba(239,68,68,0.5)',
            animation: 'expel-bolt 1s ease-out forwards',
          }}
        />
      </div>
      {/* Red sparks at impact */}
      {sparks.map((s) => (
        <div
          key={s.i}
          className="absolute left-1/2 top-1/3 w-2 h-2 bg-red-400 rounded-full"
          style={{
            animation: `expel-spark 0.8s ease-out 0.5s forwards`,
            '--sx': `${Math.cos(s.angle) * s.dist * 0.8}px`,
            '--sy': `${Math.sin(s.angle) * s.dist * 0.8}px`,
            boxShadow: '0 0 6px rgba(239,68,68,0.8)',
          } as React.CSSProperties}
        />
      ))}
      {/* Wand flying out */}
      <div
        className="absolute left-1/2 top-1/3 text-3xl select-none"
        style={{ animation: 'expel-wand-fly 1.2s ease-in 0.6s forwards' }}
      >
        🪄
      </div>
      {/* Screen shake */}
      <div className="absolute inset-0" style={{ animation: 'spell-screen-shake 0.3s ease-out 0.5s' }} />
    </>
  );
}

function Stupefy() {
  return (
    <>
      {/* Red star bolt */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="w-[60px] h-[60px]"
          style={{
            background: 'radial-gradient(circle, #ff4444 0%, #cc0000 40%, transparent 70%)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            animation: 'spell-scale-in 0.3s ease-out forwards',
            boxShadow: '0 0 30px rgba(255,0,0,0.6)',
          }}
        />
      </div>
      {/* Red flash */}
      <div
        className="absolute inset-0 bg-red-600/30"
        style={{ animation: 'stupefy-flash 0.8s ease-out 0.3s forwards' }}
      />
      {/* Shockwave */}
      {[0, 0.15].map((delay, i) => (
        <div key={i} className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-[100px] h-[100px] rounded-full border-2 border-red-400/50"
            style={{ animation: `stupefy-wave 1s ease-out ${delay}s forwards` }}
          />
        </div>
      ))}
      {/* Screen shake */}
      <div className="absolute inset-0" style={{ animation: 'spell-screen-shake 0.4s ease-out 0.3s' }} />
    </>
  );
}

function PetrificusTotalus() {
  const runes = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    i,
    x: 15 + (i * 14) % 70,
    y: 15 + (i * 19) % 70,
    char: 'ᚠᚢᚦᚨᚱᚲ'[i],
    delay: 0.3 + i * 0.1,
  })), []);
  return (
    <>
      {/* Stone texture spreading */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #4a4a4a 0%, #6b6b6b 30%, #555 60%, #787878 100%)',
          animation: 'petrify-spread 1.5s ease-out forwards',
          clipPath: 'inset(50% 50% 50% 50%)',
        }}
      />
      {/* Ancient runes */}
      {runes.map((r) => (
        <div
          key={r.i}
          className="absolute text-2xl text-amber-400/80 select-none"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            animation: `petrify-rune 1s ease-out ${r.delay}s forwards`,
            opacity: 0,
          }}
        >
          {r.char}
        </div>
      ))}
      {/* Crack and dissolve */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(100,100,100,0.3) 100%)',
          animation: 'petrify-crack 0.8s ease-in 1.8s forwards',
        }}
      />
    </>
  );
}

function Impedimenta() {
  const rubble = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    i,
    x: 10 + (i * 13) % 80,
    delay: 0.8 + i * 0.08,
  })), []);
  return (
    <>
      {/* Stone wall rising */}
      <div className="absolute bottom-0 left-0 right-0 h-[60%]">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(180deg, #5a4a3a 0%, #3d3229 40%, #2d241e 100%)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            animation: 'wall-rise 1s ease-out forwards',
          }}
        />
        {/* Wall texture lines */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="absolute w-full h-px bg-amber-900/30" style={{ top: `${(i + 1) * 20}%` }} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="absolute h-full w-px bg-amber-900/30" style={{ left: `${(i + 1) * 25}%` }} />
          ))}
        </div>
        {/* Rune glow on wall */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-4xl text-amber-500/60 select-none"
          style={{ animation: 'wall-rune-glow 1.5s ease-in-out 0.6s infinite' }}>
          ᛗ
        </div>
      </div>
      {/* Rubble falling */}
      {rubble.map((r) => (
        <div
          key={r.i}
          className="absolute w-3 h-3 bg-stone-600 rounded-sm"
          style={{
            left: `${r.x}%`,
            top: '35%',
            animation: `rubble-fall 0.8s ease-in ${r.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </>
  );
}

function Sectumsempra() {
  const cuts = useMemo(() => [
    { y: 35, r: -8, delay: 0.3 },
    { y: 45, r: 5, delay: 0.5 },
    { y: 55, r: -12, delay: 0.7 },
    { y: 40, r: 15, delay: 0.6 },
    { y: 60, r: -3, delay: 0.8 },
  ], []);
  return (
    <>
      {/* Invisible slash - thin white line */}
      <div
        className="absolute left-0 top-1/2 h-[2px] bg-white/90"
        style={{
          animation: 'sectum-slash 0.6s ease-out forwards',
          boxShadow: '0 0 10px rgba(255,255,255,0.8)',
        }}
      />
      {/* Red gashes appearing */}
      {cuts.map((c, i) => (
        <div
          key={i}
          className="absolute left-[10%] w-[80%]"
          style={{
            top: `${c.y}%`,
            transform: `rotate(${c.r}deg)`,
            animation: `sectum-bleed 1.5s ease-out ${c.delay}s forwards`,
            background: 'linear-gradient(90deg, transparent, #8b0000, #dc143c, #8b0000, transparent)',
            opacity: 0,
            height: 0,
          }}
        />
      ))}
      {/* Dark red drip effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(139,0,0,0.2) 0%, transparent 60%)',
          animation: 'spell-fade-in 0.5s ease-out 0.8s forwards, spell-fade-out 1s ease-out 1.5s forwards',
          opacity: 0,
        }}
      />
    </>
  );
}

function Morsmordre() {
  return (
    <>
      {/* Dark green sky */}
      <div
        className="absolute inset-0"
        style={{ animation: 'morsmordre-sky 1s ease-out forwards' }}
      />
      {/* Green glow from below */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(34,197,94,0.2) 0%, transparent 60%)',
          animation: 'spell-fade-in 0.5s ease-out 0.3s forwards',
          opacity: 0,
        }}
      />
      {/* Skull */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-9xl select-none"
          style={{
            animation: 'morsmordre-skull 1.5s ease-out 0.3s forwards, morsmordre-glow 1s ease-in-out 1s infinite',
            color: 'rgba(34,197,94,0.9)',
            opacity: 0,
          }}
        >
          💀
        </div>
      </div>
      {/* Snake */}
      <div
        className="absolute left-1/2 top-[55%] text-5xl select-none"
        style={{
          animation: 'morsmordre-snake 1s ease-out 1s forwards',
          color: 'rgba(34,197,94,0.8)',
          opacity: 0,
          filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.6))',
        }}
      >
        🐍
      </div>
      {/* Eerie green glow particles */}
      {particles(10, 88).map((p) => (
        <div
          key={p.i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-green-400/60 rounded-full"
          style={{
            animation: `confetti-burst 1.5s ease-out 0.8s forwards`,
            '--cx': `${Math.cos(p.angle) * p.dist}px`,
            '--cy': `${Math.sin(p.angle) * p.dist}px`,
            '--cr': '0deg',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Fiendfyre() {
  const flames = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    i,
    x: 35 + (i * 11) % 30,
    w: 40 + (i * 7) % 40,
    h: 80 + (i * 13) % 60,
    delay: (i * 0.06) % 0.5,
  })), []);
  return (
    <>
      {/* Fire erupting from bottom */}
      {flames.map((f) => (
        <div
          key={f.i}
          className="absolute bottom-0"
          style={{
            left: `${f.x}%`,
            width: f.w,
            height: f.h,
            background: `linear-gradient(to top, #8b0000, #ff4500 30%, #ff6347 50%, #ffa500 70%, transparent)`,
            borderRadius: '50% 50% 0 0',
            animation: `fiendfyre-erupt 1.5s ease-out ${f.delay}s forwards, fiendfyre-flicker 0.3s ease-in-out ${0.5 + f.delay}s infinite`,
            filter: 'blur(2px)',
            opacity: 0,
          }}
        />
      ))}
      {/* Fire beast */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl select-none"
        style={{
          animation: 'fiendfyre-beast 2s ease-in-out 0.8s forwards',
          filter: 'drop-shadow(0 0 20px rgba(255,69,0,0.8))',
          opacity: 0,
        }}
      >
        🐉
      </div>
      {/* Orange glow overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 70%, rgba(255,69,0,0.15) 0%, transparent 60%)',
          animation: 'spell-fade-in 0.5s ease-out 0.2s forwards, spell-fade-out 1s ease-out 1.5s forwards',
          opacity: 0,
        }}
      />
    </>
  );
}

function Obliviate() {
  return (
    <>
      {/* White fog from edges */}
      {Array.from({ length: 4 }, (_, i) => {
        const positions = [
          { left: 0, top: '30%', w: '40%', h: '40%' },
          { right: 0, top: '20%', w: '40%', h: '50%' },
          { left: '20%', top: 0, w: '60%', h: '30%' },
          { left: '10%', bottom: 0, w: '80%', h: '30%' },
        ][i];
        return (
          <div
            key={i}
            className="absolute"
            style={{
              ...positions,
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 70%)',
              animation: `obliviate-fog 2s ease-out ${i * 0.2}s forwards`,
              opacity: 0,
            }}
          />
        );
      })}
      {/* White wipe */}
      <div
        className="absolute inset-0 bg-white/90"
        style={{ animation: 'obliviate-wipe 1s ease-out 1.2s forwards', clipPath: 'inset(0 100% 0 0)' }}
      />
    </>
  );
}

function Crucio() {
  const arcs = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    i,
    ax: ((i * 61 + 7) % 120) - 60,
    ay: ((i * 43 + 11) % 120) - 60,
    delay: (i * 0.06) % 0.6,
  })), []);
  return (
    <>
      {/* Red lightning from corners */}
      {[
        { from: 'top-0 left-0', delay: 0 },
        { from: 'top-0 right-0', delay: 0.05 },
        { from: 'bottom-0 left-0', delay: 0.1 },
        { from: 'bottom-0 right-0', delay: 0.15 },
      ].map((bolt, i) => (
        <div
          key={i}
          className={`absolute ${bolt.from} w-1 h-[60%]`}
          style={{
            background: 'linear-gradient(to bottom, transparent, #dc2626, #ff4444, #dc2626, transparent)',
            boxShadow: '0 0 15px rgba(220,38,38,0.7)',
            animation: `crucio-bolt 1s ease-out ${bolt.delay}s forwards`,
            transformOrigin: i < 2 ? 'top center' : 'bottom center',
          }}
        />
      ))}
      {/* Energy vortex at center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[120px] h-[120px] rounded-full border-2 border-red-500/50"
          style={{
            animation: 'crucio-vortex 1.5s ease-out 0.5s forwards',
            boxShadow: '0 0 30px rgba(220,38,38,0.5), inset 0 0 30px rgba(220,38,38,0.3)',
          }}
        />
      </div>
      {/* Red arcs jumping */}
      {arcs.map((a) => (
        <div
          key={a.i}
          className="absolute left-1/2 top-1/2 w-2 h-2 bg-red-400 rounded-full"
          style={{
            animation: `crucio-arc 0.6s ease-out ${0.3 + a.delay}s forwards`,
            '--ax': `${a.ax}px`,
            '--ay': `${a.ay}px`,
            boxShadow: '0 0 8px rgba(220,38,38,0.8)',
          } as React.CSSProperties}
        />
      ))}
      {/* Screen shake */}
      <div className="absolute inset-0" style={{ animation: 'spell-screen-shake 0.5s ease-out 0.5s' }} />
    </>
  );
}

function Imperio() {
  return (
    <>
      {/* Purple spiral */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300" className="opacity-70">
          <circle cx="150" cy="150" r="40" fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="2"
            style={{ animation: 'imperio-ring 2s linear 0s infinite', '--ir': '0deg' } as React.CSSProperties} />
          <circle cx="150" cy="150" r="60" fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5"
            style={{ animation: 'imperio-ring 2s linear 0.3s infinite', '--ir': '45deg' } as React.CSSProperties} />
          <circle cx="150" cy="150" r="80" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1"
            style={{ animation: 'imperio-ring 2s linear 0.6s infinite', '--ir': '90deg' } as React.CSSProperties} />
          <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1"
            style={{ animation: 'imperio-ring 2s linear 0.9s infinite', '--ir': '135deg' } as React.CSSProperties} />
        </svg>
      </div>
      {/* Spiral overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[200px] h-[200px] rounded-full border-4 border-purple-500/30"
          style={{ animation: 'imperio-spiral 2s linear 0.3s forwards' }}
        />
      </div>
      {/* Glowing eye */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-6xl select-none"
          style={{
            animation: 'imperio-eye 1.5s ease-out 0.5s forwards',
            color: 'rgba(139,92,246,0.9)',
            filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.8))',
            opacity: 0,
          }}
        >
          👁️
        </div>
      </div>
      {/* Purple tint overlay */}
      <div
        className="absolute inset-0 bg-purple-900/10"
        style={{ animation: 'spell-fade-in 0.5s ease-out forwards, spell-fade-out 1s ease-out 1.5s forwards' }}
      />
    </>
  );
}

function AvadaKedavra() {
  const embers = useMemo(() => particles(25, 7), []);
  return (
    <>
      {/* Green lightning bolt */}
      <div className="absolute left-1/2 -ml-[2px] top-0 w-1 h-full">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(to top, transparent 0%, #00ff00 20%, #22c55e 50%, #00ff00 80%, transparent 100%)',
            boxShadow: '0 0 40px 15px rgba(34,197,94,0.6), 0 0 100px 30px rgba(34,197,94,0.3)',
            animation: 'avada-bolt 1.5s ease-out forwards',
          }}
        />
      </div>
      {/* Green flash - illuminates entire screen */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(34,197,94,0.3)',
          animation: 'avada-flash 1s ease-out 0.1s forwards',
        }}
      />
      {/* Second flash (lightning flicker) */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(34,197,94,0.2)',
          animation: 'avada-flash 0.6s ease-out 0.4s forwards',
          opacity: 0,
        }}
      />
      {/* Green embers drifting down */}
      {embers.map((e) => (
        <div
          key={e.i}
          className="absolute w-1.5 h-1.5 bg-green-400 rounded-full"
          style={{
            left: `${40 + (e.i * 7) % 20}%`,
            top: `${20 + (e.i * 5) % 30}%`,
            animation: `avada-ember 1.5s ease-out ${0.5 + e.delay}s forwards`,
            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
          } as React.CSSProperties}
        />
      ))}
      {/* Green afterglow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 50%)',
          animation: 'avada-afterglow 1.5s ease-out 1s forwards',
        }}
      />
    </>
  );
}

/* ───────── main component ───────── */
const SPELL_RENDERERS: Record<string, () => React.ReactNode> = {
  '盔甲护身': ShieldCharm,
  '呼神护卫': PatronusCharm,
  '滑稽滑稽': Riddikulus,
  '恢复如初': Episkey,
  '荧光闪烁': Lumos,
  '悬浮咒': WingardiumLeviosa,
  '速速前': Accio,
  '阿拉霍洞开': Alohomora,
  '修复如初': Reparo,
  '除你武器': Expelliarmus,
  '昏昏倒地': Stupefy,
  '统统石化': PetrificusTotalus,
  '障碍重重': Impedimenta,
  '神锋无影': Sectumsempra,
  '尸骨再现': Morsmordre,
  '厉火咒': Fiendfyre,
  '一忘皆空': Obliviate,
  '钻心剜骨': Crucio,
  '魂魄出窍': Imperio,
  '阿瓦达索命': AvadaKedavra,
};

export default function SpellAnimation({ spellName, onComplete }: SpellAnimationProps) {
  const Renderer = SPELL_RENDERERS[spellName];

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, 2500);
    return () => clearTimeout(timer);
  }, [handleComplete]);

  if (!Renderer) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <Renderer />
      </div>
    </>
  );
}
