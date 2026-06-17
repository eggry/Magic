export type SpellCategory = 'defense' | 'utility' | 'combat' | 'dark' | 'unforgivable';

export interface Spell {
  name: string;           // 拉丁咒语名
  nameEn: string;         // 英文名
  nameCn: string;         // 中文名（用户要念的）
  incantationCn: string;  // 中文念法提示（如 "盔甲护身" 的念法）
  aliases: string[];      // 常见同音字/误写，用于模糊匹配
  pronunciation: string;  // 拉丁发音提示
  description: string;    // 咒语效果
  difficulty: 1 | 2 | 3; // 难度
  category: SpellCategory; // 咒语分类
  categoryLabel: string;  // 分类中文名
  categoryEmoji: string;  // 分类图标
}

export const SPELLS: Spell[] = [
  // ===== 防御术 =====
  {
    name: 'Protego',
    nameEn: 'Shield Charm',
    nameCn: '盔甲护身',
    incantationCn: '盔甲护身',
    aliases: ['亏甲护身', '盔甲互身', '亏甲互身', '葵甲护身'],
    pronunciation: 'pro-TAY-go',
    description: '在施咒者面前形成一道无形的护盾，弹开物理攻击和大多数魔咒',
    difficulty: 2,
    category: 'defense',
    categoryLabel: '防御术',
    categoryEmoji: '🛡️',
  },
  {
    name: 'Expecto Patronum',
    nameEn: 'Patronus Charm',
    nameCn: '呼神护卫',
    incantationCn: '呼神护卫',
    aliases: ['忽神护卫', '呼神忽卫', '护神护卫', '呼神护位'],
    pronunciation: 'ex-PEK-toh pa-TROH-num',
    description: '召唤守护神驱赶摄魂怪，需要集中最快乐的记忆',
    difficulty: 3,
    category: 'defense',
    categoryLabel: '防御术',
    categoryEmoji: '🛡️',
  },
  {
    name: 'Riddikulus',
    nameEn: 'Boggart-Banishing Spell',
    nameCn: '滑稽滑稽',
    incantationCn: '滑稽滑稽',
    aliases: ['花机滑稽', '滑机滑机', '滑稽花机', '华机滑稽'],
    pronunciation: 'rih-DIK-yoo-lus',
    description: '将博格特变成滑稽形态，以笑声驱散恐惧',
    difficulty: 2,
    category: 'defense',
    categoryLabel: '防御术',
    categoryEmoji: '🛡️',
  },
  {
    name: 'Episkey',
    nameEn: 'Healing Spell',
    nameCn: '恢复如初',
    incantationCn: '恢复如初',
    aliases: ['恢伏如初', '恢复如出', '灰复如初', '恢复乳初'],
    pronunciation: 'eh-PIS-key',
    description: '治疗轻微伤势，如鼻出血或扭伤',
    difficulty: 1,
    category: 'defense',
    categoryLabel: '防御术',
    categoryEmoji: '🛡️',
  },

  // ===== 实用术 =====
  {
    name: 'Lumos',
    nameEn: 'Wand-Lighting Charm',
    nameCn: '荧光闪烁',
    incantationCn: '荧光闪烁',
    aliases: ['莹光闪烁', '银光闪烁', '荧光闪硕', '萤光闪烁', '迎光闪烁'],
    pronunciation: 'LOO-mos',
    description: '魔杖尖端亮起光芒，照亮黑暗',
    difficulty: 1,
    category: 'utility',
    categoryLabel: '实用术',
    categoryEmoji: '✨',
  },
  {
    name: 'Wingardium Leviosa',
    nameEn: 'Levitation Charm',
    nameCn: '悬浮咒',
    incantationCn: '悬浮咒',
    aliases: ['悬乎咒', '玄浮咒', '悬浮宙', '宣浮咒'],
    pronunciation: 'win-GAR-dee-um lev-ee-OH-sa',
    description: '使物体漂浮起来，重要的是挥魔杖的动作',
    difficulty: 2,
    category: 'utility',
    categoryLabel: '实用术',
    categoryEmoji: '✨',
  },
  {
    name: 'Accio',
    nameEn: 'Summoning Charm',
    nameCn: '速速前',
    incantationCn: '速速前',
    aliases: ['素速前', '速速钱', '速速钱', '苏速前'],
    pronunciation: 'AK-ee-oh',
    description: '召唤远处物体飞向施咒者',
    difficulty: 1,
    category: 'utility',
    categoryLabel: '实用术',
    categoryEmoji: '✨',
  },
  {
    name: 'Alohomora',
    nameEn: 'Unlocking Charm',
    nameCn: '阿拉霍洞开',
    incantationCn: '阿拉霍洞开',
    aliases: ['阿拉霍洞开', '阿拉火洞开', '阿拉霍冻开', '啊拉霍洞开'],
    pronunciation: 'al-LOH-ha-MOR-ah',
    description: '打开被锁住的门窗',
    difficulty: 1,
    category: 'utility',
    categoryLabel: '实用术',
    categoryEmoji: '✨',
  },
  {
    name: 'Reparo',
    nameEn: 'Mending Charm',
    nameCn: '修复如初',
    incantationCn: '修复如初',
    aliases: ['修伏如初', '修复如出', '休复如初'],
    pronunciation: 'reh-PAH-roh',
    description: '修复破碎的物品',
    difficulty: 1,
    category: 'utility',
    categoryLabel: '实用术',
    categoryEmoji: '✨',
  },

  // ===== 战斗术 =====
  {
    name: 'Expelliarmus',
    nameEn: 'Disarming Charm',
    nameCn: '除你武器',
    incantationCn: '除你武器',
    aliases: ['除你无器', '出你武器', '除泥武器', '出你无器'],
    pronunciation: 'ex-PEL-ee-AR-mus',
    description: '解除对手武装，哈利波特的标志性咒语',
    difficulty: 2,
    category: 'combat',
    categoryLabel: '战斗术',
    categoryEmoji: '⚔️',
  },
  {
    name: 'Stupefy',
    nameEn: 'Stunning Spell',
    nameCn: '昏昏倒地',
    incantationCn: '昏昏倒地',
    aliases: ['昏昏道地', '轰轰倒地', '昏昏到的', '浑浑倒地'],
    pronunciation: 'STOO-puh-fye',
    description: '击晕对手，使其失去意识',
    difficulty: 2,
    category: 'combat',
    categoryLabel: '战斗术',
    categoryEmoji: '⚔️',
  },
  {
    name: 'Petrificus Totalus',
    nameEn: 'Full Body-Bind Curse',
    nameCn: '统统石化',
    incantationCn: '统统石化',
    aliases: ['通通石化', '统统时化', '童童石化', '统统十化'],
    pronunciation: 'pe-TRI-fi-cus to-TAH-lus',
    description: '使受害者全身僵硬，如同石化一般',
    difficulty: 2,
    category: 'combat',
    categoryLabel: '战斗术',
    categoryEmoji: '⚔️',
  },
  {
    name: 'Impedimenta',
    nameEn: 'Impediment Jinx',
    nameCn: '障碍重重',
    incantationCn: '障碍重重',
    aliases: ['障碍从从', '障碍虫虫', '障爱重重', '障碍重从'],
    pronunciation: 'im-PED-ih-MEN-tah',
    description: '减缓或停止正在接近的物体或生物',
    difficulty: 2,
    category: 'combat',
    categoryLabel: '战斗术',
    categoryEmoji: '⚔️',
  },

  // ===== 黑魔法 =====
  {
    name: 'Sectumsempra',
    nameEn: 'Sectumsempra Curse',
    nameCn: '神锋无影',
    incantationCn: '神锋无影',
    aliases: ['身锋无影', '神风无影', '神锋五影', '神锋无隐'],
    pronunciation: 'SEK-tum-SEM-prah',
    description: '在对手身上造成严重的刀割伤，由斯内普发明',
    difficulty: 3,
    category: 'dark',
    categoryLabel: '黑魔法',
    categoryEmoji: '🌑',
  },
  {
    name: 'Morsmordre',
    nameEn: 'Dark Mark',
    nameCn: '尸骨再现',
    incantationCn: '尸骨再现',
    aliases: ['尸骨在线', '石骨再现', '尸骨在线', '十骨再现'],
    pronunciation: 'MORZ-mor-druh',
    description: '在天空中召唤食死徒的暗黑印记——骷髅与蛇',
    difficulty: 3,
    category: 'dark',
    categoryLabel: '黑魔法',
    categoryEmoji: '🌑',
  },
  {
    name: 'Fiendfyre',
    nameEn: 'Cursed Fire',
    nameCn: '厉火咒',
    incantationCn: '厉火咒',
    aliases: ['立火咒', '力火咒', '离火咒', '厉火宙'],
    pronunciation: 'FEEND-fire',
    description: '召唤无法熄灭的诅咒之火，化为凶兽吞噬一切',
    difficulty: 3,
    category: 'dark',
    categoryLabel: '黑魔法',
    categoryEmoji: '🌑',
  },
  {
    name: 'Obliviate',
    nameEn: 'Memory Charm',
    nameCn: '一忘皆空',
    incantationCn: '一忘皆空',
    aliases: ['一王皆空', '一忘结空', '衣忘皆空', '一忘阶空'],
    pronunciation: 'oh-BLI-vee-ate',
    description: '抹去他人的记忆，力量强大但危险',
    difficulty: 3,
    category: 'dark',
    categoryLabel: '黑魔法',
    categoryEmoji: '🌑',
  },

  // ===== 不可饶恕咒 =====
  {
    name: 'Crucio',
    nameEn: 'Cruciatus Curse',
    nameCn: '钻心剜骨',
    incantationCn: '钻心剜骨',
    aliases: ['钻心完骨', '钻心弯骨', '专心剜骨', '钻心宛骨', '钻心玩骨'],
    pronunciation: 'KROO-see-oh',
    description: '不可饶恕咒之一——使受害者承受极度痛苦，必须真心想要造成痛苦才有效',
    difficulty: 3,
    category: 'unforgivable',
    categoryLabel: '不可饶恕咒',
    categoryEmoji: '💀',
  },
  {
    name: 'Imperio',
    nameEn: 'Imperius Curse',
    nameCn: '魂魄出窍',
    incantationCn: '魂魄出窍',
    aliases: ['魂魄出翘', '魂破出窍', '魂魄初窍', '浑魄出窍'],
    pronunciation: 'im-PEER-ee-oh',
    description: '不可饶恕咒之一——完全控制他人的意志和行动',
    difficulty: 3,
    category: 'unforgivable',
    categoryLabel: '不可饶恕咒',
    categoryEmoji: '💀',
  },
  {
    name: 'Avada Kedavra',
    nameEn: 'Killing Curse',
    nameCn: '阿瓦达索命',
    incantationCn: '阿瓦达索命',
    aliases: ['阿瓦达锁命', '阿娃达索命', '啊瓦达索命', '阿瓦达所命'],
    pronunciation: 'uh-VAH-dah keh-DAV-rah',
    description: '不可饶恕咒之一——绿光一闪即夺人命，没有反咒，唯有牺牲之爱可抵挡',
    difficulty: 3,
    category: 'unforgivable',
    categoryLabel: '不可饶恕咒',
    categoryEmoji: '💀',
  },
];

