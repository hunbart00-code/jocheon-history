// =============================================================
//  전체 화면 — 첫 화면·게임 화면의 버튼, ‘게임 시작’을 누를 때 자동으로 켜기
//  아이폰은 웹 페이지 전체 화면을 지원하지 않아서 ‘홈 화면에 추가’로 안내해요.
// =============================================================
const de = document.documentElement;
export const fsSupported = () => !!(de.requestFullscreen || de.webkitRequestFullscreen);
export const isStandalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
export const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || isStandalone();
export const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function enterFull() {
  if (!fsSupported() || isFull()) return false;
  try {
    if (de.requestFullscreen) await de.requestFullscreen({ navigationUI: 'hide' });
    else de.webkitRequestFullscreen();
  } catch (e) { return false; }
  try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* 크롬북·PC는 가로 고정이 없어요 */ }
  return true;
}
export function exitFull() {
  const f = document.exitFullscreen || document.webkitExitFullscreen;
  try { const r = f?.call(document); r?.catch?.(() => {}); } catch (e) {}
}
export function toggleFull() { if (document.fullscreenElement || document.webkitFullscreenElement) exitFull(); else return enterFull(); }
export function onFullChange(cb) {
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
}
