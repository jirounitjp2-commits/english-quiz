function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang.startsWith(lang.slice(0, 2)));
}

let activeUtterance = null;
let unlocked = false;

// iOS などは、ユーザーのタップ内で一度しゃべらせないと以降の音声が出ない
export function unlockSpeech() {
  // iOS は録音済み音声を使うので、無音の読み上げで音声系統を占有しない
  if (unlocked || !("speechSynthesis" in window) || /iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
  unlocked = true;
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
}

let wordAudio = null;

// 単語は録音済みの音声ファイルを再生する（iPhone では Web Speech が不安定なため）
function playRecorded(text, onFallback) {
  if (!/^[a-z]+$/i.test(text)) return false;
  try {
    wordAudio?.pause();
    const audio = new Audio(`./audio/words/${text.toLowerCase()}.mp3`);
    wordAudio = audio;
    audio.volume = 1;
    audio.addEventListener("error", onFallback, { once: true });
    const promise = audio.play();
    promise?.catch((error) => {
      if (error?.name !== "AbortError") onFallback();
    });
    return true;
  } catch {
    return false;
  }
}

export function speak(text, options = {}) {
  const fallback = () => speakWithSynth(text, options);
  if (playRecorded(text, fallback)) return;
  fallback();
}

function speakWithSynth(text, { lang = "en-US", rate = 0.85, onError } = {}) {
  if (!("speechSynthesis" in window)) {
    onError?.("not-supported");
    return;
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
  const needsDelay = /Android/i.test(navigator.userAgent);
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // Android Chrome は cancel 直後の speak が無視される。iOS は遅らせるとタップ操作扱いでなくなり無音になる
    if (needsDelay) setTimeout(start, 120);
    else start();
  } else {
    start();
  }
}

export function stopSpeaking() {
  wordAudio?.pause();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
