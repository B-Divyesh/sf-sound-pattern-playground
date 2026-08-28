import './style.css';
import { drawMfcc, drawSpectrogram, drawTinyWaveform, drawWaveform, describeFeatures } from './charts';
import { clearSamples, clearSettings, getLabels, getSamples, removeSample, saveLabels, saveSample, saveSamples } from './db';
import { buildFeatures, classify, observationFor } from './features';
import type { Classification, SoundSample } from './models';

const DEFAULT_LABELS = ['Tap', 'Hum', 'Clap'];
const MAX_RECORDING_MS = 4000;

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

function escapeHtml(value: string): string {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

const state: {
  labels: string[];
  samples: SoundSample[];
  activeIndex: number;
  mysteryMode: boolean;
  selectedId: string | null;
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  animationFrame: number | null;
  startedAt: number;
  lastFrameAt: number;
  waveformFrames: number[][];
  spectrumFrames: number[][];
  chunks: Blob[];
  sampleRate: number;
} = {
  labels: [...DEFAULT_LABELS],
  samples: [],
  activeIndex: 0,
  mysteryMode: false,
  selectedId: null,
  recorder: null,
  stream: null,
  audioContext: null,
  animationFrame: null,
  startedAt: 0,
  lastFrameAt: 0,
  waveformFrames: [],
  spectrumFrames: [],
  chunks: [],
  sampleRate: 44100,
};

const audioUrls = new Map<string, string>();

const liveCanvas = element<HTMLCanvasElement>('live-canvas');
const recordButton = element<HTMLButtonElement>('record-button');
const stopButton = element<HTMLButtonElement>('stop-button');
const consentInput = element<HTMLInputElement>('mic-consent');
const monitor = element('monitor');
const recordState = element('record-state');
const timer = element('timer');
const statusMessage = element('status-message');

function setStatus(message: string, kind: 'plain' | 'error' | 'success' = 'plain'): void {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('is-error', kind === 'error');
  statusMessage.classList.toggle('is-success', kind === 'success');
}

function countFor(label: string): number {
  return state.samples.filter((sample) => sample.label === label).length;
}

function readyToClassify(): boolean {
  return state.labels.every((label) => countFor(label) > 0);
}

function validLabels(labels = state.labels): boolean {
  const clean = labels.map((label) => label.trim());
  return clean.every(Boolean) && new Set(clean.map((label) => label.toLocaleLowerCase())).size === 3;
}

function renderLabels(): void {
  state.labels.forEach((label, index) => {
    const input = element<HTMLInputElement>(`label-${index}`);
    if (document.activeElement !== input) input.value = label;
  });
  document.querySelectorAll<HTMLButtonElement>('.mode-tab[data-mode="label"]').forEach((button) => {
    const index = Number(button.dataset.index);
    const label = state.labels[index];
    const labelNode = button.querySelector('span');
    const countNode = button.querySelector('small');
    if (labelNode) labelNode.textContent = label;
    if (countNode) countNode.textContent = `${countFor(label)} ${countFor(label) === 1 ? 'clip' : 'clips'}`;
    const selected = !state.mysteryMode && state.activeIndex === index;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const mystery = document.querySelector<HTMLButtonElement>('.mystery-tab');
  if (mystery) {
    mystery.classList.toggle('is-active', state.mysteryMode);
    mystery.setAttribute('aria-pressed', String(state.mysteryMode));
  }
  element('capture-guidance').textContent = state.mysteryMode
    ? 'Record a new sound. The baseline will compare it with your labeled examples.'
    : `Record a 1–4 second example of “${state.labels[state.activeIndex]}.”`;
}

function renderProgress(): void {
  const progress = element('class-progress');
  progress.innerHTML = state.labels.map((label) => {
    const count = countFor(label);
    const bars = Array.from({ length: 3 }, (_, index) => `<i class="${index < count ? 'is-filled' : ''}"></i>`).join('');
    return `<div class="progress-row"><div class="progress-label"><b>${escapeHtml(label)}</b><span>${count} / 3 suggested</span></div><div class="progress-track" role="progressbar" aria-label="Suggested ${escapeHtml(label)} examples" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${Math.min(count, 3)}">${bars}</div></div>`;
  }).join('');
  const readiness = element('readiness');
  const ready = readyToClassify();
  readiness.classList.toggle('is-ready', ready);
  readiness.innerHTML = ready
    ? '<span aria-hidden="true">✓</span><p><b>Classifier is ready</b><br><small>Choose Test sound and challenge it.</small></p>'
    : '<span aria-hidden="true">○</span><p><b>Classifier is waiting</b><br><small>Record at least one example for every sound.</small></p>';
}

function sampleTitle(sample: SoundSample): string {
  if (sample.label) return sample.label;
  return sample.predictedLabel ? `Mystery → ${sample.predictedLabel}` : 'Mystery sound';
}

function renderSpecimens(): void {
  const list = element('specimen-list');
  const sorted = [...state.samples].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  element('sample-total').textContent = `${state.samples.length} ${state.samples.length === 1 ? 'recording' : 'recordings'} on this device`;
  if (sorted.length === 0) {
    list.innerHTML = '<div class="specimen-list-empty"><p>No recordings yet. Your locally stored clips will appear here.</p></div>';
    return;
  }
  list.innerHTML = sorted.map((sample) => {
    const date = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(sample.createdAt));
    return `<article class="specimen-item ${sample.id === state.selectedId ? 'is-selected' : ''}" data-id="${sample.id}">
      <canvas class="specimen-wave" width="56" height="38" aria-hidden="true"></canvas>
      <div class="specimen-info"><b>${escapeHtml(sampleTitle(sample))}</b><small>${(sample.durationMs / 1000).toFixed(1)} s · ${date}${sample.misclassified ? ' · Marked wrong' : ''}</small></div>
      <button class="button button-quiet select-specimen" type="button">Inspect</button>
      <button class="icon-button delete-specimen" type="button" aria-label="Delete ${escapeHtml(sampleTitle(sample))} recording"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>
    </article>`;
  }).join('');
  list.querySelectorAll<HTMLElement>('.specimen-item').forEach((item) => {
    const sample = state.samples.find((entry) => entry.id === item.dataset.id);
    const canvas = item.querySelector<HTMLCanvasElement>('canvas');
    if (sample && canvas) drawTinyWaveform(canvas, sample.waveform);
    item.querySelector('.select-specimen')?.addEventListener('click', () => sample && selectSample(sample.id, true));
    item.querySelector('.delete-specimen')?.addEventListener('click', () => sample && deleteOneSample(sample));
  });
}

function audioUrl(sample: SoundSample): string {
  const existing = audioUrls.get(sample.id);
  if (existing) return existing;
  const url = URL.createObjectURL(sample.audio);
  audioUrls.set(sample.id, url);
  return url;
}

function selectSample(id: string, scroll = false): void {
  const sample = state.samples.find((entry) => entry.id === id);
  if (!sample) return;
  state.selectedId = sample.id;
  const empty = element('empty-analysis');
  const workbench = element('feature-workbench');
  empty.hidden = true;
  workbench.hidden = false;
  element('selected-tag').textContent = sample.label ? 'Labeled example' : 'Test sound';
  element('selected-title').textContent = sampleTitle(sample);
  element('selected-meta').textContent = `${(sample.durationMs / 1000).toFixed(1)} seconds · stored only on this device`;
  element<HTMLAudioElement>('selected-audio').src = audioUrl(sample);
  element('analysis-summary').textContent = `Viewing the visible fingerprint of ${sampleTitle(sample)}.`;
  const descriptions = describeFeatures(sample);
  element('waveform-description').textContent = descriptions.waveform;
  element('spectrogram-description').textContent = descriptions.spectrogram;
  element('mfcc-description').textContent = descriptions.mfcc;
  element('observation').querySelector('p')!.textContent = observationFor(sample);
  requestAnimationFrame(() => {
    drawWaveform(element<HTMLCanvasElement>('waveform-canvas'), sample.waveform);
    drawSpectrogram(element<HTMLCanvasElement>('spectrogram-canvas'), sample.trail);
    drawMfcc(element<HTMLCanvasElement>('mfcc-canvas'), sample.mfcc);
  });
  renderClassifier(sample);
  renderSpecimens();
  if (scroll) element('analysis').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderClassifier(preferred?: SoundSample): void {
  const sample = preferred && !preferred.label
    ? preferred
    : [...state.samples].filter((entry) => !entry.label).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const empty = element('classifier-empty');
  const result = element('classifier-result');
  if (!sample || !readyToClassify()) {
    empty.hidden = false;
    result.hidden = true;
    return;
  }
  const classification = classify(sample.vector, state.samples.filter((entry) => Boolean(entry.label)));
  if (!classification) return;
  empty.hidden = true;
  result.hidden = false;
  updateClassificationView(sample, classification);
}

function updateClassificationView(sample: SoundSample, classification: Classification): void {
  element('guess-label').textContent = classification.label;
  const votes = classification.votes.get(classification.label) ?? 0;
  element('guess-explanation').textContent = `${votes} of ${classification.neighbors.length} nearest stored examples vote “${classification.label}.” A tie is settled by the closest example.`;
  const meter = element('vote-meter');
  meter.innerHTML = classification.neighbors.map((neighbor) => `<span class="${neighbor.sample.label === classification.label ? 'is-vote' : ''}" title="${escapeHtml(neighbor.sample.label ?? '')}"></span>`).join('');
  meter.setAttribute('aria-label', `${votes} of ${classification.neighbors.length} neighbor votes for ${classification.label}`);
  element('neighbor-list').innerHTML = classification.neighbors.map((neighbor, index) => `<div class="neighbor"><span class="neighbor-rank">0${index + 1}</span><div><b>${escapeHtml(neighbor.sample.label ?? '')}</b><small>${(neighbor.sample.durationMs / 1000).toFixed(1)} second stored example</small></div><span class="neighbor-distance">${neighbor.distance.toFixed(3)}</span></div>`).join('');
  const markButton = element<HTMLButtonElement>('mark-misclassification');
  markButton.textContent = sample.misclassified ? 'Remove misclassification mark' : 'Mark as a misclassification';
  markButton.dataset.sampleId = sample.id;
  element('misclassification-note').textContent = sample.misclassified ? 'Marked. Finding wrong guesses is part of the experiment.' : '';
}

function renderAll(): void {
  renderLabels();
  renderProgress();
  renderSpecimens();
  renderClassifier(state.selectedId ? state.samples.find((sample) => sample.id === state.selectedId) : undefined);
}

async function saveLabelChanges(): Promise<void> {
  const next = [0, 1, 2].map((index) => element<HTMLInputElement>(`label-${index}`).value.trim());
  const error = element('labels-error');
  if (!validLabels(next)) {
    error.textContent = 'Use three different, non-empty sound names.';
    return;
  }
  error.textContent = '';
  const previous = [...state.labels];
  state.labels = next;
  const changedSamples: SoundSample[] = [];
  state.samples.forEach((sample) => {
    const index = sample.label ? previous.indexOf(sample.label) : -1;
    if (index >= 0 && sample.label !== next[index]) {
      sample.label = next[index];
      changedSamples.push(sample);
    }
  });
  try {
    await Promise.all([saveLabels(next), changedSamples.length ? saveSamples(changedSamples) : Promise.resolve()]);
    setStatus('Label names saved on this device.', 'success');
  } catch {
    setStatus('The browser could not save those label names. Check private-storage settings.', 'error');
  }
  renderAll();
}

function selectMode(button: HTMLButtonElement): void {
  state.mysteryMode = button.dataset.mode === 'mystery';
  if (!state.mysteryMode) state.activeIndex = Number(button.dataset.index);
  renderLabels();
  if (state.mysteryMode && !readyToClassify()) setStatus('Collect at least one clip for every sound before testing.', 'error');
  else setStatus(state.mysteryMode ? 'Test mode selected. Your next clip will be classified.' : `Ready to collect “${state.labels[state.activeIndex]}.”`);
}

function formatTimer(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `00:${seconds.toFixed(1).padStart(4, '0')}`;
}

function supportedMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

async function startRecording(): Promise<void> {
  if (!consentInput.checked) {
    setStatus('Check the consent box before requesting microphone access.', 'error');
    consentInput.focus();
    return;
  }
  if (state.mysteryMode && !readyToClassify()) {
    setStatus('Record at least one example for each of your three sounds first.', 'error');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    setStatus('This browser cannot record audio. Try a current version of Chrome, Edge, Firefox, or Safari.', 'error');
    return;
  }
  recordButton.disabled = true;
  setStatus('Waiting for microphone permission…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const audioContext = new AudioContext();
    await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.18;
    source.connect(analyser);
    const mimeType = supportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.stream = stream;
    state.audioContext = audioContext;
    state.sampleRate = audioContext.sampleRate;
    state.recorder = recorder;
    state.waveformFrames = [];
    state.spectrumFrames = [];
    state.chunks = [];
    state.startedAt = performance.now();
    state.lastFrameAt = 0;
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size > 0) state.chunks.push(event.data); });
    recorder.addEventListener('stop', () => void finishRecording(recorder.mimeType || mimeType));
    recorder.start(100);
    monitor.classList.add('is-recording');
    recordState.textContent = state.mysteryMode ? 'Listening for a test sound' : `Listening for ${state.labels[state.activeIndex]}`;
    stopButton.disabled = false;
    setStatus('Listening now. Make one clear sound, then stop.');
    const timeData = new Uint8Array(analyser.fftSize);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const draw = (now: number): void => {
      if (state.recorder !== recorder || recorder.state !== 'recording') return;
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);
      const wave = Array.from(timeData, (value) => (value - 128) / 128);
      drawWaveform(liveCanvas, wave, true);
      const elapsed = now - state.startedAt;
      timer.textContent = formatTimer(elapsed);
      element('live-description').textContent = `Live microphone waveform at ${(Math.min(elapsed, MAX_RECORDING_MS) / 1000).toFixed(1)} seconds.`;
      if (now - state.lastFrameAt > 65) {
        state.waveformFrames.push(wave);
        state.spectrumFrames.push(Array.from(frequencyData, (value) => value / 255));
        state.lastFrameAt = now;
      }
      if (elapsed >= MAX_RECORDING_MS) stopRecording();
      else state.animationFrame = requestAnimationFrame(draw);
    };
    state.animationFrame = requestAnimationFrame(draw);
  } catch (error) {
    recordButton.disabled = false;
    const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    setStatus(denied ? 'Microphone access was not allowed. Use the browser’s site controls to allow it, then try again.' : 'The microphone could not start. Check that another app is not using it, then try again.', 'error');
  }
}

