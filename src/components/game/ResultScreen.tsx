'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from './GameProvider';
import { HOUSES, type HouseName, type SortingResult } from '@/lib/sorting-hat';
import type { SpellCategory } from '@/lib/spells';

type Phase = 'photo' | 'revealing' | 'done';

const CATEGORY_COLORS: Record<SpellCategory, string> = {
  defense: '#3b82f6',
  utility: '#22c55e',
  combat: '#f59e0b',
  dark: '#8b5cf6',
  unforgivable: '#ef4444',
};

export default function ResultScreen() {
  const { level1Result, level2Result, sortedHouse, resetGame } = useGame();
  const [phase, setPhase] = useState<Phase>('photo');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [revealCharIndex, setRevealCharIndex] = useState(0);
  const [showTraits, setShowTraits] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const house = sortedHouse ? HOUSES[sortedHouse.name] : HOUSES.gryffindor;

  // Start camera for photo
  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      } catch (err) {
        console.error('Camera denied for photo:', err);
        setPhotoDataUrl('');
        setPhase('revealing');
        generateImage(null);
      }
    };
    startCamera();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoDataUrl(dataUrl);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setPhase('revealing');
    generateImage(dataUrl);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateImage = async (photoData: string | null) => {
    try {
      const body: { house: HouseName; photoBase64?: string } = {
        house: sortedHouse?.name || 'gryffindor',
      };

      if (photoData) {
        const base64 = photoData.split(',')[1] || '';
        body.photoBase64 = base64;
      }

      const resp = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      }
    } catch (err) {
      console.error('Image generation failed:', err);
    }
  };

  // Reveal animation
  useEffect(() => {
    if (phase !== 'revealing') return;

    const houseName = house.nameCn;
    if (revealCharIndex < houseName.length) {
      const timer = setTimeout(() => {
        setRevealCharIndex(prev => prev + 1);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowTraits(true);
        setPhase('done');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, revealCharIndex, house.nameCn]);

  const totalScore = (() => {
    if (!level1Result || !level2Result) return 0;
    return Math.round(level1Result.totalScore * 0.5 + level2Result.score * 0.5);
  })();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ color: '#9ca3af' }}>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>分院结果</span>
      </div>

      {/* Photo capture phase */}
      {phase === 'photo' && (
        <div className="flex flex-col items-center">
          <p className="text-lg mb-4" style={{ color: '#e8dcc8' }}>
            分院帽需要看看你！请正对摄像头
          </p>
          <div
            className="relative rounded-xl overflow-hidden mb-4"
            style={{
              width: '100%',
              maxWidth: '400px',
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
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button
            onClick={takePhoto}
            className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#0a0e1a',
              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
            }}
          >
            拍照
          </button>
          <button
            onClick={() => {
              setPhotoDataUrl('');
              setPhase('revealing');
              generateImage(null);
            }}
            className="mt-3 px-4 py-2 text-sm cursor-pointer"
            style={{ color: '#9ca3af' }}
          >
            跳过拍照
          </button>
        </div>
      )}

      {/* Revealing phase & Done */}
      {(phase === 'revealing' || phase === 'done') && (
        <div className="flex flex-col items-center gap-4 w-full max-w-lg">
          {/* House name reveal */}
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-wider"
            style={{
              fontFamily: "'Cinzel', serif",
              color: house.colors.secondary,
              textShadow: `0 0 30px ${house.colors.secondary}80, 0 0 60px ${house.colors.secondary}40`,
            }}
          >
            {house.nameCn.slice(0, revealCharIndex)}
          </h1>

          {phase === 'done' && (
            <>
              <p
                className="text-xl mb-2"
                style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}
              >
                {house.motto}
              </p>

              {/* Hat message */}
              {sortedHouse && (
                <p
                  className="text-sm italic mb-2 px-4"
                  style={{ color: '#c9a84c' }}
                >
                  🎩 &ldquo;{sortedHouse.hatMessage}&rdquo;
                </p>
              )}

              {/* Score breakdown */}
              <div
                className="w-full px-5 py-4 rounded-xl mb-2"
                style={{
                  background: 'rgba(15, 15, 30, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${house.colors.secondary}40`,
                }}
              >
                <h3 className="text-lg font-bold mb-3" style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}>
                  Assessment Report
                </h3>

                {/* Level 1 breakdown */}
                {level1Result && (
                  <div className="mb-3 text-left">
                    <p className="text-sm font-bold mb-2" style={{ color: '#c9a84c' }}>
                      念咒评估
                    </p>
                    {/* Individual spells */}
                    <div className="space-y-1.5 mb-2">
                      {level1Result.spells.map((sr) => (
                        <div key={sr.spell.name} className="flex items-center gap-2 text-xs">
                          <span>{sr.spell.categoryEmoji}</span>
                          <span style={{ color: CATEGORY_COLORS[sr.category] }}>{sr.spell.nameCn}</span>
                          <span style={{ color: '#9ca3af' }}>准确{sr.accuracy}</span>
                          <span style={{ color: '#9ca3af' }}>气势{sr.power}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span style={{ color: '#9ca3af' }}>平均准确度: <b style={{ color: '#e8dcc8' }}>{level1Result.accuracy}</b></span>
                      <span style={{ color: '#9ca3af' }}>平均气势: <b style={{ color: '#e8dcc8' }}>{level1Result.power}</b></span>
                    </div>
                    {level1Result.darkAffinity > 0 && (
                      <div className="mt-1">
                        <MiniBar label="黑魔法亲和度" value={level1Result.darkAffinity} color="#8b5cf6" />
                      </div>
                    )}
                  </div>
                )}

                {/* Level 2 breakdown */}
                {level2Result && (
                  <div className="mb-3 text-left">
                    <p className="text-sm font-bold mb-2" style={{ color: '#c9a84c' }}>
                      施咒评估
                    </p>
                    <div className="flex gap-4 text-sm mb-1">
                      <span style={{ color: '#9ca3af' }}>匹配度: <b style={{ color: '#e8dcc8' }}>{level2Result.score}</b></span>
                      <span style={{ color: '#9ca3af' }}>精度: <b style={{ color: '#e8dcc8' }}>{level2Result.precision}</b></span>
                    </div>
                    <MiniBar label="图案匹配" value={level2Result.score} color={house.colors.secondary} />
                  </div>
                )}

                <div
                  className="pt-2 mt-2 text-lg font-bold text-center"
                  style={{ borderTop: `1px solid ${house.colors.secondary}30`, color: house.colors.secondary }}
                >
                  综合魔力值: {totalScore}
                </div>
              </div>

              {/* Traits */}
              {showTraits && (
                <div
                  className="w-full px-5 py-4 rounded-xl mb-2"
                  style={{
                    background: 'rgba(15, 15, 30, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${house.colors.secondary}40`,
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: '#9ca3af' }}>你的品质</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {house.traits.map(trait => (
                      <span
                        key={trait}
                        className="px-3 py-1 rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${house.colors.secondary}20`,
                          color: house.colors.secondary,
                          border: `1px solid ${house.colors.secondary}40`,
                        }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm mt-3" style={{ color: '#e8dcc8' }}>
                    {house.description}
                  </p>
                </div>
              )}

              {/* Generated image */}
              {generatedImageUrl && (
                <div
                  className="w-full rounded-xl overflow-hidden mb-2"
                  style={{
                    border: `2px solid ${house.colors.secondary}60`,
                    boxShadow: `0 0 30px ${house.colors.secondary}30`,
                  }}
                >
                  <img
                    src={generatedImageUrl}
                    alt="Your wizard portrait"
                    className="w-full"
                  />
                  <p className="text-xs py-2" style={{ color: '#9ca3af', backgroundColor: 'rgba(15,15,30,0.8)' }}>
                    AI 生成的学院巫师肖像
                  </p>
                </div>
              )}

              {/* AI portrait loading indicator */}
              {!generatedImageUrl && photoDataUrl !== '' && (
                <div
                  className="w-full px-4 py-3 rounded-xl mb-2 text-center"
                  style={{
                    background: 'rgba(15, 15, 30, 0.6)',
                    border: `1px dashed ${house.colors.secondary}40`,
                  }}
                >
                  <p className="text-sm" style={{ color: '#9ca3af' }}>
                    🎨 学院肖像正在绘制中...
                  </p>
                </div>
              )}

              {/* Photo fallback */}
              {!generatedImageUrl && photoDataUrl && (
                <div
                  className="w-full rounded-xl overflow-hidden mb-2"
                  style={{ border: `2px solid ${house.colors.secondary}60` }}
                >
                  <div className="relative">
                    <img src={photoDataUrl} alt="Your photo" className="w-full" />
                    <div
                      className="absolute bottom-0 left-0 right-0 px-4 py-3 text-center font-bold text-lg"
                      style={{
                        background: `linear-gradient(transparent, ${house.colors.primary}cc)`,
                        color: house.colors.secondary,
                      }}
                    >
                      {house.nameCn}
                    </div>
                  </div>
                </div>
              )}

              {/* Restart */}
              <button
                onClick={resetGame}
                className="mt-2 px-6 py-2 rounded-lg text-sm cursor-pointer"
                style={{
                  color: '#9ca3af',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                再来一次
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
        />
      </div>
    </div>
  );
}
