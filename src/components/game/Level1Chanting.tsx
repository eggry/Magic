'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useGame, type Level1Result, type SpellResult } from './GameProvider';
import { pickThreeSpells } from '@/lib/spells';
import { matchSpell } from '@/lib/spellMatch';
import type { Spell, SpellCategory } from '@/lib/spells';
import SpellAnimation from './SpellAnimation';

type Phase = 'ready' | 'countdown' | 'listening' | 'transition' | 'done';

const TIME_PER_SPELL = 7; // 每个咒语限时 7 秒

export default function Level1Chanting() {
  const { completeLevel1 } = useGame();
  const [spells] = useState<Spell[]>(() => pickThreeSpells());

  // --- State for rendering ---
  const [currentSpellIndex, setCurrentSpellIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [transcript, setTranscript] = useState('');
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_SPELL);
  const [animatingSpell, setAnimatingSpell] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [spellResults, setSpellResults] = useState<SpellResult[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [matchDetail, setMatchDetail] = useState<string>(''); // 匹配详情

  // --- Refs for mutable values accessed inside callbacks ---
  const currentSpellIndexRef = useRef(0);
  const spellResultsRef = useRef<SpellResult[]>([]);
  const phaseRef = useRef<Phase>(phase);

  // --- Refs for hardware / browser APIs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animFrameRef = useRef<number>(0);
  const volumeSamplesRef = useRef<number[]>([]);
  const transcriptRef = useRef('');
  const micReadyRef = useRef(false);
  const completeLevel1Ref = useRef(completeLevel1);
  completeLevel1Ref.current = completeLevel1;
  const autoSubmittedRef = useRef(false); // 防止自动提交后重复触发

  // Track whether component is mounted
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const currentSpell = spells[currentSpellIndex];

  // ---- Cleanup all media resources ----
  const cleanupMedia = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
      recognitionRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      try { audioContextRef.current?.close(); } catch (_e) { /* ignore */ }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // ---- Volume analysis loop ----
  const analyzeVolume = useCallback(() => {
    if (!analyserRef.current || !mountedRef.current) return;
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

  // ---- Calculate a single spell's result ----
  const calculateSpellResult = useCallback((spell: Spell): SpellResult => {
    const samples = volumeSamplesRef.current;
    const spokenText = transcriptRef.current;

    // === 准确度：基于中文拼音模糊匹配 ===
    const accuracy = matchSpell(spokenText, spell.nameCn, spell.aliases);

    // 匹配详情（用于展示）
    if (accuracy >= 90) {
      setMatchDetail('完美匹配!');
    } else if (accuracy >= 70) {
      setMatchDetail('发音接近，基本正确');
    } else if (accuracy >= 50) {
      setMatchDetail('有些偏差，但分院帽听出了你的意思');
    } else if (accuracy >= 30) {
      setMatchDetail('发音不太对，但勉强辨认');
    } else if (spokenText.length > 0) {
      setMatchDetail('分院帽听不清你在念什么...');
    } else {
      setMatchDetail('没有检测到语音');
    }

    // === 气势：基于音量分析 ===
    const avgVolume = samples.length > 0
      ? samples.reduce((a, b) => a + b, 0) / samples.length
      : 0.3;
    const maxVolume = samples.length > 0 ? Math.max(...samples) : 0.5;
    const power = Math.round(Math.min((avgVolume * 0.6 + maxVolume * 0.4) * 120, 100));

    return { spell, accuracy, power, category: spell.category };
  }, []);

  // ---- Stop current spell's recognition + animation (NOT the timer — useEffect handles that) ----
  const stopSpellMedia = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  // ---- Finish current spell and advance ----
  const doFinishCurrentSpell = useCallback(() => {
    autoSubmittedRef.current = false; // 重置自动提交标记
    stopSpellMedia();

    // Read latest values from refs
    const idx = currentSpellIndexRef.current;
    const spell = spells[idx];
    const result = calculateSpellResult(spell);
    const newResults = [...spellResultsRef.current, result];

    // Sync refs
    spellResultsRef.current = newResults;
    setSpellResults(newResults);

    // Reset per-spell state
    setTranscript('');
    transcriptRef.current = '';
    volumeSamplesRef.current = [];
    setVolumeHistory([]);

    if (idx < spells.length - 1) {
      setPhase('transition');
    } else {
      setAllDone(true);
      setPhase('done');
    }
  }, [stopSpellMedia, calculateSpellResult, spells]);

  // ============================================================
  // EFFECT: Countdown timer (3-2-1 before each spell)
  // Uses setTimeout per tick — React auto-cleans up on phase change
  // ============================================================
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      // Countdown finished → transition to listening
      startListeningPhase();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ============================================================
  // EFFECT: Spell timer (10-9-8... during listening)
  // Uses setTimeout per tick — React auto-cleans up on phase change
  // ============================================================
  useEffect(() => {
    if (phase !== 'listening') return;

    if (timeLeft <= 0) {
      // Time's up → check if matched, play animation, then finish
      const spell = spells[currentSpellIndex];
      const spokenText = transcriptRef.current.trim();
      const accuracy = spokenText ? matchSpell(spokenText, spell.nameCn, spell.aliases) : 0;
      if (accuracy >= 40 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        setAnimatingSpell(spell.nameCn);
      } else {
        doFinishCurrentSpell();
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, timeLeft, doFinishCurrentSpell]);

  // ---- Start listening phase for current spell ----
  const startListeningPhase = useCallback(() => {
    // Reset per-spell state
    transcriptRef.current = '';
    volumeSamplesRef.current = [];
    autoSubmittedRef.current = false;
    setVolumeHistory([]);
    setTranscript('');
    setTimeLeft(TIME_PER_SPELL);
    setMatchDetail('');

    // Speech recognition — 使用中文识别
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'zh-CN'; // 改为中文识别
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.length > 0) {
            text += result[0].transcript;
          }
        }
        transcriptRef.current = text;
        setTranscript(text);

        // 自动提交逻辑：当一句话说完(isFinal)且文本较短且与咒语匹配度较高时
        if (!autoSubmittedRef.current && event.results[event.results.length - 1]?.isFinal) {
          const spokenText = text.trim();
          const spell = spells[currentSpellIndexRef.current];
          // 短文本(<=10字)才判定，避免长句子误触发
          if (spokenText.length > 0 && spokenText.length <= 10) {
            const accuracy = matchSpell(spokenText, spell.nameCn, spell.aliases);
            if (accuracy >= 40) {
              autoSubmittedRef.current = true;
              setMatchDetail(accuracy >= 70 ? '匹配成功!' : '基本匹配...');
              // 播放咒语动画，动画结束后自动继续
              setAnimatingSpell(spell.nameCn);
            }
          }
        }
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
  }, [analyzeVolume]);

  // ---- Initialize microphone once ----
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

  // ---- Handle start button ----
  const handleStart = useCallback(async () => {
    const micOk = await initMicrophone();
    if (!micOk) {
      // Fallback: simulate all 3 spells
      const fakeResults: SpellResult[] = spells.map(spell => {
        const accuracy = 60 + Math.floor(Math.random() * 30);
        const power = 50 + Math.floor(Math.random() * 40);
        return { spell, accuracy, power, category: spell.category };
      });
      spellResultsRef.current = fakeResults;
      setSpellResults(fakeResults);
      setAllDone(true);
      setPhase('done');
      return;
    }

    // 3-2-1 countdown
    setCountdown(3);
    setPhase('countdown');
  }, [initMicrophone, spells]);

  // ---- Go to next spell ----
  const handleNextSpell = useCallback(() => {
    const nextIdx = currentSpellIndexRef.current + 1;
    currentSpellIndexRef.current = nextIdx;
    setCurrentSpellIndex(nextIdx);

    // Short countdown then start
    setCountdown(2);
    setPhase('countdown');
  }, []);

  // ---- Auto-advance after each spell ----
  useEffect(() => {
    if (phase !== 'transition') return;
    const timer = setTimeout(() => {
      handleNextSpell();
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase, handleNextSpell]);

  // ---- Handle "I'm done" button (early finish) ----
  const handleEarlyFinish = useCallback(() => {
    const spell = spells[currentSpellIndex];
    const spokenText = transcriptRef.current.trim();
    const accuracy = spokenText ? matchSpell(spokenText, spell.nameCn, spell.aliases) : 0;
    if (accuracy >= 40 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setAnimatingSpell(spell.nameCn);
    } else {
      doFinishCurrentSpell();
    }
  }, [doFinishCurrentSpell, spells, currentSpellIndex]);

  // ---- Build final Level1Result ----
  const finalResult = useMemo<Level1Result | null>(() => {
    if (!allDone || spellResults.length === 0) return null;

    const avgAccuracy = Math.round(spellResults.reduce((s, r) => s + r.accuracy, 0) / spellResults.length);
    const avgPower = Math.round(spellResults.reduce((s, r) => s + r.power, 0) / spellResults.length);

    const darkSpells = spellResults.filter(r => r.category === 'dark' || r.category === 'unforgivable');
    const lightSpells = spellResults.filter(r => r.category === 'defense' || r.category === 'utility');
    const darkAffinity = darkSpells.length > 0
      ? Math.round(darkSpells.reduce((s, r) => s + (r.accuracy + r.power) / 2, 0) / darkSpells.length)
      : 0;
    const lightAffinity = lightSpells.length > 0
      ? Math.round(lightSpells.reduce((s, r) => s + (r.accuracy + r.power) / 2, 0) / lightSpells.length)
      : 0;

    return {
      spells: spellResults,
      accuracy: avgAccuracy,
      power: avgPower,
      darkAffinity,
      lightAffinity,
      totalScore: Math.round(avgAccuracy * 0.5 + avgPower * 0.5),
    };
  }, [allDone, spellResults]);

  // Auto-start first spell on mount
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (phase === 'ready' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      handleStart();
    }
  }, [phase, handleStart]);

  // Auto-proceed to next level when done
  const hasAutoCompletedRef = useRef(false);
  useEffect(() => {
    if (phase === 'done' && finalResult && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      const timer = setTimeout(() => {
        completeLevel1Ref.current(finalResult);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, finalResult]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => { cleanupMedia(); };
  }, [cleanupMedia]);

  // ---- Category styling helpers ----
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

  const handleAnimationComplete = useCallback(() => {
    setAnimatingSpell(null);
    if (phaseRef.current === 'listening') {
      doFinishCurrentSpell();
    }
  }, [doFinishCurrentSpell]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Spell Animation Overlay */}
      {animatingSpell && (
        <SpellAnimation spellName={animatingSpell} onComplete={handleAnimationComplete} />
      )}
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
          {/* 中文咒语名 — 大字显示，这是用户要念的 */}
          <h2
            className="text-4xl sm:text-5xl font-bold mb-2 tracking-widest"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: currentSpell.category === 'unforgivable' ? '#ef4444'
                : currentSpell.category === 'dark' ? '#8b5cf6'
                : '#c9a84c',
              textShadow: `0 0 15px ${getCategoryColor(currentSpell.category)}60`,
            }}
          >
            {currentSpell.nameCn}
          </h2>
          {/* 拉丁原名 — 小字辅助 */}
          <p className="text-sm mb-1" style={{ color: '#9ca3af', fontFamily: "'Cinzel Decorative', serif" }}>
            {currentSpell.name}
          </p>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            中文发音: [{currentSpell.incantationCn}]
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

      {/* Transcript — 显示语音识别结果 */}
      {phase === 'listening' && transcript && (
        <div className="mb-2">
          <p className="text-lg" style={{ color: '#e8dcc8' }}>
            你说: &ldquo;{transcript}&rdquo;
          </p>
          {matchDetail && (
            <p className="text-xs mt-1" style={{ color: '#c9a84c' }}>
              {matchDetail}
            </p>
          )}
        </div>
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
          onClick={handleEarlyFinish}
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

      {/* Transition between spells — auto-advances */}
      {phase === 'transition' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
          <p style={{ color: '#c9a84c' }}>分院帽记下了...</p>
          <p className="text-sm" style={{ color: '#9ca3af' }}>即将进入下一个咒语</p>
        </div>
      )}

      {/* Start button */}
      {/* Ready phase: auto-starts via useEffect */}

      {/* Done: auto-proceed to next level */}
      {phase === 'done' && finalResult && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl" style={{ animation: 'hatWobble 2s ease-in-out infinite' }}>🎩</div>
          <p className="text-lg" style={{ color: '#c9a84c', fontFamily: "'Noto Serif SC', serif" }}>
            念咒考核完成
          </p>
          <p className="text-sm" style={{ color: '#9ca3af' }}>即将进入施咒考验...</p>
        </div>
      )}
    </div>
  );
}


