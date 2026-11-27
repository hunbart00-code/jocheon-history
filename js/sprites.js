// =============================================================
//  도트(픽셀) 그래픽 — 외부 이미지 없이 코드로 그립니다.
//  아이소메트릭 좌표: P(u, v, z)  u,v = 타일 단위(-0.5~0.5), z = 높이(px)
//  * 선생님이 직접 만든 그림(PNG)을 쓰고 싶으면 data-buildings.js 에 img: '파일경로' 를 넣으면 됩니다.
// =============================================================
import { getImage } from './images.js?v=202611271349';
export const TW = 64, TH = 32;

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function shade(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

// 간단한 시드 난수 (그림이 매번 같게)
export function srand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

export class Art {
  constructor(w, h, ox, oy) { this.c = cnv(w, h); this.g = this.c.getContext('2d'); this.w = w; this.h = h; this.ox = ox; this.oy = oy; }
  P(u, v, z = 0) { return [this.ox + (u - v) * TW / 2, this.oy + (u + v) * TH / 2 - z]; }
  poly(pts, col) {
    const g = this.g; g.fillStyle = col; g.beginPath();
    pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  }
  q(pts, col) { this.poly(pts.map(p => this.P(p[0], p[1], p[2] || 0)), col); }
  rect(x, y, w, h, col) { this.g.fillStyle = col; this.g.fillRect(Math.round(x), Math.round(y), w, h); }
  px(x, y, col) { this.rect(x, y, 1, 1, col); }
  line(x0, y0, x1, y1, col, w = 1) {
    const g = this.g; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  L(a, b, col, w = 1) { const p = this.P(...a), q = this.P(...b); this.line(p[0], p[1], q[0], q[1], col, w); }
  ell(x, y, rx, ry, col) { const g = this.g; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
  // 상자: 윗면 / 왼쪽 앞면(v=v1) / 오른쪽 앞면(u=u1)
  box(u0, v0, u1, v1, z0, z1, col, opt = {}) {
    const top = opt.top || shade(col, 0.18), left = opt.left || col, right = opt.right || shade(col, -0.25);
    this.q([[u0, v1, z1], [u1, v1, z1], [u1, v1, z0], [u0, v1, z0]], left);
    this.q([[u1, v0, z1], [u1, v1, z1], [u1, v1, z0], [u1, v0, z0]], right);
    if (!opt.noTop) this.q([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], top);
  }
  // 앞면에 세로선(기둥) 그리기
  pillarsL(u0, u1, v, z0, z1, n, col, w = 2) { for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; this.L([u, v, z0], [u, v, z1], col, w); } }
  pillarsR(v0, v1, u, z0, z1, n, col, w = 2) { for (let i = 0; i <= n; i++) { const v = v0 + (v1 - v0) * i / n; this.L([u, v, z0], [u, v, z1], col, w); } }
  // 앞면 가로띠
  bandL(u0, u1, v, z0, z1, col) { this.q([[u0, v, z1], [u1, v, z1], [u1, v, z0], [u0, v, z0]], col); }
  bandR(v0, v1, u, z0, z1, col) { this.q([[u, v0, z1], [u, v1, z1], [u, v1, z0], [u, v0, z0]], col); }
  // 기와(또는 초가) 우진각/팔작 지붕
  roof(u0, v0, u1, v1, z, rh, o, col, opt = {}) {
    const U0 = u0 - o, U1 = u1 + o, V0 = v0 - o, V1 = v1 + o;
    const alongU = (U1 - U0) >= (V1 - V0);
    const k = opt.hip ?? 0.55;
    const front = col, endc = shade(col, -0.28), back = shade(col, -0.15);
    let frontPts, ridgeA, ridgeB;
    if (alongU) {
      const d = (V1 - V0) / 2 * k, vm = (V0 + V1) / 2;
      ridgeA = [U0 + d, vm, z + rh]; ridgeB = [U1 - d, vm, z + rh];
      this.q([[U0, V0, z], [U1, V0, z], ridgeB, ridgeA], back);
      this.q([[U0, V0, z], [U0, V1, z], ridgeA], back);
      this.q([[U1, V0, z], [U1, V1, z], ridgeB], endc);
      frontPts = [[U0, V1, z], [U1, V1, z], ridgeB, ridgeA];
      this.q(frontPts, front);
      if (opt.lines !== false) {
        const g = this.g; g.save(); g.beginPath(); frontPts.map(p => this.P(...p)).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
        const n = Math.round((U1 - U0) * (opt.density || 14));
        for (let i = 1; i < n; i++) { const u = U0 + (U1 - U0) * i / n; this.L([u, V1, z], [u, vm, z + rh], shade(col, -0.2), 1); }
        g.restore();
      }
      // 처마 끝 밝은 선
      this.L([U0, V1, z + 0.5], [U1, V1, z + 0.5], opt.eave || shade(col, 0.35), 1);
      this.L(ridgeA, ridgeB, opt.ridge || shade(col, -0.45), 2);
      if (opt.upturn !== false) {
        const [ax, ay] = this.P(U0, V1, z), [bx, by] = this.P(U1, V0, z), [cx, cy] = this.P(U1, V1, z);
        this.poly([[ax, ay], [ax - 3, ay - 4], [ax + 2, ay - 1]], front);
        this.poly([[bx, by], [bx + 3, by - 4], [bx - 2, by - 1]], endc);
        this.poly([[cx, cy], [cx + 1, cy - 3], [cx + 3, cy - 4], [cx + 1, cy]], front);
        const [rx, ry] = this.P(...ridgeA), [sx, sy] = this.P(...ridgeB);
        this.rect(rx - 1, ry - 2, 2, 2, shade(col, 0.5)); this.rect(sx - 1, sy - 2, 2, 2, shade(col, 0.5));
      }
    } else {
      const d = (U1 - U0) / 2 * k, um = (U0 + U1) / 2;
      ridgeA = [um, V0 + d, z + rh]; ridgeB = [um, V1 - d, z + rh];
      this.q([[U0, V0, z], [U0, V1, z], ridgeB, ridgeA], back);
      this.q([[U0, V0, z], [U1, V0, z], ridgeA], back);
      this.q([[U0, V1, z], [U1, V1, z], ridgeB], shade(col, -0.08));
      frontPts = [[U1, V0, z], [U1, V1, z], ridgeB, ridgeA];
      this.q(frontPts, endc);
      if (opt.lines !== false) {
        const g = this.g; g.save(); g.beginPath(); frontPts.map(p => this.P(...p)).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
        const n = Math.round((V1 - V0) * (opt.density || 14));
        for (let i = 1; i < n; i++) { const v = V0 + (V1 - V0) * i / n; this.L([U1, v, z], [um, v, z + rh], shade(col, -0.4), 1); }
        g.restore();
      }
      this.L([U1, V0, z + 0.5], [U1, V1, z + 0.5], opt.eave || shade(col, 0.2), 1);
      this.L(ridgeA, ridgeB, opt.ridge || shade(col, -0.45), 2);
    }
  }
  cone(u, v, r, z0, h, col) {
    const [cx, cy] = this.P(u, v, z0); const rx = r * 45, ry = rx / 2; const g = this.g;
    g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx - rx, cy); g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
    g.fillStyle = shade(col, -0.22); g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + 2, cy + ry); g.ellipse(cx, cy, rx, ry, 0, Math.PI / 2 - 0.1, 0, true); g.closePath(); g.fill();
    return [cx, cy, rx, ry];
  }
  dome(u, v, r, z0, h, col) {
    const [cx, cy] = this.P(u, v, z0); const rx = r * 45, ry = rx / 2; const g = this.g;
    const path = () => { g.beginPath(); g.moveTo(cx - rx, cy); g.bezierCurveTo(cx - rx, cy - h * 1.3, cx + rx, cy - h * 1.3, cx + rx, cy); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); g.closePath(); };
    g.fillStyle = col; path(); g.fill();
    g.save(); path(); g.clip();
    g.fillStyle = shade(col, -0.2); g.beginPath(); g.ellipse(cx + rx * 0.75, cy - h * 0.1, rx * 0.7, h * 1.1, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = shade(col, 0.18); g.beginPath(); g.ellipse(cx - rx * 0.35, cy - h * 0.62, rx * 0.35, h * 0.25, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    return [cx, cy, rx, ry];
  }
  cyl(u, v, r, z0, z1, col) {
    const [cx, cy] = this.P(u, v, z0); const rx = r * 45, ry = rx / 2, h = z1 - z0; const g = this.g;
    g.fillStyle = col; g.beginPath(); g.moveTo(cx - rx, cy - h); g.lineTo(cx - rx, cy); g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, cy - h); g.closePath(); g.fill();
    g.fillStyle = shade(col, -0.22); g.fillRect(cx + rx * 0.3, cy - h, rx * 0.7, h); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0.2, Math.PI / 2.5); g.lineTo(cx + rx * 0.3, cy); g.fill();
    this.ell(cx, cy - h, rx, ry, shade(col, 0.2));
    return [cx, cy, rx, ry];
  }
  flame(x, y, s = 1) {
    this.poly([[x - 3 * s, y], [x, y - 8 * s], [x + 3 * s, y]], '#f07a1a');
    this.poly([[x - 1.5 * s, y], [x, y - 5 * s], [x + 1.5 * s, y]], '#ffd34a');
  }
  smoke(x, y) { this.ell(x, y, 3, 2, '#d8d8d8cc'); this.ell(x + 3, y - 5, 4, 3, '#e6e6e6aa'); this.ell(x + 1, y - 11, 3, 2, '#efefef88'); }
  flag(x, y, h, col) { this.rect(x, y - h, 1, h, '#5a3a1e'); this.poly([[x + 1, y - h], [x + 8, y - h + 3], [x + 1, y - h + 6]], col); }
}

// 알파값 정리 + 외곽선 (도트 느낌)
export function finish(art, opt = {}) {
  const { g, w, h } = art; const id = g.getImageData(0, 0, w, h); const d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 120 ? 255 : 0;
  if (opt.outline !== false) {
    const oc = hexRgb(opt.outline || '#2b1b10');
    const src = new Uint8ClampedArray(d);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]) continue;
      if (A(x + 1, y) || A(x - 1, y) || A(x, y + 1) || A(x, y - 1)) { d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2]; d[i + 3] = 255; }
    }
  }
  if (opt.tint) {
    const t = hexRgb(opt.tint), a = opt.tintA || 0.2;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] += (t[0] - d[i]) * a; d[i + 1] += (t[1] - d[i + 1]) * a; d[i + 2] += (t[2] - d[i + 2]) * a; }
  }
  g.putImageData(id, 0, 0);
  return art;
}
function hexRgb(h) { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

// ---------- 공통 색 ----------
const C = {
  stone: '#b9b4a6', stoneD: '#8f8a7d', wall: '#efe6cf', wood: '#8b5a2b', woodD: '#6b4220', red: '#b8322b',
  giwa: '#556170', straw: '#d6ae5a', green: '#2f8f83', grass: '#7cc05a', gold: '#f2c230', water: '#4aa3df', dirt: '#c9a26b',
};

// 한옥 본채 (기단 + 몸체 + 지붕)
function hanok(a, u0, v0, u1, v1, z, opt = {}) {
  const bh = opt.bh ?? 4, wh = opt.wh ?? 13;
  if (bh) a.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, z, z + bh, opt.base || C.stone);
  a.box(u0, v0, u1, v1, z + bh, z + bh + wh, opt.wall || C.wall, { noTop: true });
  // 문살·벽 띠
  a.bandL(u0, u1, v1, z + bh + wh - 3, z + bh + wh, opt.band || C.green);
  a.bandR(v0, v1, u1, z + bh + wh - 3, z + bh + wh, shade(opt.band || C.green, -0.25));
  const n = opt.cols || Math.max(2, Math.round((u1 - u0) * 6));
  a.pillarsL(u0, u1, v1, z + bh, z + bh + wh - 3, n, opt.pillar || C.red, 2);
  a.pillarsR(v0, v1, u1, z + bh, z + bh + wh - 3, Math.max(1, Math.round((v1 - v0) * 6)), shade(opt.pillar || C.red, -0.2), 2);
  if (opt.door !== false) { const um = (u0 + u1) / 2; a.q([[um - 0.06, v1, z + bh], [um + 0.06, v1, z + bh], [um + 0.06, v1, z + bh + wh - 4], [um - 0.06, v1, z + bh + wh - 4]], opt.doorCol || '#7a4a24'); }
  a.roof(u0, v0, u1, v1, z + bh + wh, opt.rh ?? 13, opt.o ?? 0.1, opt.roof || C.giwa, opt.roofOpt || {});
}

function waterPatch(a, u0, v0, u1, v1) {
  a.q([[u0, v0, 0], [u1, v0, 0], [u1, v1, 0], [u0, v1, 0]], '#3f95d4');
  const r = srand(7);
  for (let i = 0; i < 10; i++) { const u = u0 + (u1 - u0) * r(), v = v0 + (v1 - v0) * r(); const [x, y] = a.P(u, v, 0); a.rect(x, y, 4, 1, '#8fd0f5'); }
}
function boat(a, u, v, len, sail, opt = {}) {
  const [x, y] = a.P(u, v, 0); const L = len * 32;
  a.poly([[x - L, y - 6], [x + L, y - 10], [x + L - 4, y - 2], [x - L + 5, y + 2]], opt.hull || '#7a4a24');
  a.poly([[x - L, y - 6], [x + L, y - 10], [x + L - 2, y - 8], [x - L + 2, y - 4]], shade(opt.hull || '#7a4a24', 0.25));
  if (sail) {
    const masts = opt.masts || 1;
    for (let m = 0; m < masts; m++) {
      const mx = x - L * 0.3 + m * L * 0.7, my = y - 6 - m * 2;
      a.rect(mx, my - 26, 1, 26, '#4b2e14');
      a.poly([[mx + 1, my - 25], [mx + 11, my - 22], [mx + 11, my - 8], [mx + 1, my - 10]], opt.sail || '#efe2c4');
      a.L([0, 0, 0], [0, 0, 0], '#0000');
      a.rect(mx + 1, my - 18, 10, 1, shade(opt.sail || '#efe2c4', -0.2));
      a.rect(mx, my - 30, 1, 4, '#4b2e14'); a.poly([[mx + 1, my - 30], [mx + 6, my - 28], [mx + 1, my - 26]], opt.flag || '#d23a2f');
    }
  }
}

