export type HouseName = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff';

export interface House {
  name: HouseName;
  nameCn: string;
  nameEn: string;
  motto: string;
  description: string;
  colors: { primary: string; secondary: string };
  traits: string[];
  emoji: string;
  mascot: string;
}

export const HOUSES: Record<HouseName, House> = {
  gryffindor: {
    name: 'gryffindor',
    nameCn: '格兰芬多',
    nameEn: 'Gryffindor',
    motto: '勇者无畏',
    description: '勇气与胆识的殿堂，这里的人不惧挑战，敢于直面危险',
    colors: { primary: '#740001', secondary: '#f59e0b' },
    traits: ['勇气', '胆识', '正义', '无畏'],
    emoji: '🦁',
    mascot: 'lion',
  },
  slytherin: {
    name: 'slytherin',
    nameCn: '斯莱特林',
    nameEn: 'Slytherin',
    motto: '野心成就伟大',
    description: '野心与权谋的殿堂，这里的人追求力量，不择手段达到目的',
    colors: { primary: '#1a472a', secondary: '#4ade80' },
    traits: ['野心', '狡猾', '决断', '权谋'],
    emoji: '🐍',
    mascot: 'serpent',
  },
  ravenclaw: {
    name: 'ravenclaw',
    nameCn: '拉文克劳',
    nameEn: 'Ravenclaw',
    motto: '智慧超凡',
    description: '智慧与学识的殿堂，这里的人崇尚知识，追求真理',
    colors: { primary: '#0e1a40', secondary: '#60a5fa' },
    traits: ['智慧', '学识', '理性', '创造'],
    emoji: '🦅',
    mascot: 'eagle',
  },
  hufflepuff: {
    name: 'hufflepuff',
    nameCn: '赫奇帕奇',
    nameEn: 'Hufflepuff',
    motto: '忠诚勤勉',
    description: '忠诚与勤勉的殿堂，这里的人正直善良，值得信赖',
    colors: { primary: '#ecb939', secondary: '#fbbf24' },
    traits: ['忠诚', '勤勉', '正直', '善良'],
    emoji: '🦡',
    mascot: 'badger',
  },
};

export interface SortingInput {
  chantAccuracy: number;    // 0-100
  chantPower: number;       // 0-100
  darkAffinity: number;     // 0-100, performance on dark/unforgivable spells
  lightAffinity: number;    // 0-100, performance on defense/utility spells
  patternScore: number;     // 0-100
  patternPrecision: number; // 0-100
}

export interface SortingResult extends House {
  confidence: number; // 0-100, how confident the hat is
  hatMessage: string; // 分院帽的评语
}

/**
 * 分院算法 — 基于咒语倾向性 + 施咒表现 + 随机因素
 *
 * 核心逻辑:
 * - 黑魔法亲和度高 → 斯莱特林倾向
 * - 准确度高 + 精度高 → 拉文克劳倾向
 * - 气势强 + 勇敢面对黑魔法 → 格兰芬多倾向
 * - 整体稳定但不突出 → 赫奇帕奇倾向
 */
export function sortIntoHouse(input: SortingInput): SortingResult {
  const { chantAccuracy, chantPower, darkAffinity, lightAffinity, patternScore, patternPrecision } = input;

  // Calculate house scores (0-100 range)
  const scores: Record<HouseName, number> = {
    // Gryffindor: high power + high light affinity + brave (performs well even on scary spells)
    gryffindor: (
      chantPower * 0.30 +
      lightAffinity * 0.25 +
      Math.max(darkAffinity, 40) * 0.15 + // not scared of dark spells = brave
      patternScore * 0.15 +
      patternPrecision * 0.15
    ),

    // Slytherin: high dark affinity + high accuracy on dark spells + ambition (power)
    slytherin: (
      darkAffinity * 0.35 +
      chantPower * 0.20 +
      chantAccuracy * 0.15 +
      patternScore * 0.15 +
      patternPrecision * 0.15
    ),

    // Ravenclaw: high accuracy + high precision + knowledge (performs well on utility spells)
    ravenclaw: (
      chantAccuracy * 0.30 +
      patternPrecision * 0.30 +
      lightAffinity * 0.15 +
      patternScore * 0.15 +
      chantPower * 0.10
    ),

    // Hufflepuff: balanced + stable + decent on everything
    hufflepuff: (
      (chantAccuracy + chantPower) * 0.20 +
      (patternScore + patternPrecision) * 0.20 +
      lightAffinity * 0.15 +
      (100 - Math.abs(darkAffinity - lightAffinity)) * 0.25 // balanced = hufflepuff
    ),
  };

  // Add small random factor (±5)
  for (const key of Object.keys(scores) as HouseName[]) {
    scores[key] += (Math.random() - 0.5) * 10;
  }

  // Find the house with highest score
  let maxScore = -Infinity;
  let sortedHouse: HouseName = 'gryffindor';
  for (const [house, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      sortedHouse = house as HouseName;
    }
  }

  // Calculate confidence (how far ahead the winner is)
  const secondScore = Math.max(
    ...Object.entries(scores)
      .filter(([h]) => h !== sortedHouse)
      .map(([, s]) => s)
  );
  const confidence = Math.min(Math.round((maxScore - secondScore) * 3 + 50), 98);

  // Generate hat message based on the sorting
  const hatMessage = generateHatMessage(sortedHouse, input, confidence);

  return {
    ...HOUSES[sortedHouse],
    confidence,
    hatMessage,
  };
}

function generateHatMessage(house: HouseName, input: SortingInput, confidence: number): string {
  const messages: Record<HouseName, string[]> = {
    gryffindor: [
      `嗯...我感受到了强烈的勇气！你在黑暗咒语面前毫不退缩，这份胆识...`,
      `有意思...你念咒时气势如虹，不惧任何挑战——毫无疑问！`,
      `多么坚定的意志！即使面对不可饶恕咒，你的内心依然光明...`,
    ],
    slytherin: [
      `哦？你在黑魔法上展现了惊人的天赋...那份对力量的渴望，我太熟悉了...`,
      `有趣...你对黑暗咒语的亲和力超乎寻常。野心，决断，还有...不择手段的决心`,
      `嗯...不可饶恕咒从你口中念出如此坚定，你注定要成就大事...`,
    ],
    ravenclaw: [
      `精准的发音，完美的手势，你追求的不只是力量，而是真理...`,
      `你念咒的准确度令人赞叹，每一个音节都恰到好处，智慧在你心中闪耀...`,
      `不是蛮力，而是智慧指引了你的魔杖，这份理性难能可贵...`,
    ],
    hufflepuff: [
      `你稳扎稳打，每一个咒语都用心完成，这份真诚与勤勉打动了我...`,
      `没有偏激，没有贪念，你用温和而坚定的方式完成了所有挑战...`,
      `你的内心平和而充实，忠诚与善良才是最持久的魔法...`,
    ],
  };

  const pool = messages[house];
  const baseMsg = pool[Math.floor(Math.random() * pool.length)];

  if (confidence > 80) {
    return baseMsg + ' 我毫不迟疑！';
  } else if (confidence > 60) {
    return baseMsg + ' 是的，我确信。';
  } else {
    return baseMsg + ' 嗯...让我再想想...好吧，就是你了！';
  }
}
