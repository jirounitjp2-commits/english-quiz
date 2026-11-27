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
  // ドミソドの明るい上昇メロディ＋キラキラ＋最後の和音
  clear: [
    { frequency: 523, start: 0, duration: 0.16 },
    { frequency: 659, start: 0.14, duration: 0.16 },
    { frequency: 784, start: 0.28, duration: 0.16 },
    { frequency: 1047, start: 0.42, duration: 0.2 },
    { frequency: 784, start: 0.62, duration: 0.12 },
    { frequency: 1047, start: 0.74, duration: 0.5, volume: 0.2 },
    { frequency: 1319, start: 0.74, duration: 0.5, volume: 0.16 },
    { frequency: 1568, start: 0.74, duration: 0.5, volume: 0.12 },
    { frequency: 2093, start: 1.0, duration: 0.12, volume: 0.1 },
    { frequency: 2637, start: 1.1, duration: 0.2, volume: 0.08 },
  ],
  // 全問正解：さらに長くてにぎやかなファンファーレ
  perfect: [
    { frequency: 523, start: 0, duration: 0.12 },
    { frequency: 659, start: 0.1, duration: 0.12 },
    { frequency: 784, start: 0.2, duration: 0.12 },
    { frequency: 1047, start: 0.3, duration: 0.12 },
    { frequency: 1319, start: 0.4, duration: 0.12 },
    { frequency: 1568, start: 0.5, duration: 0.2 },
    { frequency: 1319, start: 0.72, duration: 0.12 },
    { frequency: 1568, start: 0.84, duration: 0.12 },
    { frequency: 2093, start: 0.96, duration: 0.7, volume: 0.2 },
    { frequency: 1047, start: 0.96, duration: 0.7, volume: 0.15 },
    { frequency: 1319, start: 0.96, duration: 0.7, volume: 0.12 },
    { frequency: 2637, start: 1.3, duration: 0.15, volume: 0.1 },
    { frequency: 3136, start: 1.42, duration: 0.15, volume: 0.08 },
    { frequency: 4186, start: 1.54, duration: 0.3, volume: 0.06 },
  ],
};

export function playEffect(name) {
  const audio = getContext();
  if (!audio) return false;
  unlockAudio();
  SOUNDS[name]?.forEach((note) => tone(audio, note));
  return true;
}
