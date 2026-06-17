export interface MagicPattern {
  id: string;
  name: string;
  nameCn: string;
  points: { x: number; y: number }[]; // 归一化坐标 0-1
  segments: number[][]; // 每段连接的点索引 [fromIndex, toIndex]
}

export const PATTERNS: MagicPattern[] = [
  {
    id: 'star',
    name: 'Star',
    nameCn: '五芒星',
    points: [
      { x: 0.5, y: 0.1 },   // 0 顶
      { x: 0.61, y: 0.45 },  // 1 右上
      { x: 0.9, y: 0.45 },   // 2 右
      { x: 0.66, y: 0.65 },  // 3 右下
      { x: 0.74, y: 0.9 },   // 4 下右
      { x: 0.5, y: 0.72 },   // 5 下中
      { x: 0.26, y: 0.9 },   // 6 下左
      { x: 0.34, y: 0.65 },  // 7 左下
      { x: 0.1, y: 0.45 },   // 8 左
      { x: 0.39, y: 0.45 },  // 9 左上
    ],
    segments: [[0, 2], [2, 4], [4, 6], [6, 8], [8, 0]],
  },
  {
    id: 'lightning',
    name: 'Lightning',
    nameCn: '闪电',
    points: [
      { x: 0.35, y: 0.1 },   // 0
      { x: 0.55, y: 0.1 },   // 1
      { x: 0.42, y: 0.42 },  // 2
      { x: 0.65, y: 0.42 },  // 3
      { x: 0.35, y: 0.9 },   // 4
      { x: 0.45, y: 0.58 },  // 5
      { x: 0.28, y: 0.58 },  // 6
    ],
    segments: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  },
  {
    id: 'triangle',
    name: 'Triangle',
    nameCn: '三角符文',
    points: [
      { x: 0.5, y: 0.15 },  // 0 顶
      { x: 0.85, y: 0.85 }, // 1 右下
      { x: 0.15, y: 0.85 }, // 2 左下
    ],
    segments: [[0, 1], [1, 2], [2, 0]],
  },
  {
    id: 'circle',
    name: 'Circle',
    nameCn: '魔法圆环',
    points: Array.from({ length: 24 }, (_, i) => ({
      x: 0.5 + 0.35 * Math.cos((2 * Math.PI * i) / 24),
      y: 0.5 + 0.35 * Math.sin((2 * Math.PI * i) / 24),
    })),
    segments: Array.from({ length: 24 }, (_, i) => [i, (i + 1) % 24]),
  },
];

export function getRandomPattern(): MagicPattern {
  return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
}

// 计算用户轨迹与目标图案的匹配度
export function calculatePatternScore(
  tracedPoints: { x: number; y: number }[],
  pattern: MagicPattern
): number {
  if (tracedPoints.length < 5) return 0;

  const threshold = 0.08; // 匹配阈值
  let matchedSegments = 0;
  const totalSegments = pattern.segments.length;

  for (const [fromIdx, toIdx] of pattern.segments) {
    const p1 = pattern.points[fromIdx];
    const p2 = pattern.points[toIdx];
    let bestMatch = 0;

    for (const tp of tracedPoints) {
      const dist = distToSegment(tp, p1, p2);
      if (dist < threshold) {
        bestMatch = Math.max(bestMatch, 1 - dist / threshold);
      }
    }

    matchedSegments += bestMatch;
  }

  const coverageScore = Math.min(matchedSegments / totalSegments, 1);

  // 计算精度：轨迹点中有多少接近目标线段
  let nearCount = 0;
  for (const tp of tracedPoints) {
    let minDist = Infinity;
    for (const [fromIdx, toIdx] of pattern.segments) {
      const dist = distToSegment(tp, pattern.points[fromIdx], pattern.points[toIdx]);
      minDist = Math.min(minDist, dist);
    }
    if (minDist < threshold) nearCount++;
  }
  const precisionScore = nearCount / tracedPoints.length;

  // 综合分数：50% 覆盖率 + 50% 精度
  return Math.round((coverageScore * 0.5 + precisionScore * 0.5) * 100);
}

// 点到线段的距离
function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}
