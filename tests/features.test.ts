import { describe, expect, it } from 'vitest';
import { buildFeatures, classify, dct, euclideanDistance, logBands } from '../src/features';
import type { SoundSample } from '../src/models';

function sample(id: string, label: string, vector: number[]): SoundSample {
  return {
    id,
    label,
    vector,
    waveform: [0],
    trail: [[0]],
    mfcc: [0],
    metrics: { rms: 0, centroidHz: 0, brightness: 0, dominantBand: 0 },
    predictedLabel: null,
    misclassified: false,
    createdAt: '2026-08-28T00:00:00.000Z',
    durationMs: 1000,
    mimeType: 'audio/webm',
    audio: new Blob(),
  };
}

describe('audio feature summaries', () => {
  it('creates stable display and classifier dimensions', () => {
    const wave = Array.from({ length: 4 }, (_, frame) => Array.from({ length: 128 }, (_, index) => Math.sin((index + frame) / 8) * 0.2));
    const spectrum = Array.from({ length: 12 }, (_, frame) => Array.from({ length: 128 }, (_, index) => Math.max(0, 1 - Math.abs(index - 18 - frame) / 28)));
    const features = buildFeatures(wave, spectrum, 48000);
    expect(features.waveform).toHaveLength(256);
    expect(features.trail).toHaveLength(12);
    expect(features.trail[0]).toHaveLength(32);
    expect(features.mfcc).toHaveLength(8);
    expect(features.vector).toHaveLength(13);
    expect(features.metrics.centroidHz).toBeGreaterThan(0);
  });

  it('maps spectra into the requested number of logarithmic bands', () => {
    expect(logBands(Array.from({ length: 128 }, (_, index) => index / 128), 12)).toHaveLength(12);
    expect(dct([1, 0.5, 0.25, 0.125], 3)).toHaveLength(3);
  });
});

describe('transparent nearest-neighbor baseline', () => {
  it('returns the majority label among the three nearest samples', () => {
    const training = [sample('a', 'Tap', [0, 0]), sample('b', 'Tap', [0.1, 0]), sample('c', 'Hum', [0.2, 0]), sample('d', 'Clap', [2, 2])];
    const result = classify([0.08, 0], training);
    expect(result?.label).toBe('Tap');
    expect(result?.neighbors.map((neighbor) => neighbor.sample.id)).toEqual(['b', 'a', 'c']);
    expect(result?.votes.get('Tap')).toBe(2);
  });

  it('uses the closest neighbor to break an equal vote', () => {
    const result = classify([0, 0], [sample('a', 'Hum', [0.01, 0]), sample('b', 'Tap', [0.02, 0])], 2);
    expect(result?.label).toBe('Hum');
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });
});
