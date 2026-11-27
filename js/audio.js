// =============================================================
//  효과음 & 배경음 (WebAudio로 직접 합성 — 음원 파일 없음)
// =============================================================
let ctx = null, master = null, bgmTimer = null, bgmOn = false, sfxOn = true;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); }
    catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function tone(freq, t0, dur, type = 'square', vol = 0.12, slide = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + t0 + dur);
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
  o.connect(g); g.connect(master); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
}
const SFX = {
  click: () => tone(660, 0, 0.06, 'square', 0.05),
  coin: () => { tone(988, 0, 0.08, 'square', 0.08); tone(1319, 0.07, 0.18, 'square', 0.08); },
  correct: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.16, 'square', 0.07)); },
  wrong: () => { tone(220, 0, 0.25, 'sawtooth', 0.08, -80); tone(165, 0.12, 0.3, 'sawtooth', 0.06, -40); },
  build: () => { tone(330, 0, 0.08, 'triangle', 0.15); tone(262, 0.09, 0.08, 'triangle', 0.15); tone(392, 0.2, 0.2, 'square', 0.07); },
  levelup: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.22, 'square', 0.07)); },
  fever: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.05, 0.12, 'square', 0.06)); },
  gacha: () => { for (let i = 0; i < 8; i++) tone(400 + i * 90, i * 0.06, 0.07, 'square', 0.05); },
  rare: () => { [659, 831, 988, 1319, 1661].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.12)); },
  fanfare: () => { [[523, 0], [523, 0.15], [523, 0.3], [659, 0.45], [784, 0.75], [659, 1.0], [784, 1.15], [1047, 1.35]].forEach(([f, t]) => tone(f, t, 0.3, 'square', 0.08)); },
  alarm: () => { tone(880, 0, 0.12, 'square', 0.07); tone(660, 0.15, 0.12, 'square', 0.07); tone(880, 0.3, 0.12, 'square', 0.07); },
  tick: () => tone(1200, 0, 0.03, 'square', 0.03),
};
export function sfx(name) { if (sfxOn) try { SFX[name]?.(); } catch (e) { /* 무시 */ } }
export function setSfx(on) { sfxOn = on; }

// 국악 느낌의 5음계 배경음 (가야금 뜯는 소리 흉내)
const PENTA = [293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
const SONG = [0, 2, 3, 4, 3, 2, 0, -1, 1, 2, 4, 5, 4, 2, 1, -1, 3, 4, 5, 6, 5, 4, 2, -1, 2, 1, 0, 1, 2, 0, -1, -1];
function pluck(freq, t0) { tone(freq, t0, 0.9, 'triangle', 0.06); tone(freq * 2, t0, 0.25, 'sine', 0.015); }
export function setBgm(on) {
  bgmOn = on;
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  if (!on || !ac()) return;
  let step = 0;
  bgmTimer = setInterval(() => {
    if (!bgmOn) return;
    const n = SONG[step % SONG.length];
    if (n >= 0) pluck(PENTA[n], 0);
    if (step % 4 === 0) tone(PENTA[0] / 2, 0, 0.6, 'sine', 0.05);
    step++;
  }, 380);
}
export function unlockAudio() { ac(); }
