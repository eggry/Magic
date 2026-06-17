"use client";

import { useState, useEffect, useMemo } from "react";
import { useGame } from "./GameProvider";
import { recommendWand } from "@/lib/wands";
import { getBadgeUrl, type Spell } from "@/lib/spells";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wand2,
  ChevronRight,
  Camera,
  RotateCcw,
  Loader2,
  Shield,
  Flame,
  Eye,
  Scroll,
  Star,
} from "lucide-react";
import type { HouseName } from "@/lib/sorting-hat";

export default function ResultScreen() {
  const { level1Result, level2Result, sortedHouse, generatedImageUrl, resetGame } = useGame();
  const [step, setStep] = useState<"report" | "badge" | "wand" | "portrait">("report");
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

  const bestCategory = useMemo<Spell["category"] | null>(() => {
    if (!level1Result || level1Result.spells.length === 0) return null;
    const cats = level1Result.spells.reduce<Record<string, number>>((acc, s) => {
      acc[s.spell.category] = (acc[s.spell.category] || 0) + (s.accuracy + s.power) / 2;
      return acc;
    }, {});
    const bestCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    return bestCat ? (bestCat[0] as Spell["category"]) : null;
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
    import("qrcode")
      .then((QRCode) => {
        if (cancelled) return;
        QRCode.toDataURL(generatedImageUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#c9a84c", light: "#0a0e1a" },
        })
          .then((url: string) => {
            if (!cancelled) setQrCodeDataUrl(url);
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [generatedImageUrl]);

  const house = sortedHouse;
  if (!house) return null;

  const primary = house.colors.primary;
  const secondary = house.colors.secondary;

  const steps = [
    { key: "report" as const, label: "评估报告", icon: Scroll },
    { key: "badge" as const, label: "专属徽章", icon: Shield },
    { key: "wand" as const, label: "魔杖", icon: Wand2 },
    { key: "portrait" as const, label: "巫师肖像", icon: Camera },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #111827 50%, #1a1025 100%)",
      }}
    >
      {/* Particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-amber-300/30"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animation: `particleFloat ${4 + (i % 6)}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{ borderColor: `${primary}30`, background: "rgba(10,14,26,0.8)", backdropFilter: "blur(12px)" }}>
        <h1 className="text-sm font-bold tracking-widest" style={{ fontFamily: "Cinzel, serif", color: "#c9a84c" }}>
          分院仪式
        </h1>
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === currentStepIndex;
            const done = i < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                    active ? "scale-110" : ""
                  }`}
                  style={{
                    background: done ? primary : active ? `linear-gradient(135deg, ${primary}, ${secondary})` : "rgba(255,255,255,0.1)",
                    border: `1.5px solid ${active ? secondary : done ? primary : "rgba(255,255,255,0.15)"}`,
                    boxShadow: active ? `0 0 10px ${primary}60` : "none",
                  }}
                >
                  <Icon className="h-3 w-3" style={{ color: active || done ? "#fff" : "#9ca3af" }} />
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-1 h-px w-4" style={{ background: done ? primary : "rgba(255,255,255,0.1)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`relative z-10 flex-1 overflow-y-auto p-4 transition-all duration-400 ${
          stepEntering ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* =================== STEP 1: PORTRAIT =================== */}
        {step === "portrait" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4">
            {/* House Title */}
            <div className="text-center">
              <h2
                className="text-4xl font-bold"
                style={{
                  fontFamily: "Cinzel, serif",
                  color: primary,
                  textShadow: `0 0 20px ${primary}60, 0 0 40px ${primary}30`,
                }}
              >
                {house.name}
              </h2>
              <p className="mt-1 text-sm" style={{ color: secondary }}>
                {house.motto}
              </p>
              <p className="mt-2 text-xs italic" style={{ color: "#9ca3af" }}>
                "{house.hatMessage}"
              </p>
            </div>

            {/* Portrait or Loading */}
            <div className="relative w-full max-w-md">
              <div
                className="relative overflow-hidden rounded-2xl border-2"
                style={{
                  borderColor: `${primary}40`,
                  boxShadow: `0 0 30px ${primary}20, inset 0 0 30px rgba(0,0,0,0.5)`,
                }}
              >
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="巫师肖像"
                    className="h-auto w-full"
                  />
                ) : (
                  <div
                    className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3"
                    style={{ background: "rgba(10,10,20,0.8)" }}
                  >
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: primary }} />
                    <p className="text-sm" style={{ color: "#9ca3af" }}>
                      分院帽正在为你施法...
                    </p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      巫师形象生成中，请稍候
                    </p>
                  </div>
                )}

                {/* Corner glow */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2" style={{ borderColor: primary }} />
                  <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2" style={{ borderColor: primary }} />
                  <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2" style={{ borderColor: primary }} />
                  <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2" style={{ borderColor: primary }} />
                </div>
              </div>

              {/* QR Code */}
              {generatedImageUrl && qrCodeDataUrl && (
                <div className="mt-3 flex flex-col items-center gap-1">
                  <img src={qrCodeDataUrl} alt="扫码保存" className="h-16 w-16 rounded-lg border" style={{ borderColor: `${primary}30` }} />
                  <span className="text-xs" style={{ color: "#9ca3af" }}>扫码保存肖像</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep("badge")}
              className="mt-2 flex items-center gap-2 rounded-xl px-8 py-3 text-base font-bold text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                fontFamily: "Noto Serif SC, serif",
              }}
            >
              下一步：专属徽章
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* =================== STEP 2: BADGE =================== */}
        {step === "badge" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#c9a84c" }}>
                专属徽章
              </h2>
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                你在考核中表现最出色的咒语
              </p>
            </div>

            <div className="flex gap-6">
              {/* Badge Card */}
              <div
                className="flex flex-col items-center rounded-2xl border p-4 text-center"
                style={{
                  width: 200,
                  borderColor: `${primary}30`,
                  background: "rgba(15,15,30,0.8)",
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 0 20px ${primary}10, inset 0 0 30px rgba(0,0,0,0.3)`,
                }}
              >
                <h3 className="mb-2 text-base font-bold" style={{ color: "#c9a84c", fontFamily: "Cinzel, serif" }}>
                  专属徽章
                </h3>
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-xl border"
                  style={{ borderColor: `${primary}30`, background: "rgba(0,0,0,0.3)" }}>
                  {badgeUrl ? (
                    <img
                      src={badgeUrl}
                      alt={bestSpell?.spell.nameCn ?? "徽章"}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const parent = el.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span style="font-size:48px">🎖️</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-5xl">🎖️</span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold" style={{ color: "#e8dcc8" }}>
                  {bestSpell?.spell.nameCn ?? "未知咒语"}
                </p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  {bestSpell?.spell.incantationCn ?? ""}
                </p>

                {!badgeForged ? (
                  <button
                    onClick={() => setBadgeForged(true)}
                    className="mt-3 w-full rounded-lg px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    }}
                  >
                    1 加隆 · 铸造
                  </button>
                ) : (
                  <p className="mt-3 text-xs" style={{ color: "#4ade80" }}>
                    徽章已铸成！
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("portrait")}
                className="rounded-xl border-amber-500/30 px-6 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                上一步
              </Button>
              <Button
                onClick={() => setStep("wand")}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-bold text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #c9a84c, #d4a017)",
                  fontFamily: "Noto Serif SC, serif",
                }}
              >
                下一步：魔杖
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =================== STEP 3: WAND =================== */}
        {step === "wand" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#c9a84c" }}>
                你的魔杖
              </h2>
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                分院帽为你匹配的专属魔杖
              </p>
            </div>

            <div
              className="flex w-full max-w-md flex-col items-center rounded-2xl border p-5 text-center"
              style={{
                borderColor: `${primary}30`,
                background: "rgba(15,15,30,0.8)",
                backdropFilter: "blur(12px)",
                boxShadow: `0 0 20px ${primary}10, inset 0 0 30px rgba(0,0,0,0.3)`,
              }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${primary}40)` }} />
                <Sparkles className="h-4 w-4" style={{ color: primary }} />
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${primary}40, transparent)` }} />
              </div>

              <div className="relative mb-3 flex h-[120px] w-[120px] items-center justify-center">
                <img
                  src="/wand.png"
                  alt="魔杖"
                  className="h-20 w-20 object-contain drop-shadow-lg"
                  style={{ filter: `drop-shadow(0 0 10px ${primary}60)` }}
                />
              </div>

              <p className="text-lg font-bold" style={{ color: "#e8dcc8", fontFamily: "Cinzel, serif" }}>
                {wand?.wood ?? "神秘"} · {wand?.core ?? "未知杖芯"}
              </p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                长度: {wand?.length ?? "未知"} · 弹性: {wand?.flexibility ?? "未知"}
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                {wand?.description ?? "这根魔杖选择了你..."}
              </p>

              {!wandBought ? (
                <button
                  onClick={() => setWandBought(true)}
                  className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  }}
                >
                  11 加隆 · 购买
                </button>
              ) : (
                <p className="mt-4 text-sm" style={{ color: "#4ade80" }}>
                  奥利凡德已为你包好魔杖！
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("badge")}
                className="rounded-xl border-amber-500/30 px-6 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                上一步
              </Button>
              <Button
                onClick={() => setStep("report")}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-bold text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #c9a84c, #d4a017)",
                  fontFamily: "Noto Serif SC, serif",
                }}
              >
                下一步：评估报告
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =================== STEP 4: REPORT =================== */}
        {step === "report" && (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#c9a84c" }}>
                评估报告
              </h2>
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                你在分院仪式中的全部表现
              </p>
            </div>

            <div className="grid w-full max-w-3xl grid-cols-2 gap-4">
              {/* Level 1 */}
              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${primary}30`,
                  background: "rgba(15,15,30,0.8)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <h3 className="mb-3 text-base font-bold" style={{ color: "#c9a84c", fontFamily: "Cinzel, serif" }}>
                  念咒考核
                </h3>
                <div className="space-y-3">
                  <ScoreBar label="准确度" value={accuracy} max={100} color="#60a5fa" icon={<Eye className="h-3.5 w-3.5" />} />
                  <ScoreBar label="气势" value={power} max={100} color="#f87171" icon={<Flame className="h-3.5 w-3.5" />} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#9ca3af" }}>
                  <span>咒语倾向</span>
                  <span>
                    光明:{Math.round(lightAffinity)} 黑暗:{Math.round(darkAffinity)}
                  </span>
                </div>
              </div>

              {/* Level 2 */}
              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${primary}30`,
                  background: "rgba(15,15,30,0.8)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <h3 className="mb-3 text-base font-bold" style={{ color: "#c9a84c", fontFamily: "Cinzel, serif" }}>
                  画符考核
                </h3>
                <div className="space-y-3">
                  <ScoreBar label="匹配度" value={level2Result?.score ?? 0} max={100} color="#a78bfa" icon={<Shield className="h-3.5 w-3.5" />} />
                  <ScoreBar label="精准度" value={level2Result?.precision ?? 0} max={100} color="#34d399" icon={<Star className="h-3.5 w-3.5" />} />
                </div>
              </div>
            </div>

            {/* Total Score */}
            <div
              className="flex w-full max-w-md items-center justify-between rounded-xl border px-6 py-3"
              style={{ borderColor: `${primary}40`, background: "rgba(15,15,30,0.6)" }}
            >
              <span className="text-sm font-bold" style={{ color: "#e8dcc8" }}>
                总分
              </span>
              <span className="text-2xl font-bold" style={{ color: primary, textShadow: `0 0 20px ${primary}60` }}>
                {totalScore}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("wand")}
                className="rounded-xl border-amber-500/30 px-6 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                上一步
              </Button>
              <Button
                onClick={resetGame}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-bold text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #c9a84c, #d4a017)",
                  fontFamily: "Noto Serif SC, serif",
                }}
              >
                <RotateCcw className="h-4 w-4" />
                再来一次
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1" style={{ color: "#9ca3af" }}>
          {icon} {label}
        </span>
        <span className="font-bold" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />
      </div>
    </div>
  );
}