// ---------- 건물별 그림 ----------
const DRAW = {
  umjip(a) {
    const [cx, cy, rx, ry] = a.cone(0, 0.02, 0.36, 0, 30, C.straw);
    for (let i = -rx + 3; i < rx; i += 4) a.line(cx, cy - 30, cx + i, cy + ry * 0.7, shade(C.straw, -0.18), 1);
    a.rect(cx - 2, cy - 33, 4, 4, shade(C.straw, -0.3));
    a.poly([[cx - 3, cy - 32], [cx - 6, cy - 37], [cx - 1, cy - 33]], C.straw); a.poly([[cx + 2, cy - 33], [cx + 5, cy - 38], [cx + 3, cy - 32]], C.straw);
    a.poly([[cx - 11, cy + 6], [cx - 9, cy - 6], [cx - 3, cy - 7], [cx - 2, cy + 7]], '#3a2513');
    a.line(cx - 10, cy - 6, cx - 2, cy - 7, '#6b4220', 2);
    a.ell(cx + 11, cy + 4, 3, 3, '#a86b45'); a.rect(cx + 9, cy, 4, 1, '#7a4a2f');
  },
  goindol(a) {
    a.box(-0.28, -0.06, -0.12, 0.12, 0, 15, '#9b978c');
    a.box(0.1, -0.06, 0.26, 0.12, 0, 15, '#9b978c');
    a.box(-0.4, -0.3, 0.4, 0.32, 15, 21, '#aba79b', { top: '#c4c0b3' });
    const [x, y] = a.P(-0.1, 0, 21); a.rect(x, y, 3, 1, '#6c9a4a'); a.rect(x + 9, y + 3, 2, 1, '#6c9a4a'); a.rect(x - 8, y + 2, 2, 1, '#6c9a4a');
    const [p, q] = a.P(0.4, 0.1, 18); a.line(p - 3, q - 1, p - 1, q + 2, '#6f6b60');
    const [s, t] = a.P(0.3, 0.4, 0); a.ell(s, t - 1, 4, 2, '#7f9f5a');
  },
  altar(a) {
    a.box(-0.42, -0.42, 0.42, 0.42, 0, 4, C.stone);
    a.box(-0.3, -0.3, 0.3, 0.3, 4, 9, shade(C.stone, -0.05));
    // 청동 거울 받침
    const [x, y] = a.P(-0.05, -0.05, 9);
    a.rect(x - 9, y - 22, 2, 22, C.woodD); a.rect(x + 7, y - 22, 2, 22, C.woodD); a.rect(x - 9, y - 23, 18, 2, C.wood);
    a.ell(x, y - 13, 7, 7, '#c99a3a'); a.ell(x, y - 13, 5.5, 5.5, '#4f9c86'); a.ell(x - 2, y - 15, 2, 2, '#8fd3c0');
    // 청동검과 화로
    const [d, e] = a.P(-0.2, 0.2, 9); a.rect(d, e - 14, 2, 12, '#5aa58c'); a.rect(d - 2, e - 3, 6, 2, '#8a6a2a');
    const [f, h] = a.P(0.2, 0.18, 9); a.poly([[f - 5, h - 4], [f + 5, h - 4], [f + 3, h], [f - 3, h]], '#6d5a3a'); a.flame(f, h - 4, 1);
  },
  cheomseong(a) {
    a.box(-0.36, -0.36, 0.36, 0.36, 0, 3, C.stone); a.box(-0.28, -0.28, 0.28, 0.28, 3, 6, shade(C.stone, 0.05));
    const [cx, cy] = a.P(0, 0, 6); const H = 46; const g = a.g;
    const r = z => 12 - 5 * Math.pow(z / H, 1.4);
    g.fillStyle = '#d8ccae'; g.beginPath(); g.moveTo(cx - r(0), cy);
    for (let z = 0; z <= H; z += 2) g.lineTo(cx - r(z), cy - z);
    for (let z = H; z >= 0; z -= 2) g.lineTo(cx + r(z), cy - z);
    g.ellipse(cx, cy, r(0), r(0) / 2, 0, 0, Math.PI); g.fill();
    for (let z = 0; z <= H; z += 2) a.rect(cx + r(z) * 0.25, cy - z, r(z) * 0.75, 2, '#b3a684');
    for (let z = 3; z < H; z += 4) a.rect(cx - r(z), cy - z, r(z) * 2, 1, '#a8987a');
    a.rect(cx - 3, cy - 26, 6, 6, '#3a2a1a');
    a.box(-0.13, -0.13, 0.13, 0.13, 6 + H, 6 + H + 4, '#cfc3a4');
    const [tx, ty] = a.P(0, 0, 6 + H + 4); a.poly([[tx, ty - 3], [tx + 5, ty], [tx, ty + 3], [tx - 5, ty]], '#3a2a1a');
  },
  muryeong(a) {
    const [cx, cy, rx] = a.dome(0, -0.05, 0.4, 0, 22, '#6fae4c');
    const r = srand(3); for (let i = 0; i < 24; i++) a.rect(cx - rx + r() * rx * 2, cy - 4 - r() * 22, 2, 1, i % 2 ? '#8fcb64' : '#5a9a3e');
    a.box(-0.12, 0.18, 0.12, 0.44, 0, 12, '#a8653a', { top: '#bf7a4a' });
    const [x, y] = a.P(0, 0.44, 0); a.poly([[x - 6, y - 3], [x - 6, y - 8], [x - 3, y - 11], [x + 1, y - 11], [x + 2, y - 8], [x + 2, y]], '#2a1a12');
    for (let k = 0; k < 4; k++) a.rect(x - 12 + k * 2, y - 10 + k * 3, 1, 1, '#7a4428');
    const [s, t] = a.P(0.36, 0.36, 0); a.ell(s, t - 3, 4, 3, '#9a978e'); a.rect(s - 1, t - 9, 2, 3, '#9a978e');
  },
  gwanggaeto_bi(a) {
    a.box(-0.34, -0.34, 0.34, 0.34, 0, 4, C.stone);
    a.box(-0.17, -0.15, 0.17, 0.15, 4, 44, '#8a8f7a', { top: '#a1a690', right: '#686d5a', left: '#7f846f' });
    // 거친 돌 윤곽
    const [t1, t2] = a.P(-0.17, 0.15, 44); a.poly([[t1, t2], [t1 + 4, t2 - 4], [t1 + 9, t2 - 2], [t1 + 9, t2 + 2]], '#a1a690');
    const r = srand(13); for (let i = 0; i < 18; i++) { const [x, y] = a.P(-0.15 + r() * 0.3, 0.15, 6 + r() * 36); a.rect(x, y, 2, 1, i % 2 ? '#6b705e' : '#9aa08a'); }
    for (let z = 12; z < 40; z += 3) for (let k = 0; k < 3; k++) { const [x, y] = a.P(-0.11 + k * 0.08, 0.15, z); a.rect(x, y, 1, 2, '#4e5344'); }
    const [x, y] = a.P(0.17, -0.02, 30); a.line(x, y, x + 1, y + 7, '#4e5344');
    a.box(-0.12, 0.24, 0.12, 0.42, 0, 4, '#9a8f78');
    const [f, h] = a.P(0, 0.33, 4); a.rect(f - 1, h - 4, 2, 2, '#f2c230');
  },
  bulguksa(a) {
    a.box(-0.46, -0.46, 0.46, 0.46, 0, 10, '#c9c1a8', { left: '#bdb59b', right: '#968e75' });
    for (let z = 3; z < 10; z += 3) a.L([-0.46, 0.46, z], [0.46, 0.46, z], '#9e967c');
    for (let i = 0; i < 4; i++) a.box(-0.12, 0.46 + i * 0.03, 0.08, 0.49 + i * 0.03, 0, 10 - i * 2.5, '#d8d0b6');
    hanok(a, -0.32, -0.3, 0.32, 0.18, 10, { wh: 13, rh: 14, o: 0.12 });
    // 석가탑 (작게)
    const [x, y] = a.P(0.36, 0.33, 10);
    for (let k = 0; k < 3; k++) { a.rect(x - 4 + k, y - 4 - k * 5, 8 - 2 * k, 4, '#d6d0be'); a.rect(x - 5 + k, y - 5 - k * 5, 10 - 2 * k, 1, '#a49e8b'); }
    a.rect(x - 1, y - 21, 2, 5, '#a49e8b');
  },
  seokguram(a) {
    const [cx, cy, rx] = a.dome(0, -0.08, 0.38, 0, 28, '#78b456');
    const r = srand(9); for (let i = 0; i < 26; i++) a.rect(cx - rx + r() * rx * 2, cy - 4 - r() * 26, 2, 1, i % 2 ? '#98d070' : '#5d9e40');
    a.box(-0.16, 0.16, 0.16, 0.44, 0, 4, C.stone);
    a.box(-0.13, 0.19, 0.13, 0.42, 4, 15, C.wall, { noTop: true });
    a.pillarsL(-0.13, 0.13, 0.42, 4, 13, 2, C.red);
    a.roof(-0.13, 0.19, 0.13, 0.42, 15, 9, 0.07, C.giwa);
    const [x, y] = a.P(0, 0.42, 4); a.rect(x - 2, y - 9, 4, 8, '#e3c76a');
  },
  sanggyeong(a) {
    // 주작대로 길
    a.q([[-0.14, -0.5, 0], [0.14, -0.5, 0], [0.14, 0.5, 0], [-0.14, 0.5, 0]], '#d9cfb4');
    for (let i = 0; i < 6; i++) a.L([-0.14, -0.5 + i * 0.2, 0], [0.14, -0.5 + i * 0.2, 0], '#bfb497');
    a.box(-0.46, -0.16, -0.14, 0.16, 0, 17, '#b8ad92'); a.box(0.14, -0.16, 0.46, 0.16, 0, 17, '#b8ad92');
    a.box(-0.14, -0.16, 0.14, 0.16, 12, 17, '#b8ad92');
    for (let z = 4; z < 17; z += 4) { a.L([-0.46, 0.16, z], [-0.14, 0.16, z], '#9b9076'); a.L([0.14, 0.16, z], [0.46, 0.16, z], '#9b9076'); }
    hanok(a, -0.34, -0.12, 0.34, 0.12, 17, { bh: 0, wh: 10, rh: 11, o: 0.1, band: '#2f7f6b' });
  },
  cheonghaejin(a) {
    waterPatch(a, -0.05, -0.5, 0.5, 0.5);
    a.box(-0.48, -0.48, 0.02, 0.48, 0, 5, '#9a6a3a', { top: '#b07c46' });
    for (let i = 0; i < 9; i++) { const v = -0.46 + i * 0.1; a.box(-0.48, v, -0.44, v + 0.06, 5, 15, '#7a4e26'); }
    a.box(-0.36, -0.36, -0.16, -0.16, 5, 30, '#8b5a2b'); a.roof(-0.36, -0.36, -0.16, -0.16, 30, 8, 0.06, '#6b4a2a', { lines: false });
    boat(a, 0.3, 0.05, 0.6, true, { flag: '#2f6fb3' });
  },
  kiln(a) {
    a.box(-0.45, -0.45, 0.45, 0.45, 0, 2, '#b8935f');
    const segs = [[-0.28, 0.2, 14], [-0.05, 0, 17], [0.18, -0.2, 20]];
    for (const [u, v, h] of segs.slice().reverse()) a.dome(u, v, 0.2, 0, h, '#a8693f');
    for (const [u, v] of segs) { const [x, y] = a.P(u, v + 0.17, 0); a.rect(x - 2, y - 6, 4, 4, '#2a140a'); a.rect(x - 1, y - 5, 2, 2, '#ff9a2a'); }
    const [cx, cy] = a.P(0.32, -0.32, 0); a.rect(cx - 2, cy - 30, 5, 22, '#7d4c2e'); a.smoke(cx, cy - 34);
    const vase = (u, v) => { const [x, y] = a.P(u, v, 0); a.ell(x, y - 5, 3, 4, '#8fc2ad'); a.rect(x - 1, y - 11, 2, 3, '#8fc2ad'); a.rect(x - 2, y - 12, 4, 1, '#6fa38e'); a.px(x - 1, y - 6, '#d7efe6'); };
    vase(0.3, 0.3); vase(0.38, 0.18); vase(0.2, 0.4);
  },
  byeokrando(a) {
    waterPatch(a, 0.0, -0.5, 0.5, 0.5);
    a.box(-0.48, -0.48, 0.1, 0.48, 0, 5, '#9a6a3a', { top: '#b07c46' });
    hanok(a, -0.44, -0.44, -0.08, -0.06, 5, { wh: 10, rh: 10, bh: 0, roof: '#9b3d30', band: '#d9a441', o: 0.07 });
    const crate = (u, v, c) => a.box(u, v, u + 0.1, v + 0.1, 5, 11, c);
    crate(-0.3, 0.2, '#b98a4a'); crate(-0.18, 0.24, '#a77a3c'); crate(-0.25, 0.08, '#c49a5a');
    const [bx, by] = a.P(-0.02, 0.36, 5); a.ell(bx, by - 4, 3, 4, '#7a4a24');
    boat(a, 0.32, 0.02, 0.7, true, { masts: 2, sail: '#d9b27a', hull: '#5e3a1c', flag: '#2a9d5c' });
  },
  janggyeong(a) {
    a.box(-0.47, -0.47, 0.47, 0.47, 0, 3, '#c7bfa6');
    const hall = (v0, v1) => {
      a.box(-0.42, v0, 0.42, v1, 3, 13, '#e8dcc0', { noTop: true });
      for (let i = 0; i < 14; i++) { const u = -0.38 + i * 0.056; a.L([u, v1, 5], [u, v1, 11], '#6b4a2a'); }
      a.pillarsL(-0.42, 0.42, v1, 3, 13, 5, '#7a4a2a', 2);
      a.roof(-0.42, v0, 0.42, v1, 13, 9, 0.06, C.giwa, { hip: 0.35 });
    };
    hall(-0.42, -0.14); hall(0.1, 0.38);
  },
  jiphyeonjeon(a) {
    a.box(-0.44, -0.44, 0.44, 0.44, 0, 3, '#c8c0a6');
    hanok(a, -0.36, -0.32, 0.36, 0.14, 3, { wh: 14, rh: 14, o: 0.12, bh: 3 });
    const [x, y] = a.P(0, 0.14, 21); a.rect(x - 6, y - 3, 12, 4, '#2b2520'); a.rect(x - 5, y - 2, 10, 2, '#e2b23a');
    const book = (u, v, c) => { a.box(u, v, u + 0.12, v + 0.08, 0, 3, c); a.box(u + 0.01, v + 0.01, u + 0.11, v + 0.07, 3, 5, shade(c, 0.3)); };
    book(-0.25, 0.26, '#3d5a8a'); book(0.05, 0.28, '#8a3d3d'); book(0.2, 0.22, '#3d7a4a');
  },
  gyeongbok(a) {
    a.box(-0.48, -0.48, 0.48, 0.48, 0, 5, '#d4ccb2');
    a.box(-0.4, -0.4, 0.4, 0.4, 5, 9, '#ddd5bc');
    for (let i = 0; i < 9; i++) { const u = -0.4 + i * 0.1; const [x, y] = a.P(u, 0.4, 9); a.rect(x, y - 3, 1, 3, '#f0ead8'); }
    a.L([-0.4, 0.4, 12], [0.4, 0.4, 12], '#f0ead8');
    hanok(a, -0.3, -0.28, 0.3, 0.2, 9, { wh: 11, rh: 7, o: 0.13, bh: 0, roofOpt: { hip: 0.9 } });
    a.box(-0.22, -0.2, 0.22, 0.12, 27, 35, C.wall, { noTop: true });
    a.pillarsL(-0.22, 0.22, 0.12, 27, 33, 4, C.red);
    a.bandL(-0.22, 0.22, 0.12, 32, 35, C.green);
    a.roof(-0.22, -0.2, 0.22, 0.12, 35, 13, 0.12, C.giwa);
    const [x, y] = a.P(0, 0.12, 32); a.rect(x - 4, y - 2, 8, 3, '#2b2520');
  },
  turtleship(a) {
    waterPatch(a, -0.5, -0.5, 0.5, 0.5);
    a.box(-0.48, -0.48, -0.3, 0.48, 0, 5, '#9a6a3a');
    a.box(-0.46, -0.44, -0.4, -0.38, 5, 30, '#6b4220'); a.L([-0.43, -0.41, 30], [-0.1, -0.41, 30], '#6b4220', 2);
    const [hx, hy] = a.P(-0.12, -0.41, 30); a.rect(hx, hy, 1, 8, '#555'); a.rect(hx - 2, hy + 8, 5, 3, '#8a8a8a');
    for (let i = 0; i < 3; i++) a.box(-0.44, 0.1 + i * 0.1, -0.34, 0.18 + i * 0.1, 5, 9, '#a87a4a');
    const [x, y] = a.P(0.12, 0.05, 0);
    a.poly([[x - 24, y - 6], [x + 22, y - 12], [x + 18, y - 2], [x - 19, y + 3]], '#7a4a24');
    a.poly([[x - 22, y - 7], [x + 20, y - 13], [x + 16, y - 24], [x - 15, y - 19]], '#3f5a3a');
    a.poly([[x - 15, y - 19], [x + 16, y - 24], [x + 5, y - 27], [x - 8, y - 24]], '#4f6b48');
    const r = srand(5); for (let i = 0; i < 14; i++) { const t = r(); a.px(x - 16 + t * 32, y - 25 + t * -2 + r() * 9, '#e8e8e8'); }
    a.poly([[x + 20, y - 14], [x + 29, y - 18], [x + 30, y - 13], [x + 21, y - 10]], '#b23a2a');
    a.rect(x + 27, y - 17, 2, 1, '#ffe08a'); a.smoke(x + 32, y - 20);
    for (let i = 0; i < 6; i++) a.line(x - 16 + i * 6, y - 2 - i, x - 18 + i * 6, y + 4 - i, '#5a3a1a');
  },
  hwaseong(a) {
    a.box(-0.48, -0.2, 0.48, 0.2, 0, 19, '#b5b0a2', { top: '#c9c4b5' });
    for (let z = 4; z < 19; z += 4) a.L([-0.48, 0.2, z], [0.48, 0.2, z], '#8e897b');
    for (let i = 0; i < 8; i++) { const u = -0.46 + i * 0.125; a.box(u, 0.14, u + 0.07, 0.2, 19, 23, '#6d6a66'); }
    const [x, y] = a.P(0, 0.2, 0); a.poly([[x - 6, y], [x - 6, y - 10], [x - 3, y - 13], [x + 3, y - 13], [x + 6, y - 10], [x + 6, y]], '#3a2a1e');
    hanok(a, -0.28, -0.12, 0.28, 0.1, 19, { bh: 0, wh: 9, rh: 6, o: 0.1, roofOpt: { hip: 0.9 } });
    a.box(-0.18, -0.08, 0.18, 0.06, 34, 40, C.wall, { noTop: true });
    a.pillarsL(-0.18, 0.18, 0.06, 34, 39, 3, C.red);
    a.roof(-0.18, -0.08, 0.18, 0.06, 40, 9, 0.1, C.giwa);
    const [f, g] = a.P(0.44, -0.15, 23); a.flag(f, g, 16, '#e8c23a');
  },
  gyujanggak(a) {
    a.q([[-0.46, 0.12, 0], [0.46, 0.12, 0], [0.46, 0.48, 0], [-0.46, 0.48, 0]], '#4a9fd8');
    a.box(-0.46, 0.12, 0.46, 0.48, -1, 0, '#4a9fd8', { noTop: true });
    const r = srand(11); for (let i = 0; i < 6; i++) { const [x, y] = a.P(-0.4 + r() * 0.8, 0.18 + r() * 0.26, 0); a.rect(x, y, 3, 2, '#5fb35a'); if (i % 2) a.px(x + 1, y - 1, '#f2a0c0'); }
    a.box(-0.4, -0.44, 0.4, 0.08, 0, 10, '#c9c1a8');
    a.box(-0.3, -0.36, 0.3, 0.02, 10, 22, C.wall, { noTop: true });
    a.pillarsL(-0.3, 0.3, 0.02, 10, 22, 4, C.red);
    a.box(-0.34, -0.4, 0.34, 0.06, 22, 24, '#8b5a2b');
    for (let i = 0; i < 9; i++) { const u = -0.33 + i * 0.083; a.L([u, 0.06, 24], [u, 0.06, 27], '#6b4220'); }
    a.L([-0.34, 0.06, 27], [0.34, 0.06, 27], '#6b4220');
    a.box(-0.26, -0.32, 0.26, -0.02, 24, 34, C.wall, { noTop: true });
    a.pillarsL(-0.26, 0.26, -0.02, 24, 31, 3, C.red); a.bandL(-0.26, 0.26, -0.02, 31, 34, C.green);
    a.roof(-0.26, -0.32, 0.26, -0.02, 34, 12, 0.12, C.giwa);
  },
  daedong_store(a) {
    a.box(-0.46, -0.46, 0.46, 0.46, 0, 3, '#c8b48a');
    a.box(-0.42, -0.42, 0.42, -0.02, 3, 17, '#a87a4a', { noTop: true });
    for (let i = 0; i < 10; i++) { const u = -0.4 + i * 0.09; a.L([u, -0.02, 3], [u, -0.02, 17], '#8a5e34'); }
    a.q([[-0.15, -0.02, 3], [0.15, -0.02, 3], [0.15, -0.02, 14], [-0.15, -0.02, 14]], '#3a2616');
    a.roof(-0.42, -0.42, 0.42, -0.02, 17, 12, 0.08, '#5b6270');
    const sack = (u, v, z) => { const [x, y] = a.P(u, v, z); a.ell(x, y - 3, 5, 4, '#e2cf9a'); a.rect(x - 4, y - 4, 8, 1, '#b89a5a'); a.px(x - 1, y - 7, '#b89a5a'); };
    sack(-0.3, 0.2, 3); sack(-0.15, 0.25, 3); sack(-0.22, 0.12, 9); sack(0.0, 0.3, 3); sack(-0.08, 0.17, 9);
    const [x, y] = a.P(0.3, 0.28, 3); a.box(0.2, 0.18, 0.42, 0.36, 5, 9, '#8b5a2b'); a.ell(x - 6, y + 1, 3, 3, '#4b2e14'); a.ell(x + 6, y - 4, 3, 3, '#4b2e14');
  },
  dongnipmun(a) {
    a.box(-0.4, -0.18, 0.4, 0.18, 0, 4, '#c9c5b8');
    a.box(-0.34, -0.14, 0.34, 0.14, 4, 34, '#e1ddd2', { right: '#b5b1a6' });
    for (let z = 8; z < 34; z += 4) a.L([-0.34, 0.14, z], [0.34, 0.14, z], '#c3bfb3');
    const [x, y] = a.P(0, 0.14, 4); a.poly([[x - 7, y], [x - 7, y - 14], [x - 5, y - 18], [x - 1, y - 20], [x + 3, y - 18], [x + 5, y - 14], [x + 5, y]], '#3a3530');
    a.box(-0.38, -0.18, 0.38, 0.18, 34, 37, '#d4d0c4');
    for (let i = 0; i < 9; i++) { const u = -0.36 + i * 0.09; a.box(u, 0.12, u + 0.05, 0.18, 37, 41, '#cbc7bb'); }
    const [p, q] = a.P(0, 0.14, 29); a.rect(p - 6, q - 3, 11, 5, '#4a4540'); a.ell(p - 1, q - 1, 2, 2, '#d23a3a'); a.rect(p - 1, q - 1, 2, 1, '#2a5fb3');
  },
  gyeongin(a) {
    a.q([[-0.5, -0.12, 0], [0.5, -0.12, 0], [0.5, 0.18, 0], [-0.5, 0.18, 0]], '#a89a86');
    for (let i = 0; i < 10; i++) { const u = -0.48 + i * 0.1; a.L([u, -0.1, 0], [u, 0.16, 0], '#6b4a2a', 2); }
    a.L([-0.5, -0.04, 1], [0.5, -0.04, 1], '#4a4a4a'); a.L([-0.5, 0.1, 1], [0.5, 0.1, 1], '#4a4a4a');
    a.box(-0.32, -0.06, 0.18, 0.12, 4, 16, '#2e2e34', { top: '#45454e' });
    a.box(0.18, -0.06, 0.34, 0.12, 4, 22, '#3a2e2a');
    a.box(0.2, -0.04, 0.32, 0.1, 22, 25, '#2a2a2a');
    a.cyl(-0.22, 0.03, 0.05, 16, 25, '#2a2a2e'); const [sx, sy] = a.P(-0.22, 0.03, 26); a.smoke(sx, sy - 2);
    for (let i = 0; i < 3; i++) { const [x, y] = a.P(-0.25 + i * 0.18, 0.12, 4); a.ell(x, y, 3, 3, '#b23a2a'); a.px(x, y, '#ffcc66'); }
    a.rect(...a.P(0.24, 0.12, 15), 3, 3, '#ffe08a');
    a.box(-0.46, -0.46, 0.2, -0.24, 0, 6, '#c9b89a');
    a.box(-0.4, -0.44, 0.1, -0.3, 6, 14, '#b85c3c', { noTop: true });
    a.roof(-0.4, -0.44, 0.1, -0.3, 14, 6, 0.04, '#4a5a6a', { lines: false });
  },
  smarttower(a) {
    a.box(-0.44, -0.44, 0.44, 0.44, 0, 3, '#c8ccd2');
    a.box(-0.24, -0.24, 0.24, 0.24, 3, 84, '#4a8fd0', { top: '#9fd0f5', right: '#2f6aa8' });
    for (let z = 8; z < 82; z += 5) { a.L([-0.24, 0.24, z], [0.24, 0.24, z], '#7fc0ee'); a.L([0.24, -0.24, z], [0.24, 0.24, z], '#4f86bf'); }
    for (let i = 1; i < 4; i++) { const u = -0.24 + i * 0.12; a.L([u, 0.24, 4], [u, 0.24, 84], '#3a7cc0'); a.L([0.24, u, 4], [0.24, u, 84], '#28609a'); }
    a.bandL(-0.24, 0.24, 0.24, 70, 74, '#5ef0e8'); a.bandR(-0.24, 0.24, 0.24, 70, 74, '#3cc6c0');
    a.box(-0.16, -0.16, 0.16, 0.16, 84, 90, '#d9e2ea');
    const [x, y] = a.P(0, 0, 90); a.rect(x, y - 16, 1, 16, '#9aa3ad'); a.rect(x - 1, y - 18, 3, 2, '#ff4040');
    const [d, e] = a.P(-0.24, 0.24, 3); a.rect(d + 8, e - 8, 6, 6, '#ffd84a');
  },

  // ---------- v1.7: 8단계 현대 ----------
  ktx(a) {
    a.box(-0.48, -0.48, 0.48, 0.48, 0, 2, '#c8ccd2');
    a.box(-0.44, -0.44, 0.16, 0.14, 2, 24, '#eef2f5', { right: '#c4ccd4', top: '#dfe6ec' });
    for (let i = 0; i < 6; i++) { const u = -0.4 + i * 0.09; a.L([u, 0.14, 7], [u, 0.14, 20], '#6fb0e0', 3); }
    for (let i = 0; i < 4; i++) { const v = -0.38 + i * 0.13; a.L([0.16, v, 7], [0.16, v, 20], '#4f8fc0', 3); }
    a.box(-0.48, -0.48, 0.2, 0.18, 24, 27, '#2f6aa8');
    const [x, y] = a.P(-0.14, 0.14, 27); a.rect(x - 6, y - 7, 13, 6, '#2f6aa8'); a.rect(x - 4, y - 6, 9, 2, '#ffffff');
    a.box(-0.47, 0.26, 0.38, 0.46, 2, 13, '#f4f6f8', { right: '#d2d9df', top: '#ffffff' });
    a.bandL(-0.47, 0.38, 0.46, 6, 8, '#2f6aa8');
    for (let i = 0; i < 6; i++) { const u = -0.42 + i * 0.13; a.bandL(u, u + 0.07, 0.46, 9, 12, '#3a4a5a'); }
    a.q([[0.38, 0.26, 2], [0.5, 0.36, 2], [0.38, 0.46, 2]], '#d2d9df'); a.q([[0.38, 0.26, 13], [0.5, 0.36, 4], [0.38, 0.46, 13]], '#e8edf1');
  },
  olympic88(a) {
    const [x, y] = a.P(0, 0, 0);
    for (let k = 0; k < 14; k++) a.ell(x, y - k, 31, 15.5, k < 2 ? '#8f8a7d' : '#c9c3b3');
    for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI; a.rect(x - 30 * Math.cos(t) - 1, y - 3 + 15 * Math.sin(t) - 8, 2, 8, '#a8a294'); }
    a.ell(x, y - 14, 31, 15.5, '#e8e2d2'); a.ell(x, y - 14, 25, 12, '#d84a3a'); a.ell(x, y - 14, 21, 10, '#3f9a3a'); a.ell(x, y - 14, 17, 7.5, '#4fb34a');
    a.rect(x - 1, y - 14, 2, 1, '#ffffff');
    a.rect(x + 22, y - 40, 2, 24, '#6b6b6b'); a.ell(x + 23, y - 41, 4, 2, '#8a8a8a'); a.flame(x + 23, y - 42, 1.2);
    a.flag(x - 26, y - 14, 22, '#2f6fb3'); a.flag(x - 18, y - 22, 22, '#d23a3a'); a.flag(x + 8, y - 26, 20, '#f2c230');
  },
  semicon(a) {
    a.box(-0.46, -0.46, 0.46, 0.46, 0, 3, '#b8c0c8');
    a.box(-0.42, -0.42, 0.3, 0.3, 3, 30, '#f0f4f8', { right: '#cdd6de', top: '#e2e9ef' });
    for (let z = 8; z < 28; z += 6) { a.bandL(-0.4, 0.28, 0.3, z, z + 3, '#7fb0e0'); a.bandR(-0.4, 0.28, 0.3, z, z + 3, '#5f90c0'); }
    a.box(0.02, -0.36, 0.26, -0.12, 30, 36, '#9aa6b2'); a.box(-0.36, -0.36, -0.12, -0.12, 30, 34, '#9aa6b2');
    for (let i = 0; i < 3; i++) a.cyl(-0.3 + i * 0.1, -0.3, 0.025, 34, 38, '#c9d1d9');
    const [x, y] = a.P(-0.06, 0.3, 21); a.rect(x - 7, y - 5, 14, 9, '#1f2f4f'); for (let i = 0; i < 4; i++) { a.rect(x - 9, y - 3 + i * 2, 2, 1, '#c9a24a'); a.rect(x + 7, y - 3 + i * 2, 2, 1, '#c9a24a'); }
    a.rect(x - 4, y - 2, 8, 4, '#3a5a8a');
  },
  airport(a) {
    a.q([[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]], '#9a9a9a');
    for (let i = 0; i < 4; i++) a.L([-0.45 + i * 0.25, 0.38, 0], [-0.35 + i * 0.25, 0.38, 0], '#ffffff', 1);
    a.box(-0.46, -0.46, 0.3, -0.06, 0, 16, '#e8eef4', { right: '#c4d0dc' });
    for (let i = 0; i < 7; i++) { const u = -0.42 + i * 0.1; a.L([u, -0.06, 4], [u, -0.06, 14], '#6fb0e0', 3); }
    a.q([[-0.5, -0.5, 16], [0.34, -0.5, 16], [0.34, -0.02, 18], [-0.5, -0.02, 18]], '#5a7a9a');
    a.cyl(0.36, -0.34, 0.05, 0, 34, '#d9e0e6'); a.cyl(0.36, -0.34, 0.09, 34, 40, '#4f8fc0'); a.cyl(0.36, -0.34, 0.04, 40, 46, '#d9e0e6');
    const [px, py] = a.P(0.1, 0.28, 2);
    a.rect(px - 14, py - 2, 28, 4, '#f4f6f8'); a.poly([[px - 3, py - 1], [px + 3, py - 1], [px + 1, py - 10], [px - 1, py - 10]], '#e2e8ee');
    a.poly([[px - 3, py + 2], [px + 3, py + 2], [px + 1, py + 10], [px - 1, py + 10]], '#d2d9df'); a.rect(px + 12, py - 6, 2, 5, '#2f6aa8');
    a.rect(px - 10, py - 1, 18, 1, '#2f6aa8');
  },
  // ---------- 9단계 우주 ----------
  naro(a) {
    a.box(-0.46, -0.46, 0.46, 0.46, 0, 4, '#8f949a');
    a.box(-0.3, -0.3, 0.3, 0.3, 4, 8, '#6b7076');
    const [x, y] = a.P(0, 0, 8);
    for (let k = 0; k < 2; k++) { const X = x - 16 + k * 3; a.rect(X, y - 78, 2, 78, '#c0392b'); }
    for (let z = 0; z < 76; z += 8) a.line(x - 16, y - z, x - 12, y - z - 8, '#a8301f', 1);
    for (let z = 10; z < 70; z += 20) a.rect(x - 14, y - z, 8, 2, '#a8301f');
    a.cyl(0.02, 0.02, 0.07, 8, 72, '#f4f6f8'); a.bandL(-0.05, 0.09, 0.09, 40, 44, '#2f6fb3');
    a.cone(0.02, 0.02, 0.07, 72, 14, '#e8edf1');
    a.rect(x - 5, y - 70 + 14, 2, 6, '#d23a3a'); a.rect(x - 2, y - 30, 5, 3, '#d23a3a');
    a.poly([[x - 9, y - 12], [x - 5, y - 20], [x - 5, y - 8]], '#c9d1d9'); a.poly([[x + 9, y - 12], [x + 5, y - 20], [x + 5, y - 8]], '#c9d1d9');
    a.smoke(x - 12, y + 2); a.smoke(x + 8, y);
  },
  radiotel(a) {
    a.box(-0.4, -0.4, 0.4, 0.4, 0, 4, '#c8ccd2');
    a.box(-0.16, -0.16, 0.16, 0.16, 4, 18, '#e2e6ea');
    const [x, y] = a.P(0, 0, 18);
    a.rect(x - 2, y - 14, 4, 14, '#9aa3ad');
    const g = a.g; g.save(); g.translate(x, y - 30); g.rotate(-0.45);
    g.fillStyle = '#f4f6f8'; g.beginPath(); g.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d2d9df'; g.beginPath(); g.ellipse(2, 2, 21, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#aab3bc'; g.lineWidth = 1; for (let k = 6; k < 22; k += 5) { g.beginPath(); g.ellipse(2, 2, k, k * 0.43, 0, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    a.line(x, y - 30, x + 10, y - 48, '#7a838d', 2); a.rect(x + 8, y - 51, 5, 4, '#f2c230');
  },
  spacestation(a) {
    a.box(-0.3, -0.3, 0.3, 0.3, 0, 6, '#9aa3ad');
    const [x, y] = a.P(0, 0, 6);
    a.rect(x - 1, y - 22, 3, 22, '#7a838d');
    a.cyl(0, 0, 0.11, 22, 44, '#e8edf1'); a.cyl(0, 0, 0.08, 44, 56, '#d2d9df'); a.dome(0, 0, 0.08, 56, 8, '#f4f6f8');
    const z = y - 36;
    for (const s of [-1, 1]) {
      a.rect(x + s * 8 - (s < 0 ? 28 : 0), z - 1, 28, 2, '#7a838d');
      for (let k = 0; k < 3; k++) { const X = s < 0 ? x - 34 + k * 9 : x + 10 + k * 9; a.rect(X, z - 9, 8, 18, '#2f5fa8'); a.rect(X + 1, z - 8, 6, 16, '#4f8fe0'); a.rect(X + 1, z - 1, 6, 1, '#2f5fa8'); }
    }
    a.rect(x - 3, y - 48, 6, 3, '#5ef0e8'); a.flag(x + 3, y - 62, 10, '#d23a3a');
  },
  moonbase(a) {
    a.q([[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]], '#a8a8b0');
    const [cx, cy] = a.P(0.3, -0.3, 0); a.ell(cx, cy, 6, 3, '#8a8a92'); a.ell(cx, cy - 1, 4, 2, '#9a9aa2');
    a.dome(-0.12, 0.05, 0.3, 0, 26, '#e8edf1');
    a.dome(0.26, 0.22, 0.15, 0, 14, '#dde3e8');
    a.box(0.02, 0.08, 0.22, 0.22, 0, 6, '#c9d1d9');
    const [x, y] = a.P(-0.12, 0.05, 0); for (let i = 0; i < 4; i++) a.rect(x - 15 + i * 8, y - 12, 4, 3, '#5ab0e8');
    a.rect(x - 3, y - 6, 6, 6, '#4a5a6a');
    a.line(x + 6, y - 30, x + 6, y - 44, '#8a8f96', 1); a.ell(x + 6, y - 45, 4, 2, '#c9d1d9');
    const [fx, fy] = a.P(-0.4, 0.34, 0); a.flag(fx, fy, 18, '#ffffff'); a.ell(fx + 4, fy - 15, 1.5, 1.5, '#d23a3a');
  },
  // ---------- 10단계 외계 (상상) ----------
  xenolab(a) {
    a.box(-0.42, -0.42, 0.42, 0.42, 0, 4, '#4a3a6a', { top: '#6a5a9a' });
    a.cyl(0, 0, 0.26, 4, 14, '#7a5ab0');
    a.cone(0, 0, 0.2, 14, 52, '#9a7ad0');
    const [x, y] = a.P(0, 0, 14);
    a.ell(x, y - 58, 7, 7, '#5ef0e8'); a.ell(x - 2, y - 60, 3, 3, '#d8fffb');
    for (let i = 0; i < 3; i++) a.rect(x - 9 + i * 7, y - 8, 4, 4, '#ffe14a');
    a.dome(0.32, 0.3, 0.1, 4, 8, '#b07aff'); a.dome(-0.32, 0.3, 0.08, 4, 7, '#5ef0e8');
    a.line(x - 18, y - 6, x - 24, y - 30, '#b07aff', 1); a.ell(x - 24, y - 31, 2, 2, '#ff7ad8');
  },
  crystal(a) {
    a.box(-0.44, -0.44, 0.44, 0.44, 0, 4, '#3a2a5a', { top: '#5a4a8a' });
    const [x, y] = a.P(0, 0, 4);
    const cr = (X, h, w, c) => { a.poly([[X - w, y - 2], [X - w, y - h + w], [X, y - h], [X + w, y - h + w], [X + w, y - 2]], c); a.poly([[X, y - h], [X + w, y - h + w], [X + w, y - 2], [X, y - 2]], shade(c, -0.25)); a.rect(X - w + 2, y - h + w + 2, 1, h / 2, '#ffffff'); };
    cr(x - 14, 34, 6, '#7af0e0'); cr(x + 12, 40, 7, '#5ad0f0'); cr(x - 2, 58, 8, '#9affef'); cr(x + 4, 26, 5, '#b07aff');
    a.ell(x, y, 26, 6, '#5ef0e855');
    a.rect(x - 20, y - 10, 2, 2, '#ffffff'); a.rect(x + 18, y - 30, 2, 2, '#ffffff');
  },
  floatgarden(a) {
    const [x, y] = a.P(0, 0, 0);
    a.ell(x, y, 22, 8, '#00000033');
    const by = y - 28;
    a.poly([[x - 26, by], [x + 26, by], [x + 8, by + 18], [x - 6, by + 22]], '#7a5a3a'); a.poly([[x, by], [x + 26, by], [x + 8, by + 18]], '#5a3e24');
    a.ell(x, by, 26, 9, '#4fb34a'); a.ell(x - 4, by - 2, 18, 6, '#6fd05a');
    for (const [dx, h, c] of [[-12, 18, '#3f9a3a'], [6, 24, '#2e8b57'], [16, 14, '#ff7ad8']]) { a.rect(x + dx, by - h + 4, 2, h - 4, '#6b4220'); a.ell(x + dx + 1, by - h + 2, 6, 5, c); }
    a.ell(x - 4, by + 1, 2, 2, '#ffe14a'); a.ell(x + 10, by + 2, 2, 2, '#ff7ad8');
    a.rect(x - 2, by + 22, 3, 3, '#7a5a3a'); a.rect(x + 4, by + 27, 2, 2, '#7a5a3a');
  },
  stargate(a) {
    a.box(-0.44, -0.44, 0.44, 0.44, 0, 4, '#4a4a6a', { top: '#6a6a8a' });
    const [x, y] = a.P(0, 0, 4); const g = a.g;
    g.fillStyle = '#2a1a5a'; g.beginPath(); g.ellipse(x, y - 30, 24, 28, 0, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 4; k++) { g.strokeStyle = ['#5ef0e8', '#b07aff', '#4f8fe0', '#d8fffb'][k]; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 30, 6 + k * 5, k * 1.3, k * 1.3 + 4); g.stroke(); }
    g.strokeStyle = '#c9c3d9'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y - 30, 24, 28, 0, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; a.rect(x + Math.cos(t) * 24 - 2, y - 30 + Math.sin(t) * 28 - 2, 4, 4, i % 2 ? '#ffe14a' : '#5ef0e8'); }
    a.box(-0.2, 0.2, 0.2, 0.34, 4, 8, '#6a6a8a');
  },
};

