import type { HouseName } from './sorting-hat';
import type { SpellCategory } from './spells';

export interface Wand {
  name: string;           // 魔杖名
  wood: string;           // 杖木
  woodCn: string;         // 杖木中文名
  core: string;           // 杖芯
  coreCn: string;         // 杖芯中文名
  length: string;         // 长度
  flexibility: string;    // 弹性
  description: string;    // 魔杖描述
  price: number;          // 价格（加隆）
  priceKnuts: number;     // 价格（纳特，1加隆=493纳特）
  imageUrl: string;       // 魔杖图片（emoji替代）
}

/**
 * 杖木数据 — 不同杖木对应不同性格特质
 */
const WOODS: Record<string, { name: string; nameCn: string; trait: string; houses: HouseName[] }> = {
  holly: { name: 'Holly', nameCn: '冬青木', trait: '适合需要控制力量的巫师，与凤凰羽毛杖芯搭配最默契', houses: ['gryffindor'] },
  yew: { name: 'Yew', nameCn: '紫杉木', trait: '赋予持有者生死之力，极适合黑魔法防御和战斗', houses: ['slytherin'] },
  vine: { name: 'Vine', nameCn: '葡萄藤木', trait: '选择有远见和内在力量的巫师，能感知魔杖主人的意图', houses: ['ravenclaw'] },
  hazel: { name: 'Hazel', nameCn: '榛木', trait: '对主人情绪极其敏感，能释放出格外强大的魔咒', houses: ['hufflepuff'] },
  elder: { name: 'Elder', nameCn: '接骨木', trait: '最稀有的杖木，只选择命运非凡的巫师', houses: ['slytherin', 'ravenclaw'] },
  phoenix_feather_partner: { name: 'Hawthorn', nameCn: '山楂木', trait: '适合有冲突天性的巫师，治愈与伤害的平衡大师', houses: ['gryffindor', 'hufflepuff'] },
  elm: { name: 'Elm', nameCn: '榆木', trait: '只选择有尊严和天赋的巫师，施展咒语优雅精准', houses: ['ravenclaw', 'slytherin'] },
  chestnut: { name: 'Chestnut', nameCn: '栗木', trait: '擅长驯兽和草药学的巫师之选，品质坚韧', houses: ['hufflepuff'] },
};

/**
 * 杖芯数据
 */
const CORES: Record<string, { name: string; nameCn: string; trait: string; price: number }> = {
  phoenix: { name: 'Phoenix Feather', nameCn: '凤凰羽毛', trait: '最灵活的杖芯，能施展最广泛的魔咒，但需要时间建立忠诚', price: 9 },
  dragon: { name: 'Dragon Heartstring', nameCn: '火龙心腱', trait: '力量最强大的杖芯，施咒快速且气势惊人，但易走偏', price: 12 },
  unicorn: { name: 'Unicorn Hair', nameCn: '独角兽尾毛', trait: '最稳定的杖芯，施咒可靠不易走偏，适合精确操作', price: 7 },
  thestral: { name: 'Thestral Tail Hair', nameCn: '夜骐尾毛', trait: '最稀有的杖芯，只有接受死亡的人才能驾驭其力量', price: 18 },
  thunderbird: { name: 'Thunderbird Tail Feather', nameCn: '雷鸟尾羽', trait: '能感知危险，适合有冒险精神的巫师', price: 15 },
};

/**
 * 根据施咒表现选择杖芯
 */
function selectCore(accuracy: number, power: number, darkAffinity: number): typeof CORES[string] & { key: string } {
  // 高气势 + 高黑魔法亲和 → 火龙心腱
  if (power > 70 && darkAffinity > 60) return { ...CORES.dragon, key: 'dragon' };
  // 高准确度 → 独角兽尾毛
  if (accuracy > 70) return { ...CORES.unicorn, key: 'unicorn' };
  // 黑魔法亲和极高 → 夜骐尾毛
  if (darkAffinity > 75) return { ...CORES.thestral, key: 'thestral' };
  // 均衡 → 凤凰羽毛
  if (accuracy > 50 && power > 50) return { ...CORES.phoenix, key: 'phoenix' };
  // 气势突出 → 雷鸟尾羽
  if (power > 60) return { ...CORES.thunderbird, key: 'thunderbird' };
  // 默认
  return { ...CORES.phoenix, key: 'phoenix' };
}

