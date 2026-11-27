let context = null;

function getContext() {
  if (context) return context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  // iOS Safari 16.4+: マナーモード中でも再生音を鳴らす
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {
    // 非対応なら無視
  }
  context = new AudioContextClass();
  return context;
}

// タップ操作の中で呼び出して、音を出せる状態にする
export function unlockAudio() {
  const audio = getContext();
  if (audio && audio.state === "suspended") audio.resume().catch(() => {});
}

function tone(audio, { frequency, start, duration, type = "sine", volume = 0.25 }) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const begin = audio.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(volume, begin + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, begin + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(begin);
  oscillator.stop(begin + duration + 0.05);
}

const SOUNDS = {
  correct: [
    { frequency: 784, start: 0, duration: 0.14 },
    { frequency: 1047, start: 0.12, duration: 0.28 },
  ],
  wrong: [
    { frequency: 330, start: 0, duration: 0.16, type: "triangle" },
    { frequency: 262, start: 0.14, duration: 0.26, type: "triangle" },
  ],
  clear: [
    { frequency: 523, start: 0, duration: 0.14 },
    { frequency: 659, start: 0.13, duration: 0.14 },
    { frequency: 784, start: 0.26, duration: 0.14 },
    { frequency: 1047, start: 0.39, duration: 0.4 },
  ],
};

export function playEffect(name) {
  const audio = getContext();
  if (!audio) return false;
  unlockAudio();
  SOUNDS[name]?.forEach((note) => tone(audio, note));
  return true;
}