// 대역사 (2×2) 단계별 그림
function drawWonder(a, stage) {
  a.box(-0.98, -0.98, 0.98, 0.98, 0, 3, '#c9a26b');
  if (stage === 0) {
    for (let i = 0; i < 12; i++) { const t = -0.95 + i * 0.17; a.box(t, 0.9, t + 0.04, 0.95, 3, 11, '#c08a4a'); a.box(0.9, t, 0.95, t + 0.04, 3, 11, '#c08a4a'); }
    const [x, y] = a.P(0.3, 0.5, 3); a.rect(x, y - 18, 2, 18, '#6b4220'); a.rect(x - 10, y - 22, 22, 9, '#f0e2b6'); a.rect(x - 8, y - 20, 18, 1, '#a05a2a'); a.rect(x - 8, y - 17, 12, 1, '#a05a2a');
    return;
  }
  a.box(-0.85, -0.85, 0.85, 0.85, 3, 9, '#cfc8b4');
  if (stage >= 2) {
    for (let i = 0; i < 6; i++) { const u = -0.75 + i * 0.3; a.box(u, 0.7, u + 0.08, 0.78, 9, stage >= 3 ? 30 : 26, '#f1ede2'); a.box(0.7, u, 0.78, u + 0.08, 9, stage >= 3 ? 30 : 26, '#e2ddcf'); }
  }
  if (stage >= 3) {
    a.box(-0.7, -0.7, 0.7, 0.7, 9, 30, '#e9e3d4', { noTop: stage >= 4 });
    a.bandL(-0.7, 0.7, 0.7, 12, 26, '#7fb8e0'); a.bandR(-0.7, 0.7, 0.7, 12, 26, '#5a94bf');
    for (let i = 0; i < 8; i++) { const u = -0.7 + i * 0.2; a.L([u, 0.7, 12], [u, 0.7, 26], '#e9e3d4', 2); a.L([0.7, u, 12], [0.7, u, 26], '#cfc8b4', 2); }
  }
  if (stage >= 4) {
    a.roof(-0.7, -0.7, 0.7, 0.7, 30, 22, 0.16, '#3f4a5a', { hip: 0.6, density: 10 });
  }
  if (stage >= 5) {
    a.box(-0.3, -0.3, 0.3, 0.3, 46, 52, '#e9e3d4', { noTop: true });
    a.roof(-0.3, -0.3, 0.3, 0.3, 52, 12, 0.08, '#3f4a5a', { hip: 0.6 });
    const [x, y] = a.P(0.85, 0.85, 9); a.rect(x, y - 40, 1, 40, '#bfc6cc');
    const fx = x + 1, fy = y - 40; a.rect(fx, fy, 14, 9, '#ffffff'); a.ell(fx + 7, fy + 4.5, 2.5, 2.5, '#d23a3a'); a.rect(fx + 4.5, fy + 4.5, 5, 2, '#2a5fb3');
    a.rect(fx + 1, fy + 1, 2, 1, '#222'); a.rect(fx + 11, fy + 1, 2, 1, '#222'); a.rect(fx + 1, fy + 7, 2, 1, '#222'); a.rect(fx + 11, fy + 7, 2, 1, '#222');
    const [p, q] = a.P(0, 0.7, 30); a.rect(p - 10, q - 4, 20, 5, '#2b2520'); a.rect(p - 9, q - 3, 18, 3, '#e2b23a');
  } else if (stage >= 1) {
    // 비계와 크레인
    const [x, y] = a.P(-0.8, -0.8, 3); a.rect(x - 1, y - 70, 3, 70, '#e0a020'); a.rect(x - 1, y - 70, 46, 3, '#e0a020'); a.rect(x + 40, y - 67, 1, 22, '#555'); a.rect(x + 37, y - 46, 7, 5, '#777');
    for (let k = 0; k < 10; k++) a.line(x, y - 66 + k * 7, x + 2, y - 60 + k * 7, '#b07810');
  }
}

