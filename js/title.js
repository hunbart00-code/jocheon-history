// =============================================================
//  첫 화면 — 밤하늘에 떠 있는 ‘시대의 섬’
//  섬 왼쪽(선사)에서 오른쪽(외계)으로 시대가 흘러요. 길을 걷는 주민은 걸어가며 옷이 바뀌고
//  마지막엔 별의 문으로 들어가요. 그림은 게임 안 건물·주민 그림을 밤 색으로 물들여 써요.
// =============================================================
import * as S from './sprites.js?v=202611271441';
import { getImage } from './images.js?v=202611271441';

const N = 5;
const PAST = 'warm', NOW = 'cool', SPACE = 'cool', ALIEN = 'alien';
// [u, v, 종류(b 건물 · t 나무 · d 장식 · pad 발사대), id, 불빛, 나무 고르기]
const OBJ = [
  [0, 3, 'b', 'umjip', PAST], [0, 2, 'b', 'goindol', PAST], [0, 1, 'b', 'cheomseong', PAST], [1, 2, 'b', 'bulguksa', PAST],
  [0, 0, 'b', 'gyeongbok', PAST], [1, 1, 't', 'round', null, 0.8], [1, 0, 'b', 'hwaseong', PAST], [2, 1, 'b', 'dongnipmun', PAST],
  [2, 0, 'b', 'smarttower', NOW], [3, 0, 'pad', '', SPACE], [4, 0, 'b', 'stargate', ALIEN],
  [1, 4, 'd', 'd_jangseung', null], [2, 3, 'b', 'gwanggaeto_bi', PAST], [2, 4, 't', 'pine', null, 0.2], [3, 4, 'd', 'd_lantern', PAST],
  [3, 3, 'd', 'd_flagpole', null], [3, 2, 'b', 'ktx', NOW], [4, 4, 't', 'bush', null, 0.5], [4, 3, 't', 'round', null, 0.1],
  [4, 2, 'b', 'radiotel', SPACE], [4, 1, 'b', 'moonbase', SPACE],
];

