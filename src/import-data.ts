import type { FeatureMetrics, SoundSample } from './models';

export interface ImportedSample extends Omit<SoundSample, 'audio'> {
  audioData: string;
}

export interface ImportedPayload {
  schemaVersion: 1;
  product: 'sound-pattern-playground';
  labels: string[];
  samples: ImportedSample[];
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isFiniteArray = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every(isFiniteNumber);

function isMetrics(value: unknown): value is FeatureMetrics {
  if (!value || typeof value !== 'object') return false;
  const metrics = value as Partial<FeatureMetrics>;
  return isFiniteNumber(metrics.rms) && metrics.rms >= 0
    && isFiniteNumber(metrics.centroidHz) && metrics.centroidHz >= 0
    && isFiniteNumber(metrics.brightness) && metrics.brightness >= 0 && metrics.brightness <= 1
    && Number.isInteger(metrics.dominantBand) && Number(metrics.dominantBand) >= 0 && Number(metrics.dominantBand) < 12;
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isAudioDataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 50 * 1024 * 1024) return false;
  const match = /^data:(audio\/[a-z0-9.+-]+);base64,([a-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length < 4 || match[2].length % 4 !== 0) return false;
  try {
    return atob(match[2]).length > 0;
  } catch {
    return false;
  }
}

export function labelsAreValid(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  if (!value.every((label) => typeof label === 'string' && label === label.trim() && label.length > 0 && label.length <= 24)) return false;
  return new Set(value.map((label) => label.trim().toLocaleLowerCase())).size === 3;
}

function hasValidSampleFields(sample: Record<string, unknown>, labels: string[]): boolean {
  const label = sample.label;
  const predictedLabel = sample.predictedLabel;
  return typeof sample.id === 'string' && sample.id.length > 0 && sample.id.length <= 128
    && (label === null || (typeof label === 'string' && labels.includes(label)))
    && (predictedLabel === null || (typeof predictedLabel === 'string' && labels.includes(predictedLabel)))
    && typeof sample.misclassified === 'boolean'
    && isDate(sample.createdAt)
    && isFiniteNumber(sample.durationMs) && sample.durationMs >= 300 && sample.durationMs <= 4000
    && typeof sample.mimeType === 'string' && /^audio\/[a-z0-9.+-]+$/i.test(sample.mimeType)
    && isFiniteArray(sample.waveform, 256)
    && Array.isArray(sample.trail) && sample.trail.length > 0 && sample.trail.length <= 48
    && sample.trail.every((row) => isFiniteArray(row, 32))
    && isFiniteArray(sample.mfcc, 8)
    && isFiniteArray(sample.vector, 13)
    && isMetrics(sample.metrics);
}

export function isImportedPayload(value: unknown): value is ImportedPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  if (payload.schemaVersion !== 1 || payload.product !== 'sound-pattern-playground' || !labelsAreValid(payload.labels) || !Array.isArray(payload.samples)) return false;
  const ids = new Set<string>();
  return payload.samples.every((value) => {
    if (!value || typeof value !== 'object') return false;
    const sample = value as Record<string, unknown>;
    if (!hasValidSampleFields(sample, payload.labels as string[]) || !isAudioDataUrl(sample.audioData)) return false;
    if (ids.has(sample.id as string)) return false;
    ids.add(sample.id as string);
    return true;
  });
}

export function isStoredSample(value: unknown): value is SoundSample {
  if (!value || typeof value !== 'object') return false;
  const sample = value as unknown as Record<string, unknown>;
  const possibleLabels = [sample.label, sample.predictedLabel].filter((label): label is string => typeof label === 'string');
  return hasValidSampleFields(sample, possibleLabels) && sample.audio instanceof Blob && sample.audio.size > 0;
}

export function audioDataUrlToBlob(dataUrl: string): Blob {
  if (!isAudioDataUrl(dataUrl)) throw new Error('Invalid audio data');
  const [header, encoded] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'audio/webm';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export function materializeImportedSamples(payload: ImportedPayload): SoundSample[] {
  return payload.samples.map(({ audioData, ...sample }) => ({ ...sample, audio: audioDataUrlToBlob(audioData) }));
}