// 꾸미기
const DECOR_DRAW = {
  d_pine(a) { pine(a, 0, 0, 1); },
  d_flower(a) {
    a.q([[-0.38, -0.38, 0], [0.38, -0.38, 0], [0.38, 0.38, 0], [-0.38, 0.38, 0]], '#8a6a3e');
    const r = srand(21), cols = ['#f25c78', '#ffd34a', '#ffffff', '#b06ae0', '#ff8a3a'];
    for (let i = 0; i < 34; i++) { const [x, y] = a.P(-0.34 + r() * 0.68, -0.34 + r() * 0.68, 0); a.rect(x, y - 2, 1, 2, '#3d8a3a'); a.rect(x - 1, y - 3, 2, 2, cols[i % 5]); }
  },
  d_road(a) {
    a.q([[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]], '#b9b2a0');
    const r = srand(4); for (let i = 0; i < 14; i++) { const [x, y] = a.P(-0.42 + r() * 0.84, -0.42 + r() * 0.84, 0); a.ell(x, y, 4, 2, i % 2 ? '#cfc8b6' : '#a8a08c'); }
  },
  d_stonetower(a) {
    const [x, y] = a.P(0, 0, 0);
    const st = [[10, 4], [8, 4], [7, 3], [5, 3], [4, 3], [3, 2], [2, 2]]; let yy = y;
    st.forEach(([w, h], i) => { a.ell(x + (i % 2 ? 1 : -1), yy - h / 2, w, h, i % 2 ? '#a49e8e' : '#8f897a'); yy -= h + 1; });
  },
  d_jangseung(a) {
    const pole = (u, v, face, hat) => {
      const [x, y] = a.P(u, v, 0); a.rect(x - 3, y - 30, 6, 30, '#a0703a'); a.rect(x + 1, y - 30, 2, 30, '#86592c');
      a.rect(x - 4, y - 34, 8, 5, hat); a.rect(x - 2, y - 26, 1, 2, '#222'); a.rect(x + 1, y - 26, 1, 2, '#222'); a.rect(x - 2, y - 21, 4, 1, face);
      a.rect(x - 1, y - 16, 2, 8, '#2a2a2a');
    };
    pole(-0.15, 0.05, '#c0392b', '#222'); pole(0.18, -0.1, '#c0392b', '#7a3a1a');
  },
  d_pond(a) {
    a.q([[-0.4, -0.4, 0], [0.4, -0.4, 0], [0.4, 0.4, 0], [-0.4, 0.4, 0]], '#9a9384');
    a.q([[-0.32, -0.32, 0], [0.32, -0.32, 0], [0.32, 0.32, 0], [-0.32, 0.32, 0]], '#4a9fd8');
    const r = srand(8); for (let i = 0; i < 6; i++) { const [x, y] = a.P(-0.25 + r() * 0.5, -0.25 + r() * 0.5, 0); a.ell(x, y, 3, 1.5, '#5fb35a'); if (i % 2) a.rect(x, y - 2, 2, 2, '#f4a3c4'); }
    const [x, y] = a.P(0.1, -0.1, 0); a.rect(x, y, 5, 1, '#9fdcff');
  },
  d_lantern(a) {
    a.box(-0.12, -0.12, 0.12, 0.12, 0, 3, '#a8a294'); a.box(-0.04, -0.04, 0.04, 0.04, 3, 18, '#b5af9f');
    a.box(-0.1, -0.1, 0.1, 0.1, 18, 27, '#c4beae'); const [x, y] = a.P(0, 0.1, 21); a.rect(x - 2, y - 3, 4, 4, '#ffd34a');
    a.roof(-0.1, -0.1, 0.1, 0.1, 27, 7, 0.05, '#a8a294', { lines: false, upturn: false });
  },
  d_flagpole(a) {
    a.box(-0.15, -0.15, 0.15, 0.15, 0, 4, '#b5b0a2');
    const [x, y] = a.P(0, 0, 4); a.rect(x, y - 52, 1, 52, '#cfd6dc'); a.rect(x - 1, y - 54, 3, 2, '#e8c23a');
    const fx = x + 1, fy = y - 52; a.rect(fx, fy, 18, 12, '#ffffff'); a.ell(fx + 9, fy + 6, 3.5, 3.5, '#d23a3a'); a.rect(fx + 5.5, fy + 6, 7, 2.5, '#2a5fb3');
    [[1, 1], [14, 1], [1, 9], [14, 9]].forEach(([dx, dy]) => a.rect(fx + dx, fy + dy, 3, 1, '#222'));
  },
};

// 나무·바위 (풍경)
function pine(a, u, v, s) {
  const [x, y] = a.P(u, v, 0);
  a.rect(x - 1, y - 8 * s, 3, 8 * s, '#6b4220');
  const tiers = [[13, 12, 0], [10, 11, 8], [7, 10, 15], [4, 8, 21]];
  tiers.forEach(([w, h, o], i) => {
    const ww = w * s, hh = h * s, yy = y - 6 * s - o * s;
    a.poly([[x - ww, yy], [x, yy - hh], [x + ww, yy]], i % 2 ? '#2f7d43' : '#2a6e3b');
    a.poly([[x, yy - hh], [x + ww, yy], [x + 1, yy]], '#215a30');
    a.rect(x - ww * 0.5, yy - 2, 2, 1, '#4aa35e');
  });
}
function roundTree(a, u, v, s, col = '#4f9a3e') {
  const [x, y] = a.P(u, v, 0);
  a.rect(x - 1, y - 9 * s, 3, 9 * s, '#6b4220');
  a.ell(x, y - 17 * s, 11 * s, 10 * s, shade(col, -0.15));
  a.ell(x - 3 * s, y - 19 * s, 8 * s, 8 * s, col);
  a.ell(x - 5 * s, y - 22 * s, 4 * s, 3 * s, shade(col, 0.3));
}

// ---------- 공개: 스프라이트 생성 ----------
const cache = new Map();
function makeSprite(key, w, h, ox, oy, fn, opt) {
  if (cache.has(key)) return cache.get(key);
  const a = new Art(w, h, ox, oy); fn(a); finish(a, opt);
  const spr = { img: a.c, w, h, ox, oy, mask: null };
  cache.set(key, spr); return spr;
}

function decoFlags(a, tier) {
  const L = a.P(-0.44, 0.38, 0), R = a.P(0.38, -0.44, 0);
  const cols = ['#d23a3a', '#2f6fb3', '#f2c230', '#2a9d5c', '#ffffff'];
  a.flag(L[0], L[1], 24, cols[0]); a.flag(R[0], R[1], 24, cols[1]);
  a.rect(L[0], L[1] - 22, 2, 2, cols[2]); a.rect(R[0], R[1] - 22, 2, 2, cols[3]);
  if (tier >= 2) { a.flag(L[0] + 1, L[1] - 1, 30, '#f2c230'); a.flag(R[0] + 1, R[1] - 1, 30, '#f2c230'); }
}

// 그림 파일(투명 PNG)로 만든 스프라이트 — 3배 해상도로 보관하고 월드 크기로 그림
const RES = 3;
function imgSprite(key, im, worldW, tileUnits, tier) {
  if (cache.has(key)) return cache.get(key);
  const w = worldW, h = Math.max(8, Math.round(im.height / im.width * worldW));
  const ox = w / 2, oy = h - TH / 2 * tileUnits;
  const a = new Art(w, h, ox, oy);
  a.c = cnv(w * RES, h * RES); a.g = a.c.getContext('2d');
  a.g.imageSmoothingEnabled = true; a.g.imageSmoothingQuality = 'high';
  a.g.drawImage(im, 0, 0, w * RES, h * RES);
  if (tier >= 1 && tileUnits === 1) { a.g.save(); a.g.scale(RES, RES); decoFlags(a, tier); a.g.restore(); }
  a.w = w * RES; a.h = h * RES;
  if (tier >= 2) { finish(a, { outline: '#ffcf3a', tint: '#ffe27a', tintA: 0.12 }); finish(a, { outline: '#ffe27a' }); }
  else finish(a, { outline: false });
  const spr = { img: a.c, w, h, ox, oy, res: RES, mask: null };
  cache.set(key, spr); return spr;
}
// 서 있는 그림(나무·주민·병사): 바닥 가운데를 기준점으로, 높이를 world px 로 맞춰요
function uprightSprite(key, im, worldH, opt = {}) {
  if (cache.has(key)) return cache.get(key);
  const h = worldH, w = Math.max(4, Math.round(im.width / im.height * worldH));
  const c = cnv(w * RES, h * RES), g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w * RES, h * RES);
  if (opt.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = opt.tintA || 0.2; g.fillStyle = opt.tint; g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  const spr = { img: c, w, h, ox: w / 2, oy: h - (opt.foot ?? 2), res: RES, mask: null };
  cache.set(key, spr); return spr;
}
function fitCanvas(im, size) {
  const c = cnv(size, size), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const k = Math.min(size / im.width, size / im.height), w = im.width * k, h = im.height * k;
  g.drawImage(im, (size - w) / 2, (size - h) / 2, w, h); return c;
}

export function buildingSprite(type, tier = 0) {
  const im = getImage('buildings', type);
  if (im) return imgSprite(`bi_${type}_${tier}`, im, 64, 1, tier);
  return makeSprite(`b_${type}_${tier}`, 64, 128, 32, 112, a => {
    DRAW[type]?.(a);
    if (tier >= 1) decoFlags(a, tier);
  }, tier >= 2 ? { outline: '#ffcf3a', tint: '#ffe27a', tintA: 0.12 } : {});
}
export function wonderSprite(stage) {
  const im = getImage('wonder', 'stage' + stage);
  if (im) return imgSprite(`wi_${stage}`, im, 128, 2, 0);
  return makeSprite(`w_${stage}`, 128, 176, 64, 144, a => drawWonder(a, stage), stage >= 5 ? { outline: '#ffcf3a' } : {});
}
export function decorSprite(id) {
  const im = getImage('decor', id);
  if (im) return imgSprite(`di_${id}`, im, 64, 1, 0);
  return makeSprite(`d_${id}`, 64, 112, 32, 96, a => DECOR_DRAW[id]?.(a));
}
// 배경 나무·바위 그림 (img/scenery) — 같은 종류 안에서 여러 그림을 섞어 써요
const SCENERY_IMG = { pine: ['pine', 'pine', 'pine', 'pine2', 'pine2', 'bamboo'], round: ['round', 'round', 'blossom'], autumn: ['maple', 'ginkgo'], bush: ['bush', 'azalea', 'grass'], rock: ['rock', 'mossrock'] };
const SCENERY_H = { pine: 66, pine2: 58, bamboo: 52, round: 54, blossom: 54, maple: 54, ginkgo: 58, bush: 22, azalea: 22, grass: 16, rock: 16, mossrock: 18 };
export function treeSprite(kind, size, pick = 0) {
  const opts = (SCENERY_IMG[kind] || []).filter(k => getImage('scenery', k));
  if (opts.length) { const k = opts[Math.min(opts.length - 1, Math.floor(pick * opts.length))]; return uprightSprite(`sc_${k}_${size}`, getImage('scenery', k), Math.round(SCENERY_H[k] * size)); }
  return makeSprite(`t_${kind}_${size}`, 48, 72, 24, 64, a => {
    a.ox = 24; a.oy = 64;
    if (kind === 'pine') pine(a, 0, 0, size);
    else if (kind === 'round') roundTree(a, 0, 0, size);
    else if (kind === 'autumn') roundTree(a, 0, 0, size, '#d98a2a');
    else if (kind === 'rock') { const [x, y] = a.P(0, 0, 0); a.ell(x, y - 4 * size, 8 * size, 5 * size, '#9a978e'); a.ell(x - 2, y - 6 * size, 4 * size, 2.5 * size, '#b8b5ab'); }
    else if (kind === 'bush') { const [x, y] = a.P(0, 0, 0); a.ell(x, y - 4, 8 * size, 5 * size, '#4a8f3a'); a.ell(x - 2, y - 6, 4 * size, 3 * size, '#6fb850'); a.px(x + 3, y - 6, '#f25c78'); }
  });
}

// 우주·외계 시대의 배경 장식 (나무 대신 바위·안테나·수정·외계 식물)
export function themeScenery(theme, pick) {
  const k = Math.floor(pick * 4);
  return makeSprite(`ts_${theme}_${k}`, 48, 72, 24, 64, a => {
    a.ox = 24; a.oy = 64; const [x, y] = a.P(0, 0, 0);
    if (theme === 'space') {
      if (k === 0) { a.ell(x, y - 3, 9, 5, '#8a8a96'); a.ell(x - 2, y - 5, 5, 2.5, '#a8a8b4'); }
      else if (k === 1) { a.ell(x, y, 10, 4, '#7a7a86'); a.ell(x, y - 1, 7, 2.5, '#5f5f6c'); }
      else if (k === 2) { a.rect(x - 1, y - 26, 2, 26, '#9aa3ad'); a.ell(x, y - 28, 6, 3, '#d9e0e6'); a.rect(x + 3, y - 32, 1, 4, '#ff4040'); }
      else { a.ell(x - 4, y - 4, 6, 5, '#9a9aa8'); a.ell(x + 5, y - 3, 4, 3, '#8a8a96'); a.rect(x - 1, y - 9, 2, 1, '#c9c9d4'); }
    } else {
      if (k === 0) { a.poly([[x - 4, y], [x - 4, y - 16], [x, y - 22], [x + 4, y - 16], [x + 4, y]], '#7af0e0'); a.poly([[x, y - 22], [x + 4, y - 16], [x + 4, y], [x, y]], '#4ac0b0'); a.rect(x - 3, y - 14, 1, 6, '#ffffff'); }
      else if (k === 1) { a.rect(x - 1, y - 18, 2, 18, '#3a8a5a'); a.ell(x, y - 20, 8, 5, '#ff7ad8'); a.ell(x, y - 21, 4, 2, '#ffc0ec'); }
      else if (k === 2) { a.rect(x - 2, y - 10, 4, 10, '#d8d0f0'); a.ell(x, y - 11, 9, 5, '#b07aff'); a.ell(x - 3, y - 13, 2, 1.5, '#ffffff'); a.ell(x + 3, y - 12, 1.5, 1, '#ffffff'); }
      else { for (const [dx, h] of [[-5, 14], [0, 20], [5, 12]]) { a.rect(x + dx, y - h, 2, h, '#5ab05a'); a.ell(x + dx + 1, y - h, 3, 3, '#ffe14a'); } }
    }
  });
}

