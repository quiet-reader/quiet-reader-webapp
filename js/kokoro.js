// Main-thread audio playback + WebGPU worker bridge for experimental Kokoro TTS.
let worker = null;
let workerReady = null;
let nextRequestId = 1;
const pending = new Map();
let audioContext = null;
let activeSource = null;
let activeResolve = null;
let playbackPaused = false;

export const DEFAULT_KOKORO_VOICE = 'af_heart';

function getWorker(onProgress = () => {}) {
  if (worker) return Promise.resolve(worker);
  if (!workerReady) {
    workerReady = new Promise((resolve, reject) => {
      try {
        const instance = new Worker(new URL('./kokoro-worker.js', import.meta.url), { type: 'module' });
        worker = instance;
        instance.onmessage = event => {
          const message = event.data || {};
          if (message.type === 'status') { onProgress(message.message); return; }
          if (message.type === 'ready') { onProgress('Kokoro ready · WebGPU'); return; }
          const request = pending.get(message.id);
          if (!request) return;
          pending.delete(message.id);
          if (message.type === 'error') request.reject(new Error(message.message || 'Kokoro worker failed'));
          else if (message.type === 'loaded') request.resolve(instance);
          else if (message.type === 'audio') request.resolve({
            samples: new Float32Array(message.samples),
            sampleRate: message.sampleRate || 24000,
            inferenceMs: message.inferenceMs,
            audioSeconds: message.audioSeconds,
            realTimeFactor: message.realTimeFactor,
            backend: message.backend || 'webgpu'
          });
        };
        instance.onerror = event => {
          const error = new Error(event.message || 'Kokoro WebGPU worker stopped unexpectedly');
          for (const request of pending.values()) request.reject(error);
          pending.clear();
          worker = null;
          workerReady = null;
          reject(error);
        };
        resolve(instance);
      } catch (error) {
        workerReady = null;
        reject(error);
      }
    });
  }
  return workerReady;
}

function requestWorker(type, payload = {}, onProgress = () => {}) {
  return getWorker(onProgress).then(instance => new Promise((resolve, reject) => {
    const id = nextRequestId++;
    pending.set(id, { resolve, reject });
    instance.postMessage({ type, id, ...payload });
  }));
}

export async function loadKokoro(onProgress = () => {}) {
  await requestWorker('load', {}, onProgress);
  onProgress('Kokoro ready · WebGPU');
  return true;
}

export function kokoroVoices() { return []; }

export async function generateKokoro(text, { voice = DEFAULT_KOKORO_VOICE, onStatus = () => {} } = {}) {
  onStatus('Generating speech with WebGPU…');
  const audio = await requestWorker('generate', { text, voice }, onStatus);
  if (Number.isFinite(audio.inferenceMs) && Number.isFinite(audio.realTimeFactor)) {
    const rtf = audio.realTimeFactor;
    const result = `WebGPU · ${(audio.inferenceMs / 1000).toFixed(2)}s generated / ${audio.audioSeconds.toFixed(2)}s audio · RTF ${rtf.toFixed(2)}`;
    onStatus(result);
    console.info('[Quiet Reader TTS benchmark]', {
      backend: audio.backend,
      inferenceSeconds: audio.inferenceMs / 1000,
      audioSeconds: audio.audioSeconds,
      realTimeFactor: rtf
    });
  }
  return audio;
}

export async function playKokoroAudio(audio, { rate = 1, onStatus = () => {} } = {}) {
  const { samples, sampleRate } = audio || {};
  if (!samples?.length) throw new Error('Kokoro returned empty audio');
  stopKokoro();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser');
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended' && !playbackPaused) await audioContext.resume();
  const buffer = audioContext.createBuffer(1, samples.length, sampleRate || 24000);
  buffer.copyToChannel(samples, 0);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.max(0.65, Math.min(3, rate));
  source.connect(audioContext.destination);
  activeSource = source;
  onStatus('Speaking · Kokoro WebGPU');
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

export async function playKokoro(text, options = {}) {
  const audio = await generateKokoro(text, options);
  return playKokoroAudio(audio, options);
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
