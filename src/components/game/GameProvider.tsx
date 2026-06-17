'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { SortingResult } from '@/lib/sorting-hat';
import type { Spell, SpellCategory } from '@/lib/spells';
import type { MagicPattern } from '@/lib/patterns';
import { getRandomPattern } from '@/lib/patterns';
import { sortIntoHouse } from '@/lib/sorting-hat';

export type GamePhase = 'intro' | 'level1' | 'level2' | 'photo' | 'result';

export interface SpellResult {
  spell: Spell;
  accuracy: number;
  power: number;
  category: SpellCategory;
}

export interface Level1Result {
  spells: SpellResult[];
  accuracy: number;   // 0-100, average accuracy across 3 spells
  power: number;      // 0-100, average power across 3 spells
  darkAffinity: number; // 0-100, performance on dark/unforgivable spells
  lightAffinity: number; // 0-100, performance on defense/utility spells
  totalScore: number; // combined score
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
  sortedHouse: SortingResult | null;
  generatedImageUrl: string | null;
  userPhotoUrl: string | null;
}

interface GameContextType extends GameState {
  startGame: () => void;
  completeLevel1: (result: Level1Result) => void;
  completeLevel2: (result: Level2Result) => void;
  completePhoto: () => void;
  setResult: (house: SortingResult, photoUrl: string | null, generatedUrl: string | null) => void;
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
        darkAffinity: l1.darkAffinity,
        lightAffinity: l1.lightAffinity,
        patternScore: result.score,
        patternPrecision: result.precision,
      });
      return { ...prev, level2Result: result, sortedHouse: house, phase: 'photo' };
    });
  }, []);

  const completePhoto = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'result' }));
  }, []);

  const setResult = useCallback((house: SortingResult, photoUrl: string | null, generatedUrl: string | null) => {
    setState(prev => ({
      ...prev,
      sortedHouse: house,
      userPhotoUrl: photoUrl,
      generatedImageUrl: generatedUrl,
    }));
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
    <GameContext.Provider value={{ ...state, startGame, completeLevel1, completeLevel2, completePhoto, setResult, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}