function stopRecording(): void {
  const recorder = state.recorder;
  if (!recorder || recorder.state !== 'recording') return;
  recorder.stop();
  stopButton.disabled = true;
  if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
}

async function finishRecording(mimeType: string): Promise<void> {
  const durationMs = Math.min(MAX_RECORDING_MS, performance.now() - state.startedAt);
  const stream = state.stream;
  const context = state.audioContext;
  state.stream = null;
  state.audioContext = null;
  state.recorder = null;
  stream?.getTracks().forEach((track) => track.stop());
  await context?.close().catch(() => undefined);
  monitor.classList.remove('is-recording');
  recordState.textContent = 'Processing visible features';
  recordButton.disabled = false;
  timer.textContent = formatTimer(durationMs);
  if (durationMs < 300 || state.chunks.length === 0) {
    recordState.textContent = 'Ready to listen';
    setStatus('That clip was too short. Listen for at least half a second and try again.', 'error');
    drawWaveform(liveCanvas, Array.from({ length: 100 }, () => 0), true);
    return;
  }
  const audio = new Blob(state.chunks, { type: mimeType || 'audio/webm' });
  const features = buildFeatures(state.waveformFrames, state.spectrumFrames, state.sampleRate);
  const label = state.mysteryMode ? null : state.labels[state.activeIndex];
  const classification = label ? null : classify(features.vector, state.samples.filter((sample) => Boolean(sample.label)));
  const sample: SoundSample = {
    ...features,
    id: crypto.randomUUID(),
    label,
    predictedLabel: classification?.label ?? null,
    misclassified: false,
    createdAt: new Date().toISOString(),
    durationMs,
    mimeType: audio.type,
    audio,
  };
  try {
    await saveSample(sample);
    state.samples.push(sample);
    state.selectedId = sample.id;
    recordState.textContent = 'Saved on this device';
    setStatus(label ? `Saved a “${label}” example on this device.` : `Test complete. The baseline guessed “${classification?.label ?? 'unknown'}.”`, 'success');
    renderAll();
    selectSample(sample.id, true);
  } catch {
    recordState.textContent = 'Could not save';
    setStatus('The browser could not store this clip. Free some site storage or leave private browsing, then try again.', 'error');
  }
}

