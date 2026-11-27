export function celebrate(element) {
  element.classList.remove("celebrate");
  requestAnimationFrame(() => element.classList.add("celebrate"));
}

export function shake(element) {
  element.classList.remove("shake");
  requestAnimationFrame(() => element.classList.add("shake"));
}
