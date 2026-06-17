export type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff';

export interface HouseInfo {
  id: House;
  name: string;
  nameCn: string;
  motto: string;
  description: string;
  colors: { primary: string; secondary: string; accent: string };
  traits: string[];
}

export const HOUSES: Record<House, HouseInfo> = {
  gryffindor: {
    id: 'gryffindor',
    name: 'Gryffindor',
    nameCn: '格兰芬多',
    motto: '勇敢者之所在',
    description: '你拥有无畏的勇气和炽热的心灵。面对黑暗，你选择挺身而出。格兰芬多欢迎你！',
    colors: {
      primary: '#740001',
      secondary: '#d3a625',
      accent: '#ae0001',
    },
    traits: ['勇气', '胆识', '骑士精神'],
  },
  slytherin: {
    id: 'slytherin',
    name: 'Slytherin',
    nameCn: '斯莱特林',
    motto: '野心家之殿堂',
    description: '你拥有精明的头脑和不可动摇的意志。为了目标，你无所不能。斯莱特林欢迎你！',
    colors: {
      primary: '#1a472a',
      secondary: '#aaaaaa',
      accent: '#2a623d',
    },
    traits: ['野心', '精明', '领导力'],
  },
  ravenclaw: {
    id: 'ravenclaw',
    name: 'Ravenclaw',
    nameCn: '拉文克劳',
    motto: '智慧者之殿堂',
    description: '你拥有敏锐的洞察力和对知识的无尽渴求。智慧是你最强大的魔法。拉文克劳欢迎你！',
    colors: {
      primary: '#0e1a40',
      secondary: '#946b2d',
      accent: '#222f5b',
    },
    traits: ['智慧', '创造力', '学识'],
  },
  hufflepuff: {
    id: 'hufflepuff',
    name: 'Hufflepuff',
    nameCn: '赫奇帕奇',
    motto: '忠诚者之家园',
    description: '你拥有最珍贵的品质——忠诚与善良。你的坚持与温暖，比任何魔法都强大。赫奇帕奇欢迎你！',
    colors: {
      primary: '#ecb939',
      secondary: '#372e29',
      accent: '#f0c75e',
    },
    traits: ['忠诚', '勤劳', '善良'],
  },
};

export interface SortingInput {
  chantAccuracy: number;    // 0-100, 咒语念得对不对
  chantPower: number;       // 0-100, 音量/气势
  patternScore: number;     // 0-100, 图案匹配度
  patternPrecision: number; // 0-100, 绘制精度
}

export function sortIntoHouse(input: SortingInput): House {
  const { chantAccuracy, chantPower, patternScore, patternPrecision } = input;

  // 计算各学院倾向分数
  const gryffindorScore = chantPower * 0.4 + chantAccuracy * 0.2 + (100 - patternPrecision) * 0.1 + Math.random() * 15;
  const slytherinScore = patternScore * 0.35 + chantPower * 0.2 + (100 - chantAccuracy) * 0.15 + Math.random() * 15;
  const ravenclawScore = chantAccuracy * 0.4 + patternPrecision * 0.3 + patternScore * 0.1 + Math.random() * 10;
  const hufflepuffScore = (chantAccuracy + chantPower + patternScore + patternPrecision) * 0.2 + Math.random() * 20;

  const scores: [House, number][] = [
    ['gryffindor', gryffindorScore],
    ['slytherin', slytherinScore],
    ['ravenclaw', ravenclawScore],
    ['hufflepuff', hufflepuffScore],
  ];

  scores.sort((a, b) => b[1] - a[1]);

  return scores[0][0];
}