// 지면 타일
const THEME_TILE = {
  space: { grass: '#a9a9b6', locked: '#878795', dirt: '#9a9aa8', plaza: '#cfd0da' },
  alien: { grass: '#6a4aa8', locked: '#523a88', dirt: '#7a62a8', plaza: '#a296cc' },
};
export function tileSprite(kind, variant = 0, theme = '') {
  return makeSprite(`tile_${kind}_${variant}_${theme || ''}`, 64, 32, 32, 16, a => {
    const top = (theme && THEME_TILE[theme]?.[kind]) || { grass: '#7cc05a', locked: '#5f9a46', dirt: '#d2ae74', plaza: '#cdbb94', water: '#3f95d4' }[kind] || '#7cc05a';
    if (theme && (kind === 'grass' || kind === 'locked')) {
      a.q([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], top);
      const r = srand(variant * 31 + 7);
      for (let i = 0; i < 10; i++) { const [x, y] = a.P(-0.42 + r() * 0.84, -0.42 + r() * 0.84); a.rect(x, y, 2, 1, i % 2 ? shade(top, -0.15) : shade(top, 0.12)); }
      if (variant === 2) { const [x, y] = a.P(0.1, -0.1); a.ell(x, y, 5, 2.5, shade(top, -0.2)); a.ell(x, y - 0.5, 4, 1.8, shade(top, -0.08)); }
      if (theme === 'alien' && variant === 3) { const [x, y] = a.P(-0.2, 0.2); a.rect(x, y, 2, 1, '#5ef0e8'); a.rect(x + 6, y - 3, 1, 1, '#ff7ad8'); }
      return;
    }
    a.q([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], top);
    const r = srand(variant * 31 + kind.length * 7 + 1);
    if (kind === 'grass' || kind === 'locked') {
      for (let i = 0; i < 16; i++) { const [x, y] = a.P(-0.45 + r() * 0.9, -0.45 + r() * 0.9); a.rect(x, y, 2, 1, i % 3 ? shade(top, -0.12) : shade(top, 0.15)); }
      if (variant === 3) for (let i = 0; i < 3; i++) { const [x, y] = a.P(-0.3 + r() * 0.6, -0.3 + r() * 0.6); a.rect(x, y, 1, 1, ['#fff', '#ffd34a', '#f25c78'][i]); }
    } else if (kind === 'dirt' || kind === 'plaza') {
      for (let i = 0; i < 12; i++) { const [x, y] = a.P(-0.42 + r() * 0.84, -0.42 + r() * 0.84); a.rect(x, y, 2, 1, shade(top, -0.12)); }
    } else if (kind === 'water') {
      for (let i = 0; i < 6; i++) { const [x, y] = a.P(-0.4 + r() * 0.8, -0.4 + r() * 0.8); a.rect(x, y, 4, 1, '#8fd0f5'); }
    }
  }, { outline: false });
}
// 섬 가장자리 절벽 (아래쪽 두 면)
const THEME_CLIFF = { space: ['#7a7a88', '#5c5c6a', '#5f5f6e', '#4c4c5a', '#9a9aa8', '#82828f'], alien: ['#5a3a7a', '#43285e', '#4a2e68', '#35204e', '#7a5ab0', '#62469a'] };
export function cliffSprite(side, theme = '') {
  return makeSprite(`cliff_${side}_${theme || ''}`, 64, 64, 32, 16, a => {
    const H = 28; const T = theme && THEME_CLIFF[theme];
    if (side === 'L') a.q([[-0.5, 0.5, 0], [0.5, 0.5, 0], [0.5, 0.5, -H], [-0.5, 0.5, -H]], T ? T[0] : '#a8794a');
    else a.q([[0.5, -0.5, 0], [0.5, 0.5, 0], [0.5, 0.5, -H], [0.5, -0.5, -H]], T ? T[1] : '#86592f');
    const r = srand(side === 'L' ? 3 : 5);
    for (let i = 0; i < 10; i++) {
      const t = r(), z = -4 - r() * (H - 8);
      const p = side === 'L' ? a.P(-0.45 + t * 0.9, 0.5, z) : a.P(0.5, -0.45 + t * 0.9, z);
      a.rect(p[0], p[1], 4, 1, T ? (side === 'L' ? T[2] : T[3]) : side === 'L' ? '#8e6239' : '#6e4824');
    }
    if (side === 'L') a.q([[-0.5, 0.5, 0], [0.5, 0.5, 0], [0.5, 0.5, -3], [-0.5, 0.5, -3]], T ? T[4] : '#5f9a46');
    else a.q([[0.5, -0.5, 0], [0.5, 0.5, 0], [0.5, 0.5, -3], [0.5, -0.5, -3]], T ? T[5] : '#4f8a3a');
  }, { outline: false });
}

