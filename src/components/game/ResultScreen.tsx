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
  const [badgeForged, setBadgeForged] = useState(false);
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
      width: 400,
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

  // Card style helper
  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'rgba(15, 15, 30, 0.85)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${house.colors.secondary}40`,
    ...extra,
  });

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center px-6 py-3 text-center">

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

      {/* Revealing phase & Done — horizontal desktop layout */}
      {(phase === 'revealing' || phase === 'done') && (
        <div className="w-full h-full flex flex-col items-center max-w-[1400px]">
          {/* Progress indicator — in flow, not absolute */}
          <div className="flex items-center gap-2 mb-2 shrink-0" style={{ color: '#9ca3af' }}>
            <span style={{ color: '#c9a84c' }}>●</span>
            <span style={{ color: '#c9a84c' }}>●</span>
            <span style={{ color: '#c9a84c' }}>●</span>
            <span style={{ color: '#c9a84c' }}>分院结果</span>
          </div>

          {/* House name reveal */}
          <h1
            className="text-5xl font-black tracking-widest mb-1 shrink-0"
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
                className="text-lg mb-1 shrink-0"
                style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}
              >
                {house.motto}
              </p>

              {sortedHouse && (
                <p className="text-sm italic mb-2 px-4 shrink-0" style={{ color: '#c9a84c' }}>
                  🎩 &ldquo;{sortedHouse.hatMessage}&rdquo;
                </p>
              )}

              {/* ===== Main 2-column layout ===== */}
              <div className="flex gap-4 w-full flex-1 min-h-0 max-h-[calc(100vh-180px)]">

                {/* LEFT: Generated Image + QR */}
                <div className="flex flex-col items-center justify-center gap-3" style={{ flex: '1.1' }}>
                  {generatedImageUrl ? (
                    <div
                      className="relative rounded-xl overflow-hidden w-full"
                      style={{
                        border: `2px solid ${house.colors.secondary}60`,
                        boxShadow: `0 0 30px ${house.colors.secondary}30`,
                        maxHeight: 'calc(100vh - 380px)',
                      }}
                    >
                      <img
                        src={generatedImageUrl}
                        alt="Your wizard portrait"
                        className="w-full h-full object-contain"
                        style={{ maxHeight: 'calc(100vh - 380px)' }}
                      />
                    </div>
                  ) : photoDataUrl ? (
                    <div
                      className="relative rounded-xl overflow-hidden w-full"
                      style={{ border: `2px solid ${house.colors.secondary}60`, maxHeight: 'calc(100vh - 380px)' }}
                    >
                      <img src={photoDataUrl} alt="Your photo" className="w-full object-contain" style={{ maxHeight: 'calc(100vh - 380px)' }} />
                      <div
                        className="absolute bottom-0 left-0 right-0 px-4 py-2 text-center font-bold text-lg"
                        style={{
                          background: `linear-gradient(transparent, ${house.colors.primary}cc)`,
                          color: house.colors.secondary,
                        }}
                      >
                        {house.nameCn}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(15, 15, 30, 0.85)',
                        border: `1px solid ${house.colors.secondary}30`,
                        maxHeight: 'calc(100vh - 380px)',
                        aspectRatio: '16/10',
                      }}
                    >
                      <p className="text-sm" style={{ color: '#9ca3af' }}>AI 肖像生成中...</p>
                    </div>
                  )}

                  {/* QR Code — large and prominent */}
                  {qrCodeDataUrl && (
                    <div className="flex items-center gap-4 shrink-0">
                      <img
                        src={qrCodeDataUrl}
                        alt="扫码保存图片"
                        className="rounded-lg"
                        style={{ width: 140, height: 140, imageRendering: 'pixelated', border: `2px solid ${house.colors.secondary}40` }}
                      />
                      <div className="text-left">
                        <p className="text-base font-bold" style={{ color: house.colors.secondary }}>扫码保存</p>
                        <p className="text-sm" style={{ color: '#9ca3af' }}>手机扫码下载<br/>你的巫师肖像</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Info panels — scrollable only if needed */}
                <div className="flex flex-col gap-3 overflow-y-auto min-h-0 pr-1" style={{ flex: '0.9' }}>

                  {/* Score breakdown */}
                  <div className="rounded-xl px-4 py-3" style={cardStyle()}>
                    <h3 className="text-sm font-bold mb-2" style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}>
                      Assessment Report
                    </h3>

                    {level1Result && (
                      <div className="mb-2 text-left">
                        <p className="text-xs font-bold mb-1.5" style={{ color: '#c9a84c' }}>念咒评估</p>
                        <div className="space-y-1 mb-1.5">
                          {level1Result.spells.map((sr) => (
                            <div key={sr.spell.name} className="flex items-center gap-2 text-xs">
                              <span>{sr.spell.categoryEmoji}</span>
                              <span style={{ color: CATEGORY_COLORS[sr.category] }}>{sr.spell.nameCn}</span>
                              <span style={{ color: '#9ca3af' }}>准确{sr.accuracy}</span>
                              <span style={{ color: '#9ca3af' }}>气势{sr.power}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span style={{ color: '#9ca3af' }}>准确度: <b style={{ color: '#e8dcc8' }}>{level1Result.accuracy}</b></span>
                          <span style={{ color: '#9ca3af' }}>气势: <b style={{ color: '#e8dcc8' }}>{level1Result.power}</b></span>
                        </div>
                        {level1Result.darkAffinity > 0 && (
                          <div className="mt-1">
                            <MiniBar label="黑魔法亲和度" value={level1Result.darkAffinity} color="#8b5cf6" />
                          </div>
                        )}
                      </div>
                    )}

                    {level2Result && (
                      <div className="mb-2 text-left">
                        <p className="text-xs font-bold mb-1.5" style={{ color: '#c9a84c' }}>施咒评估</p>
                        <div className="flex gap-4 text-xs mb-1">
                          <span style={{ color: '#9ca3af' }}>匹配度: <b style={{ color: '#e8dcc8' }}>{level2Result.score}</b></span>
                          <span style={{ color: '#9ca3af' }}>精度: <b style={{ color: '#e8dcc8' }}>{level2Result.precision}</b></span>
                        </div>
                        <MiniBar label="图案匹配" value={level2Result.score} color={house.colors.secondary} />
                      </div>
                    )}

                    <div
                      className="pt-2 mt-1 text-base font-bold text-center"
                      style={{ borderTop: `1px solid ${house.colors.secondary}30`, color: house.colors.secondary }}
                    >
                      综合魔力值: {totalScore}
                    </div>
                  </div>

                  {/* Traits */}
                  {showTraits && (
                    <div className="rounded-xl px-4 py-3" style={cardStyle()}>
                      <p className="text-xs mb-1.5" style={{ color: '#9ca3af' }}>你的品质</p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {house.traits.map(trait => (
                          <span
                            key={trait}
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
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
                    </div>
                  )}

                  {/* Badge + Wand side by side */}
                  <div className="flex gap-3">
                    {/* Badge */}
                    {showBadge && bestSpellData && (() => {
                      const bestSpell = bestSpellData.spell;
                      return (
                        <div
                          className="rounded-xl px-4 py-3 flex-1"
                          style={{
                            ...cardStyle(),
                            animation: 'fadeSlideUp 0.6s ease-out',
                          }}
                        >
                          <h3 className="text-sm font-bold mb-2" style={{ color: house.colors.secondary, fontFamily: "'Cinzel', serif" }}>
                            专属徽章
                          </h3>

                          <div className="flex justify-center mb-2">
                            <div
                              className="relative rounded-lg overflow-hidden"
                              style={{
                                width: 120,
                                height: 120,
                                background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1025 100%)',
                                border: `2px solid ${house.colors.secondary}60`,
                                boxShadow: `0 0 20px ${house.colors.secondary}30, inset 0 0 12px ${house.colors.primary}40`,
                              }}
                            >
                              {badgeLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <div
                                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-1"
                                    style={{ borderColor: `${house.colors.secondary}60`, borderTopColor: 'transparent' }}
                                  />
                                  <p className="text-[10px]" style={{ color: house.colors.secondary }}>锻造中...</p>
                                </div>
                              )}
                              {badgeUrl && (
                                <img
                                  src={badgeUrl}
                                  alt="专属徽章"
                                  className="w-full h-full object-contain"
                                  style={{ filter: `drop-shadow(0 0 8px ${house.colors.secondary}40)` }}
                                />
                              )}
                              {!badgeUrl && !badgeLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span style={{ fontSize: 36, filter: `drop-shadow(0 0 8px ${house.colors.secondary})` }}>
                                    {bestSpell.categoryEmoji}
                                  </span>
                                  <span style={{ fontSize: 20, marginTop: 2, filter: `drop-shadow(0 0 6px ${house.colors.secondary})` }}>
                                    {house.emoji}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-bold" style={{ color: house.colors.secondary }}>{bestSpell.nameCn}</p>
                          <p className="text-[11px] mb-2" style={{ color: '#9ca3af' }}>
                            {bestCategory === 'dark' || bestCategory === 'unforgivable' ? '暗黑之力' : bestCategory === 'defense' ? '守护之光' : bestCategory === 'combat' ? '战斗之魂' : '万象灵光'}
                          </p>

                          {!badgeForged ? (
                            <button
                              onClick={() => setBadgeForged(true)}
                              className="w-full px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 cursor-pointer"
                              style={{
                                fontFamily: "'Cinzel', serif",
                                color: '#0a0e1a',
                                background: `linear-gradient(135deg, ${house.colors.secondary}, ${house.colors.secondary}cc)`,
                                boxShadow: `0 0 15px ${house.colors.secondary}40`,
                              }}
                            >
                              1 加隆 · 铸造
                            </button>
                          ) : (
                            <p className="text-xs" style={{ color: house.colors.secondary }}>
                              徽章已铸成！古灵阁已扣款。
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Wand */}
                    {showWand && wand && (
                      <div
                        className="rounded-xl px-4 py-3 flex-1"
                        style={{
                          ...cardStyle({ border: '1px solid rgba(201, 168, 76, 0.3)' }),
                          animation: 'fadeSlideUp 0.6s ease-out',
                        }}
                      >
                        <h3 className="text-sm font-bold mb-2" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
                          Your Wand
                        </h3>

                        <div className="flex flex-col items-center mb-2">
                          <img
                            src="/wand.png"
                            alt="Magic Wand"
                            className="object-contain"
                            style={{ width: 80, height: 80, filter: `drop-shadow(0 0 8px ${house.colors.secondary}80)` }}
                          />
                          <p className="text-sm font-bold mt-1" style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif" }}>
                            {wand.name}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-left mb-2">
                          <div><span style={{ color: '#9ca3af' }}>杖木：</span><span style={{ color: '#e8dcc8' }}>{wand.woodCn}</span></div>
                          <div><span style={{ color: '#9ca3af' }}>杖芯：</span><span style={{ color: '#e8dcc8' }}>{wand.coreCn}</span></div>
                          <div><span style={{ color: '#9ca3af' }}>长度：</span><span style={{ color: '#e8dcc8' }}>{wand.length}</span></div>
                          <div><span style={{ color: '#9ca3af' }}>弹性：</span><span style={{ color: '#e8dcc8' }}>{wand.flexibility}</span></div>
                        </div>

                        {!wandPurchased ? (
                          <button
                            onClick={() => setWandPurchased(true)}
                            className="w-full px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 cursor-pointer"
                            style={{
                              fontFamily: "'Cinzel', serif",
                              color: '#0a0e1a',
                              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
                              boxShadow: '0 0 15px rgba(201, 168, 76, 0.3)',
                            }}
                          >
                            {wand.price} 加隆 · 购买
                          </button>
                        ) : (
                          <p className="text-xs" style={{ color: '#c9a84c' }}>
                            魔杖已选择你！预计7个猫头鹰工作日送达。
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Restart — at the very bottom */}
              <button
                onClick={resetGame}
                className="mt-2 shrink-0 px-6 py-1.5 rounded-lg text-xs cursor-pointer"
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
      <div className="flex justify-between text-[10px] mb-0.5">
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
        />
      </div>
    </div>
  );
}
