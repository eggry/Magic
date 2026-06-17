import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import MagicalBackground from '@/components/game/MagicalBackground';

export const metadata: Metadata = {
  title: '霍格沃茨分院仪式 | Hogwarts Sorting Ceremony',
  description: '通过念咒语和挥舞魔杖，让分院帽决定你属于哪个学院！',
  keywords: ['哈利波特', '分院帽', '霍格沃茨', 'Hogwarts', 'Sorting Hat'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased relative min-h-screen`}>
        <MagicalBackground />
        {isDev && <Inspector />}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
