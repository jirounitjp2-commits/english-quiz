export function speak(text, { lang = "en-US", rate = 0.85 } = {}) {
  if (!("speechSynthesis" in window)) {
    throw new Error("このブラウザーは音声読み上げに対応していません。");
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
