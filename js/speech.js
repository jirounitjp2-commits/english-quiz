function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang.startsWith(lang.slice(0, 2)));
}

let activeUtterance = null;
let unlocked = false;

// iOS などは、ユーザーのタップ内で一度しゃべらせないと以降の音声が出ない
export function unlockSpeech() {
  if (unlocked || !("speechSynthesis" in window)) return;
  unlocked = true;
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
}

export function speak(text, { lang = "en-US", rate = 0.85, onError } = {}) {
  if (!("speechSynthesis" in window)) {
    throw new Error("このブラウザーは音声読み上げに対応していません。");
  }
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.volume = 1;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.onerror = (event) => {
    if (event.error === "canceled" || event.error === "interrupted") return;
    onError?.(event.error);
  };
  // 参照を保持しないと、一部のブラウザーで再生前に破棄される
  activeUtterance = utterance;

  const start = () => {
    synth.resume();
    synth.speak(utterance);
  };
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // Android Chrome では cancel 直後の speak が無視されることがある
    setTimeout(start, 120);
  } else {
    start();
  }
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
