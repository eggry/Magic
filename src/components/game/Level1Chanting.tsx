'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useGame, type Level1Result, type SpellResult } from './GameProvider';
import { pickThreeSpells } from '@/lib/spells';
import type { Spell, SpellCategory } from '@/lib/spells';

type Phase = 'ready' | 'countdown' | 'listening' | 'transition' | 'done';

const TIME_PER_SPELL = 10; // 每个咒语限时 10 秒

export default function Level1Chanting() {
  const { completeLevel1 } = useGame();
  const [spells] = useState<Spell[]>(() => pickThreeSpells());
  const [currentSpellIndex, setCurrentSpellIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [transcript, setTranscript] = useState('');
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_SPELL);
  const [countdown, setCountdown] = useState(0);
  const [spellResults, setSpellResults] = useState<SpellResult[]>([]);
  const [allDone, setAllDone] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animFrameRef = useRef<number>(0);
  const volumeSamplesRef = useRef<number[]>([]);
  const transcriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micReadyRef = useRef(false);

  const currentSpell = spells[currentSpellIndex];

  const stopCurrent = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    stopCurrent();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      try { audioContextRef.current?.close(); } catch (_e) { /* ignore */ }
      audioContextRef.current = null;
    }
  }, [stopCurrent]);

  const analyzeVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const normalized = Math.min(rms * 5, 1);
    volumeSamplesRef.current.push(normalized);
    setVolumeHistory(prev => [...prev.slice(-50), normalized]);

    animFrameRef.current = requestAnimationFrame(analyzeVolume);
  }, []);

  const calculateSpellResult = useCallback((spell: Spell): SpellResult => {
    const samples = volumeSamplesRef.current;
    const transcriptLower = transcriptRef.current.toLowerCase();

    // Accuracy: check if spell name words appear in transcript
    const spellWords = spell.name.toLowerCase().split(' ');
    let matchedWords = 0;
    for (const word of spellWords) {
      if (transcriptLower.includes(word)) matchedWords++;
    }
    const accuracy = spellWords.length > 0
      ? Math.round((matchedWords / spellWords.length) * 70 + 30 * (transcriptLower.length > 0 ? 1 : 0))
      : 50;

    // Power: based on volume
    const avgVolume = samples.length > 0
      ? samples.reduce((a, b) => a + b, 0) / samples.length
      : 0.3;
    const maxVolume = samples.length > 0 ? Math.max(...samples) : 0.5;
    const power = Math.round(Math.min((avgVolume * 0.6 + maxVolume * 0.4) * 120, 100));

    return { spell, accuracy, power, category: spell.category };
  }, []);

  const finishCurrentSpell = useCallback(() => {
    stopCurrent();
    const result = calculateSpellResult(currentSpell);
    const newResults = [...spellResults, result];
    setSpellResults(newResults);

    // Reset for next spell
    setTranscript('');
    transcriptRef.current = '';
    volumeSamplesRef.current = [];
    setVolumeHistory([]);
    setTimeLeft(TIME_PER_SPELL);

    if (currentSpellIndex < spells.length - 1) {
      // Move to next spell
      setPhase('transition');
    } else {
      // All done
      setAllDone(true);
      setPhase('done');
    }
  }, [stopCurrent, calculateSpellResult, currentSpell, spellResults, currentSpellIndex, spells.length]);

  const startListeningForSpell = useCallback(() => {
    // Reset per-spell state
    transcriptRef.current = '';
    volumeSamplesRef.current = [];
    setVolumeHistory([]);
    setTranscript('');
    setTimeLeft(TIME_PER_SPELL);

    // Speech recognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        transcriptRef.current = text;
        setTranscript(text);
      };

      recognition.onerror = () => { /* continue */ };
      recognitionRef.current = recognition;
      recognition.start();
    }

    // Start volume analysis (reuse existing audio context if available)
    if (analyserRef.current) {
      analyzeVolume();
    }

    setPhase('listening');

    // Timer countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto finish
          finishCurrentSpell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [analyzeVolume, finishCurrentSpell]);

  // Initialize microphone once
  const initMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      micReadyRef.current = true;

      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      return false;
    }
  }, []);

  const handleStart = useCallback(async () => {
    const micOk = await initMicrophone();
    if (!micOk) {
      // Fallback: simulate all 3 spells
      const fakeResults: SpellResult[] = spells.map(spell => {
        const accuracy = 60 + Math.floor(Math.random() * 30);
        const power = 50 + Math.floor(Math.random() * 40);
        return { spell, accuracy, power, category: spell.category };
      });
      setSpellResults(fakeResults);
      setAllDone(true);
      setPhase('done');
      return;
    }

    // 3-2-1 countdown
    setPhase('countdown');
    setCountdown(3);
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          startListeningForSpell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initMicrophone, spells, startListeningForSpell]);

  const handleNextSpell = useCallback(() => {
    setCurrentSpellIndex(prev => prev + 1);
    // Small countdown then start
    setPhase('countdown');
    setCountdown(2);
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          startListeningForSpell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startListeningForSpell]);

  // Build final Level1Result from all spell results
  const finalResult = useMemo<Level1Result | null>(() => {
    if (!allDone || spellResults.length === 0) return null;

    const avgAccuracy = Math.round(spellResults.reduce((s, r) => s + r.accuracy, 0) / spellResults.length);
    const avgPower = Math.round(spellResults.reduce((s, r) => s + r.power, 0) / spellResults.length);

    // Calculate dark affinity: how well user performed on dark/unforgivable spells
    const darkSpells = spellResults.filter(r => r.category === 'dark' || r.category === 'unforgivable');
    const lightSpells = spellResults.filter(r => r.category === 'defense' || r.category === 'utility');
    const darkAffinity = darkSpells.length > 0
      ? Math.round(darkSpells.reduce((s, r) => s + (r.accuracy + r.power) / 2, 0) / darkSpells.length)
      : 0;
    const lightAffinity = lightSpells.length > 0
      ? Math.round(lightSpells.reduce((s, r) => s + (r.accuracy + r.power) / 2, 0) / lightSpells.length)
      : 50;

    return {
      spells: spellResults,
      accuracy: avgAccuracy,
      power: avgPower,
      darkAffinity,
      lightAffinity,
      totalScore: Math.round(avgAccuracy * 0.5 + avgPower * 0.5),
    };
  }, [allDone, spellResults]);

  useEffect(() => {
    return () => { stopAll(); };
  }, [stopAll]);

  // Category color mapping
  const getCategoryColor = (cat: SpellCategory): string => {
    switch (cat) {
      case 'defense': return '#3b82f6';
      case 'utility': return '#22c55e';
      case 'combat': return '#f59e0b';
      case 'dark': return '#8b5cf6';
      case 'unforgivable': return '#ef4444';
    }
  };

  const getCategoryBg = (cat: SpellCategory): string => {
    switch (cat) {
      case 'defense': return 'rgba(59, 130, 246, 0.15)';
      case 'utility': return 'rgba(34, 197, 94, 0.15)';
      case 'combat': return 'rgba(245, 158, 11, 0.15)';
      case 'dark': return 'rgba(139, 92, 246, 0.15)';
      case 'unforgivable': return 'rgba(239, 68, 68, 0.15)';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ color: '#9ca3af' }}>
        <span style={{ color: '#c9a84c' }}>●</span>
        <span>第一关</span>
        <span>○</span>
        <span>第二关</span>
        <span>○</span>
        <span>结果</span>
      </div>

      {/* Spell progress dots */}
      <div className="flex items-center gap-3 mb-6">
        {spells.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < currentSpellIndex
                  ? getCategoryColor(s.category)
                  : i === currentSpellIndex && (phase === 'listening' || phase === 'countdown')
                    ? getCategoryColor(s.category)
                    : 'rgba(255,255,255,0.2)',
                boxShadow: i === currentSpellIndex && (phase === 'listening' || phase === 'countdown')
                  ? `0 0 10px ${getCategoryColor(s.category)}60`
                  : 'none',
              }}
            />
            <span className="text-xs" style={{
              color: i <= currentSpellIndex ? getCategoryColor(s.category) : '#9ca3af',
            }}>
              {s.nameCn}
            </span>
          </div>
        ))}
      </div>

      {/* Current Spell Display */}
      {(phase === 'ready' || phase === 'countdown' || phase === 'listening' || phase === 'transition') && currentSpell && (
        <div
          className="mb-6 px-8 py-5 rounded-xl w-full max-w-md"
          style={{
            background: 'rgba(15, 15, 30, 0.8)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${getCategoryColor(currentSpell.category)}40`,
            boxShadow: `0 0 20px ${getCategoryColor(currentSpell.category)}10`,
          }}
        >
          {/* Category badge */}
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{
              backgroundColor: getCategoryBg(currentSpell.category),
              color: getCategoryColor(currentSpell.category),
              border: `1px solid ${getCategoryColor(currentSpell.category)}30`,
            }}
          >
            {currentSpell.categoryEmoji} {currentSpell.categoryLabel}
          </div>

          <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>
            {currentSpellIndex + 1} / {spells.length} — 念出这个咒语
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold mb-2 tracking-widest"
            style={{
              fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
              color: currentSpell.category === 'unforgivable' ? '#ef4444'
                : currentSpell.category === 'dark' ? '#8b5cf6'
                : '#c9a84c',
              textShadow: `0 0 15px ${getCategoryColor(currentSpell.category)}60`,
            }}
          >
            {currentSpell.name}
          </h2>
          <p className="text-lg mb-1" style={{ color: '#e8dcc8', fontFamily: "'Noto Serif SC', serif" }}>
            {currentSpell.nameCn}
          </p>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            发音: [{currentSpell.pronunciation}]
          </p>
          <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
            {currentSpell.description}
          </p>

          {/* Dark/unforgivable warning */}
          {(currentSpell.category === 'dark' || currentSpell.category === 'unforgivable') && (
            <p
              className="text-xs mt-3 italic"
              style={{
                color: currentSpell.category === 'unforgivable' ? '#ef4444' : '#8b5cf6',
              }}
            >
              ⚠️ 分院帽说：你可以拒绝念这个咒语，但如果你坚定地念出它...
            </p>
          )}
        </div>
      )}

      {/* Timer */}
      {phase === 'listening' && (
        <div className="flex items-center gap-3 mb-4">
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              border: `3px solid ${timeLeft <= 3 ? '#ef4444' : '#c9a84c'}`,
            }}
          >
            <span
              className="text-xl font-bold"
              style={{
                color: timeLeft <= 3 ? '#ef4444' : '#c9a84c',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {timeLeft}
            </span>
          </div>
          <span className="text-sm" style={{ color: '#9ca3af' }}>限时</span>
        </div>
      )}

      {/* Audio visualization */}
      {phase === 'listening' && (
        <div className="flex items-center justify-center gap-1 mb-4 h-16">
          {volumeHistory.map((v, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: '4px',
                height: `${Math.max(4, v * 60)}px`,
                backgroundColor: `rgba(201, 168, 76, ${0.4 + v * 0.6})`,
                boxShadow: v > 0.5 ? '0 0 8px rgba(201, 168, 76, 0.5)' : 'none',
                transition: 'height 0.05s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && countdown > 0 && (
        <div
          className="text-8xl font-bold mb-6"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#c9a84c',
            textShadow: '0 0 30px rgba(201, 168, 76, 0.7)',
            animation: 'countdownPulse 1s ease-in-out',
          }}
        >
          {countdown}
        </div>
      )}

      {/* Transcript */}
      {(phase === 'listening') && transcript && (
        <p className="mb-4 text-lg" style={{ color: '#e8dcc8' }}>
          你说: &ldquo;{transcript}&rdquo;
        </p>
      )}

      {/* Listening indicator */}
      {phase === 'listening' && (
        <div className="flex items-center gap-2 mb-2" style={{ color: '#ef4444' }}>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span>正在聆听... 请大声念出咒语!</span>
        </div>
      )}

      {/* Early stop button */}
      {phase === 'listening' && (
        <button
          onClick={() => { finishCurrentSpell(); }}
          className="px-6 py-2 rounded-lg text-sm cursor-pointer"
          style={{
            color: '#e8dcc8',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
          }}
        >
          我念完了
        </button>
      )}

      {/* Transition between spells */}
      {phase === 'transition' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
          <p style={{ color: '#c9a84c' }}>分院帽记下了...</p>
          <button
            onClick={handleNextSpell}
            className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#0a0e1a',
              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
            }}
          >
            下一个咒语 →
          </button>
        </div>
      )}

      {/* Start button */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            分院帽将依次赐予你 {spells.length} 个咒语，每个限时 {TIME_PER_SPELL} 秒
          </p>
          <button
            onClick={handleStart}
            className="px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#0a0e1a',
              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(201, 168, 76, 0.6)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.4)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🎤 开始念咒
          </button>
        </div>
      )}

      {/* Final results */}
      {phase === 'done' && finalResult && (
        <div
          className="w-full max-w-md px-6 py-5 rounded-xl"
          style={{
            background: 'rgba(15, 15, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(201, 168, 76, 0.3)',
          }}
        >
          <h3
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "'Cinzel', serif", color: '#c9a84c' }}
          >
            Spell Assessment
          </h3>

          {/* Individual spell results */}
          <div className="space-y-3 mb-4">
            {finalResult.spells.map((sr, i) => (
              <div
                key={sr.spell.name}
                className="px-3 py-2 rounded-lg text-left"
                style={{
                  backgroundColor: getCategoryBg(sr.spell.category),
                  borderLeft: `3px solid ${getCategoryColor(sr.spell.category)}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{sr.spell.categoryEmoji}</span>
                  <span className="text-sm font-bold" style={{ color: getCategoryColor(sr.spell.category) }}>
                    {sr.spell.nameCn}
                  </span>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>
                    ({sr.spell.categoryLabel})
                  </span>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: '#9ca3af' }}>
                  <span>准确度: <b style={{ color: '#e8dcc8' }}>{sr.accuracy}</b></span>
                  <span>气势: <b style={{ color: '#e8dcc8' }}>{sr.power}</b></span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary scores */}
          <div className="space-y-3 text-left">
            <ScoreBar label="咒语准确度" value={finalResult.accuracy} />
            <ScoreBar label="魔力气势" value={finalResult.power} />
            {finalResult.darkAffinity > 0 && (
              <ScoreBar
                label="黑魔法亲和度"
                value={finalResult.darkAffinity}
                barColor="#8b5cf6"
              />
            )}
            <div
              className="pt-3 mt-3 text-center text-xl font-bold"
              style={{
                borderTop: '1px solid rgba(201, 168, 76, 0.2)',
                color: '#c9a84c',
                textShadow: '0 0 10px rgba(201, 168, 76, 0.4)',
              }}
            >
              综合评分: {finalResult.totalScore}
            </div>
          </div>

          <button
            onClick={() => completeLevel1(finalResult)}
            className="mt-5 px-8 py-3 rounded-lg text-lg font-bold tracking-wider transition-all duration-300 cursor-pointer w-full"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#0a0e1a',
              background: 'linear-gradient(135deg, #c9a84c, #d4a017, #c9a84c)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.4)',
            }}
          >
            进入下一关 →
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, barColor }: { label: string; value: number; barColor?: string }) {
  const getColor = (v: number): string => {
    if (barColor) return barColor;
    if (v >= 80) return '#22c55e';
    if (v >= 50) return '#c9a84c';
    return '#ef4444';
  };

  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ color: getColor(value) }}>{value}</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${value}%`,
            backgroundColor: getColor(value),
            boxShadow: `0 0 8px ${getColor(value)}40`,
          }}
        />
      </div>
    </div>
  );
}