/**
 * 从题库中选出3个有区分度的咒语：
 * - 必定1个防御/实用术（正面）
 * - 必定1个战斗术/黑魔法（灰色地带）
 * - 有概率出现不可饶恕咒（50%概率第三个替换为不可饶恕咒）
 */
export function pickThreeSpells(): Spell[] {
  const defenseUtility = SPELLS.filter(s => s.category === 'defense' || s.category === 'utility');
  const combatDark = SPELLS.filter(s => s.category === 'combat' || s.category === 'dark');
  const unforgivable = SPELLS.filter(s => s.category === 'unforgivable');
  const allNonUnforgivable = SPELLS.filter(s => s.category !== 'unforgivable');

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const spell1 = pick(defenseUtility);   // 正面咒语
  const spell2 = pick(combatDark);       // 灰色地带

  // 第三个：50% 概率是不可饶恕咒，50% 是其他
  let spell3: Spell;
  if (Math.random() < 0.5 && unforgivable.length > 0) {
    spell3 = pick(unforgivable);
  } else {
    spell3 = pick(allNonUnforgivable);
  }

  // 确保三个不重复
  const chosen = [spell1, spell2];
  if (!chosen.find(s => s.name === spell3.name)) {
    chosen.push(spell3);
  } else {
    // 如果重复，从全部咒语中找一个不重复的
    const remaining = SPELLS.filter(s => !chosen.find(c => c.name === s.name));
    chosen.push(pick(remaining));
  }

  return chosen;
}