const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const rnd = S.srand(20261127);
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
function polyF(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ellF(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
const crisp = (c, outline) => S.finish({ g: c.getContext('2d'), w: c.width, h: c.height }, outline ? { outline } : { outline: false });
function tint(c, col) { const g = c.getContext('2d'); g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.restore(); }
function put(g, spr, X, Y, k) {
  g.imageSmoothingEnabled = !!spr.res; if (spr.res) g.imageSmoothingQuality = 'high';
  g.drawImage(spr.img, Math.round(X - spr.ox * k), Math.round(Y - spr.oy * k), Math.round(spr.w * k), Math.round(spr.h * k));
}
// 작게 그린 뒤 크게 늘려 도트 느낌을 내요
function up(small, s) { const c = cnv(small.width * s, small.height * s), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, c.width, c.height); return c; }
function glowCanvas(rgb) {
  const c = cnv(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
}
const GLOW = {};

// ---------- 작은 도트 그림들 ----------
function padSprite() {
  const a = new S.Art(64, 128, 32, 112);
  a.box(-0.42, -0.42, 0.42, 0.42, 0, 4, '#8f949a'); a.box(-0.24, -0.24, 0.24, 0.24, 4, 8, '#6b7076');
  const [x, y] = a.P(0, 0, 8);
  for (let i = 0; i < 2; i++) a.rect(x - 17 + i * 4, y - 56, 2, 56, '#c0392b');
  for (let z = 0; z < 54; z += 7) a.line(x - 16, y - z, x - 12, y - z - 7, '#a8301f', 1);
  for (const z of [16, 34, 50]) a.rect(x - 13, y - z, 9, 2, '#a8301f');
  a.rect(x - 18, y - 59, 7, 3, '#ff5a5a');
  S.finish(a);
  return { img: a.c, w: 64, h: 128, ox: 32, oy: 112 };
}
function rocketCanvas() {
  const c = cnv(12, 32), g = c.getContext('2d');
  R(g, 3, 8, 6, 18, '#f4f6f8'); R(g, 7, 8, 2, 18, '#cdd5de');
  polyF(g, [[3, 9], [9, 9], [6, 1]], '#e2443a');
  R(g, 5, 12, 2, 2, '#5ab0e8'); R(g, 3, 18, 6, 2, '#2f6fb3');
  polyF(g, [[3, 19], [0, 28], [3, 26]], '#c0392b'); polyF(g, [[9, 19], [12, 28], [9, 26]], '#a8301f');
  R(g, 4, 26, 4, 3, '#6b7076');
  crisp(c, '#14101f'); return c;
}
function astronautCanvas(wave) {
  const c = cnv(34, 66), g = c.getContext('2d'), o = 1;
  R(g, 5 + o, 25, 22, 15, '#aeb8c4');                                    // 등짐
  R(g, 6 + o, 30, 4, 11, '#e6ebf1'); R(g, 6 + o, 41, 4, 3, '#ff8a3a');    // 왼팔(내린 팔)
  if (wave) { R(g, 23 + o, 29, 4, 4, '#e6ebf1'); R(g, 25 + o, 19, 4, 11, '#e6ebf1'); R(g, 25 + o, 16, 4, 4, '#ff8a3a'); }
  else { R(g, 23 + o, 29, 4, 4, '#e6ebf1'); R(g, 26 + o, 21, 4, 10, '#e6ebf1'); R(g, 27 + o, 18, 4, 4, '#ff8a3a'); }
  R(g, 10 + o, 43, 5, 14, '#e6ebf1'); R(g, 17 + o, 43, 5, 14, '#d9e0e8'); R(g, 10 + o, 48, 5, 2, '#c3ccd6'); R(g, 17 + o, 48, 5, 2, '#bcc5cf');
  R(g, 9 + o, 57, 7, 6, '#7a8696'); R(g, 16 + o, 57, 7, 6, '#6a7686'); R(g, 9 + o, 62, 7, 1, '#4a5566'); R(g, 16 + o, 62, 7, 1, '#4a5566');
  R(g, 9 + o, 29, 14, 14, '#eef2f6'); R(g, 20 + o, 29, 3, 14, '#cdd5de');
  R(g, 12 + o, 32, 8, 5, '#33425e'); R(g, 13 + o, 33, 1, 1, '#ff5a5a'); R(g, 15 + o, 33, 1, 1, '#ffd84a'); R(g, 17 + o, 33, 1, 1, '#5ad06a'); R(g, 13 + o, 35, 6, 1, '#7fd3ff');
  R(g, 9 + o, 30, 3, 2, '#ffffff'); R(g, 10 + o, 30, 1, 1, '#d23a3a'); R(g, 10 + o, 31, 1, 1, '#2f6fb3');
  R(g, 9 + o, 41, 14, 2, '#8a96a6');
  R(g, 9 + o, 26, 14, 3, '#9aa6b4');
  circ(g, 16 + o, 15, 12, '#cfd7e0'); circ(g, 15.5 + o, 14.5, 11, '#f3f6f9');
  ellF(g, 16 + o, 16, 8, 6, '#1b2a4e'); ellF(g, 17 + o, 18, 6, 3, '#2c4a86');
  R(g, 11 + o, 12, 3, 2, '#8fdcff'); R(g, 14 + o, 12, 1, 1, '#ffffff'); R(g, 20 + o, 19, 2, 1, '#5aa8e8');
  R(g, 23 + o, 2, 1, 5, '#9aa6b4'); R(g, 22 + o, 1, 3, 2, '#ff5a5a');
  crisp(c, '#141228'); return c;
}
function ufoCanvas(f) {
  const c = cnv(44, 32), g = c.getContext('2d');
  circ(g, 22, 13, 10, '#bdf3ff');
  ellF(g, 22, 15, 5.5, 5, '#7be05a'); R(g, 18, 6, 1, 5, '#5aa84a'); R(g, 26, 6, 1, 5, '#5aa84a'); R(g, 17, 5, 3, 2, '#ffe14a'); R(g, 25, 5, 3, 2, '#ffe14a');
  ellF(g, 20, 15, 1.6, 2.2, '#10131e'); ellF(g, 24, 15, 1.6, 2.2, '#10131e'); R(g, 19, 14, 1, 1, '#ffffff'); R(g, 23, 14, 1, 1, '#ffffff');
  R(g, 15, 8, 2, 4, '#ffffff');
  ellF(g, 22, 23, 21, 6, '#97a3b3'); ellF(g, 22, 21, 17, 4, '#d5dde6'); ellF(g, 22, 26, 12, 3, '#6a7586');
  const cols = ['#ff5a7a', '#ffe14a', '#5ef0e8'];
  [[6, 23], [13, 25], [22, 26], [31, 25], [38, 23]].forEach(([x, y], i) => R(g, x - 1, y - 1, 3, 2, cols[(i + f) % 3]));
  crisp(c, '#141228'); return c;
}

// ---------- 섬 ----------
function rockCanvas() {
  const W0 = 340, H0 = 270, cx = 170, cy = 10, c = cnv(W0, H0), g = c.getContext('2d');
  const L = [[-160, 2], [-157, 30], [-146, 46], [-138, 60], [-126, 74], [-118, 92], [-104, 104], [-94, 124], [-80, 138], [-68, 160], [-54, 176], [-42, 198], [-28, 214], [-16, 236], [-2, 252]];
  const Rr = [[10, 240], [22, 216], [34, 198], [48, 176], [62, 160], [74, 138], [88, 124], [100, 104], [114, 92], [124, 74], [138, 60], [148, 44], [156, 28], [160, 2]];
  const pts = [...L, ...Rr].map(([x, y]) => [cx + x, cy + y]);
  g.save(); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
  const gr = g.createLinearGradient(0, 0, W0, 0); gr.addColorStop(0, '#5a4030'); gr.addColorStop(0.5, '#4a3426'); gr.addColorStop(1, '#33241a');
  g.fillStyle = gr; g.fillRect(0, 0, W0, H0);
  for (let y = 40; y < H0; y += 13) {                       // 지층 줄무늬
    let x = 0; while (x < W0) { const len = 6 + rnd() * 22; R(g, x, y + Math.round(rnd() * 4), len, 2, rnd() < 0.5 ? '#3a281c' : '#2c1e15'); x += len + 4 + rnd() * 10; }
  }
  for (let i = 0; i < 70; i++) R(g, rnd() * W0, 30 + rnd() * (H0 - 30), 2 + rnd() * 3, 1, '#6e5040');
  for (let i = 0; i < 9; i++) { const x = 40 + rnd() * 260, y = 60 + rnd() * 150; ellF(g, x, y, 6 + rnd() * 6, 4 + rnd() * 3, '#3d2b1f'); ellF(g, x - 1, y - 1, 4, 2, '#5f4635'); }
  // 빛나는 수정 (왼쪽은 금빛, 오른쪽은 푸른빛)
  for (const [x, y, col] of [[110, 96, '#ffcf6a'], [140, 150, '#ffcf6a'], [232, 104, '#5ef0e8'], [212, 170, '#b07aff'], [262, 80, '#5ef0e8'], [180, 210, '#7af0e0']]) {
    polyF(g, [[x, y - 6], [x + 3, y], [x, y + 4], [x - 3, y]], col); R(g, x - 1, y - 3, 1, 3, '#ffffff');
  }
  g.restore();
  for (let i = 0; i < 26; i++) {                            // 섬 아래로 늘어진 뿌리·덩굴
    const x = -150 + rnd() * 300, top = x < 0 ? 28 + (x + 160) / 160 * 80 : 108 - x / 160 * 80;
    const len = 8 + rnd() * 26, X = cx + x, Y = cy + top - 2;
    R(g, X, Y, 1, len, '#2f5a35'); if (rnd() < 0.7) R(g, X - 1, Y + len * 0.6, 3, 2, '#4a8a4a');
  }
  crisp(c, '#120b07'); return c;
}
function buildIsland(k) {
  const LW = 400 * k, LH = 420 * k, ax = LW / 2, ay = 150 * k;
  const back = cnv(LW, LH), front = cnv(LW, LH), gb = back.getContext('2d'), gf = front.getContext('2d');
  const P = (u, v) => [ax + (u - v) * 32 * k, ay + (u + v - 4) * 16 * k];
  gb.imageSmoothingEnabled = false;
  gb.drawImage(rockCanvas(), Math.round(ax - 170 * k), Math.round(ay - 10 * k), Math.round(340 * k), Math.round(270 * k));
  const theme = (u, v) => (u - v >= 4 ? 'alien' : u - v === 3 ? 'space' : '');
  for (let r = 0; r <= 8; r++) for (let u = 0; u < N; u++) {
    const v = r - u; if (v < 0 || v >= N) continue;
    const road = r === 4, kind = road ? (u - v <= -2 ? 'dirt' : 'plaza') : 'grass';
    const [x, y] = P(u, v); put(gb, S.tileSprite(kind, (u * 7 + v * 3) % 4, theme(u, v)), x, y, k);
  }
  for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) {
    const [x, y] = P(u, v);
    if (v === N - 1) put(gb, S.cliffSprite('L', theme(u, v)), x, y, k);
    if (u === N - 1) put(gb, S.cliffSprite('R', theme(u, v)), x, y, k);
  }
  const lights = [], objs = OBJ.map(o => ({ u: o[0], v: o[1], kind: o[2], id: o[3], light: o[4], pick: o[5] }))
    .sort((a, b) => (a.u + a.v) - (b.u + b.v) || (a.u - a.v) - (b.u - b.v));
  for (const o of objs) {
    const g = o.u + o.v <= 4 ? gb : gf, [x, y] = P(o.u, o.v);
    let spr = null;
    if (o.kind === 'b') spr = S.buildingSprite(o.id, 0);
    else if (o.kind === 't') spr = S.treeSprite(o.id, o.id === 'bush' ? 1 : 0.9, o.pick);
    else if (o.kind === 'd') spr = S.decorSprite(o.id);
    else if (o.kind === 'pad') spr = padSprite();
    if (spr) put(g, spr, x, y, k);
    if (o.light) lights.push({ x, y: y - 12 * k, kind: o.light, front: g === gf, ph: rnd() * 6, big: o.id === 'stargate' });
  }
  for (const c of [back, front]) tint(c, 'rgba(22,26,78,0.36)');
  return { back, front, ax, ay, P, lights };
}

// ---------- 하늘·산·구름 ----------
function buildSky(W, H, p) {
  const c = cnv(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H * 0.7);
  gr.addColorStop(0, '#060920'); gr.addColorStop(0.4, '#101a48'); gr.addColorStop(0.78, '#2a2868'); gr.addColorStop(1, '#4b3876');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const tu = Math.min(H / 100, W * 0.0062);                 // 로고 크기 단위(--tu)와 같은 계산
  const mx = Math.max(W * 0.355, tu * 61 + 13 * p), my = H * 0.13;   // 달은 늘 로고 오른쪽에
  const mg = g.createRadialGradient(mx, my, 0, mx, my, H * 0.3);
  mg.addColorStop(0, 'rgba(255,236,190,0.28)'); mg.addColorStop(0.3, 'rgba(255,236,190,0.08)'); mg.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = mg; g.fillRect(0, 0, W, H);
  const r = 11, m = cnv(2 * r + 2, 2 * r + 2), mgc = m.getContext('2d');      // 도트 달
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = x * x + y * y; if (d > r * r) continue;
    let col = (x + y) > r * 0.55 ? '#ead29a' : '#fff1c4';
    for (const [cx0, cy0, cr] of [[-4, -3, 2.6], [3, 4, 2], [5, -5, 1.6], [-5, 5, 1.4]]) if ((x - cx0) ** 2 + (y - cy0) ** 2 <= cr * cr) col = '#e2c98e';
    R(mgc, x + r + 1, y + r + 1, 1, 1, col);
  }
  g.imageSmoothingEnabled = false; g.drawImage(m, Math.round(mx - (r + 1) * p), Math.round(my - (r + 1) * p), m.width * p, m.height * p);
  const pr = 6, pl = cnv(30, 16), pg = pl.getContext('2d');                 // 고리 달린 행성
  ellF(pg, 15, 8, 14, 3, '#f2d6a0'); circ(pg, 15, 8, pr, '#c9783f'); R(pg, 9, 6, 12, 2, '#e0985a'); R(pg, 10, 9, 10, 1, '#a85f30'); ellF(pg, 13, 6, 2, 1.5, '#f0b07a');
  pg.fillStyle = '#f2d6a0'; pg.fillRect(1, 8, 28, 1); crisp(pl);
  g.globalAlpha = 0.85; g.drawImage(pl, Math.round(W * 0.77), Math.round(H * 0.1), pl.width * p * 0.8, pl.height * p * 0.8); g.globalAlpha = 1;
  // 산 (작게 그려 크게)
  const w = Math.ceil(W / p), h = Math.ceil(H / p), sm = cnv(w, h), sg = sm.getContext('2d'), base = Math.round(h * 0.64);
  const ridge = (col, rim, f) => {
    sg.fillStyle = col; sg.beginPath(); sg.moveTo(0, h);
    const ys = []; for (let x = 0; x <= w; x++) { const y = Math.round(base - f(x / w) * h); ys.push(y); sg.lineTo(x, y); }
    sg.lineTo(w, h); sg.closePath(); sg.fill();
    ys.forEach((y, x) => R(sg, x, y, 1, 1, rim));
  };
  ridge('#252b64', '#4a5aa6', x => 0.07 + 0.11 * Math.max(0, 1 - Math.abs(x - 0.24) / 0.2) ** 1.4 * (x > 0.21 && x < 0.27 ? 0.96 : 1) + 0.03 * Math.sin(x * 23) + 0.05 * Math.max(0, 1 - Math.abs(x - 0.86) / 0.14));
  ridge('#1c2154', '#34407e', x => 0.03 + 0.05 * Math.abs(Math.sin(x * 9 + 1)) + 0.02 * Math.sin(x * 41));
  g.drawImage(up(sm, p), 0, 0);
  return c;
}
function buildBand(W, H, p, top, hgt, body, rim, seed) {
  const r = S.srand(seed), w = Math.ceil(W / p), h = Math.ceil(hgt * H / p) + 14, c = cnv(w, h), g = c.getContext('2d');
  const puffs = []; for (let x = -6; x < w + 6; x += 7 + r() * 9) puffs.push([x, 4 + r() * 7, 5 + r() * 9]);
  for (const sh of [-w, 0, w]) for (const [x, y, rr] of puffs) circ(g, x + sh, y + rr, rr, rim);
  for (const sh of [-w, 0, w]) for (const [x, y, rr] of puffs) circ(g, x + sh, y + rr + 1.5, rr - 0.5, body);
  R(g, 0, 18, w, h - 18, body);
  crisp(c);
  return { img: up(c, p), y: top * H - 6 * p };
}
function buildFg(W, H, p) {
  const w = Math.ceil(W / p), h = Math.ceil(H / p), c = cnv(w, h), g = c.getContext('2d');
  const left = [[0, 0.79], [0.05, 0.8], [0.12, 0.823], [0.2, 0.83], [0.27, 0.826], [0.31, 0.845], [0.335, 0.9], [0.355, 1.02], [0, 1.02]];
  const right = left.map(([x, y]) => [1 - x, y]);
  for (const pts of [left, right]) {
    const pp = pts.map(([x, y]) => [x * w, y * h]);
    const gr = g.createLinearGradient(0, h * 0.78, 0, h); gr.addColorStop(0, '#16223c'); gr.addColorStop(1, '#070a18');
    g.fillStyle = gr; g.beginPath(); pp.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  }
  crisp(c);
  const top = x => ledgeTop(x / w) * h;
  for (let x = 0; x < w; x++) {                               // 윗면 풀 가장자리
    const fx = x / w; if (fx > 0.34 && fx < 0.66) continue;
    const y = Math.round(top(x)); R(g, x, y, 1, 1, '#4f8a6e'); R(g, x, y + 1, 1, 1, '#2c5048');
    if (rnd() < 0.45) { const bh = 1 + Math.round(rnd() * 3); R(g, x, y - bh, 1, bh, rnd() < 0.5 ? '#3f7a5e' : '#2f6250'); }
    if (rnd() < 0.04) R(g, x, y - 2, 1, 1, fx < 0.5 ? '#ff8ab0' : '#5ef0e8');
  }
  for (let i = 0; i < 40; i++) { const x = rnd() < 0.5 ? rnd() * 0.3 * w : w - rnd() * 0.3 * w; R(g, x, top(x) + 4 + rnd() * (h - top(x)), 2, 1, '#1f2c48'); }
  // 왼쪽: 청사초롱 기둥 · 오른쪽: 빛나는 외계 버섯
  const lx = Math.round(w * 0.283), ly = Math.round(top(lx));
  const pole = Math.round(h * 0.25);
  R(g, lx, ly - pole, 2, pole, '#3a2414'); R(g, lx - 8, ly - pole, 10, 2, '#3a2414'); R(g, lx - 7, ly - pole + 2, 1, 2, '#2a1a10');
  const lt = { x: lx - 7, y: ly - pole + 4 };
  R(g, lt.x - 3, lt.y, 7, 1, '#2a1a10'); R(g, lt.x - 3, lt.y + 1, 7, 2, '#3a6ad0'); R(g, lt.x - 3, lt.y + 3, 7, 5, '#e2463a'); R(g, lt.x - 2, lt.y + 4, 2, 3, '#ffb07a'); R(g, lt.x - 3, lt.y + 8, 7, 2, '#3a6ad0'); R(g, lt.x - 3, lt.y + 10, 7, 1, '#2a1a10'); R(g, lt.x, lt.y + 11, 1, 2, '#e2b04a');
  const shrooms = [];
  for (const [fx, s, col] of [[0.705, 3, '#5ef0e8'], [0.73, 2, '#b07aff'], [0.955, 4, '#5ef0e8'], [0.975, 2, '#ff7ad8']]) {
    const x = Math.round(fx * w), y = Math.round(top(x));
    R(g, x, y - s * 2, 1, s * 2, '#c9d8e8'); ellF(g, x + 0.5, y - s * 2, s + 1, s * 0.7 + 0.5, col); R(g, x - s + 1, y - s * 2 - 1, 1, 1, '#ffffff');
    shrooms.push({ x: (x + 0.5) * p, y: (y - s * 2) * p, col });
  }
  return { img: up(c, p), lantern: { x: (lt.x + 0.5) * p, y: (lt.y + 5) * p }, shrooms };
}
function ledgeTop(fx) {
  const f = fx > 0.5 ? 1 - fx : fx;
  const pts = [[0, 0.79], [0.05, 0.8], [0.12, 0.823], [0.2, 0.83], [0.27, 0.826], [0.31, 0.845], [0.335, 0.9], [0.355, 1.02]];
  for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (f - x0) / (x1 - x0); }
  return 1.02;
}
function charCanvas(im, hgt, light) {
  const w = Math.round(im.width / im.height * hgt), c = cnv(w, hgt), g = c.getContext('2d');
  g.imageSmoothingEnabled = im.height > hgt; g.drawImage(im, 0, 0, w, hgt);
  tint(c, 'rgba(18,22,64,0.3)');
  g.save(); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(light < 0 ? 0 : w, 0, light < 0 ? w : 0, 0);
  gr.addColorStop(0, light === 1 ? 'rgba(255,170,90,0.32)' : 'rgba(110,220,255,0.3)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, hgt); g.restore();
  return c;
}
function buildChars(W, H, k) {
  const ch = Math.round(Math.min(H * 0.25, W * 0.15)), list = [];
  const person = (id, fx, light) => {
    let im = getImage('people', id);
    if (!im) { const [e, i] = id.slice(1).split('_').map(Number); im = S.personSprite(i, 0, e).img; }
    list.push({ img: charCanvas(im, ch, light), fx, ph: rnd() * 6 });
  };
  const L0 = 0.03 + ch / W * 0.32, step = ch / W * 0.44;
  person('e1_0', L0, 1); person('e2_1', L0 + step, 1); person('e5_0', L0 + step * 2, 1);
  const R0 = 0.97 - ch / W * 0.32;
  person('e7_3', R0 - step * 2, -1);
  const astro = [astronautCanvas(false), astronautCanvas(true)].map(a => charCanvas(a, Math.round(ch * 1.02), -1));
  list.push({ frames: astro, fx: R0 - step, ph: 1 });
  person('e7_4', R0, -1);
  for (const o of list) { const im = o.img || o.frames[0]; o.x = o.fx * W - im.width / 2; o.y = ledgeTop(o.fx) * H; }
  const ufoS = ch / 64 * 1.05, ufo = [0, 1, 2].map(f => up(ufoCanvas(f), 1)).map(c0 => { const c = cnv(c0.width * ufoS, c0.height * ufoS), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c0, 0, 0, c.width, c.height); return c; });
  return { list, ch, ufo, ufoX: (R0 - step * 0.5) * W, ufoY: ledgeTop(R0) * H - ch * 1.75 };
}
function buildVignette(W, H) {
  const c = cnv(W, H), g = c.getContext('2d'), gr = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  gr.addColorStop(0, 'rgba(4,5,18,0)'); gr.addColorStop(1, 'rgba(4,5,18,0.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return c;
}

// =============================================================
let root = null, cv = null, g = null, L = null, raf = 0, t0 = 0, lastDraw = 0, running = false, resizeT = 0;
let W = 0, H = 0, k = 1, p = 2, IX = 0, IY = 0;
let stars = [], flies = [], smoke = [], shoot = null, rocket = null;

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
  cv.width = W; cv.height = H;
  k = Math.min(H / 430, W / 770); p = Math.max(2, Math.round(k * 2.2));
  IX = W * 0.5; IY = H * 0.4;          // 섬은 화면 한가운데 (이름 줄·게임 시작과 같은 세로선)
  if (!GLOW.warm) { GLOW.warm = glowCanvas('255,178,96'); GLOW.cool = glowCanvas('120,210,255'); GLOW.alien = glowCanvas('200,120,255'); GLOW.moon = glowCanvas('255,240,200'); }
  const fg = buildFg(W, H, p);
  L = {
    sky: buildSky(W, H, p), isl: buildIsland(k),
    bands: [buildBand(W, H, p, 0.6, 0.45, '#293170', '#4b5ba6', 5), buildBand(W, H, p, 0.7, 0.35, '#1f2558', '#3b4a8c', 9), buildBand(W, H, p, 0.83, 0.2, '#171c44', '#2d3a74', 13)],
    fg: fg.img, lantern: fg.lantern, shrooms: fg.shrooms, chars: buildChars(W, H, k), vig: buildVignette(W, H), rocket: rocketCanvas(),
  };
  const r = S.srand(77);
  stars = Array.from({ length: Math.round(W * H / 5200) }, () => ({ x: r() * W, y: r() * H * 0.62, s: r() < 0.12 ? 2 : 1, ph: r() * 6, sp: 0.6 + r() * 2.2 }));
  flies = Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 340, y: r() * 260 - 120, sp: 4 + r() * 8, ph: r() * 6, kind: r() < 0.55 ? 'warm' : r() < 0.7 ? 'alien' : 'cool' }));
}

