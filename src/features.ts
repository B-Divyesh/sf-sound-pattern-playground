import type { Classification, FeatureBundle, SoundSample } from './models';

const EPSILON = 1e-8;

function compress(values: number[], length: number): number[] {
  if (values.length === 0) return Array.from({ length }, () => 0);
  return Array.from({ length }, (_, index) => {
    const start = Math.floor((index * values.length) / length);
    const end = Math.max(start + 1, Math.floor(((index + 1) * values.length) / length));
    let total = 0;
    for (let i = start; i < Math.min(end, values.length); i += 1) total += values[i];
    return total / Math.max(1, Math.min(end, values.length) - start);
  });
}

export function logBands(spectrum: number[], bandCount: number): number[] {
  if (spectrum.length === 0) return Array.from({ length: bandCount }, () => 0);
  return Array.from({ length: bandCount }, (_, band) => {
    const low = Math.pow(spectrum.length, band / bandCount) - 1;
    const high = Math.pow(spectrum.length, (band + 1) / bandCount) - 1;
    const start = Math.max(0, Math.floor(low));
    const end = Math.max(start + 1, Math.ceil(high));
    let total = 0;
    for (let i = start; i < Math.min(end, spectrum.length); i += 1) total += spectrum[i];
    return total / Math.max(1, Math.min(end, spectrum.length) - start);
  });
}

export function dct(input: number[], coefficientCount = 8): number[] {
  const raw = Array.from({ length: coefficientCount }, (_, coefficient) => {
    let sum = 0;
    for (let index = 0; index < input.length; index += 1) {
      sum += Math.log(input[index] + 0.015) * Math.cos((Math.PI * coefficient * (index + 0.5)) / input.length);
    }
    return sum / input.length;
  });
  const scale = Math.max(...raw.map((value) => Math.abs(value)), EPSILON);
  return raw.map((value) => value / scale);
}

export function buildFeatures(
  waveformFrames: number[][],
  spectrumFrames: number[][],
  sampleRate: number,
): FeatureBundle {
  const flatWaveform = waveformFrames.flat();
  const waveform = compress(flatWaveform, 256).map((value) => Math.max(-1, Math.min(1, value)));
  const sourceFrames = spectrumFrames.length > 0 ? spectrumFrames : [Array.from({ length: 64 }, () => 0)];
  const step = Math.max(1, Math.ceil(sourceFrames.length / 48));
  const trail = sourceFrames.filter((_, index) => index % step === 0).slice(-48).map((frame) => logBands(frame, 32));
  const averageSpectrum = Array.from({ length: sourceFrames[0].length }, (_, index) =>
    sourceFrames.reduce((sum, frame) => sum + (frame[index] ?? 0), 0) / sourceFrames.length,
  );
  const bands = logBands(averageSpectrum, 12);
  const bandTotal = bands.reduce((sum, value) => sum + value, 0) + EPSILON;
  const normalizedBands = bands.map((value) => value / bandTotal);
  const squareTotal = flatWaveform.reduce((sum, value) => sum + value * value, 0);
  const rms = Math.sqrt(squareTotal / Math.max(flatWaveform.length, 1));
  const spectrumTotal = averageSpectrum.reduce((sum, value) => sum + value, 0) + EPSILON;
  const nyquist = sampleRate / 2;
  const centroidHz = averageSpectrum.reduce(
    (sum, value, index) => sum + value * ((index / Math.max(1, averageSpectrum.length - 1)) * nyquist),
    0,
  ) / spectrumTotal;
  const brightStart = Math.floor((2000 / nyquist) * averageSpectrum.length);
  const brightness = averageSpectrum.slice(brightStart).reduce((sum, value) => sum + value, 0) / spectrumTotal;
  const dominantBand = normalizedBands.indexOf(Math.max(...normalizedBands));
  const mfcc = dct(bands, 8);
  const vector = [...normalizedBands, Math.min(1, rms * 2) * 0.15];
  return { waveform, trail, mfcc, vector, metrics: { rms, centroidHz, brightness, dominantBand } };
}

export function euclideanDistance(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) sum += (left[index] - right[index]) ** 2;
  return Math.sqrt(sum);
}

export function classify(vector: number[], training: SoundSample[], k = 3): Classification | null {
  const labeled = training.filter((sample) => sample.label && sample.vector.length > 0);
  if (labeled.length === 0) return null;
  const neighbors = labeled
    .map((sample) => ({ sample, distance: euclideanDistance(vector, sample.vector) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.min(k, labeled.length));
  const votes = new Map<string, number>();
  for (const neighbor of neighbors) {
    const label = neighbor.sample.label as string;
    votes.set(label, (votes.get(label) ?? 0) + 1);
  }
  const nearestIndex = new Map(neighbors.map((neighbor, index) => [neighbor.sample.label as string, index]));
  const label = [...votes.entries()].sort((left, right) => {
    const countDifference = right[1] - left[1];
    return countDifference || (nearestIndex.get(left[0]) ?? 99) - (nearestIndex.get(right[0]) ?? 99);
  })[0][0];
  return { label, neighbors, votes };
}

export function observationFor(features: FeatureBundle): string {
  const { rms, centroidHz, brightness } = features.metrics;
  const energy = rms < 0.035 ? 'quiet' : rms > 0.16 ? 'strong' : 'moderate';
  const texture = brightness > 0.5 ? 'bright, high-frequency' : brightness < 0.22 ? 'low, rounded' : 'balanced';
  return `This clip has ${energy} energy and a ${texture} spectrum. Its center of frequency is about ${Math.round(centroidHz)} Hz—compare that shape with another label.`;
}
