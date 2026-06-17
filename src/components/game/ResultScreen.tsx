"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useGame } from "./GameProvider";
import { recommendWand } from "@/lib/wands";
import { getBadgeUrl, type Spell } from "@/lib/spells";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Shield, Star, ChevronRight, Camera, RotateCcw, Loader2 } from "lucide-react";
import type { HouseName } from "@/lib/sorting-hat";

export default function ResultScreen() {
  const { level1Result, level2Result, sortedHouse, generatedImageUrl, setResult, resetGame } = useGame();
  const [step, setStep] = useState<"report" | "portrait" | "badge" | "wand">("report");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoGenerated, setPhotoGenerated] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [wandBought, setWandBought] = useState(false);
  const [badgeForged, setBadgeForged] = useState(false);
  const [stepEntering, setStepEntering] = useState(true);

  // Step transition animation
  useEffect(() => {
    setStepEntering(true);
    const t = setTimeout(() => setStepEntering(false), 400);
    return () => clearTimeout(t);
  }, [step]);

  const accuracy = level1Result?.accuracy ?? 0;
  const power = level1Result?.power ?? 0;
  const darkAffinity = level1Result?.darkAffinity ?? 0;
  const lightAffinity = level1Result?.lightAffinity ?? 0;
  const l1Score = level1Result ? (level1Result.accuracy * 0.4 + level1Result.power * 0.6) : 0;
  const l2Score = level2Result ? (level2Result.score * 0.5 + level2Result.precision * 0.5) : 0;
  const totalScore = Math.round((l1Score + l2Score) / 2);

  const bestSpell = useMemo(() => {
    if (!level1Result || level1Result.spells.length === 0) return null;
    const best = level1Result.spells.reduce((a, b) =>
      (a.accuracy + a.power) > (b.accuracy + b.power) ? a : b
    );
    return best;
  }, [level1Result]);

  const bestCategory = useMemo<Spell['category'] | null>(() => {
    if (!level1Result || level1Result.spells.length === 0) return null;
    const cats = level1Result.spells.reduce<Record<string, number>>((acc, s) => {
      acc[s.spell.category] = (acc[s.spell.category] || 0) + (s.accuracy + s.power) / 2;
      return acc;
    }, {});
    const bestCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    return bestCat ? (bestCat[0] as Spell['category']) : null;
  }, [level1Result]);

  const wand = useMemo(() => {
    if (!sortedHouse || !bestCategory) return null;
    return recommendWand({
      house: sortedHouse.name as HouseName,
      accuracy,
      power,
      darkAffinity,
      bestCategory,
    });
  }, [sortedHouse, bestCategory, accuracy, power, darkAffinity]);

  const badgeUrl = useMemo(() => {
    if (!bestSpell) return null;
    return getBadgeUrl(bestSpell.spell.nameCn);
  }, [bestSpell]);

  // Generate QR code for the portrait
  useEffect(() => {
    if (!generatedImageUrl) return;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      QRCode.toDataURL(generatedImageUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#c9a84c", light: "#0a0e1a" },
      }).then((url: string) => {
        if (!cancelled) setQrCodeDataUrl(url);
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [generatedImageUrl]);

  // Auto-advance from portrait step once photo is generated
  useEffect(() => {
    if (step === "portrait" && photoGenerated && generatedImageUrl) {
      const t = setTimeout(() => setStep("badge"), 1500);
      return () => clearTimeout(t);
    }
  }, [step, photoGenerated, generatedImageUrl]);

  const handleTakePhoto = useCallback(async () => {
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
      video.play();
      await new Promise<void>((r) => setTimeout(r, 500));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法创建画布");
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/jpeg", 0.9));
      stream.getTracks().forEach((t) => t.stop());
      if (!blob) throw new Error("拍照失败");

      // Convert blob to base64 and call API
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const photoBase64 = base64.split(',')[1];

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house: sortedHouse?.name ?? "gryffindor", photoBase64 }),
      });
      const data = await response.json();
      if (!data.success || !data.imageUrl) throw new Error(data.error || "生成失败");
      setResult(sortedHouse!, null, data.imageUrl);
      setPhotoGenerated(true);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setPhotoLoading(false);
    }
  }, [sortedHouse]);

  const handleRetake = () => {
    setPhotoGenerated(false);
    setPhotoError(null);
  };

  if (!sortedHouse) return null;

  const primary = sortedHouse.colors.primary;
  const secondary = sortedHouse.colors.secondary;
  const hName = sortedHouse.nameCn;

  const stepTitles: Record<string, string> = {
    report: "📜 考核报告",
    portrait: "📸 巫师肖像",
    badge: "🎖️ 专属徽章",
    wand: "🪄 魔杖选择",
  };

  const stepOrder: Array<"report" | "portrait" | "badge" | "wand"> = ["report", "portrait", "badge", "wand"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0e1a] overflow-hidden flex flex-col">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-30 animate-particle-float"
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              background: i % 3 === 0 ? primary : i % 3 === 1 ? secondary : "#c9a84c",
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${6 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      {/* Top step progress */}
      <div className="relative z-10 flex items-center justify-center gap-2 pt-3 pb-2 px-4">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-500 ${
                i <= currentIdx
                  ? "text-[#0a0e1a]"
                  : "text-[#9ca3af] border border-[#1f2937]"
              }`}
              style={{
                background: i <= currentIdx ? `linear-gradient(135deg, ${primary}, ${secondary})` : "transparent",
                boxShadow: i === currentIdx ? `0 0 12px ${primary}66` : "none",
              }}
            >
              {i < currentIdx ? "✓" : i + 1}
              <span className="hidden sm:inline">{stepTitles[s]}</span>
            </div>
            {i < stepOrder.length - 1 && (
              <div
                className="w-6 h-0.5 rounded-full transition-all duration-500"
                style={{ background: i < currentIdx ? primary : "#1f2937" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 flex-1 flex items-center justify-center p-4 transition-all duration-500 ${stepEntering ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        {/* ===== STEP 1: REPORT ===== */}
        {step === "report" && (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
            {/* Left: House result */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                className="text-6xl lg:text-7xl font-bold mb-3 text-center"
                style={{
                  color: "#e8dcc8",
                  textShadow: `0 0 20px ${primary}, 0 0 40px ${primary}88, 0 0 80px ${secondary}44`,
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {hName}
              </div>
              <div className="text-xl mb-1" style={{ color: secondary }}>
                {sortedHouse.motto}
              </div>
              <div className="text-sm text-[#9ca3af] mb-6 max-w-md text-center">
                {sortedHouse.description}
              </div>

              <div className="flex gap-3 mb-6">
                {sortedHouse.traits.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: `${primary}22`,
                      color: secondary,
                      border: `1px solid ${primary}44`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div
                className="text-lg italic text-center max-w-md mb-6 px-4 py-3 rounded-lg border"
                style={{
                  color: "#e8dcc8",
                  borderColor: `${primary}44`,
                  background: `${primary}11`,
                }}
              >
                "{sortedHouse.hatMessage}"
              </div>

              <Button
                onClick={() => setStep("portrait")}
                className="px-8 py-3 text-base font-bold rounded-lg animate-pulse-glow"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: "#0a0e1a",
                }}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                下一步：生成巫师肖像
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>

            {/* Right: Score cards */}
            <div className="lg:w-80 flex flex-col gap-4 justify-center">
              <div className="rounded-xl border p-4" style={{ borderColor: `${primary}33`, background: "rgba(15,15,30,0.7)", backdropFilter: "blur(10px)" }}>
                <div className="text-xs text-[#9ca3af] mb-3 uppercase tracking-wider">念咒考核</div>
                {level1Result?.spells.map((s, i) => (
                  <div key={i} className="flex items-center justify-between mb-2 py-1.5 border-b border-[#1f2937] last:border-0">
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" style={{ color: secondary }} />
                      <span className="text-sm text-[#e8dcc8]">{s.spell.nameCn}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-xs text-[#9ca3af]">准确度 {s.accuracy}%</span>
                      <span className="text-xs text-[#9ca3af]">气势 {s.power}%</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1f2937]">
                  <span className="text-sm font-bold" style={{ color: secondary }}>综合得分</span>
                  <span className="text-lg font-bold" style={{ color: primary }}>{Math.round(l1Score)}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: `${primary}33`, background: "rgba(15,15,30,0.7)", backdropFilter: "blur(10px)" }}>
                <div className="text-xs text-[#9ca3af] mb-3 uppercase tracking-wider">施咒考核</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#e8dcc8]">图案匹配</span>
                  <span className="text-sm font-bold" style={{ color: primary }}>{Math.round(level2Result?.score ?? 0)}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#e8dcc8]">轨迹精度</span>
                  <span className="text-sm font-bold" style={{ color: primary }}>{Math.round(level2Result?.precision ?? 0)}%</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1f2937]">
                  <span className="text-sm font-bold" style={{ color: secondary }}>综合得分</span>
                  <span className="text-lg font-bold" style={{ color: primary }}>{Math.round(l2Score)}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${primary}55`, background: `linear-gradient(135deg, ${primary}22, ${secondary}11)` }}>
                <div className="text-xs text-[#9ca3af] mb-1 uppercase tracking-wider">总评</div>
                <div className="text-4xl font-bold" style={{ color: secondary, textShadow: `0 0 20px ${primary}88` }}>
                  {totalScore}
                </div>
                <div className="text-xs text-[#9ca3af] mt-1">
                  {totalScore >= 80 ? "杰出" : totalScore >= 60 ? "优秀" : totalScore >= 40 ? "良好" : "尚需磨练"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 2: PORTRAIT ===== */}
        {step === "portrait" && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-[#e8dcc8]" style={{ fontFamily: "'Cinzel', serif", textShadow: "0 0 12px #c9a84c88" }}>
              巫师肖像
            </h2>
            <p className="text-sm text-[#9ca3af] mb-6">分院帽将为你的照片施展幻身咒，呈现你身着学院服饰的英姿</p>

            {!photoGenerated ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-64 h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3"
                  style={{ borderColor: `${primary}55`, background: `${primary}0d` }}
                >
                  <Camera className="w-12 h-12" style={{ color: `${primary}88` }} />
                  <span className="text-sm text-[#9ca3af]">点击下方按钮拍照</span>
                </div>
                {photoError && (
                  <div className="text-sm text-red-400 bg-red-950/50 px-4 py-2 rounded-lg">{photoError}</div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleTakePhoto}
                    disabled={photoLoading}
                    className="px-6 py-3 text-base font-bold rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                      color: "#0a0e1a",
                    }}
                  >
                    {photoLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 mr-2" />
                    )}
                    {photoLoading ? "施展幻身咒中..." : "拍照"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {generatedImageUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative rounded-xl overflow-hidden border-2" style={{ borderColor: `${primary}66`, boxShadow: `0 0 40px ${primary}33` }}>
                      <img
                        src={generatedImageUrl}
                        alt="巫师肖像"
                        className="w-full max-w-md object-contain"
                        style={{ maxHeight: "50vh" }}
                      />
                      {/* QR Code overlay */}
                      {qrCodeDataUrl && (
                        <div
                          className="absolute bottom-3 left-3 p-2 rounded-lg flex flex-col items-center gap-1"
                          style={{ background: "rgba(10,14,26,0.85)", backdropFilter: "blur(8px)" }}
                        >
                          <img src={qrCodeDataUrl} alt="扫码保存" className="w-24 h-24" />
                          <span className="text-[10px] text-[#9ca3af]">手机扫码保存</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleRetake}
                        className="rounded-lg border-[#374151] text-[#e8dcc8] hover:bg-[#1f2937]"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        重拍
                      </Button>
                      <Button
                        onClick={() => setStep("badge")}
                        className="px-6 py-3 text-base font-bold rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                          color: "#0a0e1a",
                        }}
                      >
                        <ChevronRight className="w-5 h-5 mr-1" />
                        下一步：专属徽章
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: primary }} />
                    <p className="text-sm text-[#9ca3af]">正在施展幻身咒...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 3: BADGE ===== */}
        {step === "badge" && (
          <div className="w-full max-w-2xl flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-[#e8dcc8]" style={{ fontFamily: "'Cinzel', serif", textShadow: "0 0 12px #c9a84c88" }}>
              专属徽章
            </h2>
            <p className="text-sm text-[#9ca3af] mb-6">
              以你表现最出色的咒语「{bestSpell?.spell.nameCn ?? "未知"}」为灵感铸造
            </p>

            <div className="flex flex-col items-center gap-6">
              {badgeUrl ? (
                <div
                  className="relative rounded-2xl overflow-hidden border-2 p-2"
                  style={{
                    borderColor: `${primary}66`,
                    boxShadow: `0 0 40px ${primary}33, inset 0 0 60px ${primary}11`,
                    background: "rgba(15,15,30,0.6)",
                  }}
                >
                  <img
                    src={badgeUrl}
                    alt={`${bestSpell?.spell.nameCn ?? ""}徽章`}
                    className="w-56 h-56 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const fallback = document.createElement("div");
                        fallback.className = "w-56 h-56 flex items-center justify-center text-6xl";
                        fallback.textContent = sortedHouse.emoji;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-56 h-56 rounded-2xl border flex items-center justify-center text-6xl" style={{ borderColor: `${primary}44` }}>
                  {sortedHouse.emoji}
                </div>
              )}

              <div className="text-center">
                <div className="text-lg font-bold text-[#e8dcc8] mb-1">{bestSpell?.spell.nameCn} 徽章</div>
                <div className="text-sm text-[#9ca3af]">金属珐琅 · 限定版</div>
              </div>

              {!badgeForged ? (
                <Button
                  onClick={() => setBadgeForged(true)}
                  className="px-6 py-3 text-base font-bold rounded-lg animate-pulse-glow"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    color: "#0a0e1a",
                  }}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  1 加隆 · 铸造
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm font-bold" style={{ color: secondary }}>✨ 徽章已铸成！古灵阁已扣款。</div>
                  <Button
                    onClick={() => setStep("wand")}
                    className="px-6 py-3 text-base font-bold rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                      color: "#0a0e1a",
                    }}
                  >
                    <ChevronRight className="w-5 h-5 mr-1" />
                    下一步：魔杖选择
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 4: WAND ===== */}
        {step === "wand" && (
          <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-8">
            {/* Wand image */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative rounded-2xl overflow-hidden border-2 p-4"
                style={{
                  borderColor: `${primary}66`,
                  boxShadow: `0 0 40px ${primary}33`,
                  background: "rgba(15,15,30,0.6)",
                }}
              >
                <img src="/wand.png" alt="魔杖" className="w-32 h-80 object-contain" />
              </div>
            </div>

            {/* Wand info */}
            <div className="flex-1 flex flex-col items-center lg:items-start gap-4">
              <h2 className="text-2xl font-bold text-[#e8dcc8]" style={{ fontFamily: "'Cinzel', serif", textShadow: "0 0 12px #c9a84c88" }}>
                你的魔杖
              </h2>

              {wand ? (
                <div className="w-full max-w-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-[#1f2937]">
                    <span className="text-sm text-[#9ca3af]">杖木</span>
                    <span className="text-base font-bold text-[#e8dcc8]">{wand.woodCn}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1f2937]">
                    <span className="text-sm text-[#9ca3af]">杖芯</span>
                    <span className="text-base font-bold text-[#e8dcc8]">{wand.coreCn}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1f2937]">
                    <span className="text-sm text-[#9ca3af]">长度</span>
                    <span className="text-base font-bold text-[#e8dcc8]">{wand.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1f2937]">
                    <span className="text-sm text-[#9ca3af]">弹性</span>
                    <span className="text-base font-bold text-[#e8dcc8]">{wand.flexibility}</span>
                  </div>
                  <div
                    className="text-sm text-[#e8dcc8] leading-relaxed p-3 rounded-lg"
                    style={{ background: `${primary}11`, border: `1px solid ${primary}33` }}
                  >
                    {wand.description}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#9ca3af]">暂无魔杖推荐</div>
              )}

              {!wandBought ? (
                <Button
                  onClick={() => setWandBought(true)}
                  className="px-6 py-3 text-base font-bold rounded-lg animate-pulse-glow"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    color: "#0a0e1a",
                  }}
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  {wand?.price ?? 11} 加隆 · 购买
                </Button>
              ) : (
                <div className="flex flex-col items-center lg:items-start gap-3">
                  <div className="text-sm font-bold" style={{ color: secondary }}>
                    ✨ 魔杖已选中！奥利凡德记下了你的选择。
                  </div>
                  <Button
                    onClick={resetGame}
                    className="px-6 py-3 text-base font-bold rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                      color: "#0a0e1a",
                    }}
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    再来一次分院仪式
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
