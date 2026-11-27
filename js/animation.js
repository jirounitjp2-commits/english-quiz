export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 非対応・ブロック時は何もしない
  }
}

export function celebrate(element) {
  element.classList.remove("celebrate");
  requestAnimationFrame(() => element.classList.add("celebrate"));
}

export function shake(element) {
  element.classList.remove("shake");
  requestAnimationFrame(() => element.classList.add("shake"));
}