function drawFrame(now) {
  if (!running) return;
  raf = requestAnimationFrame(drawFrame);
  if (now - lastDraw < 32) return;
  const dt = Math.min(0.1, (now - (lastDraw || now)) / 1000); lastDraw = now;
  const t = Math.max(0, (now - t0) / 1000);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false;
  g.drawImage(L.sky, 0, 0);
  // 별
  for (const s of stars) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
    g.fillStyle = `rgba(255,250,235,${a.toFixed(2)})`;
    const z = s.s * p * 0.5;
    if (s.s === 2) { g.fillRect(s.x - z, s.y, z * 3, z); g.fillRect(s.x, s.y - z, z, z * 3); } else g.fillRect(s.x, s.y, z, z);
  }
  // 별똥별
  if (!shoot && Math.random() < dt / 5) shoot = { x: W * (0.3 + Math.random() * 0.6), y: H * (0.04 + Math.random() * 0.2), t: 0 };
  if (shoot) {
    shoot.t += dt; const q = shoot.t / 0.9, x = shoot.x - q * W * 0.22, y = shoot.y + q * H * 0.12;
    const gr = g.createLinearGradient(x, y, x + W * 0.08, y - H * 0.045); gr.addColorStop(0, `rgba(255,255,255,${(1 - q).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr; g.lineWidth = p * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + W * 0.08, y - H * 0.045); g.stroke();
    if (q >= 1) shoot = null;
  }
  band(L.bands[0], t, 3);
  const bob = Math.sin(t * 0.9) * 3 * k, ix = Math.round(IX - L.isl.ax), iy = Math.round(IY - L.isl.ay + bob);
  g.drawImage(L.isl.back, ix, iy);
  lights(t, ix, iy, false);
  drawRocket(t, dt, ix, iy);
  walkers(t, ix, iy);
  g.drawImage(L.isl.front, ix, iy);
  lights(t, ix, iy, true);
  // 반딧불
  g.globalCompositeOperation = 'lighter';
  for (const f of flies) {
    const y = ((f.y - t * f.sp + 400) % 300) - 140, x = f.x + Math.sin(t * 0.8 + f.ph) * 8;
    const a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + f.ph * 2));
    const X = IX + x * k, Y = IY + bob + y * k, sz = 22 * k;
    g.globalAlpha = a * 0.5; g.drawImage(GLOW[f.kind], X - sz / 2, Y - sz / 2, sz, sz);
    g.globalAlpha = a; g.fillStyle = f.kind === 'warm' ? '#ffe6a0' : f.kind === 'alien' ? '#f0c8ff' : '#c8f4ff'; g.fillRect(X, Y, Math.max(2, k * 1.4), Math.max(2, k * 1.4));
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  waterfall(t);
  band(L.bands[1], t, 6);
  band(L.bands[2], t, 10);
  g.drawImage(L.fg, 0, 0);
  // 청사초롱 · 버섯 불빛
  g.globalCompositeOperation = 'lighter';
  const fl = 0.75 + 0.12 * Math.sin(t * 7) + 0.08 * Math.sin(t * 13.3);
  g.globalAlpha = fl * 0.9; const ls = 150 * k; g.drawImage(GLOW.warm, L.lantern.x - ls / 2, L.lantern.y - ls / 2, ls, ls);
  for (const s of L.shrooms) { g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2 + s.x); const ss = 46 * k; g.drawImage(s.col === '#5ef0e8' ? GLOW.cool : GLOW.alien, s.x - ss / 2, s.y - ss / 2, ss, ss); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  chars(t);
  g.drawImage(L.vig, 0, 0);
}
function band(b, t, speed) {
  const w = b.img.width / 1, off = ((t * speed * p * 0.5) % w + w) % w;
  g.drawImage(b.img, Math.round(-off), Math.round(b.y)); g.drawImage(b.img, Math.round(w - off), Math.round(b.y));
}
function lights(t, ix, iy, front) {
  g.globalCompositeOperation = 'lighter';
  for (const l of L.isl.lights) {
    if (l.front !== front) continue;
    const a = (l.kind === 'cool' ? 0.26 : 0.42) + 0.1 * Math.sin(t * 2.3 + l.ph) + (l.big ? 0.25 + 0.15 * Math.sin(t * 3) : 0);
    const s = (l.big ? 120 : 70) * k;
    g.globalAlpha = Math.max(0, a); g.drawImage(GLOW[l.kind], ix + l.x - s / 2, iy + l.y - s / 2 - (l.big ? 18 * k : 0), s, s);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function walkers(t, ix, iy) {
  for (let i = 0; i < 5; i++) {
    const s = ((i * 0.9 + t * 0.12) % 4.5) - 0.15; if (s < 0 || s > 4.05) continue;
    const era = Math.max(1, Math.min(10, 1 + Math.floor(s / 4 * 10))), frame = Math.floor(t * 4 + i) % 2;
    const spr = S.personSprite(i * 2 + era, frame, era);
    const X = ix + L.isl.ax + (2 * s - 4) * 32 * k, Y = iy + L.isl.ay + 3 * k;
    g.globalAlpha = s < 0.25 ? s / 0.25 : s > 3.7 ? Math.max(0, (4.05 - s) / 0.35) : 1;
    put(g, spr, X, Y, k);
    if (s > 3.7) { g.globalCompositeOperation = 'lighter'; const z = 40 * k; g.drawImage(GLOW.alien, X - z / 2, Y - 20 * k - z / 2, z, z); g.globalCompositeOperation = 'source-over'; }
  }
  g.globalAlpha = 1;
}
function drawRocket(t, dt, ix, iy) {
  const [px, py] = L.isl.P(3, 0), bx = ix + px, by = iy + py - 8 * k, cyc = t % 16;
  const rw = 12 * k, rh = 32 * k;
  let x = bx, y = by, firing = false, alpha = 1;
  if (cyc < 0.8) alpha = cyc / 0.8;
  else if (cyc > 9 && cyc < 10) { firing = true; x += Math.sin(t * 60) * k * 0.6; }
  else if (cyc >= 10) { const tt = cyc - 10; firing = true; y -= 70 * k * tt * tt; x += 6 * k * tt * tt; }
  if (firing && y > -rh) for (let i = 0; i < 2; i++) smoke.push({ x: x + (Math.random() - 0.5) * 4 * k, y: y + 2 * k, r: 4 * k, life: 0 });
  if (cyc < 9 && Math.random() < dt * 1.5) smoke.push({ x: bx + 6 * k, y: by, r: 2 * k, life: 0.5 });
  for (const s of smoke) { s.life += dt; s.r += dt * 14 * k; s.y += dt * 4 * k; }
  smoke = smoke.filter(s => s.life < 1.6);
  for (const s of smoke) { g.globalAlpha = Math.max(0, 0.5 * (1 - s.life / 1.6)); g.fillStyle = '#9aa0c0'; g.fillRect(Math.round(s.x - s.r), Math.round(s.y - s.r), Math.round(s.r * 2), Math.round(s.r * 2)); }
  g.globalAlpha = alpha;
  if (y > -rh) {
    if (firing) {
      g.globalCompositeOperation = 'lighter'; const z = 60 * k; g.globalAlpha = 0.8; g.drawImage(GLOW.warm, x - z / 2, y - z / 2 + 4 * k, z, z); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const fh = (6 + Math.random() * 5) * k;
      g.fillStyle = '#ffd84a'; g.fillRect(Math.round(x - 2 * k), Math.round(y), Math.round(4 * k), Math.round(fh));
      g.fillStyle = '#ff7a2a'; g.fillRect(Math.round(x - 1 * k), Math.round(y + fh * 0.5), Math.round(2 * k), Math.round(fh * 0.7));
    }
    g.imageSmoothingEnabled = false; g.drawImage(L.rocket, Math.round(x - 6 * k), Math.round(y - 29 * k), Math.round(rw), Math.round(rh));
  }
  g.globalAlpha = 1;
}
function waterfall(t) {
  const bob = Math.sin(t * 0.9) * 3 * k, x = IX - 126 * k, top = IY + bob + 18 * k, bot = H * 0.74, w = Math.max(4, Math.round(12 * k));
  const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, 'rgba(120,180,240,0.9)'); gr.addColorStop(0.7, 'rgba(110,160,230,0.35)'); gr.addColorStop(1, 'rgba(110,160,230,0)');
  g.fillStyle = gr; g.fillRect(Math.round(x), Math.round(top), w, Math.round(bot - top));
  const cw = Math.max(1, Math.round(w / 4));
  for (let i = 0; i < 12; i++) {                      // 떨어지는 물줄기
    const lane = i % 4, sp = 70 + lane * 14, yy = top + ((t * sp * k + i * 37 * k) % (bot - top));
    g.globalAlpha = Math.max(0, 0.85 - (yy - top) / (bot - top)); g.fillStyle = lane % 2 ? '#e8f6ff' : '#b8e0ff';
    g.fillRect(Math.round(x + lane * cw), Math.round(yy), cw, Math.round((10 + lane * 3) * k));
  }
  g.globalAlpha = 0.8; g.fillStyle = '#dff3ff'; g.fillRect(Math.round(x - k), Math.round(top), w + 2 * k, Math.round(2 * k));
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; const z = 70 * k; g.drawImage(GLOW.cool, x + w / 2 - z / 2, bot - z * 0.75, z, z);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
function chars(t) {
  const C = L.chars;
  // 비행접시 + 빛줄기
  const uf = C.ufo[Math.floor(t * 4) % 3], ux = C.ufoX - uf.width / 2, uy = C.ufoY + Math.sin(t * 1.6) * 6 * k;
  const ground = ledgeTop(C.ufoX / W) * H, bw0 = uf.width * 0.35, bw1 = uf.width * 1.25;
  const gr = g.createLinearGradient(0, uy + uf.height * 0.8, 0, ground);
  const pa = 0.16 + 0.06 * Math.sin(t * 3);
  gr.addColorStop(0, `rgba(140,240,255,${pa + 0.1})`); gr.addColorStop(1, `rgba(140,240,255,${pa * 0.4})`);
  g.globalCompositeOperation = 'lighter';
  polyF(g, [[C.ufoX - bw0 / 2, uy + uf.height * 0.8], [C.ufoX + bw0 / 2, uy + uf.height * 0.8], [C.ufoX + bw1 / 2, ground], [C.ufoX - bw1 / 2, ground]], gr);
  g.globalCompositeOperation = 'source-over';
  for (const c of C.list) {
    const im = c.frames ? c.frames[(t % 5) < 2 ? Math.floor(t * 3) % 2 : 0] : c.img;
    const br = Math.sin(t * 2 + c.ph) * 0.006, h = im.height * (1 + br);
    g.imageSmoothingEnabled = false; g.drawImage(im, Math.round(c.x), Math.round(c.y - h), im.width, Math.round(h));
  }
  g.imageSmoothingEnabled = false; g.drawImage(uf, Math.round(ux), Math.round(uy));
}

// =============================================================
//  공개: show() → 컨트롤러
// =============================================================
const SVG = {
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="on" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path class="off" d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  news: '<svg viewBox="0 0 24 24"><path d="M3 10v4l3 1 2 5h2l-1-4.4L18 19V5L6 9z" fill="currentColor"/><path d="M20.5 9.5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path class="on" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path class="off" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
};
function logoSVG() {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i / 10 * Math.PI * 2, x = 92 + Math.cos(a) * 74, y = 96 + Math.sin(a) * 74;
    const col = ['#c98a4a', '#d9a05a', '#e6b45a', '#f2c84a', '#e8d06a', '#bfe07a', '#7ad8a0', '#5ef0e8', '#8ab8ff', '#c07aff'][i];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 9 ? 8 : 6}" fill="${col}"/>`;
  }).join('');
  const T = (y, extra) => `<text x="58" y="${y}" font-family="Jua, sans-serif" font-size="84" ${extra}>히스토리 빌더</text>`;
  return `<svg viewBox="0 0 600 232" role="img" aria-label="히스토리 빌더">
    <defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0"/><stop offset=".5" stop-color="#ffd35a"/><stop offset="1" stop-color="#f28a22"/></linearGradient>
    <radialGradient id="trg"><stop offset="0" stop-color="#b48cff" stop-opacity=".45"/><stop offset="1" stop-color="#b48cff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="92" cy="96" r="96" fill="url(#trg)"/>
    <circle cx="92" cy="96" r="74" fill="none" stroke="#d9c2ff" stroke-opacity=".55" stroke-width="5"/>
    <circle cx="92" cy="96" r="62" fill="none" stroke="#d9c2ff" stroke-opacity=".22" stroke-width="2" stroke-dasharray="4 7"/>
    ${dots}
    ${T(140, 'fill="#26103a" stroke="#26103a" stroke-width="18" stroke-linejoin="round" transform="translate(0 9)"')}
    ${T(140, 'fill="url(#tlg)" stroke="#3a1605" stroke-width="13" stroke-linejoin="round" paint-order="stroke"')}
    ${T(140, 'fill="none" stroke="#fff7d8" stroke-opacity=".55" stroke-width="1.6" transform="translate(-1.5 -2)"')}
    <g font-family="Jua, sans-serif" text-anchor="middle">
      <path d="M150 178h60M430 178h60" stroke="#e9d9ff" stroke-opacity=".7" stroke-width="3"/>
      <path d="M216 178l6-6 6 6-6 6zM412 178l6-6 6 6-6 6z" fill="#ffd35a"/>
      <text x="320" y="188" font-size="28" letter-spacing="7" fill="#f6ecd2" stroke="#1a0f2a" stroke-width="6" paint-order="stroke">HISTORY BUILDER</text>
      <text x="320" y="224" font-size="21" fill="#cfc6ff" stroke="#120a22" stroke-width="5" paint-order="stroke">초등 한국사 시대 발전 타이쿤</text>
    </g></svg>`;
}

