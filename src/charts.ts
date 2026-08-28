import type { FeatureBundle } from './models';

function contextFor(canvas: HTMLCanvasElement): { context: CanvasRenderingContext2D; width: number; height: number } | null {
  const width = Math.max(280, Math.round(canvas.getBoundingClientRect().width || canvas.width));
  const height = Math.max(100, Math.round(canvas.getBoundingClientRect().height || canvas.height));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(ratio, ratio);
  return { context, width, height };
}

function background(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = '#071311';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(184,199,189,.09)';
  context.lineWidth = 1;
  for (let index = 1; index < 4; index += 1) {
    context.beginPath();
    context.moveTo(0, (height * index) / 4 + 0.5);
    context.lineTo(width, (height * index) / 4 + 0.5);
    context.stroke();
  }
}

export function drawWaveform(canvas: HTMLCanvasElement, values: number[], live = false): void {
  const prepared = contextFor(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  background(context, width, height);
  context.strokeStyle = live ? '#ff746c' : '#73e6d2';
  context.lineWidth = live ? 2 : 1.7;
  context.beginPath();
  values.forEach((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height / 2 + value * height * 0.42;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.stroke();
}

export function drawSpectrogram(canvas: HTMLCanvasElement, trail: number[][]): void {
  const prepared = contextFor(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  background(context, width, height);
  if (trail.length === 0) return;
  const cellWidth = width / trail.length;
  const bandHeight = height / trail[0].length;
  trail.forEach((frame, xIndex) => {
    frame.forEach((value, yIndex) => {
      const intensity = Math.max(0, Math.min(1, value));
      const hue = 164 - intensity * 24;
      context.fillStyle = `hsla(${hue}, 68%, ${25 + intensity * 49}%, ${0.08 + intensity * 0.92})`;
      context.fillRect(xIndex * cellWidth, height - (yIndex + 1) * bandHeight, Math.ceil(cellWidth + 0.5), Math.ceil(bandHeight + 0.5));
    });
  });
  context.fillStyle = '#b8c7bd';
  context.font = '10px system-ui';
  context.fillText('high', 8, 14);
  context.fillText('low', 8, height - 8);
}

export function drawMfcc(canvas: HTMLCanvasElement, coefficients: number[]): void {
  const prepared = contextFor(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  background(context, width, height);
  const gap = 8;
  const barWidth = (width - gap * (coefficients.length + 1)) / coefficients.length;
  const middle = height / 2;
  context.strokeStyle = 'rgba(184,199,189,.24)';
  context.beginPath(); context.moveTo(0, middle); context.lineTo(width, middle); context.stroke();
  coefficients.forEach((value, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = Math.abs(value) * (height * 0.39);
    context.fillStyle = value >= 0 ? '#f2bd65' : '#73e6d2';
    context.fillRect(x, value >= 0 ? middle - barHeight : middle, barWidth, barHeight);
    context.fillStyle = '#849a92';
    context.font = '10px system-ui';
    context.fillText(String(index + 1), x + barWidth / 2 - 3, height - 8);
  });
}

export function drawTinyWaveform(canvas: HTMLCanvasElement, values: number[]): void {
  drawWaveform(canvas, values.filter((_, index) => index % 5 === 0));
}

export function describeFeatures(features: FeatureBundle): { waveform: string; spectrogram: string; mfcc: string } {
  const peaks = features.waveform.filter((value) => Math.abs(value) > 0.35).length;
  const waveform = `The waveform has ${peaks > 25 ? 'many' : peaks > 8 ? 'several' : 'few'} strong peaks and an RMS energy of ${features.metrics.rms.toFixed(3)}.`;
  const spectrogram = `${Math.round(features.metrics.brightness * 100)}% of measured spectral energy is above 2 kHz; the frequency center is ${Math.round(features.metrics.centroidHz)} Hz.`;
  const signs = features.mfcc.map((value) => value >= 0 ? 'positive' : 'negative').join(', ');
  const mfcc = `Eight illustrative cosine coefficients: ${signs}. Compare the bar shape, not any one bar alone.`;
  return { waveform, spectrogram, mfcc };
}
