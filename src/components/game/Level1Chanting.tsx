'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGame, type Level1Result } from './GameProvider';
import { getRandomSpell } from '@/lib/spells';
import type { Spell } from '@/lib/spells';

type Phase = 'ready' | 'listening' | 'analyzing' | 'done';

export default function Level1Chanting() {
  const { completeLevel1 } = useGame();
  const [spell] = useState<Spell>(() => getRandomSpell());
  const [phase, setPhase] = useState<Phase>('ready');
  const [transcript, setTranscript] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  const [result, setResult] = useState<Level1Result | null>(null);
  const [countdown, setCountdown] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animFrameRef = useRef<number>(0);
  const volumeSamplesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const stopAll = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      try { audioContextRef.current?.close(); } catch (_e) { /* ignore */ }
    }
  }, []);

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
    setVolumeLevel(normalized);
    volumeSamplesRef.current.push(normalized);
    setVolumeHistory(prev => [...prev.slice(-50), normalized]);

    animFrameRef.current = requestAnimationFrame(analyzeVolume);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

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
          setTranscript(text);
        };

        recognition.onerror = () => {
          // Continue even on error, we still have audio data
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      volumeSamplesRef.current = [];
      startTimeRef.current = Date.now();
      setPhase('listening');
      setVolumeHistory([]);
      analyzeVolume();

      // Auto-stop after 8 seconds
      setTimeout(() => {
        if (phase === 'listening' || true) {
          stopAll();
          setPhase('analyzing');
          setTimeout(() => {
            calculateResult();
          }, 1500);
        }
      }, 8000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      // Fallback: simulate the level
      setPhase('analyzing');
      setTimeout(() => {
        const fakeResult: Level1Result = {
          spell,
          accuracy: 60 + Math.floor(Math.random() * 30),
          power: 50 + Math.floor(Math.random() * 40),
          totalScore: 0,
        };
        fakeResult.totalScore = Math.round(fakeResult.accuracy * 0.6 + fakeResult.power * 0.4);
        setResult(fakeResult);
        setPhase('done');
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell, stopAll]);

  const calculateResult = useCallback(() => {
    const samples = volumeSamplesRef.current;
    const transcriptLower = transcript.toLowerCase();

    // Accuracy: check if the spell name appears in the transcript
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

    const totalScore = Math.round(accuracy * 0.6 + power * 0.4);

    const r: Level1Result = { spell, accuracy, power, totalScore };
    setResult(r);
    setPhase('done');
  }, [spell, transcript]);

  // Countdown before starting
  const handleStart = useCallback(() => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startListening();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startListening]);

  useEffect(() => {
    return () => { stopAll(); };
  }, [stopAll]);

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

      {/* Spell Display */}
      <div
        className="mb-6 px-8 py-4 rounded-xl"
        style={{
          background: 'rgba(15, 15, 30, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201, 168, 76, 0.3)',
        }}
      >
        <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>分院帽赐予你的咒语</p>
        <h2
          className="text-4xl sm:text-5xl font-bold mb-2 tracking-widest"
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            color: '#c9a84c',
            textShadow: '0 0 15px rgba(201, 168, 76, 0.6)',
          }}
        >
          {spell.name}
        </h2>
        <p className="text-lg mb-1" style={{ color: '#e8dcc8', fontFamily: "'Noto Serif SC', serif" }}>
          {spell.nameCn}
        </p>
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          发音: [{spell.pronunciation}]
        </p>
        <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
          {spell.description}
        </p>
      </div>

      {/* Audio visualization */}
      {phase === 'listening' && (
        <div className="flex items-center justify-center gap-1 mb-6 h-16">
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
      {countdown > 0 && (
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
      {(phase === 'listening' || phase === 'analyzing') && transcript && (
        <p className="mb-4 text-lg" style={{ color: '#e8dcc8' }}>
          你说: &ldquo;{transcript}&rdquo;
        </p>
      )}

      {/* Analyzing spinner */}
      {phase === 'analyzing' && (
        <div className="flex items-center gap-3 mb-6" style={{ color: '#c9a84c' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>分院帽正在聆听...</span>
        </div>
      )}

      {/* Start button */}
      {phase === 'ready' && (
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
      )}

      {/* Listening indicator */}
      {phase === 'listening' && (
        <div className="flex items-center gap-2 mb-4" style={{ color: '#ef4444' }}>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span>正在聆听... 请大声念出咒语!</span>
        </div>
      )}

      {/* Stop button */}
      {phase === 'listening' && (
        <button
          onClick={() => {
            stopAll();
            setPhase('analyzing');
            setTimeout(calculateResult, 1500);
          }}
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

      {/* Result */}
      {phase === 'done' && result && (
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

          <div className="space-y-3 text-left">
            <ScoreBar label="咒语准确度" value={result.accuracy} />
            <ScoreBar label="魔力气势" value={result.power} />
            <div
              className="pt-3 mt-3 text-center text-xl font-bold"
              style={{
                borderTop: '1px solid rgba(201, 168, 76, 0.2)',
                color: '#c9a84c',
                textShadow: '0 0 10px rgba(201, 168, 76, 0.4)',
              }}
            >
              综合评分: {result.totalScore}
            </div>
          </div>

          <button
            onClick={() => completeLevel1(result)}
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

function ScoreBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
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
