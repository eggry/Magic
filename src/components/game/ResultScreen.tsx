'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useGame } from './GameProvider';
import { HOUSES, type HouseName, type SortingResult } from '@/lib/sorting-hat';
import type { SpellCategory } from '@/lib/spells';
import { SPELLS } from '@/lib/spells';
import { recommendWand } from '@/lib/wands';

type Phase = 'photo' | 'generating' | 'revealing' | 'done';

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
  const [showBadge, setShowBadge] = useState(false);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const badgeFetchingRef = useRef(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showWand, setShowWand] = useState(false);
  const [wandPurchased, setWandPurchased] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const house = sortedHouse ? HOUSES[sortedHouse.name] : HOUSES.gryffindor;

  // Find best spell from Level 1
  const bestSpellData = useMemo(() => {
    if (!level1Result?.spells || level1Result.spells.length === 0) return null;
    const best = level1Result.spells.reduce((prev, curr) =>
      (curr.accuracy * 0.6 + curr.power * 0.4) > (prev.accuracy * 0.6 + prev.power * 0.4) ? curr : prev
    );
    return best;
  }, [level1Result]);

  const bestCategory: SpellCategory = bestSpellData?.category ?? 'defense';

  // Wand recommendation
  const wand = useMemo(() => {
    if (!sortedHouse) return null;
    return recommendWand({
      house: sortedHouse.name,
      accuracy: level1Result?.accuracy ?? 50,
      power: level1Result?.power ?? 50,
      darkAffinity: level1Result?.darkAffinity ?? 0,
      bestCategory,
    });
  }, [sortedHouse, level1Result, bestCategory]);

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

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoDataUrl(dataUrl);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setPhase('generating');
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

    setPhase('revealing');
  };

  // Reveal animation
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

  // Staggered reveal of badge and wand
  useEffect(() => {
    if (phase !== 'done') return;
    const badgeTimer = setTimeout(() => setShowBadge(true), 800);
    const wandTimer = setTimeout(() => setShowWand(true), 1600);
    return () => {
      clearTimeout(badgeTimer);
      clearTimeout(wandTimer);
    };
  }, [phase]);

  // Fetch AI-generated badge when badge section appears
  useEffect(() => {
    if (!showBadge || badgeUrl || !sortedHouse || badgeFetchingRef.current) return;
    const fetchBadge = async () => {
      badgeFetchingRef.current = true;
      setBadgeLoading(true);
      try {
        const res = await fetch('/api/generate-badge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spellName: bestSpellData?.spell.nameCn ?? '荧光闪烁' }),
        });
        const data = await res.json();
        if (data.badgeUrl) setBadgeUrl(data.badgeUrl);
      } catch {
        // Badge generation failed, will show fallback
      } finally {
        setBadgeLoading(false);
      }
    };
    fetchBadge();
  }, [showBadge, badgeUrl, sortedHouse, bestSpellData]);

  // Generate QR code for the generated image URL
  useEffect(() => {
    if (!generatedImageUrl || qrCodeDataUrl) return;
    QRCode.toDataURL(generatedImageUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#c9a84c', light: '#0a0e1a' },
    }).then(setQrCodeDataUrl).catch(() => {
      // QR generation failed, silently ignore
    });
  }, [generatedImageUrl, qrCodeDataUrl]);

  const totalScore = (() => {
    if (!level1Result || !level2Result) return 0;
    return Math.round(level1Result.totalScore * 0.5 + level2Result.score * 0.5);
  })();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 text-center">
      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10" style={{ color: '#9ca3af' }}>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span style={{ color: '#c9a84c' }}>分院结果</span>
      </div>

      {/* Spacer for progress indicator */}
      <div className="h-10" />

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
            className="text-5xl sm:text-6xl font-black tracking-widest"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#ffffff',
              textShadow: `
                0 0 10px ${house.colors.secondary},
                0 0 30px ${house.colors.secondary},
                0 0 60px ${house.colors.secondary}80,
                0 0 100px ${house.colors.secondary}40,
                0 2px 4px rgba(0,0,0,0.9)
              `,
              WebkitTextStroke: `1px ${house.colors.secondary}`,
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

              {/* ===== 专属徽章 ===== */}
              {showBadge && bestSpellData && (() => {
                const bestSpell = bestSpellData.spell;
                return (
                  <div
                    className="w-full px-5 py-5 rounded-xl mb-2"
                    style={{
                      background: 'rgba(15, 15, 30, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${house.colors.secondary}40`,
                      animation: 'fadeSlideUp 0.6s ease-out',
                    }}
                  >
                    <h3 className="text-lg font-bold mb-3" style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}>
                      专属徽章
                    </h3>

                    {/* AI Generated Badge */}
                    <div className="flex justify-center mb-3">
                      <div
                        className="relative rounded-xl overflow-hidden"
                        style={{
                          width: 256,
                          height: 256,
                          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1025 100%)',
                          border: `2px solid ${house.colors.secondary}60`,
                          boxShadow: `0 0 30px ${house.colors.secondary}30, inset 0 0 20px ${house.colors.primary}40`,
                        }}
                      >
                        {badgeLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div
                              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-2"
                              style={{ borderColor: `${house.colors.secondary}60`, borderTopColor: 'transparent' }}
                            />
                            <p className="text-xs" style={{ color: house.colors.secondary }}>
                              徽章锻造中...
                            </p>
                          </div>
                        )}
                        {badgeUrl && (
                          <img
                            src={badgeUrl}
                            alt="专属徽章"
                            className="w-full h-full object-contain"
                            style={{ filter: `drop-shadow(0 0 12px ${house.colors.secondary}40)` }}
                          />
                        )}
                        {!badgeUrl && !badgeLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span style={{ fontSize: 48, filter: `drop-shadow(0 0 12px ${house.colors.secondary})` }}>
                              {bestSpell.categoryEmoji}
                            </span>
                            <span style={{ fontSize: 28, marginTop: 4, filter: `drop-shadow(0 0 8px ${house.colors.secondary})` }}>
                              {house.emoji}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge details */}
                    <div className="text-center">
                      <p className="text-base font-bold mb-1" style={{ color: house.colors.secondary }}>
                        {bestSpell.nameCn}
                      </p>
                      <p className="text-sm" style={{ color: '#9ca3af' }}>
                        {bestSpell.nameEn} · {bestCategory === 'dark' || bestCategory === 'unforgivable' ? '暗黑之力' : bestCategory === 'defense' ? '守护之光' : bestCategory === 'combat' ? '战斗之魂' : '万象灵光'}
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                        <span style={{ color: CATEGORY_COLORS[bestCategory] }}>
                          {bestSpellData.spell.categoryEmoji} {bestSpellData.spell.nameCn}
                        </span>
                        <span style={{ color: '#9ca3af' }}>·</span>
                        <span style={{ color: '#9ca3af' }}>
                          准确 {bestSpellData.accuracy} / 气势 {bestSpellData.power}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ===== 魔杖推荐 ===== */}
              {showWand && wand && (
                <div
                  className="w-full px-5 py-5 rounded-xl mb-2"
                  style={{
                    background: 'rgba(15, 15, 30, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid rgba(201, 168, 76, 0.3)`,
                    animation: 'fadeSlideUp 0.6s ease-out',
                  }}
                >
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
                    Your Wand
                  </h3>

                  {/* Wand display */}
                  <div className="flex flex-col items-center mb-4">
                    <img
                      src="/wand.png"
                      alt="Magic Wand"
                      className="w-28 h-28 object-contain"
                      style={{ filter: `drop-shadow(0 0 12px ${house.colors.secondary}80)` }}
                    />
                    <p className="text-base font-bold" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
                      {wand.name}
                    </p>
                  </div>

                  {/* Wand specs */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-left mb-3">
                    <div>
                      <span style={{ color: '#9ca3af' }}>杖木：</span>
                      <span style={{ color: '#e8dcc8' }}>{wand.woodCn}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>杖芯：</span>
                      <span style={{ color: '#e8dcc8' }}>{wand.coreCn}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>长度：</span>
                      <span style={{ color: '#e8dcc8' }}>{wand.length}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>弹性：</span>
                      <span style={{ color: '#e8dcc8' }}>{wand.flexibility}</span>
                    </div>
                  </div>

                  {/* Wand description */}
                  <p className="text-sm text-left mb-4" style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                    {wand.description}
                  </p>

                  {/* Price & Purchase */}
                  <div
                    className="pt-3"
                    style={{ borderTop: '1px solid rgba(201, 168, 76, 0.2)' }}
                  >
                    {!wandPurchased ? (
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-xs" style={{ color: '#9ca3af' }}>奥利凡德魔杖店 · 限量定制</p>
                          <p className="text-xl font-bold" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
                            {wand.price} <span className="text-sm">加隆</span>
                          </p>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>
                            ≈ {wand.priceKnuts} 纳特
                          </p>
                        </div>
                        <button
                          onClick={() => setWandPurchased(true)}
                          className="px-6 py-3 rounded-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
                          style={{
                            fontFamily: "'Cinzel', serif",
                            color: '#0a0e1a',
                            background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
                            boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
                          }}
                        >
                          购买魔杖
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-lg font-bold mb-1" style={{ color: '#c9a84c' }}>
                          <img src="/wand.png" alt="" className="w-10 h-10 object-contain inline-block align-middle mr-2" style={{ filter: 'drop-shadow(0 0 6px #c9a84c80)' }} />
                        <span className="align-middle">魔杖已选择你！</span>
                        </p>
                        <p className="text-sm" style={{ color: '#9ca3af' }}>
                          奥利凡德先生说：&ldquo;魔杖选择巫师，记住这一点。&rdquo;
                        </p>
                        <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                          你的{wand.woodCn}魔杖正在由奥利凡德先生亲手制作，预计7个猫头鹰工作日送达。
                        </p>
                      </div>
                    )}
                  </div>
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
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ backgroundColor: 'rgba(15,15,30,0.9)' }}
                  >
                    <p className="text-xs" style={{ color: '#9ca3af' }}>
                      AI 生成的{house.nameCn}巫师史诗场景
                    </p>
                    {qrCodeDataUrl && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs" style={{ color: '#9ca3af' }}>扫码保存</p>
                        <img
                          src={qrCodeDataUrl}
                          alt="扫码保存图片"
                          className="w-16 h-16"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    )}
                  </div>
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
