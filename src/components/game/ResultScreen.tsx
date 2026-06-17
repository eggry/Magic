"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGame, type Level1Result, type Level2Result, type SpellResult } from "./GameProvider";
import type { Spell } from "@/lib/spells";
import { recommendWand } from "@/lib/wands";
import { getBadgeUrl } from "@/lib/spells";
import { HOUSES, type SortingResult } from "@/lib/sorting-hat";
import type { SpellCategory } from "@/lib/spells";
import {
  ChevronRight,
  ChevronLeft,
  Wand2,
  Shield,
  Sparkles,
  Star,
  RotateCcw,
  Download,
  Gem,
  Award,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

const houseFrameColors: Record<string, { primary: string; secondary: string; glow: string }> = {
  gryffindor: { primary: "#740001", secondary: "#d3a625", glow: "rgba(211, 166, 37, 0.4)" },
  slytherin: { primary: "#1a472a", secondary: "#aaaaaa", glow: "rgba(170, 170, 170, 0.4)" },
  ravenclaw: { primary: "#0e1a40", secondary: "#946b2d", glow: "rgba(148, 107, 45, 0.4)" },
  hufflepuff: { primary: "#ecb939", secondary: "#372e29", glow: "rgba(236, 185, 57, 0.4)" },
};

export default function ResultScreen() {
  const { sortedHouse: house, level1Result, level2Result, generatedImageUrl, resetGame } = useGame();
  const [step, setStep] = useState<"report" | "badge" | "wand" | "portrait">("report");
  const [badgeForged, setBadgeForged] = useState(false);
  const [wandBought, setWandBought] = useState(false);
  const [stepEntering, setStepEntering] = useState(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      setStepEntering(false);
      return;
    }
    setStepEntering(true);
    const t = setTimeout(() => setStepEntering(false), 400);
    return () => clearTimeout(t);
  }, [step]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  if (!house) return null;

  const colors = houseFrameColors[house.name] || houseFrameColors.gryffindor;

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)" }}>
      {/* 背景星光 */}
      <div className="pointer-events-none absolute inset-0 sparkle-bg" />

      {/* 步骤导航 */}
      <div className="absolute left-0 right-0 top-8 z-20 flex justify-center gap-6">
        {(["report", "badge", "wand", "portrait"] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-base font-bold transition-all duration-300 ${
              step === s
                ? "scale-110"
                : "opacity-50 hover:opacity-80"
            }`}
            style={{
              background: step === s ? "linear-gradient(135deg, #c9a84c, #d4a017)" : "rgba(15,15,30,0.6)",
              color: step === s ? "#0a0e1a" : "#9ca3af",
              border: step === s ? "2px solid #f0d878" : "1px solid rgba(201,168,76,0.2)",
              boxShadow: step === s ? `0 0 20px ${colors.glow}` : "none",
            }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-black" style={{ background: step === s ? "#0a0e1a" : "rgba(201,168,76,0.2)", color: step === s ? "#c9a84c" : "#9ca3af" }}>
              {i + 1}
            </span>
            {s === "report" && "评估报告"}
            {s === "badge" && "专属徽章"}
            {s === "wand" && "匹配魔杖"}
            {s === "portrait" && "巫师肖像"}
          </button>
        ))}
      </div>

      {/* 主内容 */}
      <div
        className={`relative z-10 mt-16 flex h-[calc(100vh-120px)] w-full max-w-[1600px] flex-col items-center justify-center px-8 transition-all duration-400 ${
          stepEntering ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {step === "report" && <ReportStep house={house} level1Result={level1Result} level2Result={level2Result} onNext={() => setStep("badge")} colors={colors} />}
        {step === "badge" && <BadgeStep house={house} level1Result={level1Result} badgeForged={badgeForged} onForge={() => setBadgeForged(true)} onPrev={() => setStep("report")} onNext={() => setStep("wand")} colors={colors} />}
        {step === "wand" && <WandStep house={house} level1Result={level1Result} wandBought={wandBought} onBuy={() => setWandBought(true)} onPrev={() => setStep("badge")} onNext={() => setStep("portrait")} colors={colors} />}
        {step === "portrait" && <PortraitStep house={house} generatedImageUrl={generatedImageUrl} onPrev={() => setStep("wand")} onRestart={handleRestart} colors={colors} />}
      </div>
    </div>
  );
}

/* ========== 评估报告 ========== */
function ReportStep({
  house,
  level1Result,
  level2Result,
  onNext,
  colors,
}: {
  house: SortingResult;
  level1Result: Level1Result | null;
  level2Result: Level2Result | null;
  onNext: () => void;
  colors: { primary: string; secondary: string; glow: string };
}) {
  const accuracy = level1Result ? Math.round(level1Result.accuracy) : 0;
  const power = level1Result ? Math.round(level1Result.power) : 0;
  const score = level2Result ? Math.round(level2Result.score) : 0;
  const precision = level2Result ? Math.round(level2Result.precision || 0) : 0;
  const total = Math.round((accuracy + power + score + precision) / 4);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col items-center justify-center gap-4">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-wider text-embossed-gold-lg">
          巫师评估报告
        </h1>
        <p className="mt-1 text-xl" style={{ color: "#9ca3af", fontFamily: "Noto Serif SC, serif" }}>
          分院帽已完成对你的全面考察
        </p>
      </div>

      {/* 暗黑主卡片 */}
      <div className="relative w-full rounded-xl border p-6" style={{ borderColor: "rgba(201,168,76,0.25)", background: "rgba(15,15,30,0.7)", backdropFilter: "blur(10px)" }}>
        <div className="relative z-10 grid grid-cols-2 gap-6">
          {/* 左列：分院结果 */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-lg font-bold" style={{ color: "#c9a84c", fontFamily: "Noto Serif SC, serif" }}>分院结果</p>
              <h2 className="text-5xl font-black text-embossed-gold-lg">
                {house.nameCn}
              </h2>
              <p className="mt-1 text-lg italic" style={{ color: "#9ca3af" }}>{house.hatMessage}</p>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(15,15,30,0.5)" }}>
              <p className="mb-2 text-lg font-bold" style={{ color: "#c9a84c" }}>性格特质</p>
              <div className="flex flex-wrap gap-2">
                {house.traits.map((t) => (
                  <span key={t} className="rounded-full px-4 py-1 text-base font-bold" style={{ background: colors.primary, color: "#fff" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(15,15,30,0.5)" }}>
              <p className="mb-2 text-lg font-bold" style={{ color: "#c9a84c" }}>学院信息</p>
              <div className="flex flex-wrap gap-3 text-base" style={{ color: "#e8dcc8" }}>
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: colors.secondary }} /> {house.motto}</span>
                <span className="flex items-center gap-2"><Star className="h-4 w-4" style={{ color: colors.secondary }} /> {house.mascot}</span>
                <span className="flex items-center gap-2"><ScrollText className="h-4 w-4" style={{ color: colors.secondary }} /> {house.nameEn}</span>
              </div>
            </div>
          </div>

          {/* 右列：考核成绩 */}
          <div className="flex flex-col gap-4">
            <p className="text-lg font-bold" style={{ color: "#c9a84c" }}>考核成绩</p>

            <div className="rounded-lg border p-4" style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(15,15,30,0.5)" }}>
              <div className="mb-2 flex items-center gap-2">
                <Wand2 className="h-5 w-5" style={{ color: colors.primary }} />
                <span className="text-xl font-bold" style={{ color: "#e8dcc8" }}>念咒考核</span>
              </div>
              <div className="space-y-2">
                <ScoreBar label="准确度" value={accuracy} max={100} color={colors.primary} icon={<Star className="h-4 w-4" />} />
                <ScoreBar label="气势" value={power} max={100} color={colors.secondary} icon={<Sparkles className="h-4 w-4" />} />
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(15,15,30,0.5)" }}>
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: colors.primary }} />
                <span className="text-xl font-bold" style={{ color: "#e8dcc8" }}>画符考核</span>
              </div>
              <div className="space-y-2">
                <ScoreBar label="完成度" value={score} max={100} color={colors.primary} icon={<Star className="h-4 w-4" />} />
                <ScoreBar label="精准度" value={precision} max={100} color={colors.secondary} icon={<Sparkles className="h-4 w-4" />} />
              </div>
            </div>

            {/* 总分 */}
            <div className="mt-auto rounded-xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${colors.primary}22, ${colors.secondary}22)`, border: `2px solid ${colors.primary}` }}>
              <p className="text-lg font-bold" style={{ color: "#c9a84c" }}>综合评分</p>
              <p className="mt-1 text-5xl font-black" style={{ color: "#c9a84c", textShadow: `0 0 15px ${colors.glow}` }}>
                {total}
              </p>
              <p className="text-base" style={{ color: "#9ca3af" }}>分</p>
            </div>
          </div>
        </div>
      </div>

      {/* 下一步按钮 */}
      <Button
        onClick={onNext}
        className="flex items-center gap-3 rounded-xl px-10 py-4 text-xl font-bold text-white shadow-xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #c9a84c, #d4a017)", fontFamily: "Noto Serif SC, serif" }}
      >
        下一步：专属徽章
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
}

/* ========== 专属徽章 ========== */
function BadgeStep({
  house,
  level1Result,
  badgeForged,
  onForge,
  onPrev,
  onNext,
  colors,
}: {
  house: SortingResult;
  level1Result: Level1Result | null;
  badgeForged: boolean;
  onForge: () => void;
  onPrev: () => void;
  onNext: () => void;
  colors: { primary: string; secondary: string; glow: string };
}) {
  const bestSpell = useMemo(() => {
    if (!level1Result?.spells?.length) return null;
    return level1Result.spells.reduce((best: SpellResult, s: SpellResult) => {
      const score = ((s.accuracy || 0) + (s.power || 0)) / 2;
      const bestScore = ((best.accuracy || 0) + (best.power || 0)) / 2;
      return score > bestScore ? s : best;
    }, level1Result.spells[0]);
  }, [level1Result]);

  const badgeUrl = useMemo(() => {
    if (!bestSpell) return null;
    return getBadgeUrl(bestSpell.spell.nameCn);
  }, [bestSpell]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-wider text-embossed-gold-lg">
          专属徽章
        </h1>
        <p className="mt-2 text-2xl" style={{ color: "#9ca3af", fontFamily: "Noto Serif SC, serif" }}>
          你最强咒语的象征
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-16">
        {/* 徽章展示 */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="relative flex h-[280px] w-[280px] items-center justify-center rounded-2xl"
            style={{
              border: `3px solid ${colors.primary}`,
              boxShadow: `0 0 40px ${colors.glow}`,
            }}
          >
            {badgeUrl ? (
              <img src={badgeUrl} alt={bestSpell?.spell.nameCn ?? "徽章"} className="h-[240px] w-[240px] object-contain drop-shadow-2xl" />
            ) : (
              <span className="text-8xl">🎖️</span>
            )}
          </div>
          <p className="text-3xl font-black text-embossed-gold">
            {bestSpell?.spell.nameCn ?? "未知咒语"}
          </p>
        </div>

        {/* 铸造按钮 */}
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={onForge}
            disabled={badgeForged}
            className="flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold shadow-xl transition-all hover:scale-105 disabled:opacity-60"
            style={{
              background: badgeForged ? "linear-gradient(135deg, #2a2a4e, #1a1a2e)" : "linear-gradient(135deg, #c9a84c, #d4a017)",
              color: badgeForged ? "#9ca3af" : "#0a0e1a",
              fontFamily: "Noto Serif SC, serif",
            }}
          >
            <Gem className="h-6 w-6" />
            {badgeForged ? "已铸造" : "1 加隆 铸造"}
          </Button>
          {badgeForged && (
            <p className="animate-pulse text-xl font-bold" style={{ color: "#c9a84c" }}>
              铸造成功！
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <Button onClick={onPrev} className="flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold" variant="outline" style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}>
          <ChevronLeft className="h-5 w-5" />
          上一步
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white" style={{ background: "linear-gradient(135deg, #c9a84c, #d4a017)" }}>
          下一步：魔杖
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/* ========== 匹配魔杖 ========== */
function WandStep({
  house,
  level1Result,
  wandBought,
  onBuy,
  onPrev,
  onNext,
  colors,
}: {
  house: SortingResult;
  level1Result: Level1Result | null;
  wandBought: boolean;
  onBuy: () => void;
  onPrev: () => void;
  onNext: () => void;
  colors: { primary: string; secondary: string; glow: string };
}) {
  const bestCategory = useMemo(() => {
    if (!level1Result?.spells?.length) return null;
    const cats: Record<string, number> = {};
    level1Result.spells.forEach((s: SpellResult) => {
      const c = s.spell.category;
      const score = ((s.accuracy || 0) + (s.power || 0)) / 2;
      cats[c] = (cats[c] || 0) + score;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [level1Result]);

  const wand = useMemo(() => {
    if (!bestCategory || !level1Result) return null;
    return recommendWand({
      house: house.name,
      accuracy: level1Result.accuracy || 0,
      power: level1Result.power || 0,
      darkAffinity: level1Result.darkAffinity || 0,
      bestCategory: bestCategory as SpellCategory,
    });
  }, [bestCategory, house.name, level1Result]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col items-center justify-center gap-5">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-wider text-embossed-gold-lg">
          你的魔杖
        </h1>
        <p className="mt-1 text-2xl" style={{ color: "#9ca3af", fontFamily: "Noto Serif SC, serif" }}>
          魔杖选择巫师
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-12">
        {/* 魔杖展示 */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative flex h-[280px] w-[160px] items-center justify-center rounded-2xl"
            style={{
              border: `3px solid ${colors.primary}`,
              boxShadow: `0 0 40px ${colors.glow}`,
            }}
          >
            <img src="/wand.png" alt="魔杖" className="h-[220px] w-auto object-contain drop-shadow-2xl" />
          </div>
          <p className="text-3xl font-black text-embossed-gold">
            {wand?.name ?? "神秘魔杖"}
          </p>
          <p className="text-xl" style={{ color: "#9ca3af" }}>
            {wand?.wood ?? "神秘木材"} · {wand?.core ?? "未知杖芯"}
          </p>
          <p className="max-w-[380px] text-center text-base leading-relaxed" style={{ color: "#9ca3af" }}>
            {wand?.description ?? "这根魔杖正在等待它的主人..."}
          </p>
        </div>

        {/* 购买按钮 */}
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={onBuy}
            disabled={wandBought}
            className="flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold shadow-xl transition-all hover:scale-105 disabled:opacity-60"
            style={{
              background: wandBought ? "linear-gradient(135deg, #2a2a4e, #1a1a2e)" : "linear-gradient(135deg, #c9a84c, #d4a017)",
              color: wandBought ? "#9ca3af" : "#0a0e1a",
              fontFamily: "Noto Serif SC, serif",
            }}
          >
            <Award className="h-6 w-6" />
            {wandBought ? "已购买" : "7 加隆 购买"}
          </Button>
          {wandBought && (
            <p className="animate-pulse text-xl font-bold" style={{ color: "#c9a84c" }}>
              魔杖已认主！
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <Button onClick={onPrev} className="flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold" variant="outline" style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}>
          <ChevronLeft className="h-5 w-5" />
          上一步
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white" style={{ background: "linear-gradient(135deg, #c9a84c, #d4a017)" }}>
          下一步：巫师肖像
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/* ========== 巫师肖像 ========== */
function PortraitStep({
  house,
  generatedImageUrl,
  onPrev,
  onRestart,
  colors,
}: {
  house: SortingResult;
  generatedImageUrl: string | null;
  onPrev: () => void;
  onRestart: () => void;
  colors: { primary: string; secondary: string; glow: string };
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-wider text-embossed-gold-lg">
          巫师肖像
        </h1>
        <p className="mt-2 text-3xl font-bold text-embossed-gold-lg">
          {house.nameCn}
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-12">
        {/* 肖像画框 */}
        <div className="relative">
          <div
            className="portrait-frame"
            style={
              {
                ["--frame-primary" as string]: colors.primary,
                ["--frame-secondary" as string]: colors.secondary,
              } as React.CSSProperties
            }
          >
            {/* 四角装饰 */}
            <div className="frame-corner tl" style={{ ["--frame-primary" as string]: colors.primary } as React.CSSProperties} />
            <div className="frame-corner tr" style={{ ["--frame-primary" as string]: colors.primary } as React.CSSProperties} />
            <div className="frame-corner bl" style={{ ["--frame-primary" as string]: colors.primary } as React.CSSProperties} />
            <div className="frame-corner br" style={{ ["--frame-primary" as string]: colors.primary } as React.CSSProperties} />

            <div
              className="relative overflow-hidden rounded"
              style={{
                width: "480px",
                height: "480px",
                background: "linear-gradient(145deg, #1a1a2e, #0f0f1e)",
                boxShadow: `inset 0 0 60px ${colors.glow}`,
              }}
            >
              {generatedImageUrl ? (
                <img src={generatedImageUrl} alt="巫师肖像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent" style={{ borderTopColor: "#c9a84c" }} />
                  <p className="text-2xl font-bold" style={{ color: "#c9a84c", fontFamily: "Noto Serif SC, serif" }}>肖像生成中...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧信息 */}
        <div className="flex flex-col items-center gap-8">
          {/* 二维码 */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xl font-bold" style={{ color: "#9ca3af" }}>扫码保存肖像</p>
            <div
              className="flex h-[160px] w-[160px] items-center justify-center rounded-xl p-3"
              style={{ background: "#fff", border: `3px solid ${colors.primary}`, boxShadow: `0 0 30px ${colors.glow}` }}
            >
              {generatedImageUrl ? (
                <QRCodeSVG value={generatedImageUrl} size={140} level="M" />
              ) : (
                <div className="h-[140px] w-[140px] animate-pulse rounded bg-gray-200" />
              )}
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex flex-col gap-4">
            <Button
              onClick={onRestart}
              className="flex items-center gap-3 rounded-xl px-10 py-4 text-xl font-bold text-white shadow-xl transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #c9a84c, #d4a017)", fontFamily: "Noto Serif SC, serif" }}
            >
              <RotateCcw className="h-6 w-6" />
              再来一次
            </Button>

            {generatedImageUrl && (
              <Button
                asChild
                className="flex items-center gap-3 rounded-xl px-10 py-4 text-xl font-bold shadow-xl transition-all hover:scale-105"
                variant="outline"
                style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}
              >
                <a href={generatedImageUrl} download="wizard-portrait.png">
                  <Download className="h-6 w-6" />
                  下载肖像
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Button onClick={onPrev} className="flex items-center gap-2 rounded-xl px-8 py-3 text-lg font-bold" variant="outline" style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}>
        <ChevronLeft className="h-5 w-5" />
        上一步
      </Button>
    </div>
  );
}

/* ========== 分数条组件 ========== */
function ScoreBar({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon?: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-base">
        <span className="flex items-center gap-2 font-bold" style={{ color: "#5c4033" }}>
          {icon} {label}
        </span>
        <span className="text-lg font-black" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full" style={{ background: "rgba(92,64,51,0.15)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
    </div>
  );
}
