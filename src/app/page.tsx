'use client';

import { GameProvider, useGame } from '@/components/game/GameProvider';
import IntroScreen from '@/components/game/IntroScreen';
import Level1Chanting from '@/components/game/Level1Chanting';
import Level2Casting from '@/components/game/Level2Casting';
import PhotoCapture from '@/components/game/PhotoCapture';
import ResultScreen from '@/components/game/ResultScreen';

function GameContent() {
  const { phase } = useGame();

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 40%, #1a1025 70%, #0a0e1a 100%)',
      }}
    >
      {phase === 'intro' && <IntroScreen />}
      {phase === 'level1' && <Level1Chanting />}
      {phase === 'level2' && <Level2Casting />}
      {phase === 'photo' && <PhotoCapture />}
      {phase === 'result' && <ResultScreen />}
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
