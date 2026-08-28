import type { SoundSample } from './models';

export const DEMO_LABELS = ['Desk tap', 'Bottle hum', 'Hand clap'];

function makeWave(frequency: number, strength: number): number[] {
  return Array.from({ length: 256 }, (_, index) => Math.sin((index / 256) * Math.PI * 2 * frequency) * strength * (1 - index / 320));
}

function makeTrail(center: number): number[][] {
  return Array.from({ length: 24 }, (_, frame) => Array.from({ length: 32 }, (_, band) => {
    const movingCenter = center + Math.sin(frame / 5) * 1.2;
    return Math.max(0.015, Math.exp(-((band - movingCenter) ** 2) / 14) * (0.72 + Math.sin(frame / 3) * 0.12));
  }));
}

function makeWav(frequency: number, durationMs: number): Blob {
  const sampleRate = 8000;
  const sampleCount = Math.round(sampleRate * durationMs / 1000);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const write = (offset: number, value: string): void => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 120) * Math.max(0, 1 - index / sampleCount);
    view.setInt16(44 + index * 2, Math.sin(index / sampleRate * frequency * Math.PI * 2) * envelope * 9000, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function sample(id: string, label: string | null, predictedLabel: string | null, frequency: number, center: number, createdAt: string): SoundSample {
  const durationMs = 1200;
  const bands = Array.from({ length: 12 }, (_, index) => Math.max(0.01, Math.exp(-((index - center / 2.6) ** 2) / 3)));
  const total = bands.reduce((sum, value) => sum + value, 0);
  return {
    id,
    label,
    predictedLabel,
    misclassified: false,
    createdAt,
    durationMs,
    mimeType: 'audio/wav',
    audio: makeWav(frequency, durationMs),
    waveform: makeWave(Math.max(2, frequency / 45), label === 'Hand clap' ? 0.78 : 0.42),
    trail: makeTrail(center),
    mfcc: Array.from({ length: 8 }, (_, index) => Math.cos((index + 1) * center / 12) * 0.32),
    vector: [...bands.map((value) => value / total), label === 'Hand clap' ? 0.12 : 0.055],
    metrics: {
      rms: label === 'Hand clap' ? 0.24 : 0.1,
      centroidHz: frequency * 3.1,
      brightness: Math.min(0.9, center / 31),
      dominantBand: Math.min(11, Math.round(center / 2.6)),
    },
  };
}

export function createDemoSamples(): SoundSample[] {
  return [
    sample('demo-desk-tap', DEMO_LABELS[0], null, 420, 18, '2026-08-28T09:10:00.000Z'),
    sample('demo-bottle-hum', DEMO_LABELS[1], null, 190, 7, '2026-08-28T09:12:00.000Z'),
    sample('demo-hand-clap', DEMO_LABELS[2], null, 760, 26, '2026-08-28T09:14:00.000Z'),
    sample('demo-mystery-tap', null, DEMO_LABELS[0], 430, 18.5, '2026-08-28T09:16:00.000Z'),
  ];
}