// 마을 사람 — 시대마다 옷차림이 바뀌어요 (2프레임 걷기)
const SKIN = '#f2c9a0';
// legs: pants | skirt | robe | bare   hair: short long sangtu bun braid bald bob gache
// hat: none band jeolpung bokdu geon gat paeraengi jeollip fedora schoolcap cap helmet
export const ERA_PEOPLE = [
  null,
  [ // 1 선사·고조선 — 짐승 가죽·삼베 옷
    { top: '#a8794a', bot: '#8b5a2b', legs: 'bare', belt: '#d9c08a', hair: '#2a1a10', hs: 'long', hat: 'band', hatCol: '#c0392b', item: 'spear' },
    { top: '#c9a06a', bot: '#a8794a', legs: 'bare', belt: '#7a4a24', hair: '#2a1a10', hs: 'long', item: 'basket' },
    { top: '#9c7a4a', bot: '#7a5a34', legs: 'bare', belt: '#d9c08a', hair: '#2a1a10', hs: 'sangtu', item: 'spear' },
    { top: '#bfa070', bot: '#9c7a4a', legs: 'bare', hair: '#2a1a10', hs: 'short' },
    { top: '#e8dcc0', bot: '#d8c8a0', legs: 'robe', belt: '#c9a24a', hair: '#2a1a10', hs: 'long', item: 'mirror' },
    { top: '#d9b98a', bot: '#a8794a', legs: 'bare', hair: '#2a1a10', hs: 'long', hat: 'band', hatCol: '#2f6fb3' },
  ],
  [ // 2 삼국 — 고구려 벽화의 점무늬 저고리·주름치마
    { top: '#f6e7c4', dots: '#d0453a', bot: '#3d5fa0', belt: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'jeolpung' },
    { top: '#f6e7c4', dots: '#3d5fa0', bot: '#d84f6a', stripe: '#f6e7c4', legs: 'skirt', belt: '#2a2a2a', hair: '#1a1a1a', hs: 'bun' },
    { top: '#3d8a6a', bot: '#e8d8b0', belt: '#f2c230', hair: '#1a1a1a', hs: 'sangtu' },
    { top: '#8a8f96', bot: '#5a3a1e', belt: '#d23a3a', hair: '#1a1a1a', hs: 'short', hat: 'helmet', item: 'spear' },
    { top: '#f2c230', bot: '#2f6fb3', stripe: '#d23a3a', legs: 'skirt', hair: '#1a1a1a', hs: 'bun' },
    { top: '#e8443a', bot: '#f4f0e6', hair: '#1a1a1a', hs: 'short' },
  ],
  [ // 3 통일신라·발해 — 복두 쓴 관리, 가슴까지 올린 치마
    { top: '#2e8b57', bot: '#2e8b57', legs: 'robe', belt: '#f2c230', hair: '#1a1a1a', hs: 'short', hat: 'bokdu' },
    { top: '#6a5acd', bot: '#6a5acd', legs: 'robe', belt: '#f2c230', hair: '#1a1a1a', hs: 'short', hat: 'bokdu' },
    { top: '#f4f0e6', bot: '#e07a9a', legs: 'skirt', high: true, belt: '#2f6fb3', hair: '#1a1a1a', hs: 'bun', scarf: '#9fd0ff' },
    { top: '#8a8f96', bot: '#8a8f96', legs: 'robe', hair: '#1a1a1a', hs: 'bald' },
    { top: '#e9e2c9', bot: '#8a6a3a', belt: '#5a3a1a', hair: '#1a1a1a', hs: 'sangtu', item: 'basket' },
    { top: '#f2d3dc', bot: '#5a8a3a', legs: 'skirt', high: true, belt: '#c0392b', hair: '#1a1a1a', hs: 'bun' },
  ],
  [ // 4 고려 — 흰옷(백의)과 두건, 불교 나라의 스님
    { top: '#f4f0e6', bot: '#f4f0e6', legCol: '#e0dccf', belt: '#8a8f96', hair: '#1a1a1a', hs: 'short', hat: 'geon' },
    { top: '#f4f0e6', bot: '#d8c49a', legs: 'skirt', long: true, belt: '#c0392b', hair: '#1a1a1a', hs: 'bun', item: 'basket' },
    { top: '#8a8f96', bot: '#8a8f96', legs: 'robe', hair: '#1a1a1a', hs: 'bald' },
    { top: '#3d5fa0', bot: '#3d5fa0', legs: 'robe', belt: '#f2c230', hair: '#1a1a1a', hs: 'short', hat: 'bokdu' },
    { top: '#8a8f96', bot: '#5a3a1e', belt: '#d23a3a', hair: '#1a1a1a', hs: 'short', hat: 'helmet', item: 'spear' },
    { top: '#f4f0e6', bot: '#c0392b', hair: '#1a1a1a', hs: 'braid' },
  ],
  [ // 5 조선 전기 — 갓 쓴 선비, 저고리·치마
    { top: '#f4f0e6', bot: '#f4f0e6', legs: 'robe', collar: '#2a2a2a', goreum: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'gat', item: 'book' },
    { top: '#f2d3dc', bot: '#2f6fb3', legs: 'skirt', collar: '#c0392b', goreum: '#c0392b', hair: '#1a1a1a', hs: 'bun' },
    { top: '#efe9d8', bot: '#efe9d8', legCol: '#dcd5c0', haeng: true, hair: '#1a1a1a', hs: 'sangtu', item: 'jige' },
    { top: '#fff2b0', bot: '#c0392b', legs: 'skirt', collar: '#2f6fb3', goreum: '#2f6fb3', hair: '#1a1a1a', hs: 'bun' },
    { top: '#2f5f9a', bot: '#2a2a2a', belt: '#d23a3a', hair: '#1a1a1a', hs: 'short', hat: 'jeollip', item: 'spear' },
    { top: '#f2c230', bot: '#d23a3a', legs: 'skirt', collar: '#2f6fb3', hair: '#1a1a1a', hs: 'braid' },
  ],
  [ // 6 조선 후기 — 보부상의 패랭이·지게, 가채 머리
    { top: '#e9e2c9', bot: '#e9e2c9', legCol: '#d8d0b8', haeng: true, hair: '#1a1a1a', hs: 'short', hat: 'paeraengi', item: 'jige' },
    { top: '#d8e6f2', bot: '#d8e6f2', legs: 'robe', collar: '#2a2a2a', goreum: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'gat', item: 'fan' },
    { top: '#f6e7c4', bot: '#5a3a8a', legs: 'skirt', collar: '#5a3a8a', goreum: '#d23a3a', hair: '#1a1a1a', hs: 'gache' },
    { top: '#efe9d8', bot: '#7a8a5a', legs: 'skirt', collar: '#7a8a5a', hair: '#1a1a1a', hs: 'bun', item: 'basket' },
    { top: '#d8c49a', bot: '#7a6a4a', hair: '#1a1a1a', hs: 'sangtu', hat: 'band', hatCol: '#222' },
    { top: '#f4f0e6', bot: '#3d6fb0', hair: '#1a1a1a', hs: 'braid' },
  ],
  [ // 7 근현대 — 중절모·양복, 신여성, 교복, 오늘날 옷
    { top: '#2b2b33', bot: '#2b2b33', collar: '#ffffff', goreum: '#c0392b', hair: '#1a1a1a', hs: 'short', hat: 'fedora' },
    { top: '#f4f0e6', bot: '#1b1f2a', legs: 'skirt', collar: '#1b1f2a', hair: '#1a1a1a', hs: 'bob' },
    { top: '#1b1f2a', bot: '#1b1f2a', goreum: '#f2c230', hair: '#1a1a1a', hs: 'short', hat: 'schoolcap', item: 'bag' },
    { top: '#e85a5a', bot: '#3a4a6a', hair: '#1a1a1a', hs: 'long' },
    { top: '#5ab0e8', bot: '#444444', hair: '#222', hs: 'short', hat: 'cap', hatCol: '#2a5fb3' },
    { top: '#f4f0e6', bot: '#2f6fb3', legs: 'skirt', collar: '#2f6fb3', goreum: '#d23a3a', hair: '#8a8a8a', hs: 'bun' },
  ],
  [ // 8 현대 — 티셔츠·청바지·후드티, 운동복
    { top: '#f2c230', bot: '#3d5fa0', hair: '#1a1a1a', hs: 'short', item: 'phone' },
    { top: '#e85a8a', bot: '#2a2a3a', legs: 'skirt', hair: '#3a2a1a', hs: 'long', item: 'bag' },
    { top: '#3aa86a', bot: '#3d5fa0', hair: '#1a1a1a', hs: 'short', hat: 'cap', hatCol: '#d23a3a' },
    { top: '#ffffff', bot: '#2a2a2a', collar: '#2a2a2a', hair: '#1a1a1a', hs: 'short', item: 'phone' },
    { top: '#5ab0e8', bot: '#5ab0e8', sleeve: '#ffffff', hair: '#2a1a10', hs: 'bob' },
    { top: '#8a5ad0', bot: '#3a4a6a', hair: '#1a1a1a', hs: 'braid', item: 'book' },
  ],
  [ // 9 우주 — 우주복·연구원 가운
    { top: '#f4f6f8', bot: '#e2e6ea', belt: '#d23a3a', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm' },
    { top: '#f4f6f8', bot: '#e2e6ea', belt: '#2f6fb3', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm' },
    { top: '#ffffff', bot: '#4a5a6a', collar: '#5ab0e8', hair: '#3a2a1a', hs: 'bun', item: 'book' },
    { top: '#f28a2a', bot: '#f28a2a', belt: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm' },
    { top: '#ffffff', bot: '#2a3a5a', collar: '#2a3a5a', hair: '#1a1a1a', hs: 'short', item: 'phone' },
    { top: '#2a3a5a', bot: '#2a3a5a', belt: '#5ef0e8', hair: '#1a1a1a', hs: 'bob' },
  ],
  [ // 10 외계 — 초록·보랏빛 외계 친구들과 미래 옷
    { top: '#b07aff', bot: '#6a3aa0', skin: '#8ae08a', hair: '#8ae08a', hs: 'bald', hat: 'antenna' },
    { top: '#5ef0e8', bot: '#2a6a8a', skin: '#a8b8ff', hair: '#a8b8ff', hs: 'bald', hat: 'antenna' },
    { top: '#f4f6f8', bot: '#5a4a8a', belt: '#5ef0e8', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm' },
    { top: '#ff7ad8', bot: '#5a2a6a', skin: '#ffd08a', hair: '#ff7ad8', hs: 'long' },
    { top: '#2a2a4a', bot: '#2a2a4a', belt: '#ffe14a', skin: '#8ae08a', hair: '#8ae08a', hs: 'bald', hat: 'antenna' },
    { top: '#ffe14a', bot: '#3a3a6a', hair: '#1a1a1a', hs: 'bun' },
  ],
];
// 시대별 병사 (전쟁·보스전에서 우리 편으로 나와요)
export const ERA_SOLDIER = [null,
  { top: '#a8794a', bot: '#8b5a2b', legs: 'bare', hair: '#2a1a10', hs: 'long', hat: 'band', hatCol: '#c0392b', item: 'spear' },
  { top: '#8a8f96', dots: '#5a6068', bot: '#5a3a1e', hair: '#1a1a1a', hs: 'short', hat: 'helmet', item: 'spear' },
  { top: '#8a8f96', dots: '#5a6068', bot: '#3d3a3a', hair: '#1a1a1a', hs: 'short', hat: 'helmet', item: 'spear' },
  { top: '#9aa0a6', bot: '#5a3a1e', hair: '#1a1a1a', hs: 'short', hat: 'helmet', item: 'spear' },
  { top: '#2f5f9a', bot: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'jeollip', item: 'spear' },
  { top: '#2f5f9a', bot: '#2a2a2a', hair: '#1a1a1a', hs: 'short', hat: 'jeollip', item: 'spear' },
  { top: '#5a6a4a', bot: '#4a5a3a', hair: '#1a1a1a', hs: 'short', hat: 'cap', hatCol: '#4a5a3a', item: 'flag' },
  { top: '#4a5a6a', bot: '#3a4a5a', hair: '#1a1a1a', hs: 'short', hat: 'cap', hatCol: '#3a4a5a', item: 'flag' },
  { top: '#f4f6f8', bot: '#e2e6ea', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm', item: 'flag' },
  { top: '#5ef0e8', bot: '#2a4a6a', hair: '#1a1a1a', hs: 'short', hat: 'spacehelm', item: 'flag' },
];

function g0() {}
function drawPerson(a, c, frame) {
  const x = 8, y = 25, R = (X, Y, w, h, col) => a.rect(X, Y, w, h, col);
  const lL = frame ? 1 : 0, lR = frame ? 0 : 1, shoe = c.shoes || '#3a2a1a';
  if (c.item === 'jige') { R(x - 6, y - 19, 1, 15, '#8b5a2b'); R(x + 5, y - 19, 1, 15, '#8b5a2b'); R(x - 6, y - 16, 12, 1, '#8b5a2b'); R(x - 5, y - 21, 10, 3, '#c9a35a'); }
  // 다리·아랫도리
  if (c.legs === 'skirt') {
    const top = c.high ? y - 13 : y - 10;
    a.poly([[x - 4, top], [x + 4, top], [x + 6, y - 1], [x - 6, y - 1]], c.bot);
    if (c.stripe) for (let i = 0; i < 4; i++) R(x - 4 + i * 3, y - 7, 1, 6, c.stripe);
    R(x - 3 + lL, y - 1, 2, 1, shoe); R(x + 1 - lR, y - 1, 2, 1, shoe);
  } else {
    const lc = c.legs === 'bare' ? (c.skin || SKIN) : (c.legCol || shade(c.bot, -0.2));
    R(x - 3, y - 6 + lL, 2, 5 - lL, lc); R(x + 1, y - 6 + lR, 2, 5 - lR, lc);
    R(x - 3, y - 1, 2, 1, shoe); R(x + 1, y - 1, 2, 1, shoe);
    if (c.haeng) { R(x - 3, y - 4 + lL, 2, 2, '#f4f0e6'); R(x + 1, y - 4 + lR, 2, 2, '#f4f0e6'); }
    if (c.legs === 'bare') R(x - 4, y - 9, 8, 3, c.bot);
    else R(x - 4, y - 9, 8, 4, c.bot);
    if (c.legs === 'robe') a.poly([[x - 4, y - 10], [x + 4, y - 10], [x + 5, y - 3], [x - 5, y - 3]], c.top);
  }
  // 윗도리
  const th = c.long ? 8 : 6;
  if (!(c.legs === 'skirt' && c.high)) R(x - 4, y - 15, 8, th, c.top); else R(x - 4, y - 15, 8, 3, c.top);
  if (c.dots) for (const [dx, dy] of [[-3, -14], [0, -13], [2, -14], [-2, -11], [1, -10], [3, -12]]) R(x + dx, y + dy, 1, 1, c.dots);
  if (c.collar) { R(x - 1, y - 15, 1, 3, c.collar); R(x, y - 13, 2, 1, c.collar); }
  if (c.goreum) R(x + 1, y - 12, 1, 3, c.goreum);
  if (c.belt) R(x - 4, c.legs === 'skirt' && c.high ? y - 13 : y - 10, 8, 1, c.belt);
  if (c.scarf) { R(x - 5, y - 15, 10, 1, c.scarf); R(x - 5, y - 14, 1, 5, c.scarf); R(x + 4, y - 14, 1, 5, c.scarf); }
  const ac = c.sleeve || c.top;
  R(x - 5, y - 14 + frame, 1, 4, ac); R(x + 4, y - 14 + (1 - frame), 1, 4, ac);
  R(x - 5, y - 10 + frame, 1, 1, c.skin || SKIN); R(x + 4, y - 10 + (1 - frame), 1, 1, c.skin || SKIN);
  // 얼굴
  const SK = c.skin || SKIN;
  R(x - 3, y - 20, 6, 5, SK); R(x - 2, y - 18, 1, 1, '#222'); R(x + 1, y - 18, 1, 1, '#222');
  // 머리 모양
  const h = c.hair || '#1a1a1a';
  switch (c.hs) {
    case 'long': R(x - 3, y - 21, 6, 2, h); R(x - 4, y - 20, 1, 6, h); R(x + 3, y - 20, 1, 6, h); break;
    case 'sangtu': R(x - 3, y - 21, 6, 2, h); R(x - 1, y - 23, 2, 2, h); break;
    case 'bun': R(x - 3, y - 21, 6, 2, h); R(x - 4, y - 20, 1, 4, h); R(x + 3, y - 20, 1, 4, h); R(x + 3, y - 17, 2, 2, h); R(x + 4, y - 17, 2, 1, '#f2c230'); break;
    case 'braid': R(x - 3, y - 21, 6, 2, h); R(x + 3, y - 19, 1, 7, h); R(x + 3, y - 12, 2, 1, '#d23a3a'); break;
    case 'bald': R(x - 3, y - 21, 6, 1, shade(SKIN, -0.1)); break;
    case 'bob': R(x - 3, y - 21, 6, 2, h); R(x - 4, y - 20, 1, 4, h); R(x + 3, y - 20, 1, 4, h); break;
    case 'gache': R(x - 5, y - 23, 10, 3, h); R(x - 4, y - 24, 8, 1, h); R(x - 1, y - 23, 2, 1, '#f2c230'); R(x - 3, y - 21, 6, 1, h); break;
    default: R(x - 3, y - 21, 6, 2, h);
  }
  // 모자
  const hc = c.hatCol;
  switch (c.hat) {
    case 'band': R(x - 3, y - 20, 6, 1, hc || '#c0392b'); break;
    case 'jeolpung': a.poly([[x - 3, y - 20], [x + 3, y - 20], [x, y - 24]], '#d8b45a'); R(x - 4, y - 24, 1, 4, '#ffffff'); R(x + 3, y - 24, 1, 4, '#ffffff'); break;
    case 'bokdu': R(x - 3, y - 23, 6, 3, '#1a1a1a'); R(x - 6, y - 22, 3, 1, '#1a1a1a'); R(x + 3, y - 22, 3, 1, '#1a1a1a'); break;
    case 'geon': R(x - 3, y - 22, 6, 2, '#2a2a2a'); R(x + 2, y - 21, 2, 3, '#2a2a2a'); break;
    case 'gat': R(x - 6, y - 21, 12, 1, '#111111'); R(x - 2, y - 24, 4, 3, '#111111'); break;
    case 'paeraengi': R(x - 5, y - 21, 10, 1, '#c9a35a'); R(x - 2, y - 24, 4, 3, '#c9a35a'); R(x - 2, y - 22, 4, 1, '#5a3a1a'); break;
    case 'jeollip': R(x - 5, y - 21, 10, 1, '#222222'); R(x - 3, y - 24, 6, 3, '#222222'); R(x - 1, y - 25, 2, 1, '#d23a3a'); R(x + 3, y - 23, 1, 3, '#d23a3a'); break;
    case 'fedora': R(x - 5, y - 21, 10, 1, '#3a2a20'); R(x - 3, y - 24, 6, 3, '#3a2a20'); R(x - 3, y - 22, 6, 1, '#111111'); break;
    case 'schoolcap': R(x - 3, y - 23, 6, 2, '#1b1f2a'); R(x - 3, y - 21, 7, 1, '#111111'); R(x, y - 23, 1, 1, '#f2c230'); break;
    case 'cap': R(x - 3, y - 22, 6, 2, hc || '#2a5fb3'); R(x + 2, y - 21, 3, 1, hc || '#2a5fb3'); break;
    case 'spacehelm': g0(a); R(x - 5, y - 23, 10, 9, '#f4f6f8'); R(x - 3, y - 20, 6, 4, '#5ab0e8'); R(x - 2, y - 20, 2, 1, '#d8f0ff'); R(x - 5, y - 15, 10, 1, '#c9d1d9'); break;
    case 'antenna': R(x - 2, y - 25, 1, 4, '#5a5a5a'); R(x + 1, y - 25, 1, 4, '#5a5a5a'); R(x - 3, y - 26, 2, 2, '#ffe14a'); R(x + 1, y - 26, 2, 2, '#ff7ad8'); R(x - 2, y - 18, 1, 1, '#ffffff'); break;
    case 'helmet': R(x - 4, y - 22, 8, 3, '#8a8f96'); R(x - 1, y - 24, 2, 2, '#8a8f96'); R(x, y - 25, 1, 1, '#d23a3a'); R(x - 4, y - 19, 1, 2, '#8a8f96'); R(x + 3, y - 19, 1, 2, '#8a8f96'); break;
  }
  // 들고 있는 것
  switch (c.item) {
    case 'spear': R(x + 5, y - 22, 1, 19, '#7a5230'); a.poly([[x + 4, y - 22], [x + 7, y - 22], [x + 5.5, y - 25]], '#c9ced3'); break;
    case 'flag': R(x + 5, y - 24, 1, 21, '#7a5230'); R(x + 6, y - 24, 4, 3, c.flagCol || '#ffffff'); break;
    case 'basket': R(x + 4, y - 10, 4, 3, '#b8863b'); R(x + 5, y - 12, 2, 1, '#8a5a2a'); break;
    case 'fan': R(x + 5, y - 13, 3, 3, '#f4f0e6'); R(x + 5, y - 10, 1, 1, '#8b5a2b'); break;
    case 'book': R(x + 4, y - 11, 3, 3, '#2f6fb3'); break;
    case 'mirror': R(x + 4, y - 12, 3, 3, '#c9a24a'); R(x + 5, y - 11, 1, 1, '#fff3a8'); break;
    case 'bag': R(x - 6, y - 14, 2, 5, '#8a5a2a'); break;
    case 'phone': R(x + 4, y - 12, 2, 3, '#2a2a2a'); R(x + 4, y - 12, 2, 1, '#5ab0e8'); break;
  }
}
// 그림 파일(img/people/e{시대}_{0~5}.png)이 있으면 그 그림을 쓰고, 걸을 때 살짝 통통 튀어요
function bobbed(base, frame) { if (!frame) return base; return base.bob || (base.bob = { ...base, oy: base.oy + 1, bob: null }); }
export function personSprite(i, frame, era = 1) {
  era = Math.max(1, Math.min(10, era));
  const im = getImage('people', `e${era}_${i % 6}`);
  if (im) return bobbed(uprightSprite(`pi${era}_${i % 6}`, im, 28), frame);
  const list = ERA_PEOPLE[era]; const k = i % list.length;
  return makeSprite(`pe${era}_${k}_${frame}`, 16, 26, 8, 25, a => drawPerson(a, list[k], frame));
}
// 걷는 모습용 뼈대: 그림에서 ‘다리가 시작하는 높이’와 ‘두 발 사이(가운데)’를 한 번만 찾아 둬요
export function rigOf(spr) {
  if (spr.rig) return spr.rig;
  let leg = 0.76, split = 0.5;
  try {
    const c = spr.img, W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
    let top = -1, bot = -1;
    for (let y = 0; y < H; y++) { let any = false; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { any = true; break; } if (any) { if (top < 0) top = y; bot = y; } }
    if (top >= 0 && bot > top) {
      const hgt = bot - top; leg = (top + hgt * 0.75) / H;
      let sx = 0, n = 0;
      for (let y = Math.round(bot - hgt * 0.1); y <= bot; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { sx += x; n++; }
      if (n) split = Math.max(0.38, Math.min(0.62, sx / n / W));
    }
  } catch (e) { /* 그림을 읽을 수 없으면 기본값 */ }
  return (spr.rig = { leg, split });
}
// 병사: side 'me' 파랑 띠, 'foe' 빨강 띠
export function soldierSprite(era, side, frame) {
  era = Math.max(1, Math.min(10, era));
  const im = getImage('people', `s${era}`);
  if (im) return bobbed(uprightSprite(`ps${era}_${side}`, im, 28, { tint: side === 'me' ? '#2f8fe0' : '#e0402f', tintA: 0.2 }), frame);
  const base = ERA_SOLDIER[era];
  const c = { ...base, belt: side === 'me' ? '#2f8fe0' : '#e0402f', flagCol: side === 'me' ? '#2f8fe0' : '#e0402f' };
  return makeSprite(`so${era}_${side}_${frame}`, 16, 26, 8, 25, a => drawPerson(a, c, frame));
}

// 시대 돌파 보스 초상화 (그림 파일이 없을 때)
const BOSS_LOOK = {
  e_han:    { armor: '#7a2b2b', trim: '#e0b040', helm: '#5a5f66', banner: '#c0392b', ch: '漢' },
  e_sui:    { armor: '#5a3a7a', trim: '#e0b040', helm: '#4a4f56', banner: '#7a3aa0', ch: '隋' },
  e_tang:   { armor: '#8a5a1a', trim: '#f2d060', helm: '#6a5a3a', banner: '#d08a1a', ch: '唐' },
  b_khitan: { armor: '#6b4f2a', trim: '#d9c08a', helm: '#5a4a3a', banner: '#3a6a3a', ch: '遼' },
  b_mongol: { armor: '#4b5a6b', trim: '#d9c08a', helm: '#3a3f46', banner: '#2a4a8a', ch: '元' },
  b_imjin:  { armor: '#7a2f2f', trim: '#e0b040', helm: '#2a2a2a', banner: '#e8e8e8', ch: '倭' },
  b_byeongja:{ armor: '#3f4a3c', trim: '#d9c08a', helm: '#4a4f56', banner: '#c9a24a', ch: '淸' },
  b_yangyo: { armor: '#2f4a6b', trim: '#f2f2f2', helm: '#1a2a3a', banner: '#2f4a6b', ch: '艦' },
};
export function bossCanvas(id, size = 96) {
  const ov = getImage('bosses', id); if (ov) return fitCanvas(ov, size);
  const a = new Art(64, 64, 0, 0); const g = a.g; const R = (x, y, w, h, c) => a.rect(x, y, w, h, c);
  if (id === 'e_mangak') {
    // 망각 대마왕: 보랏빛 그림자, 빛나는 눈, 소용돌이
    g.fillStyle = '#2a1640'; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(58, 6, 60, 40, 54, 60); g.lineTo(46, 54); g.lineTo(40, 61); g.lineTo(32, 54); g.lineTo(24, 61); g.lineTo(18, 54); g.lineTo(10, 60); g.bezierCurveTo(4, 40, 6, 6, 32, 4); g.fill();
    g.fillStyle = '#4a2a6a'; g.beginPath(); g.ellipse(32, 26, 18, 16, 0, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 3; k++) { g.strokeStyle = ['#8a5ad0', '#b07aff', '#6a3aa0'][k]; g.lineWidth = 2; g.beginPath(); g.arc(32, 44, 6 + k * 4, k, Math.PI + k); g.stroke(); }
    R(21, 22, 8, 4, '#ffe14a'); R(35, 22, 8, 4, '#ffe14a'); R(24, 23, 3, 2, '#d23a3a'); R(38, 23, 3, 2, '#d23a3a');
    R(18, 18, 10, 2, '#120a20'); R(36, 18, 10, 2, '#120a20');
    R(25, 32, 14, 3, '#120a20'); for (let i = 0; i < 4; i++) R(26 + i * 4, 32, 2, 2, '#f4f0e6');
    R(8, 8, 2, 2, '#b07aff'); R(54, 12, 2, 2, '#b07aff'); R(50, 4, 1, 1, '#fff'); R(12, 16, 1, 1, '#fff');
  } else if (id === 'e_smog') {
    // 스모그 괴물: 잿빛 연기 덩어리 + 굴뚝 뿔 + 빨간 눈
    for (const [x, y, r, c] of [[20, 40, 16, '#5a5a5e'], [44, 40, 16, '#5a5a5e'], [32, 30, 20, '#6e6e72'], [24, 22, 12, '#7e7e82'], [42, 22, 12, '#7e7e82'], [32, 50, 14, '#4a4a4e']]) a.ell(x, y, r, r * 0.85, c);
    R(14, 4, 6, 14, '#8a5a3a'); R(44, 4, 6, 14, '#8a5a3a'); R(14, 4, 6, 2, '#5a3a2a'); R(44, 4, 6, 2, '#5a3a2a');
    a.ell(17, 2, 4, 3, '#9a9a9e'); a.ell(47, 1, 4, 3, '#9a9a9e');
    R(21, 26, 8, 5, '#ff4a3a'); R(35, 26, 8, 5, '#ff4a3a'); R(24, 27, 3, 3, '#ffe14a'); R(38, 27, 3, 3, '#ffe14a');
    R(23, 38, 18, 4, '#2a2a2e'); for (let i = 0; i < 4; i++) R(24 + i * 5, 38, 3, 2, '#d8d8d8');
    for (let i = 0; i < 6; i++) R(6 + i * 9, 56 + (i % 2) * 3, 2, 2, '#9a9a9e');
  } else if (id === 'e_meteor') {
    // 우주 쓰레기 폭풍: 소용돌이 속 부서진 위성 조각들
    g.fillStyle = '#0d1b3d'; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 4; k++) { g.strokeStyle = ['#4f8fe0', '#8a5ad0', '#5ef0e8', '#9aa3ad'][k]; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 8 + k * 6, k, k + 4.2); g.stroke(); }
    R(26, 26, 12, 10, '#9aa3ad'); R(16, 28, 10, 6, '#2f5fa8'); R(38, 28, 10, 6, '#2f5fa8'); R(30, 22, 4, 4, '#d8dde2');
    R(28, 29, 3, 3, '#ff4a3a'); R(33, 29, 3, 3, '#ff4a3a');
    for (const [x, y] of [[10, 12], [52, 14], [8, 48], [54, 50], [30, 6]]) { a.ell(x, y, 4, 3, '#8a6a4a'); R(x - 1, y - 1, 2, 1, '#b08a6a'); }
    for (const [x, y] of [[20, 8], [46, 58], [4, 30]]) R(x, y, 1, 1, '#ffffff');
  } else if (id === 'e_alien') {
    // 제노 함대 사령관: 큰 머리·더듬이·망토
    g.fillStyle = '#3a1a5a'; g.beginPath(); g.moveTo(8, 64); g.lineTo(14, 36); g.lineTo(50, 36); g.lineTo(56, 64); g.fill();
    R(22, 40, 20, 24, '#6a3aa0'); R(30, 40, 4, 24, '#ffe14a'); R(24, 46, 16, 2, '#5ef0e8');
    a.ell(32, 22, 17, 15, '#8ae08a'); a.ell(28, 16, 6, 4, '#aaf0aa');
    a.ell(25, 24, 5, 6, '#111'); a.ell(39, 24, 5, 6, '#111'); R(24, 21, 2, 2, '#fff'); R(38, 21, 2, 2, '#fff');
    R(28, 32, 8, 2, '#3a6a3a');
    R(20, 2, 2, 10, '#5a8a5a'); R(42, 2, 2, 10, '#5a8a5a'); a.ell(21, 2, 3, 3, '#ff7ad8'); a.ell(43, 2, 3, 3, '#5ef0e8');
    R(10, 38, 6, 4, '#ffe14a'); R(48, 38, 6, 4, '#ffe14a');
  } else {
    const L = BOSS_LOOK[id] || BOSS_LOOK.e_han;
    // 깃발
    R(50, 2, 2, 60, '#5a3a1e'); R(36, 4, 14, 20, L.banner); R(36, 4, 14, 2, L.trim);
    g.fillStyle = L.banner === '#e8e8e8' ? '#c0392b' : '#fff7e0'; g.font = 'bold 14px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L.ch, 43, 15);
    // 몸(갑옷)
    a.poly([[10, 64], [14, 40], [32, 34], [50, 40], [54, 64]], L.armor);
    for (let i = 0; i < 4; i++) R(16, 44 + i * 5, 32, 1, shade(L.armor, -0.3));
    R(30, 38, 4, 26, L.trim); R(12, 40, 8, 6, L.trim); R(44, 40, 8, 6, L.trim);
    // 얼굴
    R(22, 20, 20, 17, '#e8b88a'); R(22, 33, 20, 4, '#3a2a20');
    R(25, 25, 4, 2, '#1a1a1a'); R(35, 25, 4, 2, '#1a1a1a'); R(24, 23, 6, 1, '#1a1a1a'); R(34, 23, 6, 1, '#1a1a1a');
    R(26, 25, 1, 1, '#fff'); R(36, 25, 1, 1, '#fff'); R(28, 30, 8, 2, '#7a2a2a');
    // 투구
    R(18, 10, 28, 11, L.helm); R(16, 18, 32, 3, shade(L.helm, 0.2)); R(30, 3, 4, 8, L.helm); R(29, 1, 6, 3, '#d23a3a'); R(31, 12, 2, 8, L.trim);
    R(16, 21, 4, 10, L.helm); R(44, 21, 4, 10, L.helm);
  }
  finish(a, { outline: '#1a0e06' });
  return size === 64 ? a.c : fitCanvas(a.c, size);
}

// ---------- UI 아이콘 ----------
export function iconCanvas(name, size = 32) {
  const ov = getImage('icons', name); if (ov) return fitCanvas(ov, size);
  const a = new Art(size, size, 0, 0); const g = a.g; const s = size / 32; g.scale(s, s);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const E = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const Pl = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  switch (name) {
    case 'coin': E(16, 16, 13, 13, '#c98a14'); E(16, 15, 12, 12, '#f2c230'); E(13, 12, 4, 3, '#fff0a0'); R(13, 12, 6, 6, '#c98a14'); R(14, 13, 4, 4, '#f7d96a'); break;
    case 'kp': R(4, 7, 12, 19, '#f7f1df'); R(16, 7, 12, 19, '#efe6c8'); R(15, 6, 2, 21, '#8a5a2a'); R(3, 25, 26, 2, '#8a5a2a'); for (let i = 0; i < 4; i++) { R(6, 11 + i * 3, 8, 1, '#9aa'); R(18, 11 + i * 3, 8, 1, '#9aa'); } Pl([[22, 2], [27, 4], [19, 18], [17, 17]], '#3d8fe0'); Pl([[17, 17], [19, 18], [16, 21]], '#333'); break;
    case 'gear': E(16, 16, 12, 12, '#9aa3ad'); for (let k = 0; k < 8; k++) { g.save(); g.translate(16, 16); g.rotate(k * Math.PI / 4); R(-3, -15, 6, 6, '#9aa3ad'); g.restore(); } E(16, 16, 5, 5, '#5a6068'); break;
    case 'book': R(5, 8, 11, 16, '#fff7e0'); R(16, 8, 11, 16, '#f3e9c8'); R(15, 7, 2, 18, '#a0522d'); R(4, 23, 24, 2, '#a0522d'); for (let i = 0; i < 3; i++) { R(7, 12 + i * 3, 7, 1, '#c96'); R(18, 12 + i * 3, 7, 1, '#c96'); } break;
    case 'flame': Pl([[16, 2], [26, 18], [22, 28], [10, 28], [6, 18]], '#f05a1a'); Pl([[16, 10], [21, 21], [16, 27], [11, 21]], '#ffcf3a'); break;
    case 'hammer': Pl([[6, 8], [16, 4], [20, 10], [10, 14]], '#9aa3ad'); Pl([[13, 12], [16, 10], [27, 27], [24, 29]], '#8b5a2b'); break;
    case 'house': Pl([[16, 3], [30, 15], [2, 15]], '#c0392b'); R(6, 15, 20, 13, '#f3e3c3'); R(13, 19, 6, 9, '#8b5a2b'); R(22, 5, 4, 7, '#c0392b'); break;
    case 'chest': R(4, 12, 24, 15, '#a0602a'); Pl([[4, 12], [8, 5], [24, 5], [28, 12]], '#c07a3a'); R(4, 12, 24, 2, '#f2c230'); R(14, 13, 4, 6, '#f2c230'); R(4, 25, 24, 2, '#7a4520'); break;
    case 'people': [[8, '#3d6fb0'], [16, '#c0392b'], [24, '#2a9d5c']].forEach(([x, c]) => { E(x, 10, 4, 4, '#f2c9a0'); R(x - 4, 6, 8, 3, '#222'); R(x - 5, 15, 10, 13, c); }); break;
    case 'flask': R(13, 3, 6, 9, '#cfe8f5'); Pl([[13, 11], [19, 11], [28, 27], [4, 27]], '#cfe8f5'); Pl([[9, 19], [23, 19], [28, 27], [4, 27]], '#5ad0a0'); R(12, 2, 8, 2, '#8a9aa6'); E(14, 23, 2, 2, '#bff5e0'); break;
    case 'museum': Pl([[16, 3], [30, 11], [2, 11]], '#3f4a5a'); R(4, 11, 24, 3, '#e9e3d4'); for (let i = 0; i < 5; i++) R(5 + i * 5, 14, 3, 11, '#f1ede2'); R(3, 25, 26, 4, '#cfc8b4'); break;
    case 'sword': Pl([[24, 3], [28, 7], [12, 23], [9, 20]], '#cfd6dc'); R(6, 20, 8, 3, '#8a6a2a'); Pl([[7, 23], [10, 26], [5, 30], [2, 27]], '#6b4220'); break;
    case 'clock': E(16, 16, 13, 13, '#7a4a24'); E(16, 16, 11, 11, '#fff7e0'); R(15, 7, 2, 10, '#333'); R(16, 15, 7, 2, '#333'); break;
    case 'lock': R(7, 14, 18, 14, '#c98a14'); g.strokeStyle = '#8a8f96'; g.lineWidth = 3; g.beginPath(); g.arc(16, 14, 6, Math.PI, 0); g.stroke(); R(15, 18, 2, 6, '#5a3a0a'); break;
    case 'star': Pl([[16, 2], [20, 12], [30, 12], [22, 18], [25, 29], [16, 22], [7, 29], [10, 18], [2, 12], [12, 12]], '#f2c230'); break;
    case 'trophy': R(9, 4, 14, 12, '#f2c230'); E(16, 16, 7, 5, '#f2c230'); R(14, 19, 4, 6, '#d99b1c'); R(9, 25, 14, 4, '#8b5a2b'); R(4, 6, 5, 2, '#f2c230'); R(23, 6, 5, 2, '#f2c230'); R(4, 6, 2, 7, '#f2c230'); R(26, 6, 2, 7, '#f2c230'); break;
    case 'warn': Pl([[16, 3], [30, 28], [2, 28]], '#e8443a'); R(15, 11, 3, 10, '#fff'); R(15, 23, 3, 3, '#fff'); break;
    case 'move': R(14, 4, 4, 24, '#4a8fd0'); R(4, 14, 24, 4, '#4a8fd0'); Pl([[16, 1], [21, 7], [11, 7]], '#4a8fd0'); Pl([[16, 31], [21, 25], [11, 25]], '#4a8fd0'); Pl([[1, 16], [7, 11], [7, 21]], '#4a8fd0'); Pl([[31, 16], [25, 11], [25, 21]], '#4a8fd0'); break;
    case 'up': Pl([[16, 3], [28, 16], [21, 16], [21, 28], [11, 28], [11, 16], [4, 16]], '#3cbf5a'); break;
    case 'x': g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(8, 8); g.lineTo(24, 24); g.moveTo(24, 8); g.lineTo(8, 24); g.stroke(); break;
    case 'bolt': Pl([[18, 2], [6, 18], [15, 18], [12, 30], [26, 12], [17, 12]], '#ffcf3a'); break;
    case 'boss': Pl([[4, 10], [10, 4], [16, 9], [22, 4], [28, 10], [26, 28], [6, 28]], '#7a2b2b'); R(10, 14, 4, 3, '#ffcf3a'); R(18, 14, 4, 3, '#ffcf3a'); R(11, 21, 10, 2, '#2a0a0a'); break;
    case 'full': for (const [x, y, w, h] of [[4, 4, 10, 4], [4, 4, 4, 10], [18, 4, 10, 4], [24, 4, 4, 10], [4, 24, 10, 4], [4, 18, 4, 10], [18, 24, 10, 4], [24, 18, 4, 10]]) R(x, y, w, h, '#ffe07a'); break;
    case 'unfull': for (const [x, y, w, h] of [[4, 10, 10, 4], [10, 4, 4, 10], [18, 10, 10, 4], [18, 4, 4, 10], [4, 18, 10, 4], [10, 18, 4, 10], [18, 18, 10, 4], [18, 18, 4, 10]]) R(x, y, w, h, '#ffe07a'); break;
    case 'save': R(5, 4, 22, 24, '#2f5fa8'); R(9, 4, 14, 9, '#e8edf1'); R(18, 6, 3, 5, '#2f5fa8'); R(8, 17, 16, 11, '#f4f6f8'); R(10, 20, 12, 1, '#9aa3ad'); R(10, 23, 12, 1, '#9aa3ad'); R(5, 4, 22, 2, '#4f8fe0'); break;
    case 'chat': g.fillStyle = '#fff7e0'; g.beginPath(); g.ellipse(16, 13, 13, 10, 0, 0, Math.PI * 2); g.fill(); Pl([[8, 20], [14, 21], [6, 29]], '#fff7e0'); R(9, 12, 3, 3, '#7a4a24'); R(15, 12, 3, 3, '#7a4a24'); R(21, 12, 3, 3, '#7a4a24'); break;
    case 'heart': Pl([[16, 28], [3, 14], [3, 8], [8, 3], [13, 3], [16, 7], [19, 3], [24, 3], [29, 8], [29, 14]], '#e8443a'); R(7, 7, 4, 3, '#ff9a8a'); break;
    case 'heartx': Pl([[16, 28], [3, 14], [3, 8], [8, 3], [13, 3], [16, 7], [19, 3], [24, 3], [29, 8], [29, 14]], '#5a4a4a'); break;
    case 'shield': Pl([[16, 2], [28, 7], [26, 20], [16, 30], [6, 20], [4, 7]], '#2f78c4'); Pl([[16, 6], [24, 9], [22, 19], [16, 25]], '#5aa0e8'); R(14, 8, 4, 16, '#f2c230'); R(9, 13, 14, 4, '#f2c230'); break;
    case 'war': Pl([[5, 3], [9, 3], [27, 23], [23, 27]], '#cfd6dc'); Pl([[27, 3], [23, 3], [5, 23], [9, 27]], '#e8eef2'); R(3, 23, 7, 3, '#8a6a2a'); R(22, 23, 7, 3, '#8a6a2a'); R(4, 26, 3, 4, '#6b4220'); R(25, 26, 3, 4, '#6b4220'); break;
    case 'repair': g.strokeStyle = '#9aa3ad'; g.lineWidth = 5; g.beginPath(); g.moveTo(7, 25); g.lineTo(20, 12); g.stroke(); g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(22, 10, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(21, 3, 5, 6); R(5, 23, 5, 5, '#8b5a2b'); break;
    case 'fire': Pl([[16, 2], [25, 14], [24, 24], [16, 30], [8, 24], [7, 14], [12, 9], [13, 16]], '#f05a1a'); Pl([[16, 12], [21, 21], [16, 27], [11, 21]], '#ffcf3a'); break;
    case 'crown': Pl([[3, 11], [10, 17], [16, 5], [22, 17], [29, 11], [26, 26], [6, 26]], '#f2c230'); R(6, 23, 20, 4, '#d99b1c'); E(16, 5, 3, 3, '#e8443a'); E(3, 11, 2.5, 2.5, '#3d8fe0'); E(29, 11, 2.5, 2.5, '#3d8fe0'); E(16, 20, 2.5, 2.5, '#3cbf5a'); R(9, 18, 2, 2, '#fff0a0'); break;
    case 'flag': R(6, 3, 3, 27, '#6b4220'); Pl([[9, 4], [28, 8], [9, 17]], '#e8443a'); break;
    case 'sound': Pl([[4, 12], [10, 12], [18, 5], [18, 27], [10, 20], [4, 20]], '#5a6068'); g.strokeStyle = '#5a6068'; g.lineWidth = 2; g.beginPath(); g.arc(18, 16, 7, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(18, 16, 11, -0.9, 0.9); g.stroke(); break;
  }
  finish(a, { outline: name === 'x' ? false : '#2b1b10' });
  return a.c;
}
const iconCache = new Map();
// 그림 파일을 불러온 뒤에는 코드로 그린 아이콘 대신 그림을 쓰도록 캐시를 비워요
export function clearIconCache() { iconCache.clear(); bossCache.clear(); }
export function iconURL(name, size = 32) {
  const k = name + size; if (!iconCache.has(k)) iconCache.set(k, iconCanvas(name, size).toDataURL()); return iconCache.get(k);
}

// ---------- 위인 초상화 ----------
export function portraitCanvas(h, size = 48) {
  const ov = getImage('heroes', h.id); if (ov) return fitCanvas(ov, Math.max(size, 64));
  const L = h.look; const a = new Art(32, 32, 0, 0);
  const R = (x, y, w, hh, c) => a.rect(x, y, w, hh, c);
  R(0, 0, 32, 32, '#00000000');
  // 옷
  R(5, 24, 22, 8, L.robe); R(13, 24, 6, 8, shade(L.robe, 0.25)); R(5, 24, 22, 1, L.trim); R(14, 24, 4, 3, L.trim);
  // 얼굴 (외계 친구는 피부색이 달라요)
  const SKC = L.skin || '#f2c9a0';
  R(10, 9, 12, 14, SKC); R(9, 13, 1, 4, shade(SKC, -0.08)); R(22, 13, 1, 4, shade(SKC, -0.08));
  R(12, 14, 2, 2, '#222'); R(18, 14, 2, 2, '#222'); R(12, 13, 2, 1, L.hair); R(18, 13, 2, 1, L.hair);
  R(15, 18, 2, 1, '#d99a7a'); R(14, 20, 4, 1, '#b8604a');
  // 머리
  R(10, 7, 12, 4, L.hair); R(9, 9, 2, 5, L.hair); R(21, 9, 2, 5, L.hair);
  if (L.female) { R(8, 9, 3, 14, L.hair); R(21, 9, 3, 14, L.hair); R(11, 19, 2, 1, '#f0a0a0'); R(19, 19, 2, 1, '#f0a0a0'); }
  if (L.braid) { R(22, 20, 3, 8, L.hair); R(22, 27, 3, 2, '#c0392b'); }
  if (L.short) { R(10, 6, 12, 3, L.hair); }
  if (L.glasses) { R(11, 13, 4, 4, '#222'); R(12, 14, 2, 2, SKC); R(17, 13, 4, 4, '#222'); R(18, 14, 2, 2, SKC); R(15, 14, 2, 1, '#222'); R(12, 15, 1, 1, '#222'); R(18, 15, 1, 1, '#222'); }
  // 수염
  if (L.beard === 'long') { R(12, 20, 8, 7, L.beardColor || '#2a2a2a'); R(13, 27, 6, 2, L.beardColor || '#2a2a2a'); R(14, 20, 4, 1, '#b8604a'); }
  if (L.beard === 'short') { R(12, 21, 8, 3, '#2a2a2a'); R(14, 20, 4, 1, '#b8604a'); }
  if (L.beard === 'mustache') { R(12, 19, 8, 1, '#2a2a2a'); R(11, 20, 2, 1, '#2a2a2a'); R(19, 20, 2, 1, '#2a2a2a'); }
  // 모자/관
  const hc = L.hatColor || '#222';
  switch (L.hat) {
    case 'headband': R(9, 8, 14, 2, '#f4f0e6'); R(9, 3, 14, 5, L.hair); R(14, 1, 4, 3, L.hair); break;
    case 'crown': R(9, 3, 14, 5, hc); for (let i = 0; i < 4; i++) R(9 + i * 4, 0, 2, 4, hc); R(15, 4, 2, 2, '#d23a3a'); break;
    case 'blackcrown': R(9, 2, 14, 6, '#1d1d1d'); R(8, 1, 3, 6, hc); R(21, 1, 3, 6, hc); R(15, 0, 2, 3, hc); break;
    case 'goldcrown': R(9, 4, 14, 4, hc); R(10, 0, 2, 5, hc); R(15, -1, 2, 6, hc); R(20, 0, 2, 5, hc); R(8, 7, 1, 8, hc); R(23, 7, 1, 8, hc); R(8, 14, 2, 2, '#5aa58c'); R(22, 14, 2, 2, '#5aa58c'); break;
    case 'bandana': R(9, 5, 14, 4, hc); R(22, 6, 4, 2, hc); R(24, 8, 2, 3, hc); break;
    case 'helmet': R(8, 3, 16, 6, hc); R(15, 0, 2, 4, shade(hc, 0.3)); R(7, 8, 3, 8, shade(hc, -0.2)); R(22, 8, 3, 8, shade(hc, -0.2)); R(8, 8, 16, 1, shade(hc, 0.3)); break;
    case 'samo': R(10, 3, 12, 6, '#1a1a1a'); R(13, 1, 6, 3, '#1a1a1a'); R(5, 6, 5, 2, '#1a1a1a'); R(22, 6, 5, 2, '#1a1a1a'); break;
    case 'king': R(10, 2, 12, 7, '#1a1a1a'); R(12, 0, 8, 3, '#1a1a1a'); R(9, 5, 2, 2, '#1a1a1a'); R(21, 5, 2, 2, '#1a1a1a'); R(15, 3, 2, 2, '#e2b23a'); break;
    case 'gat': R(4, 7, 24, 2, '#1a1a1a'); R(11, 1, 10, 7, '#1a1a1a'); R(12, 2, 8, 1, '#3a3a3a'); R(8, 9, 1, 12, '#1a1a1a'); R(23, 9, 1, 12, '#1a1a1a'); break;
    case 'spacehelm': R(8, 2, 16, 4, '#eef2f6'); R(6, 5, 3, 17, '#d8dee6'); R(23, 5, 3, 17, '#d8dee6'); R(9, 6, 14, 1, '#8fd0ff'); R(7, 21, 18, 2, '#b8c2cc'); R(22, 0, 2, 3, '#9aa6b4'); R(21, 0, 4, 1, '#ff5a5a'); R(10, 3, 4, 1, '#ffffff'); break;
    case 'antenna': R(12, 2, 1, 6, '#3a5a2a'); R(19, 2, 1, 6, '#3a5a2a'); R(11, 0, 3, 3, '#ffe14a'); R(18, 0, 3, 3, '#ff7ad8'); break;
  }
  finish(a, { outline: '#2b1b10' });
  if (size === 32) return a.c;
  const c = cnv(size, size); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a.c, 0, 0, size, size); return c;
}
const portraitCache = new Map();
export function portraitURL(h, size = 64) { const k = h.id + size; if (!portraitCache.has(k)) portraitCache.set(k, portraitCanvas(h, size).toDataURL()); return portraitCache.get(k); }

// ---------- 유물 아이콘 ----------
export function relicCanvas(r, size = 48) {
  const ov = getImage('relics', r.id); if (ov) return fitCanvas(ov, Math.max(size, 64));
  const a = new Art(32, 32, 0, 0); const g = a.g; const c = r.c; const d = shade(c, -0.3), l = shade(c, 0.35);
  const R = (x, y, w, h, col) => a.rect(x, y, w, h, col);
  const E = (x, y, rx, ry, col) => a.ell(x, y, rx, ry, col);
  const Pl = (pts, col) => a.poly(pts, col);
  switch (r.icon) {
    case 'handaxe': Pl([[16, 3], [25, 18], [20, 29], [11, 29], [7, 17]], c); Pl([[16, 3], [12, 16], [16, 27], [11, 29], [7, 17]], l); break;
    case 'combpot': Pl([[7, 5], [25, 5], [23, 20], [16, 30], [9, 20]], c); for (let i = 0; i < 5; i++) { R(9 + i, 8 + i * 3, 14 - 2 * i, 1, d); } break;
    case 'halfmoon': Pl([[3, 14], [29, 14], [24, 24], [8, 24]], c); R(3, 14, 26, 2, l); E(12, 19, 1.5, 1.5, d); E(20, 19, 1.5, 1.5, d); break;
    case 'dagger': Pl([[16, 2], [21, 11], [19, 16], [21, 21], [16, 24], [11, 21], [13, 16], [11, 11]], c); R(15, 4, 2, 19, l); R(12, 24, 8, 2, '#8a6a2a'); R(14, 26, 4, 5, '#6b4220'); break;
    case 'mirror': E(16, 16, 14, 14, d); E(16, 16, 12, 12, c); for (let k = 2; k < 12; k += 3) { g.strokeStyle = l; g.lineWidth = 1; g.beginPath(); g.arc(16, 16, k, 0, Math.PI * 2); g.stroke(); } R(14, 14, 4, 4, d); break;
    case 'armor': Pl([[8, 4], [24, 4], [27, 14], [24, 28], [8, 28], [5, 14]], c); for (let i = 0; i < 5; i++) R(7, 8 + i * 4, 18, 1, d); R(13, 4, 6, 5, '#3a3a3a'); break;
    case 'horse': E(14, 20, 9, 5, c); R(20, 10, 4, 10, c); E(24, 10, 4, 3, c); R(8, 23, 2, 7, d); R(19, 23, 2, 7, d); R(11, 10, 5, 8, l); E(13, 8, 3, 3, l); break;
    case 'sevensword': R(15, 2, 3, 26, c); for (let i = 0; i < 3; i++) { R(9, 6 + i * 6, 6, 2, c); R(18, 9 + i * 6, 6, 2, c); R(9, 4 + i * 6, 2, 3, c); R(22, 7 + i * 6, 2, 3, c); } R(12, 27, 9, 3, '#6b4220'); break;
    case 'crown': R(5, 18, 22, 8, c); for (let i = 0; i < 3; i++) { R(7 + i * 8, 5, 3, 14, c); R(5 + i * 8, 8, 2, 2, c); R(10 + i * 8, 11, 2, 2, c); } for (let i = 0; i < 6; i++) E(7 + i * 4, 22, 1.5, 1.5, '#5aa58c'); R(4, 26, 3, 6, c); R(25, 26, 3, 6, c); break;
    case 'incense': E(16, 22, 9, 6, c); Pl([[9, 20], [16, 6], [23, 20]], l); R(13, 2, 6, 6, c); R(11, 28, 10, 3, d); E(16, 14, 2, 2, d); break;
    case 'dice': Pl([[16, 3], [27, 9], [27, 22], [16, 29], [5, 22], [5, 9]], c); Pl([[16, 3], [27, 9], [16, 15], [5, 9]], l); R(15, 18, 2, 2, '#222'); R(9, 14, 2, 2, '#222'); R(21, 14, 2, 2, '#222'); break;
    case 'chimi': Pl([[6, 29], [6, 14], [12, 5], [22, 3], [26, 8], [18, 12], [22, 29]], c); for (let i = 0; i < 5; i++) R(9 + i * 2, 15 + i * 2, 8, 1, d); break;
    case 'buddha': [9, 23].forEach(x => { E(x, 9, 4, 4, c); E(x, 20, 6, 8, c); R(x - 3, 26, 6, 3, d); E(x, 8, 5, 6, l + '55'); }); R(3, 28, 26, 3, d); break;
    case 'scroll': R(5, 6, 22, 20, c); R(3, 4, 26, 3, '#8a5a2a'); R(3, 25, 26, 3, '#8a5a2a'); for (let i = 0; i < 6; i++) R(8 + i * 3, 10, 1, 13, d); break;
    case 'bell': R(14, 2, 4, 4, d); Pl([[10, 6], [22, 6], [26, 26], [6, 26]], c); R(5, 24, 22, 3, d); R(9, 10, 14, 2, l); E(16, 18, 3, 3, l); break;
    case 'coin': E(16, 16, 13, 13, d); E(16, 16, 11, 11, c); R(12, 12, 8, 8, d); R(13, 13, 6, 6, '#00000000'); a.g.clearRect(13, 13, 6, 6); break;
    case 'box': R(4, 10, 24, 16, c); R(4, 8, 24, 4, shade(c, 0.15)); for (let i = 0; i < 7; i++) { R(6 + i * 3, 14 + (i % 2) * 4, 2, 2, '#e6f0ff'); R(7 + i * 3, 20, 1, 1, '#ffe0f0'); } break;
    case 'woodblock': R(3, 6, 26, 20, c); R(5, 8, 22, 16, l); for (let i = 0; i < 7; i++) R(7 + i * 3, 10, 1, 12, d); R(1, 6, 3, 20, d); R(28, 6, 3, 20, d); break;
    case 'book': R(5, 3, 22, 26, c); R(5, 3, 3, 26, d); R(11, 7, 12, 6, '#fff8e6'); R(13, 9, 8, 1, d); R(13, 11, 6, 1, d); break;
    case 'maebyeong': E(16, 7, 5, 3, c); Pl([[11, 7], [21, 7], [27, 16], [22, 29], [10, 29], [5, 16]], c); for (let i = 0; i < 3; i++) { E(11 + i * 5, 15 + (i % 2) * 5, 2, 1.5, '#f4f4f4'); R(10 + i * 5, 21, 3, 1, '#3a3a3a'); } break;
    case 'buncheong': Pl([[9, 4], [23, 4], [27, 15], [23, 29], [9, 29], [5, 15]], c); R(7, 12, 18, 7, '#ece6d6'); for (let i = 0; i < 4; i++) R(9 + i * 4, 14, 2, 3, d); break;
    case 'rocket': R(6, 14, 20, 3, '#8b5a2b'); Pl([[26, 12], [31, 15.5], [26, 19]], '#cfd6dc'); R(8, 11, 8, 3, c); R(3, 13, 4, 5, '#f07a1a'); R(1, 14, 2, 3, '#ffd34a'); break;
    case 'sundial': E(16, 14, 13, 9, d); E(16, 13, 11, 7, '#e9dcb0'); R(15, 6, 2, 8, '#333'); for (let i = 0; i < 5; i++) R(8 + i * 4, 15, 1, 3, '#555'); R(8, 22, 3, 8, c); R(21, 22, 3, 8, c); break;
    case 'raingauge': R(11, 3, 10, 22, c); R(11, 3, 10, 2, l); R(13, 6, 6, 16, '#5ab0e8'); R(7, 24, 18, 6, '#b5af9f'); R(7, 24, 18, 1, '#d6d0bf'); break;
    case 'hunmin': R(5, 3, 22, 26, '#3a5a8a'); R(9, 6, 14, 20, c); a.rect(11, 9, 4, 1, '#333'); a.rect(13, 9, 1, 5, '#333'); a.rect(17, 9, 1, 5, '#333'); a.rect(17, 11, 3, 1, '#333'); a.rect(11, 17, 10, 1, '#333'); E(16, 22, 3, 2, '#333'); E(16, 22, 1.5, 1, c); break;
    case 'blueprint': R(3, 5, 26, 22, c); for (let i = 0; i < 6; i++) R(3, 8 + i * 3.5, 26, 1, l + '66'); R(8, 10, 2, 13, '#fff'); R(22, 10, 2, 13, '#fff'); R(8, 10, 16, 2, '#fff'); E(16, 15, 3, 3, '#fff'); R(15, 17, 2, 6, '#fff'); break;
    case 'moonjar': E(16, 17, 13, 12, '#d9d4c6'); E(15, 16, 12, 11, c); R(11, 3, 10, 4, c); E(11, 12, 3, 3, '#ffffff'); break;
    case 'painting': R(3, 4, 26, 24, '#8b5a2b'); R(5, 6, 22, 20, c); E(12, 16, 3, 3, '#f2c9a0'); E(20, 16, 3, 3, '#f2c9a0'); R(9, 19, 6, 5, '#f4f0e6'); R(17, 19, 6, 5, '#f4f0e6'); R(7, 24, 18, 1, '#6a8a4a'); break;
    case 'map': R(3, 4, 26, 24, c); Pl([[12, 6], [20, 7], [22, 14], [19, 20], [21, 26], [14, 26], [12, 19], [9, 12]], '#a3c48a'); R(3, 4, 26, 1, d); R(3, 27, 26, 1, d); for (let i = 1; i < 4; i++) R(3 + i * 6.5, 4, 1, 24, d + '88'); break;
    case 'stamp': R(5, 5, 22, 22, '#fff'); for (let i = 0; i < 6; i++) { R(4, 6 + i * 4, 1, 2, '#ddd'); R(27, 6 + i * 4, 1, 2, '#ddd'); } R(8, 8, 16, 16, c); E(16, 16, 4, 4, '#fff2b0'); break;
    case 'newspaper': R(4, 4, 24, 24, c); R(6, 6, 20, 4, '#333'); for (let i = 0; i < 6; i++) { R(6, 12 + i * 2.5, 9, 1, '#777'); R(17, 12 + i * 2.5, 9, 1, '#777'); } break;
    case 'flag': R(6, 2, 2, 28, '#8b5a2b'); R(8, 4, 22, 15, '#ffffff'); E(19, 11.5, 4, 4, '#d23a3a'); R(15, 11.5, 8, 3, '#2a5fb3'); [[10, 5], [26, 5], [10, 16], [26, 16]].forEach(([x, y]) => R(x - 1, y, 3, 1, '#222')); break;
    case 'declaration': R(5, 3, 22, 26, c); for (let i = 0; i < 8; i++) R(8 + i * 2.5, 6, 1, 18, '#555'); R(18, 24, 6, 3, '#c0392b'); break;
    // v1.7
    case 'hoop': g.strokeStyle = '#8a8f96'; g.lineWidth = 3; g.beginPath(); g.arc(16, 16, 11, 0, Math.PI * 2); g.stroke(); g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(16, 16, 11, 0, Math.PI * 2); g.stroke(); a.line(16, 16, 28, 4, '#8b5a2b', 2); break;
    case 'phone': R(10, 3, 12, 26, c); R(12, 6, 8, 7, '#7ab0a0'); for (let i = 0; i < 9; i++) R(12 + (i % 3) * 3, 15 + Math.floor(i / 3) * 4, 2, 2, '#d8d8d8'); R(18, 0, 2, 4, '#2a2a2a'); break;
    case 'car': R(4, 15, 24, 8, c); Pl([[9, 15], [12, 9], [21, 9], [24, 15]], shade(c, 0.2)); R(13, 10, 4, 4, '#cfe8ff'); R(18, 10, 4, 4, '#cfe8ff'); E(10, 24, 3, 3, '#2a2a2a'); E(22, 24, 3, 3, '#2a2a2a'); R(26, 17, 2, 2, '#ffe14a'); break;
    case 'wafer': E(16, 16, 13, 13, '#c9d1d9'); E(16, 16, 12, 12, c); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if ((i - 2) ** 2 + (j - 2) ** 2 <= 5) R(7 + i * 4, 7 + j * 4, 3, 3, ['#ff9ad8', '#9affef', '#ffe14a', '#b07aff'][(i + j) % 4]); break;
    case 'ball': E(16, 16, 13, 13, c); Pl([[16, 10], [21, 14], [19, 20], [13, 20], [11, 14]], '#2a2a2a'); R(5, 14, 4, 3, '#2a2a2a'); R(23, 14, 4, 3, '#2a2a2a'); R(14, 3, 4, 3, '#2a2a2a'); R(10, 25, 4, 3, '#2a2a2a'); R(19, 25, 4, 3, '#2a2a2a'); break;
    case 'medal': Pl([[8, 2], [14, 2], [17, 14], [11, 14]], '#2f6fb3'); Pl([[24, 2], [18, 2], [15, 14], [21, 14]], '#d23a3a'); E(16, 21, 9, 9, d); E(16, 21, 7.5, 7.5, c); E(14, 19, 2, 2, l); break;
    case 'meteor': E(18, 18, 11, 10, c); E(15, 15, 3, 2, d); E(21, 21, 2, 2, d); Pl([[2, 2], [10, 12], [8, 14]], '#f28a2a'); Pl([[4, 0], [12, 10], [10, 12]], '#ffe14a'); break;
    case 'spacehelm': E(16, 15, 13, 13, c); E(16, 15, 9, 8, '#2f5fa8'); E(13, 12, 3, 2, '#9fd0ff'); R(6, 26, 20, 4, '#c9d1d9'); R(14, 2, 4, 3, '#d23a3a'); break;
    case 'satellite': R(12, 12, 8, 8, c); R(2, 14, 9, 4, '#2f5fa8'); R(21, 14, 9, 4, '#2f5fa8'); a.line(16, 12, 16, 4, '#8a8f96', 1); E(16, 3, 2, 2, '#d23a3a'); for (let i = 0; i < 3; i++) a.line(14 + i * 2, 20, 10 + i * 4, 30, '#8a8f96', 1); break;
    case 'rocket2': R(13, 6, 6, 20, c); Pl([[13, 6], [16, 0], [19, 6]], '#d23a3a'); Pl([[13, 20], [8, 28], [13, 26]], '#2f6fb3'); Pl([[19, 20], [24, 28], [19, 26]], '#2f6fb3'); R(14, 12, 4, 3, '#5ab0e8'); Pl([[14, 26], [16, 32], [18, 26]], '#f28a2a'); break;
    case 'moonphoto': R(3, 3, 26, 26, '#1a1a2a'); E(16, 16, 10, 10, c); E(12, 12, 2.5, 2.5, d); E(19, 18, 3, 3, d); E(14, 21, 1.5, 1.5, d); R(4, 4, 1, 1, '#fff'); R(26, 8, 1, 1, '#fff'); R(6, 25, 1, 1, '#fff'); break;
    case 'moonrock': Pl([[5, 22], [8, 12], [16, 7], [25, 10], [28, 20], [22, 27], [10, 27]], c); E(13, 15, 2.5, 2, d); E(21, 19, 3, 2.5, d); E(17, 11, 1.5, 1.5, l); R(4, 27, 24, 3, '#c9a24a'); break;
    case 'crystal': Pl([[16, 2], [22, 12], [16, 30], [10, 12]], c); Pl([[16, 2], [22, 12], [16, 30]], shade(c, -0.25)); Pl([[7, 14], [11, 20], [8, 28], [4, 20]], shade(c, 0.2)); Pl([[25, 14], [28, 20], [25, 28], [22, 20]], shade(c, 0.1)); R(13, 10, 1, 8, '#ffffff'); break;
    case 'seed': E(16, 18, 7, 9, c); E(14, 15, 2, 3, l); Pl([[16, 9], [13, 2], [17, 6]], '#6fd05a'); Pl([[16, 9], [21, 3], [18, 8]], '#4fb34a'); for (const [x, y] of [[6, 8], [26, 12], [8, 26]]) R(x, y, 2, 2, '#ffe14a'); break;
    case 'galaxymap': R(3, 4, 26, 24, c); for (let k = 0; k < 3; k++) { g.strokeStyle = ['#b07aff', '#5ef0e8', '#ff7ad8'][k]; g.lineWidth = 1; g.beginPath(); g.arc(16, 16, 3 + k * 4, k, k + 4); g.stroke(); } E(16, 16, 2, 2, '#ffe14a'); for (const [x, y] of [[6, 7], [25, 8], [7, 24], [24, 24], [12, 6]]) R(x, y, 1, 1, '#ffffff'); break;
    case 'translator': R(6, 4, 20, 24, '#3a3f46'); R(8, 6, 16, 10, c); a.g.fillStyle = '#ffffff'; a.g.font = 'bold 7px sans-serif'; a.g.textAlign = 'center'; a.g.fillText('가A', 16, 13); for (let i = 0; i < 6; i++) R(9 + (i % 3) * 5, 19 + Math.floor(i / 3) * 4, 4, 3, i === 4 ? '#5ef0e8' : '#9aa3ad'); break;
    case 'floatstone': E(16, 28, 9, 2, '#00000044'); Pl([[8, 14], [12, 6], [22, 5], [26, 13], [20, 20], [11, 20]], c); Pl([[22, 5], [26, 13], [20, 20], [17, 12]], shade(c, -0.25)); R(13, 9, 3, 2, l); R(15, 23, 2, 1, '#5ef0e8'); R(12, 25, 1, 1, '#5ef0e8'); R(19, 24, 1, 1, '#5ef0e8'); break;
    case 'treaty': R(5, 3, 22, 26, c); R(3, 2, 26, 3, '#8a5a2a'); R(3, 27, 26, 3, '#8a5a2a'); for (let i = 0; i < 5; i++) R(8, 8 + i * 3, 16, 1, '#7a6a5a'); E(11, 23, 3, 3, '#5ef0e8'); E(21, 23, 3, 3, '#d23a3a'); break;
  }
  finish(a, { outline: '#2b1b10' });
  const out = cnv(size, size); const og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(a.c, 0, 0, size, size); return out;
}
const relicCache = new Map();
export function relicURL(r, size = 48) { const k = r.id + size; if (!relicCache.has(k)) relicCache.set(k, relicCanvas(r, size).toDataURL()); return relicCache.get(k); }

export function spriteURL(spr) { return spr.img.toDataURL(); }

const bossCache = new Map();
export function bossURL(id) { if (!bossCache.has(id)) bossCache.set(id, bossCanvas(id, 96).toDataURL()); return bossCache.get(id); }
export const hasBossImage = id => !!getImage('bosses', id);

// 픽셀 단위 클릭 판정 (고해상도 그림 스프라이트도 지원)
export function spriteHit(spr, lx, ly) {
  const r = spr.res || 1, W = spr.img.width, Hh = spr.img.height;
  if (!spr.mask) { const d = spr.img.getContext('2d').getImageData(0, 0, W, Hh).data; spr.mask = new Uint8Array(W * Hh); for (let i = 0; i < spr.mask.length; i++) spr.mask[i] = d[i * 4 + 3] > 0 ? 1 : 0; }
  const x = Math.floor(lx * r), y = Math.floor(ly * r);
  if (x < 0 || y < 0 || x >= W || y >= Hh) return false;
  return spr.mask[y * W + x] === 1;
}
