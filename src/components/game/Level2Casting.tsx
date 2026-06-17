'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from './GameProvider';
import type { Level2Result } from './GameProvider';
import { getRandomPattern } from '@/lib/patterns';
import type { MagicPattern } from '@/lib/patterns';

type Phase = 'intro' | 'countdown' | 'drawing' | 'analyzing' | 'done';

interface Point {
  x: number;
  y: number;
  t: number;
}

export default function Level2Casting() {
  const { completeLevel2 } = useGame();

  const [phase, setPhase] = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [patternScore, setPatternScore] = useState(0);
  const [precisionScore, setPrecisionScore] = useState(0);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const overlayRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);
  const phaseRef = useRef<Phase>('intro');
  const cameraReadyRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const patternRef = useRef<MagicPattern | null>(null);
  const patternPointsRef = useRef<{ x: number; y: number }[]>([]);
  const patternLinesRef = useRef<{ from: number; to: number }[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const p = getRandomPattern();
    patternRef.current = p;
    patternPointsRef.current = p.points;
    patternLinesRef.current = p.segments.map(([from, to]) => ({ from, to }));
  }, []);

  const drawPattern = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number = 0.6) => {
    const pts = patternPointsRef.current;
    const lines = patternLinesRef.current;
    ctx.save();
    ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.shadowColor = 'rgba(201, 168, 76, 0.5)';
    ctx.shadowBlur = 10;
    for (const line of lines) {
      const from = pts[line.from];
      const to = pts[line.to];
      ctx.beginPath();
      ctx.moveTo(from.x * w, from.y * h);
      ctx.lineTo(to.x * w, to.y * h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`;
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, []);

  const drawTrail = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, points: Point[]) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * w, points[i].y * h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * w, points[i].y * h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 220, 100, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(201, 168, 76, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * w, points[i].y * h);
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x * w, last.y * h, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
    ctx.shadowColor = 'rgba(255, 220, 100, 1)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          cameraReadyRef.current = true;
          setCameraReady(true);
        };
      }
    } catch {
      setCameraError(true);
      cameraReadyRef.current = false;
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const detectBrightPoint = useCallback(() => {
    if (phaseRef.current !== 'drawing' || !cameraReadyRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    try {
      const sw = 160, sh = 120;
      const tc = document.createElement('canvas');
      tc.width = sw; tc.height = sh;
      const tctx = tc.getContext('2d');
      if (!tctx) return;
      tctx.save();
      tctx.translate(sw, 0);
      tctx.scale(-1, 1);
      tctx.drawImage(video, 0, 0, sw, sh);
      tctx.restore();
      const imgData = tctx.getImageData(0, 0, sw, sh);
      const d = imgData.data;
      let maxB = 0, bx = 0, by = 0;
      for (let y = 0; y < sh; y += 2) {
        for (let x = 0; x < sw; x += 2) {
          const i = (y * sw + x) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 200 && g > 170 && b > 140) {
            const bri = r + g + b;
            if (bri > maxB) { maxB = bri; bx = x / sw; by = y / sh; }
          }
        }
      }
      if (maxB > 0) {
        const np: Point = { x: bx, y: by, t: Date.now() };
        if (!lastPointRef.current || Math.abs(np.x - lastPointRef.current.x) > 0.005 || Math.abs(np.y - lastPointRef.current.y) > 0.005) {
          pointsRef.current.push(np);
          lastPointRef.current = np;
        }
      }
    } catch { /* ignore */ }
  }, []);

  const startOverlayLoop = useCallback(() => {
    const render = () => {
      if (phaseRef.current !== 'drawing') return;
      detectBrightPoint();
      const overlay = overlayRef.current;
      if (overlay) {
        const w = overlay.width, h = overlay.height;
        const ctx = overlay.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          drawPattern(ctx, w, h, 0.6);
          drawTrail(ctx, w, h, pointsRef.current);
        }
      }
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
  }, [detectBrightPoint, drawPattern, drawTrail]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('drawing');
      setTimeLeft(15);
      pointsRef.current = [];
      lastPointRef.current = null;
      requestAnimationFrame(() => startOverlayLoop());
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'drawing') return;
    if (timeLeft <= 0) { finishDrawing(); return; }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const timer = setTimeout(() => setPhase('done'), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done') return;
    const result: Level2Result = { pattern: patternRef.current!, score: patternScore, precision: precisionScore };
    completeLevel2(result);
  }, [phase, patternScore, precisionScore]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height, t: Date.now() };
  }, []);

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'drawing') return;
    setIsPointerDown(true);
    const pt = getCanvasPoint(clientX, clientY);
    if (pt) { pointsRef.current = [pt]; lastPointRef.current = pt; }
  }, [getCanvasPoint]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isPointerDown || phaseRef.current !== 'drawing') return;
    const pt = getCanvasPoint(clientX, clientY);
    if (pt) { pointsRef.current.push(pt); lastPointRef.current = pt; }
  }, [isPointerDown, getCanvasPoint]);

  const handlePointerUp = useCallback(() => { setIsPointerDown(false); }, []);

  const finishDrawing = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setPhase('analyzing');
    const pts = pointsRef.current;
    if (pts.length < 5) { setPatternScore(10); setPrecisionScore(10); return; }
    const lines = patternLinesRef.current;
    const vertices = patternPointsRef.current;
    let totalMinDist = 0;
    const step = Math.max(1, Math.floor(pts.length / 50));
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i];
      let minDist = Infinity;
      for (const line of lines) {
        const a = vertices[line.from], b = vertices[line.to];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) { minDist = Math.min(minDist, Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)); continue; }
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const d = Math.sqrt((p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2);
        minDist = Math.min(minDist, d);
      }
      totalMinDist += minDist;
    }
    const avgDist = totalMinDist / Math.ceil(pts.length / step);
    const coverage = Math.min(1, pts.length / 100);
    const accuracy = Math.max(0, 1 - avgDist / 0.15);
    setPatternScore(Math.min(100, Math.max(0, Math.round(accuracy * 60 + coverage * 40))));
    setPrecisionScore(Math.min(100, Math.max(0, Math.round(Math.max(0, (1 - avgDist / 0.2)) * 100))));
  }, []);

  const showCanvasArea = phase === 'drawing' || phase === 'countdown';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-4">
      {/* ===== ALWAYS render video (WebRTC rule) ===== */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* ===== Intro ===== */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="text-6xl mb-6" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", textShadow: '0 0 10px rgba(201,168,76,0.4)' }}>
            施咒考验
          </h2>
          <p className="mb-3 text-base" style={{ color: '#e8dcc8' }}>分院帽要考验你的施咒能力</p>
          <p className="mb-2 text-sm" style={{ color: '#9ca3af' }}>屏幕上会出现一个魔法符文，用你的魔杖沿着虚线描绘</p>
          <p className="mb-6 text-sm" style={{ color: '#9ca3af' }}>💡 打开手机手电筒对着摄像头，或用鼠标/手指绘制</p>
          <button
            onClick={async () => { await startCamera(); setPhase('countdown'); setCountdown(3); }}
            className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider cursor-pointer"
            style={{ fontFamily: "'Cinzel', serif", color: '#0a0e1a', background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)', boxShadow: '0 0 20px rgba(201,168,76,0.4)' }}
          >
            开始施咒
          </button>
        </div>
      )}

      {/* ===== Countdown ===== */}
      {phase === 'countdown' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,14,26,0.85)' }}>
          <div className="text-8xl font-bold" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", textShadow: '0 0 30px rgba(201,168,76,0.6)' }}>
            {countdown}
          </div>
          <p className="absolute bottom-20 text-lg" style={{ color: '#9ca3af' }}>准备好你的魔杖...</p>
        </div>
      )}

      {/* ===== Canvas area: video + overlay (always in DOM) ===== */}
      <div
        className="w-full max-w-lg"
        style={{ display: showCanvasArea ? 'block' : 'none' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>描绘符文</h2>
          {phase === 'drawing' && (
            <span className="text-2xl font-bold" style={{ color: timeLeft <= 5 ? '#ef4444' : '#c9a84c', fontFamily: "'Cinzel', serif" }}>
              {timeLeft}s
            </span>
          )}
        </div>

        {/* Video + Canvas container */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: '4/3', border: '1px solid rgba(201,168,76,0.3)', background: '#0a0e1a' }}
        >
          {/* Visible video - mirror selfie style */}
          {cameraReady && (
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              ref={(el) => {
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }}
            />
          )}

          {/* Dark background when no camera */}
          {!cameraReady && (
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #141428 0%, #0a0e1a 100%)' }} />
          )}

          {/* Dim overlay for pattern visibility on video */}
          {cameraReady && (
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
          )}

          {/* Overlay canvas (pattern + trail) */}
          <canvas
            ref={overlayRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: 'crosshair', touchAction: 'none', zIndex: 5 }}
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(); }}
          />

          {/* Drawing hint */}
          {phase === 'drawing' && (
            <div className="absolute top-3 left-0 right-0 text-center pointer-events-none" style={{ zIndex: 10 }}>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'rgba(10,14,26,0.7)', color: '#c9a84c' }}>
                {cameraError ? '🖱️ 用鼠标或手指沿着虚线描绘符文' : '🪄 用魔杖光源描绘 / 或用鼠标绘制'}
              </span>
            </div>
          )}
        </div>

        {/* Finish button */}
        {phase === 'drawing' && (
          <button
            onClick={finishDrawing}
            className="mt-4 px-6 py-2 rounded-lg text-sm font-bold tracking-wider cursor-pointer"
            style={{ fontFamily: "'Cinzel', serif", color: '#0a0e1a', background: 'linear-gradient(135deg, #c9a84c, #d4a017)' }}
          >
            画完了
          </button>
        )}
      </div>

      {/* ===== Analyzing ===== */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-6xl mb-4" style={{ animation: 'hatWobble 1s ease-in-out infinite' }}>🎩</div>
          <p className="text-xl" style={{ color: '#c9a84c', textShadow: '0 0 10px rgba(201,168,76,0.4)' }}>分院帽正在解读你的符文...</p>
        </div>
      )}

      {/* ===== Done ===== */}
      {phase === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
          <p className="text-4xl font-bold mb-4" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", textShadow: '0 0 15px rgba(201,168,76,0.5)' }}>符文解读完成</p>
          <div className="flex gap-8 text-lg">
            <div>
              <p style={{ color: '#9ca3af' }}>匹配度</p>
              <p className="text-3xl font-bold" style={{ color: '#c9a84c' }}>{patternScore}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af' }}>精度</p>
              <p className="text-3xl font-bold" style={{ color: '#c9a84c' }}>{precisionScore}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
