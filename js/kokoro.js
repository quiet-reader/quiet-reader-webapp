// Kokoro browser-local TTS. Model files are downloaded from Hugging Face
// on first use and cached by Transformers.js in the browser Cache API.
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const MODULE_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
let enginePromise = null;
let engine = null;
let audioContext = null;
let activeSource = null;
let activeResolve = null;
let playbackPaused = false;

export const DEFAULT_KOKORO_VOICE = 'af_heart';

export async function loadKokoro(onProgress = () => {}) {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = (async () => {
      if ('serviceWorker' in navigator && location.protocol !== 'file:') await navigator.serviceWorker.ready.catch(() => {});
      onProgress('Loading Kokoro runtime…');
      const { KokoroTTS } = await import(MODULE_URL);
      onProgress('Downloading / loading Kokoro model (about 90 MB)…');
      const model = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (progress) => {
          if (progress?.status === 'progress') {
            const pct = progress.total ? Math.round(progress.loaded / progress.total * 100) : null;
            onProgress(pct == null ? 'Downloading model…' : 'Downloading model… ' + pct + '%');
          } else if (progress?.status === 'done') {
            onProgress('Model file ready…');
          }
        }
      });
      engine = model;
      onProgress('Kokoro ready · cached on this device');
      return engine;
    })().catch(error => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

export function kokoroVoices() {
  if (!engine) return [];
  const voices = engine.list_voices();
  return Array.isArray(voices) ? voices : [];
}

export async function playKokoro(text, { voice = DEFAULT_KOKORO_VOICE, rate = 1, onStatus = () => {} } = {}) {
  const tts = await loadKokoro(onStatus);
  stopKokoro();
  onStatus('Generating speech…');
  const result = await tts.generate(text, { voice });
  const samples = result.audio;
  const sampleRate = result.sampling_rate || 24000;
  if (!samples || !samples.length) throw new Error('Kokoro returned empty audio');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser');
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended' && !playbackPaused) await audioContext.resume();
  const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.max(0.65, Math.min(3, rate));
  source.connect(audioContext.destination);
  activeSource = source;
  onStatus('Speaking · Kokoro local');
  return new Promise((resolve, reject) => {
    activeResolve = resolve;
    source.onended = () => {
      if (activeSource === source) {
        activeSource = null;
        activeResolve = null;
        resolve();
      }
    };
    try { source.start(); } catch (error) {
      activeSource = null;
      activeResolve = null;
      reject(error);
    }
  });
}

export function pauseKokoro() {
  playbackPaused = true;
  if (audioContext?.state === 'running') audioContext.suspend();
}
export function resumeKokoro() {
  playbackPaused = false;
  if (audioContext?.state === 'suspended') audioContext.resume();
}
export function stopKokoro() {
  playbackPaused = false;
  if (activeSource) {
    const source = activeSource;
    activeSource = null;
    source.onended = null;
    try { source.stop(); } catch {}
    activeResolve?.();
    activeResolve = null;
  }
}