async function deleteOneSample(sample: SoundSample): Promise<void> {
  const confirmed = window.confirm(`Delete the ${sampleTitle(sample)} recording from this device? This cannot be undone.`);
  if (!confirmed) return;
  try {
    await removeSample(sample.id);
    state.samples = state.samples.filter((entry) => entry.id !== sample.id);
    const url = audioUrls.get(sample.id);
    if (url) URL.revokeObjectURL(url);
    audioUrls.delete(sample.id);
    if (state.selectedId === sample.id) {
      state.selectedId = null;
      element('feature-workbench').hidden = true;
      element('empty-analysis').hidden = false;
      element('analysis-summary').textContent = 'Record or select a specimen to see the evidence the baseline compares.';
    }
    setStatus('Recording deleted from this device.', 'success');
    renderAll();
  } catch {
    setStatus('That recording could not be deleted. Reload and try again.', 'error');
  }
}

function downloadFile(contents: Blob, filename: string): void {
  const url = URL.createObjectURL(contents);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'audio/webm';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

async function exportJson(): Promise<void> {
  if (state.samples.length === 0) {
    setStatus('Record at least one sound before exporting a dataset.', 'error');
    return;
  }
  setStatus('Preparing recordings for export…');
  const samples = await Promise.all(state.samples.map(async ({ audio, ...sample }) => ({ ...sample, audioData: await blobToDataUrl(audio) })));
  const payload = { schemaVersion: 1, product: 'sound-pattern-playground', exportedAt: new Date().toISOString(), labels: state.labels, samples };
  downloadFile(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `sound-pattern-dataset-${new Date().toISOString().slice(0, 10)}.json`);
  setStatus(`Exported ${state.samples.length} recordings with their features.`, 'success');
}

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv(): void {
  if (state.samples.length === 0) {
    setStatus('Record at least one sound before exporting features.', 'error');
    return;
  }
  const headings = ['id', 'label', 'predicted_label', 'marked_misclassification', 'duration_ms', 'rms', 'centroid_hz', 'brightness', ...Array.from({ length: 8 }, (_, index) => `mfcc_${index + 1}`), ...Array.from({ length: 13 }, (_, index) => `feature_${index + 1}`)];
  const rows = state.samples.map((sample) => [sample.id, sample.label ?? '', sample.predictedLabel ?? '', sample.misclassified, Math.round(sample.durationMs), sample.metrics.rms, sample.metrics.centroidHz, sample.metrics.brightness, ...sample.mfcc, ...sample.vector].map(csvCell).join(','));
  downloadFile(new Blob([[headings.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }), `sound-pattern-features-${new Date().toISOString().slice(0, 10)}.csv`);
  setStatus(`Exported visible features for ${state.samples.length} recordings.`, 'success');
}

interface ImportedPayload {
  schemaVersion: number;
  labels: string[];
  samples: Array<Omit<SoundSample, 'audio'> & { audioData: string }>;
}

function isImportedPayload(value: unknown): value is ImportedPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ImportedPayload>;
  return payload.schemaVersion === 1 && Array.isArray(payload.labels) && payload.labels.length === 3 && Array.isArray(payload.samples)
    && payload.samples.every((sample) => typeof sample?.id === 'string' && typeof sample?.audioData === 'string' && Array.isArray(sample?.vector));
}

async function importJson(file: File): Promise<void> {
  if (file.size > 50 * 1024 * 1024) {
    setStatus('That dataset is over 50 MB. Import a smaller playground export.', 'error');
    return;
  }
  try {
    const payload: unknown = JSON.parse(await file.text());
    if (!isImportedPayload(payload) || !validLabels(payload.labels)) throw new Error('Invalid schema');
    const confirmed = window.confirm(`Import ${payload.samples.length} recordings? They will merge with this collection; matching recording IDs will be replaced.`);
    if (!confirmed) return;
    const imported = payload.samples.map(({ audioData, ...sample }) => ({ ...sample, audio: dataUrlToBlob(audioData) })) as SoundSample[];
    await Promise.all([saveSamples(imported), saveLabels(payload.labels)]);
    const merged = new Map(state.samples.map((sample) => [sample.id, sample]));
    imported.forEach((sample) => merged.set(sample.id, sample));
    state.samples = [...merged.values()];
    state.labels = payload.labels.map((label) => label.trim());
    setStatus(`Imported ${imported.length} recordings and merged them with this collection.`, 'success');
    renderAll();
  } catch {
    setStatus('That file is not a valid Sound Pattern Playground dataset.', 'error');
  }
}

async function eraseEverything(): Promise<void> {
  try {
    await Promise.all([clearSamples(), clearSettings()]);
    audioUrls.forEach((url) => URL.revokeObjectURL(url));
    audioUrls.clear();
    state.samples = [];
    state.labels = [...DEFAULT_LABELS];
    state.selectedId = null;
    state.activeIndex = 0;
    state.mysteryMode = false;
    element('feature-workbench').hidden = true;
    element('empty-analysis').hidden = false;
    element('analysis-summary').textContent = 'Record or select a specimen to see the evidence the baseline compares.';
    setStatus('All playground data was erased from this device.', 'success');
    renderAll();
  } catch {
    setStatus('The browser could not erase the local data. Reload and try again.', 'error');
  }
}

function setupEvents(): void {
  [0, 1, 2].forEach((index) => element<HTMLInputElement>(`label-${index}`).addEventListener('change', () => void saveLabelChanges()));
  document.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((button) => button.addEventListener('click', () => selectMode(button)));
  recordButton.addEventListener('click', () => void startRecording());
  stopButton.addEventListener('click', stopRecording);
  element<HTMLButtonElement>('choose-mystery').addEventListener('click', () => {
    const button = document.querySelector<HTMLButtonElement>('.mystery-tab');
    if (button) selectMode(button);
    element('capture-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  element<HTMLButtonElement>('mark-misclassification').addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const sample = state.samples.find((entry) => entry.id === button.dataset.sampleId);
    if (!sample) return;
    sample.misclassified = !sample.misclassified;
    await saveSample(sample);
    renderClassifier(sample);
    renderSpecimens();
  });
  element<HTMLButtonElement>('export-json').addEventListener('click', () => void exportJson());
  element<HTMLButtonElement>('export-csv').addEventListener('click', exportCsv);
  element<HTMLInputElement>('import-json').addEventListener('change', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importJson(file);
    input.value = '';
  });
  const dialog = element<HTMLDialogElement>('erase-dialog');
  element<HTMLButtonElement>('erase-all').addEventListener('click', () => dialog.showModal());
  element<HTMLButtonElement>('confirm-erase').addEventListener('click', () => void eraseEverything());
  window.addEventListener('resize', () => {
    const sample = state.samples.find((entry) => entry.id === state.selectedId);
    if (sample) selectSample(sample.id);
  });
  window.addEventListener('beforeunload', () => {
    state.stream?.getTracks().forEach((track) => track.stop());
    audioUrls.forEach((url) => URL.revokeObjectURL(url));
  });
}

function updateNetworkStatus(): void {
  const status = element('network-status');
  const offline = !navigator.onLine;
  status.textContent = offline ? 'Offline · local' : 'On device';
  status.classList.toggle('is-offline', offline);
}

function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    element('update-toast').hidden = false;
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {
    setStatus('Offline setup did not complete, but the playground still works while connected.', 'error');
  }));
  element<HTMLButtonElement>('reload-app').addEventListener('click', () => window.location.reload());
}

async function initialize(): Promise<void> {
  drawWaveform(liveCanvas, Array.from({ length: 160 }, () => 0), true);
  setupEvents();
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  setupServiceWorker();
  try {
    const [labels, samples] = await Promise.all([getLabels(), getSamples()]);
    if (labels && validLabels(labels)) state.labels = labels;
    state.samples = samples;
    renderAll();
    if (samples.length > 0) {
      const latest = [...samples].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
      selectSample(latest.id);
      setStatus(`Restored ${samples.length} local ${samples.length === 1 ? 'recording' : 'recordings'}.`, 'success');
    }
  } catch {
    renderAll();
    setStatus('Local storage is unavailable. Leave private browsing or allow site data before recording.', 'error');
  }
}

void initialize();
