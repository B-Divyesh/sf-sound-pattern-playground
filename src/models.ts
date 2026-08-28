export interface FeatureMetrics {
  rms: number;
  centroidHz: number;
  brightness: number;
  dominantBand: number;
}

export interface FeatureBundle {
  waveform: number[];
  trail: number[][];
  mfcc: number[];
  vector: number[];
  metrics: FeatureMetrics;
}

export interface SoundSample extends FeatureBundle {
  id: string;
  label: string | null;
  predictedLabel: string | null;
  misclassified: boolean;
  createdAt: string;
  durationMs: number;
  mimeType: string;
  audio: Blob;
}

export interface Neighbor {
  sample: SoundSample;
  distance: number;
}

export interface Classification {
  label: string;
  neighbors: Neighbor[];
  votes: Map<string, number>;
}
