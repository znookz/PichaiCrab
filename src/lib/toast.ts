const TOAST_MS = 2600;
let timer: number | undefined;

export function say(message: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(timer);
  timer = window.setTimeout(() => (el.hidden = true), TOAST_MS);
}
