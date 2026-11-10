// Run Kokoro inference off the UI thread so reading controls remain responsive.
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const MODULE_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
let enginePromise = null;
let engine = null;
let queue = Promise.resolve();

function send(message, transfer = []) {
  self.postMessage(message, transfer);
}

async function loadModel() {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = (async () => {
      send({ type: 'status', message: 'Loading Kokoro runtime…' });
      const { KokoroTTS } = await import(MODULE_URL);
      send({ type: 'status', message: 'Downloading / loading Kokoro model (about 90 MB)…' });
      engine = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progress => {
          if (progress?.status === 'progress') {
            const pct = progress.total ? Math.round(progress.loaded / progress.total * 100) : null;
            send({ type: 'status', message: pct == null ? 'Downloading model…' : 'Downloading model… ' + pct + '%' });
          } else if (progress?.status === 'done') {
            send({ type: 'status', message: 'Model file ready…' });
          }
        }
      });
      send({ type: 'ready' });
      return engine;
    })().catch(error => {
      enginePromise = null;
      engine = null;
      throw error;
    });
  }
  return enginePromise;
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'load') {
    queue = queue.then(() => loadModel()).then(
      () => send({ type: 'loaded', id: message.id }),
      error => send({ type: 'error', id: message.id, message: error?.message || String(error) })
    );
    return;
  }
  if (message.type !== 'generate') return;
  queue = queue.then(async () => {
    const tts = await loadModel();
    const started = performance.now();
    const result = await tts.generate(message.text, { voice: message.voice });
    const inferenceMs = performance.now() - started;
    const samples = result.audio;
    if (!samples?.length) throw new Error('Kokoro returned empty audio');
    const sampleRate = result.sampling_rate || 24000;
    const audioSeconds = samples.length / sampleRate;
    const realTimeFactor = audioSeconds > 0 ? inferenceMs / 1000 / audioSeconds : null;
    // Copy to a transferable buffer; don't clone a large PCM array across threads.
    const transferable = new Float32Array(samples);
    send({ type: 'audio', id: message.id, samples: transferable.buffer, sampleRate, inferenceMs, audioSeconds, realTimeFactor, backend: 'wasm' }, [transferable.buffer]);
  }).catch(error => {
    send({ type: 'error', id: message.id, message: error?.message || String(error) });
  });
};