/**
 * 根据学院和表现选择杖木
 */
function selectWood(house: HouseName, accuracy: number, power: number, darkAffinity: number): typeof WOODS[string] & { key: string } {
  // 高黑魔法亲和 + 斯莱特林 → 紫杉木/接骨木
  if (darkAffinity > 70 && house === 'slytherin') {
    return darkAffinity > 85
      ? { ...WOODS.elder, key: 'elder' }
      : { ...WOODS.yew, key: 'yew' };
  }
  // 高准确 + 拉文克劳 → 榆木/葡萄藤木
  if (accuracy > 65 && house === 'ravenclaw') {
    return accuracy > 80
      ? { ...WOODS.elm, key: 'elm' }
      : { ...WOODS.vine, key: 'vine' };
  }
  // 高气势 + 格兰芬多 → 冬青木/山楂木
  if (power > 65 && house === 'gryffindor') {
    return { ...WOODS.holly, key: 'holly' };
  }
  // 赫奇帕奇 → 榛木/栗木
  if (house === 'hufflepuff') {
    return accuracy > power
      ? { ...WOODS.chestnut, key: 'chestnut' }
      : { ...WOODS.hazel, key: 'hazel' };
  }

  // 按学院默认
  const houseDefaults: Record<HouseName, string> = {
    gryffindor: 'holly',
    slytherin: 'yew',
    ravenclaw: 'vine',
    hufflepuff: 'hazel',
  };
  const key = houseDefaults[house];
  return { ...WOODS[key], key };
}

/**
 * 选择魔杖长度和弹性
 */
function selectFlexibility(accuracy: number, power: number): { length: string; flexibility: string } {
  const baseLength = 9 + Math.round(power / 30); // 9-12 inches
  const lengthStr = `${baseLength}"`;

  if (power > 75) return { length: lengthStr, flexibility: '坚挺不屈' };
  if (accuracy > 75) return { length: lengthStr, flexibility: '出奇柔韧' };
  if (power > 55 && accuracy > 55) return { length: lengthStr, flexibility: '适度弹性' };
  return { length: lengthStr, flexibility: '意外柔软' };
}

/**
 * 生成专属魔杖推荐
 */
export function recommendWand(input: {
  house: HouseName;
  accuracy: number;
  power: number;
  darkAffinity: number;
  bestCategory: SpellCategory;
}): Wand {
  const { house, accuracy, power, darkAffinity, bestCategory } = input;

  const wood = selectWood(house, accuracy, power, darkAffinity);
  const core = selectCore(accuracy, power, darkAffinity);
  const { length, flexibility } = selectFlexibility(accuracy, power);

  // 价格基于杖芯 + 杖木稀有度
  const woodPrice = ['elder', 'yew', 'elm'].includes(wood.key) ? 5 : ['holly', 'vine'].includes(wood.key) ? 3 : 2;
  const totalPrice = core.price + woodPrice;

  // 根据最佳咒语类别添加描述
  const categoryDescriptions: Record<SpellCategory, string> = {
    defense: '你的防御咒语展现了对守护的执着，这根魔杖将与你一同守护所珍视之人',
    utility: '你展现了对实用魔法的精妙掌控，这根魔杖将助你在日常中施展妙手',
    combat: '你的战斗咒语凌厉果决，这根魔杖将在对峙中成为你最锋利的武器',
    dark: '你对黑魔法有着不凡的驾驭力，这根魔杖能承受强大而危险的魔力',
    unforgivable: '你面对禁忌咒语时展现出的惊人意志力，唯有最强大的魔杖方能承载',
  };

  const description = `${wood.trait}。${core.trait}。${categoryDescriptions[bestCategory]}`;

  return {
    name: `${wood.nameCn}魔杖`,
    wood: wood.name,
    woodCn: wood.nameCn,
    core: core.name,
    coreCn: core.nameCn,
    length,
    flexibility,
    description,
    price: totalPrice,
    priceKnuts: totalPrice * 493,
    imageUrl: '🪄',
  };
}

/**
 * 徽章场景数据 — 根据最佳咒语类别生成
 */

