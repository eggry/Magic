'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from './GameProvider';
import { HOUSES, type House } from '@/lib/sorting-hat';

type Phase = 'photo' | 'generating' | 'revealing' | 'done';

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

  const house = sortedHouse ? HOUSES[sortedHouse] : HOUSES.gryffindor;

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
        // Skip photo step
        setPhotoDataUrl('');
        setPhase('generating');
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

    // Mirror the image for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoDataUrl(dataUrl);

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setPhase('generating');
    generateImage(dataUrl);
  }, []);

  const generateImage = async (photoData: string | null) => {
    try {
      let body: { house: House; photoBase64?: string };

      if (photoData) {
        // Strip data URL prefix
        const base64 = photoData.split(',')[1] || '';
        body = { house: sortedHouse || 'gryffindor', photoBase64: base64 };
      } else {
        body = { house: sortedHouse || 'gryffindor' };
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

    // Start reveal animation regardless
    setPhase('revealing');
  };

  // Reveal animation: show house name letter by letter
  useEffect(() => {
    if (phase !== 'revealing') return;

    const houseName = house.nameCn;
    if (revealCharIndex < houseName.length) {
      const timer = setTimeout(() => {
        setRevealCharIndex(prev => prev + 1);
      }, 300);
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
            📸 拍照
          </button>
          <button
            onClick={() => {
              setPhotoDataUrl('');
              setPhase('generating');
              generateImage(null);
            }}
            className="mt-3 px-4 py-2 text-sm cursor-pointer"
            style={{ color: '#9ca3af' }}
          >
            跳过拍照
          </button>
        </div>
      )}

      {/* Generating phase */}
      {phase === 'generating' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
          <p className="text-xl" style={{ color: '#c9a84c', textShadow: '0 0 10px rgba(201, 168, 76, 0.4)' }}>
            分院帽正在深思熟虑...
          </p>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#740001', animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a472a', animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#0e1a40', animationDelay: '300ms' }} />
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ecb939', animationDelay: '450ms' }} />
          </div>
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
                style={{ color: house.colors.accent, fontFamily: "'Cinzel', serif" }}
              >
                {house.motto}
              </p>

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
                {level1Result && (
                  <div className="mb-2 text-left">
                    <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>
                      念咒: 准确度 {level1Result.accuracy} / 气势 {level1Result.power}
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${level1Result.totalScore}%`, backgroundColor: house.colors.accent }}
                      />
                    </div>
                  </div>
                )}
                {level2Result && (
                  <div className="mb-2 text-left">
                    <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>
                      施咒: 匹配度 {level2Result.score} / 精度 {level2Result.precision}
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${level2Result.score}%`, backgroundColor: house.colors.accent }}
                      />
                    </div>
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

              {/* Generated image or photo */}
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
                    ✨ AI 生成的学院巫师肖像
                  </p>
                </div>
              )}

              {/* Photo fallback if no generated image */}
              {!generatedImageUrl && photoDataUrl && (
                <div
                  className="w-full rounded-xl overflow-hidden mb-2"
                  style={{
                    border: `2px solid ${house.colors.secondary}60`,
                  }}
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
