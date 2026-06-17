'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGame, type Level2Result } from './GameProvider';
import { getRandomPattern, calculatePatternScore } from '@/lib/patterns';
import type { MagicPattern } from '@/lib/patterns';

type Phase = 'ready' | 'countdown' | 'drawing' | 'analyzing' | 'done';

const DRAW_TIME_LIMIT = 15; // seconds

export default function Level2Casting() {
  const { completeLevel2, level1Result } = useGame();
  const [pattern] = useState<MagicPattern>(() => getRandomPattern());
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Level2Result | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DRAW_TIME_LIMIT);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const tracedPointsRef = useRef<{ x: number; y: number }[]>([]);
  const prevBrightRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const CANVAS_W = 640;
  const CANVAS_H = 480;

  // ---- Cleanup media resources ----
  const cleanupMedia = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ---- Stop drawing (recognition + camera) ----
  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    cleanupMedia();
  }, [cleanupMedia]);

  // Find brightest point in the video frame (wand tip)
  const findBrightestPoint = useCallback((imageData: ImageData): { x: number; y: number; brightness: number } | null => {
    const data = imageData.data;
    let maxBrightness = 0;
    let bestX = 0;
    let bestY = 0;
    const step = 4; // Sample every 4th pixel for performance

    for (let y = 0; y < imageData.height; y += step) {
      for (let x = 0; x < imageData.width; x += step) {
        const idx = (y * imageData.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Look for bright warm-colored points (like a phone flashlight)
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        // Boost for warm colors (flashlight tends to be warm)
        const warmBoost = (r > 200 && g > 180) ? 1.5 : 1;
        const score = brightness * warmBoost;

        if (score > maxBrightness) {
          maxBrightness = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    if (maxBrightness > 180) {
      return { x: bestX / imageData.width, y: bestY / imageData.height, brightness: maxBrightness };
    }
    return null;
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;

    if (!video || !canvas || !overlay || video.videoWidth === 0) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlay.getContext('2d');
    if (!ctx || !overlayCtx) return;

    // Draw video frame (mirrored)
    ctx.save();
    ctx.translate(CANVAS_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);

    // Find brightest point
    const bright = findBrightestPoint(imageData);

    // Draw target pattern on overlay
    overlayCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw target pattern with glow
    overlayCtx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
    overlayCtx.lineWidth = 3;
    overlayCtx.setLineDash([8, 8]);
    overlayCtx.shadowColor = 'rgba(201, 168, 76, 0.3)';
    overlayCtx.shadowBlur = 10;

    for (const [fromIdx, toIdx] of pattern.segments) {
      const p1 = pattern.points[fromIdx];
      const p2 = pattern.points[toIdx];
      overlayCtx.beginPath();
      overlayCtx.moveTo(p1.x * CANVAS_W, p1.y * CANVAS_H);
      overlayCtx.lineTo(p2.x * CANVAS_W, p2.y * CANVAS_H);
      overlayCtx.stroke();
    }

    // Draw pattern points
    overlayCtx.setLineDash([]);
    for (const p of pattern.points) {
      overlayCtx.beginPath();
      overlayCtx.arc(p.x * CANVAS_W, p.y * CANVAS_H, 5, 0, Math.PI * 2);
      overlayCtx.fillStyle = 'rgba(201, 168, 76, 0.5)';
      overlayCtx.fill();
    }

    // Track bright point
    if (bright && isDrawingRef.current) {
      // Check if this point moved significantly from previous
      const currentPoint = { x: 1 - bright.x, y: bright.y }; // Mirror x

      if (prevBrightRef.current) {
        const dx = currentPoint.x - prevBrightRef.current.x;
        const dy = currentPoint.y - prevBrightRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.15) { // Reasonable movement
          tracedPointsRef.current.push(currentPoint);

          // Draw glowing trail
          overlayCtx.beginPath();
          overlayCtx.moveTo(prevBrightRef.current.x * CANVAS_W, prevBrightRef.current.y * CANVAS_H);
          overlayCtx.lineTo(currentPoint.x * CANVAS_W, currentPoint.y * CANVAS_H);
          overlayCtx.strokeStyle = '#c9a84c';
          overlayCtx.lineWidth = 3;
          overlayCtx.shadowColor = '#c9a84c';
          overlayCtx.shadowBlur = 15;
          overlayCtx.stroke();
        }
      } else {
        tracedPointsRef.current.push(currentPoint);
      }

      // Draw bright point indicator
      overlayCtx.beginPath();
      overlayCtx.arc(currentPoint.x * CANVAS_W, currentPoint.y * CANVAS_H, 8, 0, Math.PI * 2);
      overlayCtx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      overlayCtx.shadowColor = '#fff';
      overlayCtx.shadowBlur = 20;
      overlayCtx.fill();

      prevBrightRef.current = currentPoint;
    }

    overlayCtx.shadowBlur = 0;

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [pattern, findBrightestPoint]);

  // ---- Calculate result from traced points ----
  const calculateResultFromTrace = useCallback(() => {
    const points = tracedPointsRef.current;
    const score = calculatePatternScore(points, pattern);
    const precision = points.length > 0
      ? Math.min(Math.round(points.length / 3), 100)
      : 0;

    const r: Level2Result = { pattern, score, precision };
    setResult(r);
    setPhase('done');
  }, [pattern]);

  // ---- Start camera and drawing ----
  const startDrawing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      tracedPointsRef.current = [];
      prevBrightRef.current = null;
      isDrawingRef.current = true;
      setTimeLeft(DRAW_TIME_LIMIT);
      setPhase('drawing');
      processFrame();

    } catch (err) {
      console.error('Camera access denied:', err);
      // Fallback: use mouse/touch drawing
      tracedPointsRef.current = [];
      prevBrightRef.current = null;
      isDrawingRef.current = true;
      setTimeLeft(DRAW_TIME_LIMIT);
      setPhase('drawing');
    }
  }, [processFrame]);

  // ============================================================
  // EFFECT: Countdown timer (3-2-1 before drawing)
  // ============================================================
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      // Countdown finished → start drawing
      startDrawing();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdown, startDrawing]);

  // ============================================================
  // EFFECT: Drawing time limit (15-14-13... during drawing)
  // ============================================================
  useEffect(() => {
    if (phase !== 'drawing') return;

    if (timeLeft <= 0) {
      // Time's up → auto finish
      stopDrawing();
      setPhase('analyzing');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, timeLeft, stopDrawing]);

  // ============================================================
  // EFFECT: Analyzing delay (1.5s after finishing drawing)
  // ============================================================
  useEffect(() => {
    if (phase !== 'analyzing') return;

    const timer = setTimeout(() => {
      calculateResultFromTrace();
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, calculateResultFromTrace]);

  // ---- Handle start button ----
  const handleStart = useCallback(() => {
    setCountdown(3);
    setPhase('countdown');
  }, []);

  // ---- Handle "I'm done" button ----
  const handleFinishDrawing = useCallback(() => {
    stopDrawing();
    setPhase('analyzing');
  }, [stopDrawing]);

  // Mouse/touch fallback for drawing on canvas
  const handleCanvasInteraction = useCallback((clientX: number, clientY: number) => {
    if (!overlayCanvasRef.current || phase !== 'drawing') return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const currentPoint = { x, y };

    if (prevBrightRef.current) {
      const dx = currentPoint.x - prevBrightRef.current.x;
      const dy = currentPoint.y - prevBrightRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.15) {
        tracedPointsRef.current.push(currentPoint);

        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(prevBrightRef.current.x * CANVAS_W, prevBrightRef.current.y * CANVAS_H);
          ctx.lineTo(currentPoint.x * CANVAS_W, currentPoint.y * CANVAS_H);
          ctx.strokeStyle = '#c9a84c';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#c9a84c';
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    } else {
      tracedPointsRef.current.push(currentPoint);
    }

    prevBrightRef.current = currentPoint;
  }, [phase]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => { cleanupMedia(); };
  }, [cleanupMedia]);

  const noCameraMode = !streamRef.current && phase === 'drawing';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ color: '#9ca3af' }}>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>第二关</span>
        <span>○</span>
        <span>结果</span>
      </div>

      {/* Pattern name */}
      {phase === 'ready' && (
        <div className="mb-6">
          <p className="text-sm mb-2" style={{ color: '#9ca3af' }}>你需要绘制的魔法符文</p>
          <h2
            className="text-4xl font-bold"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#c9a84c',
              textShadow: '0 0 15px rgba(201, 168, 76, 0.6)',
            }}
          >
            {pattern.nameCn}
          </h2>
        </div>
      )}

      {/* Preview of target pattern */}
      {phase === 'ready' && (
        <div
          className="relative mb-6 rounded-xl overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '400px',
            aspectRatio: '4/3',
            background: 'rgba(15, 15, 30, 0.8)',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {pattern.segments.map(([fromIdx, toIdx], i) => (
              <line
                key={i}
                x1={pattern.points[fromIdx].x * 100}
                y1={pattern.points[fromIdx].y * 100}
                x2={pattern.points[toIdx].x * 100}
                y2={pattern.points[toIdx].y * 100}
                stroke="rgba(201, 168, 76, 0.6)"
                strokeWidth="0.8"
                strokeDasharray="3,2"
              />
            ))}
            {pattern.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x * 100}
                cy={p.y * 100}
                r="1.5"
                fill="rgba(201, 168, 76, 0.8)"
              />
            ))}
          </svg>
        </div>
      )}

      {/* Camera / Drawing area */}
      {(phase === 'drawing' || phase === 'analyzing') && (
        <div
          className="relative mb-4 rounded-xl overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '640px',
            aspectRatio: '4/3',
            background: '#000',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="hidden"
          />
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="absolute inset-0 w-full h-full object-cover cursor-crosshair"
            onMouseDown={(e) => handleCanvasInteraction(e.clientX, e.clientY)}
            onMouseMove={(e) => {
              if (e.buttons === 1) handleCanvasInteraction(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              handleCanvasInteraction(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleCanvasInteraction(touch.clientX, touch.clientY);
            }}
          />

          {noCameraMode && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            >
              <p style={{ color: '#e8dcc8' }}>用鼠标或手指沿着虚线描绘符文</p>
            </div>
          )}

          {/* REC indicator + timer */}
          {phase === 'drawing' && (
            <div
              className="absolute top-3 left-3 flex items-center gap-3"
            >
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC
              </div>
              <div
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: timeLeft <= 5 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(201, 168, 76, 0.2)',
                  color: timeLeft <= 5 ? '#ef4444' : '#c9a84c',
                  border: `1px solid ${timeLeft <= 5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(201, 168, 76, 0.3)'}`,
                }}
              >
                {timeLeft}s
              </div>
            </div>
          )}
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && countdown > 0 && (
        <div
          className="text-8xl font-bold mb-6"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#c9a84c',
            textShadow: '0 0 30px rgba(201, 168, 76, 0.7)',
          }}
        >
          {countdown}
        </div>
      )}

      {/* Hint */}
      {phase === 'ready' && (
        <p className="text-sm mb-4 max-w-sm" style={{ color: '#9ca3af' }}>
          打开摄像头后，用发光物体（如手机手电筒）对准摄像头，沿虚线描绘符文。
          也可以用鼠标/手指直接在画面上描绘。限时 {DRAW_TIME_LIMIT} 秒。
        </p>
      )}

      {/* Start button */}
      {phase === 'ready' && (
        <button
          onClick={handleStart}
          className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#0a0e1a',
            background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
            boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(201, 168, 76, 0.6)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.4)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🪄 开始施咒
        </button>
      )}

      {/* Drawing controls */}
      {phase === 'drawing' && (
        <button
          onClick={handleFinishDrawing}
          className="px-6 py-2 rounded-lg text-sm cursor-pointer"
          style={{
            color: '#e8dcc8',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
          }}
        >
          我画完了
        </button>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <div className="flex items-center gap-3" style={{ color: '#c9a84c' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>分院帽正在审视你的魔力...</span>
        </div>
      )}

      {/* Result */}
      {phase === 'done' && result && (
        <div
          className="w-full max-w-md px-6 py-5 rounded-xl"
          style={{
            background: 'rgba(15, 15, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          <h3
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "'Cinzel', serif", color: '#c9a84c' }}
          >
            Casting Assessment
          </h3>

          <div className="space-y-3 text-left">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span style={{ color: '#9ca3af' }}>符文匹配度</span>
                <span style={{ color: result.score >= 50 ? '#22c55e' : '#ef4444' }}>{result.score}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${result.score}%`,
                    backgroundColor: result.score >= 50 ? '#22c55e' : '#ef4444',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span style={{ color: '#9ca3af' }}>绘制精度</span>
                <span style={{ color: result.precision >= 50 ? '#c9a84c' : '#ef4444' }}>{result.precision}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${result.precision}%`,
                    backgroundColor: result.precision >= 50 ? '#c9a84c' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => completeLevel2(result)}
            className="mt-5 px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer w-full"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#0a0e1a',
              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
            }}
          >
            查看分院结果 ✨
          </button>
        </div>
      )}
    </div>
  );
}
