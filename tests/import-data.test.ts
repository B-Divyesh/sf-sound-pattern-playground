import { describe, expect, it } from 'vitest';
import { isImportedPayload, materializeImportedSamples } from '../src/import-data';

function validPayload(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    product: 'sound-pattern-playground',
    labels: ['Tap', 'Hum', 'Clap'],
    samples: [{
      id: 'sample-1', label: 'Tap', predictedLabel: null, misclassified: false,
      createdAt: '2026-08-28T10:00:00.000Z', durationMs: 1000, mimeType: 'audio/wav',
      audioData: 'data:audio/wav;base64,AAAA',
      waveform: Array(256).fill(0), trail: [Array(32).fill(0.1)], mfcc: Array(8).fill(0), vector: Array(13).fill(1 / 13),
      metrics: { rms: 0.1, centroidHz: 400, brightness: 0.2, dominantBand: 3 },
    }],
  };
}

describe('dataset import validation', () => {
  it('rejects the verifier payload before it can be persisted', () => {
    const incomplete = { schemaVersion: 1, labels: ['A', 'B', 'C'], samples: [{ id: 'broken', audioData: 'data:audio/webm;base64,', vector: [] }] };
    expect(isImportedPayload(incomplete)).toBe(false);
  });

  it('requires valid dates, feature dimensions, metrics, labels, and non-empty audio', () => {
    const invalidDate = structuredClone(validPayload());
    (invalidDate.samples as Array<Record<string, unknown>>)[0].createdAt = 'not-a-date';
    expect(isImportedPayload(invalidDate)).toBe(false);

    const invalidVector = structuredClone(validPayload());
    (invalidVector.samples as Array<Record<string, unknown>>)[0].vector = [];
    expect(isImportedPayload(invalidVector)).toBe(false);

    const emptyAudio = structuredClone(validPayload());
    (emptyAudio.samples as Array<Record<string, unknown>>)[0].audioData = 'data:audio/wav;base64,';
    expect(isImportedPayload(emptyAudio)).toBe(false);
  });

  it('materializes a complete export only after full validation', () => {
    const payload = validPayload();
    expect(isImportedPayload(payload)).toBe(true);
    if (!isImportedPayload(payload)) throw new Error('fixture must be valid');
    const samples = materializeImportedSamples(payload);
    expect(samples).toHaveLength(1);
    expect(samples[0].audio).toBeInstanceOf(Blob);
    expect(samples[0].audio.size).toBeGreaterThan(0);
  });
});
