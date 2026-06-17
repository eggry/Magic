'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from './GameProvider';
import { getRandomPattern } from '@/lib/patterns';
import type { Level2Result } from './GameProvider';

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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [patternScore, setPatternScore] = useState(0);
  const [precisionScore, setPrecisionScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);
  const phaseRef = useRef<Phase>('intro');

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Target pattern: five-pointed star
  const patternPoints = useRef<{ x: number; y: number }[]>([]);
  const patternLines = useRef<{ from: number; to: number }[]>([]);

  // Initialize pattern
  useEffect(() => {
    const cx = 0.5, cy = 0.5, r = 0.3;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    patternPoints.current = pts;
    patternLines.current = [
      { from: 0, to: 2 }, { from: 2, to: 4 }, { from: 4, to: 1 },
      { from: 1, to: 3 }, { from: 3, to: 0 },
    ];
  }, []);

  // Draw target pattern on a canvas context
  const drawPattern = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number = 0.6) => {
    const pts = patternPoints.current;
    const lines = patternLines.current;

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

    // Draw vertex dots
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`;
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // Draw traced trail with glow effect
  const drawTrail = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, points: Point[]) => {
    if (points.length < 2) return;
    ctx.save();

    // Outer glow
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();

    // Mid glow
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();

    // Core line
    ctx.strokeStyle = 'rgba(255, 220, 100, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(201, 168, 76, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();

    // Bright tip
    if (points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x * w, last.y * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
      ctx.shadowColor = 'rgba(255, 220, 100, 1)';
      ctx.shadowBlur = 20;
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // Draw dark background with grid when no camera
  const drawDarkBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Dark gradient background
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#141428');
    grad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.04)';
    ctx.lineWidth = 1;
    const step = 30;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Corner runes
    ctx.fillStyle = 'rgba(201, 168, 76, 0.08)';
    ctx.font = '16px serif';
    ctx.fillText('✦', 15, 25);
    ctx.fillText('✦', w - 25, 25);
    ctx.fillText('✦', 15, h - 10);
    ctx.fillText('✦', w - 25, h - 10);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              resolve();
            };
          }
        });
        setCameraReady(true);
      }
    } catch {
      setCameraError(true);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ---- Countdown effect ----
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      startDrawing();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- TimeLeft effect (drawing phase) ----
  useEffect(() => {
    if (phase !== 'drawing') return;
    if (timeLeft <= 0) {
      finishDrawing();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Analyzing delay effect ----
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const timer = setTimeout(() => setPhase('done'), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  // ---- Done phase: submit result ----
  useEffect(() => {
    if (phase !== 'done') return;
    const total = Math.round(patternScore * 0.6 + precisionScore * 0.4);
    const result: Level2Result = {
      pattern: getRandomPattern(),
      score: patternScore,
      precision: precisionScore,
    };
    completeLevel2(result);
  }, [phase, patternScore, precisionScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Start drawing phase ----
  const startDrawing = useCallback(() => {
    setPhase('drawing');
    setTimeLeft(15);
    pointsRef.current = [];
    lastPointRef.current = null;
    setDrawingPoints([]);

    // Start render loop
    const render = () => {
      if (phaseRef.current !== 'drawing') return;

      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      const octx = overlay.getContext('2d');
      if (!ctx || !octx) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Main canvas: video or dark background
      if (cameraReady && videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        // Slight darken
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, w, h);
        // Detect bright point for wand tracking
        detectBrightPoint(ctx, w, h);
      } else {
        drawDarkBackground(ctx, w, h);
      }

      // Overlay: pattern + trail
      octx.clearRect(0, 0, w, h);
      drawPattern(octx, w, h, 0.6);
      drawTrail(octx, w, h, pointsRef.current);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
  }, [cameraReady, drawDarkBackground, drawPattern, drawTrail]);

  // Detect bright point from camera frame (wand tip)
  const detectBrightPoint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (phaseRef.current !== 'drawing') return;

    try {
      const sampleW = 160, sampleH = 120;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sampleW;
      tempCanvas.height = sampleH;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(ctx.canvas, 0, 0, sampleW, sampleH);
      const imageData = tempCtx.getImageData(0, 0, sampleW, sampleH);
      const data = imageData.data;

      let maxBrightness = 0;
      let brightX = 0, brightY = 0;
      const threshold = 200;

      for (let y = 0; y < sampleH; y += 2) {
        for (let x = 0; x < sampleW; x += 2) {
          const idx = (y * sampleW + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          // Detect very bright, warm-white light (phone flashlight)
          if (r > threshold && g > threshold * 0.85 && b > threshold * 0.7) {
            const brightness = r + g + b;
            if (brightness > maxBrightness) {
              maxBrightness = brightness;
              brightX = x / sampleW;
              brightY = y / sampleH;
            }
          }
        }
      }

      if (maxBrightness > 0) {
        const now = Date.now();
        const newPoint: Point = { x: 1 - brightX, y: brightY, t: now };

        // Only add if moved enough from last point
        if (!lastPointRef.current ||
          Math.abs(newPoint.x - lastPointRef.current.x) > 0.005 ||
          Math.abs(newPoint.y - lastPointRef.current.y) > 0.005) {
          pointsRef.current.push(newPoint);
          lastPointRef.current = newPoint;
          setDrawingPoints([...pointsRef.current]);
        }
      }
    } catch {
      // Canvas readback may fail due to CORS
    }
  }, []);

  // ---- Mouse / touch handlers for fallback drawing ----
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
      t: Date.now(),
    };
  }, []);

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'drawing') return;
    setIsDrawing(true);
    const pt = getCanvasPoint(clientX, clientY);
    if (pt) {
      pointsRef.current = [pt];
      lastPointRef.current = pt;
      setDrawingPoints([pt]);
    }
  }, [getCanvasPoint]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing || phaseRef.current !== 'drawing') return;
    const pt = getCanvasPoint(clientX, clientY);
    if (pt) {
      pointsRef.current.push(pt);
      lastPointRef.current = pt;
      setDrawingPoints([...pointsRef.current]);
    }
  }, [isDrawing, getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // ---- Finish drawing, calculate scores ----
  const finishDrawing = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setPhase('analyzing');

    const pts = pointsRef.current;
    if (pts.length < 5) {
      setPatternScore(10);
      setPrecisionScore(10);
      return;
    }

    // Pattern matching: check how close points are to the target lines
    const lines = patternLines.current;
    const vertices = patternPoints.current;
    let totalMinDist = 0;
    const step = Math.max(1, Math.floor(pts.length / 50));

    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i];
      let minDist = Infinity;
      for (const line of lines) {
        const a = vertices[line.from];
        const b = vertices[line.to];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) {
          const d = Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
          minDist = Math.min(minDist, d);
          continue;
        }
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        const d = Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
        minDist = Math.min(minDist, d);
      }
      totalMinDist += minDist;
    }

    const avgDist = totalMinDist / Math.ceil(pts.length / step);
    const coverage = Math.min(1, pts.length / 100);
    const accuracy = Math.max(0, 1 - avgDist / 0.15);

    const score = Math.round(accuracy * 60 + coverage * 40);
    const prec = Math.round(Math.max(0, (1 - avgDist / 0.2)) * 100);

    setPatternScore(Math.min(100, Math.max(0, score)));
    setPrecisionScore(Math.min(100, Math.max(0, prec)));
  }, []);

  // ---- Render intro screen ----
  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-6xl mb-6" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
        <h2
          className="text-3xl font-bold mb-4"
          style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", textShadow: '0 0 10px rgba(201, 168, 76, 0.4)' }}
        >
          施咒考验
        </h2>
        <p className="mb-3 text-base" style={{ color: '#e8dcc8' }}>
          分院帽要考验你的施咒能力
        </p>
        <p className="mb-2 text-sm" style={{ color: '#9ca3af' }}>
          屏幕上会出现一个魔法符文，用你的魔杖沿着虚线描绘
        </p>
        <p className="mb-6 text-sm" style={{ color: '#9ca3af' }}>
          💡 打开手机手电筒对着摄像头，或用鼠标/手指绘制
        </p>
        <button
          onClick={async () => {
            await startCamera();
            setPhase('countdown');
            setCountdown(3);
          }}
          className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#0a0e1a',
            background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
            boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
          }}
        >
          开始施咒
        </button>
      </div>
    );
  }

  // ---- Countdown screen ----
  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div
          className="text-8xl font-bold"
          style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", textShadow: '0 0 30px rgba(201, 168, 76, 0.6)' }}
        >
          {countdown}
        </div>
        <p className="mt-4 text-lg" style={{ color: '#9ca3af' }}>准备好你的魔杖...</p>
      </div>
    );
  }

  // ---- Analyzing screen ----
  if (phase === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-6xl mb-4" style={{ animation: 'hatWobble 1s ease-in-out infinite' }}>🎩</div>
        <p className="text-xl" style={{ color: '#c9a84c', textShadow: '0 0 10px rgba(201, 168, 76, 0.4)' }}>
          分院帽正在解读你的符文...
        </p>
      </div>
    );
  }

  // ---- Drawing / Done phase ----
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-lg mb-3">
        <h2
          className="text-xl font-bold"
          style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}
        >
          描绘符文
        </h2>
        {phase === 'drawing' && (
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold"
              style={{
                color: timeLeft <= 5 ? '#ef4444' : '#c9a84c',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          aspectRatio: '4/3',
          border: '1px solid rgba(201, 168, 76, 0.3)',
          background: '#0a0e1a',
        }}
      >
        {/* Hidden video - always rendered */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Main canvas (video / dark bg) */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full"
        />

        {/* Overlay canvas (pattern + trail) */}
        <canvas
          ref={overlayRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handlePointerUp();
          }}
        />

        {/* Drawing hint overlay */}
        {phase === 'drawing' && (
          <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
            <span
              className="px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: 'rgba(10, 14, 26, 0.7)', color: '#c9a84c' }}
            >
              {cameraError ? '🖱️ 用鼠标或手指沿着虚线描绘符文' : '🪄 用魔杖光源描绘 / 或用鼠标绘制'}
            </span>
          </div>
        )}

        {/* Score display when done */}
        {phase === 'done' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: 'rgba(10, 14, 26, 0.85)' }}
          >
            <p className="text-4xl font-bold mb-2" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
              符文解读完成
            </p>
            <div className="flex gap-6 text-lg">
              <div>
                <p style={{ color: '#9ca3af' }}>匹配度</p>
                <p className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{patternScore}</p>
              </div>
              <div>
                <p style={{ color: '#9ca3af' }}>精度</p>
                <p className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{precisionScore}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finish button */}
      {phase === 'drawing' && (
        <button
          onClick={finishDrawing}
          className="mt-4 px-6 py-2 rounded-lg text-sm font-bold tracking-wider transition-all duration-300 cursor-pointer"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#0a0e1a',
            background: 'linear-gradient(135deg, #c9a84c, #d4a017)',
          }}
        >
          画完了
        </button>
      )}
    </div>
  );
}