// 처음 불러오는 동안 덮어 두는 어두운 화면 (첫 화면이 그 위로 나타난 뒤 걷어요)
export function hideSplash(delay = 0) {
  const sp = document.getElementById('splash'); if (!sp) return;
  setTimeout(() => { sp.classList.add('gone'); setTimeout(() => sp.remove(), 500); }, delay);
}
export function show(opt = {}) {
  root = document.createElement('div'); root.className = 'title'; root.id = 'title';
  root.innerHTML = `<canvas class="title-cv" aria-hidden="true"></canvas>
    <div class="t-logo">${logoSVG()}</div>
    <div class="t-ver">버전: ${opt.version || ''}</div>
    <div class="t-side">
      <button class="t-ic" data-act="news" aria-label="새 소식" title="새 소식">${SVG.news}</button>
      <button class="t-ic ${opt.soundOn ? '' : 'muted'}" data-act="sound" aria-label="배경 음악" title="배경 음악">${SVG.sound}</button>
      <button class="t-ic" data-act="full" aria-label="전체 화면" title="전체 화면">${SVG.full}</button>
    </div>
    <div class="t-bar"><i class="t-dot wait" id="tDot"></i><img class="t-av hidden" id="tAv" alt=""><span class="t-who" id="tWho">학급 서버에 연결하는 중…</span><button class="t-chg" id="tChg" type="button">내 정보 <b>❯</b></button></div>
    <button class="t-start" id="tStart" type="button"><span id="tStartLb">게임 시작</span></button>`;
  (document.getElementById('app') || document.body).appendChild(root);
  document.body.classList.add('title-on');
  hideSplash(900);
  cv = root.querySelector('canvas'); g = cv.getContext('2d');
  layout(); running = true; t0 = performance.now(); lastDraw = 0; raf = requestAnimationFrame(drawFrame);
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (running) layout(); }, 150); };
  window.addEventListener('resize', onResize);

  let ready = null, busy = false, soundOn = !!opt.soundOn;
  const startBtn = root.querySelector('#tStart'), lb = root.querySelector('#tStartLb');
  const ctl = {
    setStatus(st) { const d = root.querySelector('#tDot'); d.className = 't-dot ' + st; d.title = { online: '학급 서버 연결됨', offline: '학급 서버에 연결되지 않음 — 이 기기에만 저장', local: '이 기기에 저장', wait: '연결 중' }[st] || ''; },
    setProfile(pv) {
      const who = root.querySelector('#tWho'), av = root.querySelector('#tAv'), chg = root.querySelector('#tChg');
      if (pv) { who.textContent = pv.label; who.classList.remove('new'); if (pv.avatar) { av.src = pv.avatar; av.classList.remove('hidden'); } chg.innerHTML = '내 정보 <b>❯</b>'; }
      else { who.textContent = '처음 왔나요? 학급 코드와 번호를 넣어요'; who.classList.add('new'); av.classList.add('hidden'); chg.innerHTML = '정보 넣기 <b>❯</b>'; }
    },
    ready(fn) { ready = fn; if (!busy) lb.textContent = '게임 시작'; startBtn.classList.remove('wait'); },
    setFull(on) { const b = root?.querySelector('[data-act="full"]'); if (b) { b.classList.toggle('muted', !!on); b.title = b.ariaLabel = on ? '전체 화면 끄기' : '전체 화면'; } },
    busy(text) { busy = true; lb.textContent = text; startBtn.classList.add('busy'); },
    idle() { busy = false; lb.textContent = ready ? '게임 시작' : '연결 중…'; startBtn.classList.remove('busy'); },
    // 로고는 위로, 버튼은 아래로 빠지고 → 섬 쪽으로 다가가며 마을 화면으로 스르르 바뀌어요
    hide() {
      if (!root) return; const el = root; root = null; window.removeEventListener('resize', onResize);
      document.body.classList.remove('title-on'); el.classList.add('out');
      setTimeout(() => { running = false; cancelAnimationFrame(raf); el.remove(); L = null; smoke = []; }, 1000);
    },
  };
  if (!opt.waitReady) ctl.ready(null); else { lb.textContent = '연결 중…'; startBtn.classList.add('wait'); }
  startBtn.onclick = async () => {
    opt.onClick?.(); if (busy) return;
    if (!ready) { lb.textContent = '연결 중… 잠시만요'; return; }
    busy = true; startBtn.classList.add('busy');
    try { await ready(); } finally { if (root) { busy = false; startBtn.classList.remove('busy'); if (lb.textContent !== '게임 시작' && !root.classList.contains('out')) lb.textContent = '게임 시작'; } }
  };
  root.querySelector('#tChg').onclick = () => { opt.onClick?.(); opt.onProfile?.(); };
  root.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    opt.onClick?.();
    const act = b.dataset.act;
    if (act === 'news') opt.onNews?.();
    if (act === 'sound') { soundOn = !soundOn; b.classList.toggle('muted', !soundOn); opt.onSound?.(soundOn); }
    if (act === 'full') opt.onFull?.();
  });
  if (opt.hideFull) root.querySelector('[data-act="full"]').remove();
  return ctl;
}
