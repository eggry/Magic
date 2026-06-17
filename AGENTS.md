# AGENTS.md

## 项目概览

霍格沃茨分院仪式互动小游戏 - 用户通过念咒语和挥舞魔杖两个关卡，让分院帽决定其所属学院，并最终生成穿着学院服饰的AI肖像。

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI 图像生成**: coze-coding-dev-sdk (ImageGenerationClient)
- **对象存储**: coze-coding-dev-sdk (S3Storage)

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate-image/
│   │   │       └── route.ts     # AI 图像生成 API（img2img）
│   │   ├── globals.css          # 全局样式（哈利波特主题）
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 主页面（游戏流程控制）
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameProvider.tsx  # 游戏状态管理 Context
│   │   │   ├── IntroScreen.tsx  # 开场界面
│   │   │   ├── Level1Chanting.tsx # 关卡1：念咒语
│   │   │   ├── Level2Casting.tsx # 关卡2：施咒语（魔杖追踪）
│   │   │   └── ResultScreen.tsx # 分院结果页
│   │   └── ui/                  # Shadcn UI 组件库
│   ├── lib/
│   │   ├── patterns.ts          # 魔法符文图案数据 + 匹配算法
│   │   ├── sorting-hat.ts       # 分院算法 + 学院数据
│   │   ├── spells.ts            # 咒语数据
│   │   └── utils.ts             # 通用工具函数
│   └── types/
│       └── speech.d.ts          # Web Speech API 类型声明
```

## 构建与测试命令

- 安装依赖: `pnpm install`
- 类型检查: `pnpm ts-check`
- Lint: `pnpm lint --quiet`
- 构建: `pnpm run build`
- 开发: `pnpm run dev`

## 游戏流程

1. **Intro** → 开场动画，介绍游戏规则
2. **Level 1** → 念咒语：麦克风录音 + Web Speech API 语音识别 + Web Audio API 音量分析 → 打分
3. **Level 2** → 施咒语：摄像头魔杖追踪 + Canvas 图案绘制 + 相似度算法 → 打分
4. **Result** → 分院算法（基于两关分数特征）+ 拍照 + AI img2img 生成学院肖像

## 关键技术点

- **摄像头/麦克风**: 必须在用户交互后请求权限；video 元素始终渲染（CSS 控制显隐）
- **魔杖追踪**: Canvas 逐帧处理视频，检测最亮点（手机手电筒），记录轨迹点
- **分院算法**: 基于念咒准确度/气势 + 图案匹配/精度加权计算，附加随机因素
- **AI 换装**: 用户照片上传至 S3 → 生成签名 URL → img2img 生成学院服饰肖像

## 编码规范

- 所有组件使用 `'use client'` 指令
- 禁止在 JSX 渲染逻辑中使用 `Math.random()` / `Date.now()` / `typeof window`，使用 `useMemo` + `useState` + `useEffect`
- 禁止隐式 `any`
- 包管理器仅使用 `pnpm`