export function getRandomSpell(): Spell {
  return SPELLS[Math.floor(Math.random() * SPELLS.length)];
}

export function getBadgeUrl(spellName: string): string {
  const map: Record<string, string> = {
    '盔甲护身': '/badges/盔甲护身.png',
    '呼神护卫': '/badges/呼神护卫.png',
    '滑稽滑稽': '/badges/滑稽滑稽.png',
    '恢复如初': '/badges/恢复如初.png',
    '荧光闪烁': '/badges/荧光闪烁.png',
    '悬浮咒': '/badges/悬浮咒.png',
    '速速前': '/badges/速速前.png',
    '阿拉霍洞开': '/badges/阿拉霍洞开.png',
    '修复如初': '/badges/修复如初.png',
    '除你武器': '/badges/除你武器.png',
    '昏昏倒地': '/badges/昏昏倒地.png',
    '统统石化': '/badges/统统石化.png',
    '障碍重重': '/badges/障碍重重.png',
    '神锋无影': '/badges/神锋无影.png',
    '尸骨再现': '/badges/尸骨再现.png',
    '厉火咒': '/badges/厉火咒.png',
    '一忘皆空': '/badges/一忘皆空.png',
    '钻心剜骨': '/badges/钻心剜骨.png',
    '魂魄出窍': '/badges/魂魄出窍.png',
    '阿瓦达索命': '/badges/阿瓦达索命.png',
  };
  return map[spellName] || '';
}
