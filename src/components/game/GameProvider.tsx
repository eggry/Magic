'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { House } from '@/lib/sorting-hat';
import type { Spell } from '@/lib/spells';
import type { MagicPattern } from '@/lib/patterns';
import { getRandomSpell } from '@/lib/spells';
import { getRandomPattern } from '@/lib/patterns';
import { sortIntoHouse } from '@/lib/sorting-hat';

export type GamePhase = 'intro' | 'level1' | 'level2' | 'result';

export interface Level1Result {
  spell: Spell;
  accuracy: number;   // 0-100, 语音识别匹配度
  power: number;      // 0-100, 音量/气势
  totalScore: number; // 综合分
}

export interface Level2Result {
  pattern: MagicPattern;
  score: number;      // 0-100, 图案匹配分
  precision: number;  // 0-100, 精度
}

export interface GameState {
  phase: GamePhase;
  level1Result: Level1Result | null;
  level2Result: Level2Result | null;
  sortedHouse: House | null;
  generatedImageUrl: string | null;
  userPhotoUrl: string | null;
}

interface GameContextType extends GameState {
  startGame: () => void;
  completeLevel1: (result: Level1Result) => void;
  completeLevel2: (result: Level2Result) => void;
  setResult: (house: House, photoUrl: string | null, generatedUrl: string | null) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>({
    phase: 'intro',
    level1Result: null,
    level2Result: null,
    sortedHouse: null,
    generatedImageUrl: null,
    userPhotoUrl: null,
  });

  const startGame = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'level1' }));
  }, []);

  const completeLevel1 = useCallback((result: Level1Result) => {
    setState(prev => ({ ...prev, level1Result: result, phase: 'level2' }));
  }, []);

  const completeLevel2 = useCallback((result: Level2Result) => {
    setState(prev => {
      const l1 = prev.level1Result;
      if (!l1) return prev;
      const house = sortIntoHouse({
        chantAccuracy: l1.accuracy,
        chantPower: l1.power,
        patternScore: result.score,
        patternPrecision: result.precision,
      });
      return { ...prev, level2Result: result, sortedHouse: house, phase: 'result' };
    });
  }, []);

  const setResult = useCallback((house: House, photoUrl: string | null, generatedUrl: string | null) => {
    setState(prev => ({ ...prev, sortedHouse: house, userPhotoUrl: photoUrl, generatedImageUrl: generatedUrl }));
  }, []);

  const resetGame = useCallback(() => {
    setState({
      phase: 'intro',
      level1Result: null,
      level2Result: null,
      sortedHouse: null,
      generatedImageUrl: null,
      userPhotoUrl: null,
    });
  }, []);

  return (
    <GameContext.Provider value={{ ...state, startGame, completeLevel1, completeLevel2, setResult, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}
