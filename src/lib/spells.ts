export interface Spell {
  name: string; // 拉丁咒语名
  nameEn: string; // 英文名
  nameCn: string; // 中文名
  pronunciation: string; // 发音提示
  description: string; // 咒语效果
  difficulty: 1 | 2 | 3; // 难度
}

export const SPELLS: Spell[] = [
  {
    name: 'Lumos',
    nameEn: 'Wand-Lighting Charm',
    nameCn: '荧光闪烁',
    pronunciation: 'LOO-mos',
    description: '魔杖尖端亮起光芒',
    difficulty: 1,
  },
  {
    name: 'Expelliarmus',
    nameEn: 'Disarming Charm',
    nameCn: '除你武器',
    pronunciation: 'ex-PEL-ee-AR-mus',
    description: '解除对手武装',
    difficulty: 2,
  },
  {
    name: 'Expecto Patronum',
    nameEn: 'Patronus Charm',
    nameCn: '呼神护卫',
    pronunciation: 'ex-PEK-toh pa-TROH-num',
    description: '召唤守护神驱赶摄魂怪',
    difficulty: 3,
  },
  {
    name: 'Wingardium Leviosa',
    nameEn: 'Levitation Charm',
    nameCn: '悬浮咒',
    pronunciation: 'win-GAR-dee-um lev-ee-OH-sa',
    description: '使物体漂浮起来',
    difficulty: 2,
  },
  {
    name: 'Accio',
    nameEn: 'Summoning Charm',
    nameCn: '速速前',
    pronunciation: 'AK-ee-oh',
    description: '召唤远处物体飞来',
    difficulty: 1,
  },
  {
    name: 'Stupefy',
    nameEn: 'Stunning Spell',
    nameCn: '昏昏倒地',
    pronunciation: 'STOO-puh-fye',
    description: '击晕对手',
    difficulty: 2,
  },
  {
    name: 'Riddikulus',
    nameEn: 'Boggart-Banishing Spell',
    nameCn: '滑稽滑稽',
    pronunciation: 'rih-DIK-yoo-lus',
    description: '将博格特变成滑稽形态',
    difficulty: 2,
  },
  {
    name: 'Nox',
    nameEn: 'Wand-Extinguishing Charm',
    nameCn: '诺克斯',
    pronunciation: 'NOKS',
    description: '熄灭魔杖光芒',
    difficulty: 1,
  },
];

export function getRandomSpell(): Spell {
  return SPELLS[Math.floor(Math.random() * SPELLS.length)];
}
