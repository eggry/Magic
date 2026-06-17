/**
 * 咒语模糊匹配 — 基于拼音的同音字/近音字容错匹配
 *
 * 原理：
 * 1. 将目标咒语的中文名和用户语音识别结果都转为拼音序列
 * 2. 用编辑距离(Levenshtein)比较拼音序列，计算相似度
 * 3. 同时做子串匹配 — 用户说的可能比咒语名长，只要包含关键部分即可
 */
import { pinyin } from 'pinyin-pro';

/** 将中文文本转为无声调拼音数组，如 "荧光闪烁" → ["ying", "guang", "shan", "shuo"] */
export function toPinyinArray(text: string): string[] {
  if (!text) return [];
  // pinyin-pro 返回的是按字分割的拼音数组
  const result = pinyin(text, { toneType: 'none', type: 'array' });
  return result.filter(p => p && p.trim() !== '');
}

/** 将拼音数组扁平化为空格分隔的字符串，方便子串搜索 */
export function toPinyinString(text: string): string {
  return toPinyinArray(text).join(' ');
}

/**
 * 计算两个拼音序列之间的编辑距离
 */
function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/** 近音字映射 — 常见的语音识别混淆 */
const SIMILAR_INITIALS: Record<string, string[]> = {
  'zh': ['z', 'j'],
  'ch': ['c', 'q'],
  'sh': ['s', 'x'],
  'z': ['zh', 'c'],
  'c': ['ch', 'z'],
  's': ['sh', 'c'],
  'j': ['zh', 'q'],
  'q': ['ch', 'j'],
  'x': ['sh', 'q'],
  'l': ['n', 'r'],
  'n': ['l'],
  'r': ['l'],
  'f': ['h'],
  'h': ['f'],
};

/**
 * 判断两个拼音音节是否"近音"
 * 如 "kui" ≈ "gui", "shan" ≈ "xan"(无此音但算法容忍)
 */
function isSimilarSyllable(a: string, b: string): boolean {
  if (a === b) return true;
  // 完全相同
  if (a.length <= 1 || b.length <= 1) return false;

  // 提取声母（简化处理）
  const getInitial = (s: string): string => {
    const match = s.match(/^(zh|ch|sh|[bcdfghjklmnpqrstwxyz])/);
    return match ? match[1] : '';
  };

  const initialA = getInitial(a);
  const initialB = getInitial(b);

  // 声母相同，韵母接近（差一个字母）
  if (initialA === initialB) {
    const finalA = a.slice(initialA.length);
    const finalB = b.slice(initialB.length);
    if (Math.abs(finalA.length - finalB.length) <= 1) {
      let diff = 0;
      const maxLen = Math.max(finalA.length, finalB.length);
      for (let i = 0; i < maxLen; i++) {
        if (finalA[i] !== finalB[i]) diff++;
      }
      return diff <= 1;
    }
  }

  // 声母是近音映射
  const similarToA = SIMILAR_INITIALS[initialA] || [];
  if (similarToA.includes(initialB)) {
    return true;
  }

  return false;
}

/**
 * 近音容错的编辑距离 — 近音替换代价为 0.5 而非 1
 */
function fuzzyLevenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else if (isSimilarSyllable(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 0.5; // 近音替换，半惩罚
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算用户语音识别结果与目标咒语的匹配度 (0-100)
 *
 * @param transcript 语音识别原文（中文）
 * @param targetSpellCn 咒语中文名（如 "荧光闪烁"）
 * @param alternativeNames 咒语的别名/常见误写（如 ["莹光闪烁"]）
 */
export function matchSpell(
  transcript: string,
  targetSpellCn: string,
  alternativeNames: string[] = [],
): number {
  if (!transcript || !targetSpellCn) return 0;

  // 1. 精确中文字符匹配
  if (transcript.includes(targetSpellCn)) return 100;
  for (const alt of alternativeNames) {
    if (transcript.includes(alt)) return 95;
  }

  // 2. 拼音匹配
  const transcriptPinyin = toPinyinArray(transcript);
  const targetPinyin = toPinyinArray(targetSpellCn);

  if (transcriptPinyin.length === 0 || targetPinyin.length === 0) return 0;

  // 2a. 拼音序列的子串匹配 — 用户说的可能很长，找到包含目标拼音的窗口
  const tLen = transcriptPinyin.length;
  const sLen = targetPinyin.length;
  let bestWindowScore = 0;

  if (tLen >= sLen) {
    for (let start = 0; start <= tLen - sLen; start++) {
      const window = transcriptPinyin.slice(start, start + sLen);
      const dist = levenshtein(window, targetPinyin);
      const maxDist = sLen;
      const score = Math.max(0, 1 - dist / maxDist) * 100;
      bestWindowScore = Math.max(bestWindowScore, score);
    }
  } else {
    // 用户说的比目标短，做模糊匹配
    const dist = levenshtein(transcriptPinyin, targetPinyin);
    const maxDist = sLen;
    bestWindowScore = Math.max(0, 1 - dist / maxDist) * 100;
  }

  // 2b. 近音模糊匹配（带近音容错）
  let bestFuzzyScore = 0;
  if (tLen >= sLen) {
    for (let start = 0; start <= tLen - sLen; start++) {
      const window = transcriptPinyin.slice(start, start + sLen);
      const dist = fuzzyLevenshtein(window, targetPinyin);
      const maxDist = sLen;
      const score = Math.max(0, 1 - dist / maxDist) * 100;
      bestFuzzyScore = Math.max(bestFuzzyScore, score);
    }
  } else {
    const dist = fuzzyLevenshtein(transcriptPinyin, targetPinyin);
    const maxDist = sLen;
    bestFuzzyScore = Math.max(0, 1 - dist / maxDist) * 100;
  }

  // 3. 部分中文字符命中
  let charHitCount = 0;
  for (const char of targetSpellCn) {
    if (transcript.includes(char)) charHitCount++;
  }
  const charHitScore = (charHitCount / targetSpellCn.length) * 80; // 部分命中最高80

  // 取各种匹配方式的最高分
  const finalScore = Math.max(bestWindowScore, bestFuzzyScore, charHitScore);

  return Math.round(Math.min(finalScore, 100));
}
