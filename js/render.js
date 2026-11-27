// =============================================================
//  아이소메트릭 마을 렌더러 (캔버스) — 카메라·확대·클릭 판정·애니메이션
// =============================================================
import * as S from './sprites.js?v=202611271127';
import { GRID, activeOffset, occupancy, synergyInfo, isActiveTile } from './economy.js?v=202611271127';
import { B, D } from './data-buildings.js?v=202611271127';
import { H } from './data-heroes.js?v=202611271127';
import { ERAS } from './data-config.js?v=202611271127';

const ISL0 = -4, ISL1 = GRID + 3;   // 섬 범위 (타일)
const tierOf = lv => lv >= 10 ? 2 : lv >= 5 ? 1 : 0;
const W2 = S.TW / 2, H2 = S.TH / 2;
export const tileToWorld = (i, j) => [(i - j) * W2, (i + j) * H2];

export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.cam = { x: 0, y: (GRID - 1) * H2, s: 2 };
    this.userZoom = 0;
    this.people = []; this.fx = []; this.scenery = []; this.sceneryKey = '';
    this.hover = null; this.mode = null; this.selected = null; this.ghost = null;
    this.coinBoxes = []; this.crisisBox = null;
    this.t = 0; this.dpr = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    this.fitPending = true;
  }
  fit(state) {
    const n = state.mapSize, W = this.cv.width, Hh = this.cv.height;
    const top = 92 * this.dpr, bottom = 118 * this.dpr;
    const avH = Hh - top - bottom;
    let s = Math.min(W * 0.66 / (n * S.TW), avH / (n * S.TH + 84));
    s = Math.max(1, Math.round(s * 4) / 4);
    this.baseScale = s;
    this.cam.s = Math.max(1, Math.min(6, s + this.userZoom * 0.5 * this.dpr));
    const [cx, cy] = tileToWorld((GRID - 1) / 2, (GRID - 1) / 2);
    this.cam.x = cx; this.cam.y = cy - 30 + ((bottom - top) / 2) / this.cam.s;
    this.fitPending = false;
  }
  zoom(d, state) { this.userZoom = Math.max(-2, Math.min(4, this.userZoom + d)); this.fit(state); }
  pan(dx, dy) {
    this.cam.x -= dx * this.dpr / this.cam.s; this.cam.y -= dy * this.dpr / this.cam.s;
    this.cam.x = Math.max(-420, Math.min(420, this.cam.x)); this.cam.y = Math.max(-60, Math.min(340, this.cam.y));
  }
  toWorld(sx, sy) {
    const W = this.cv.width, Hh = this.cv.height;
    return [(sx * this.dpr - W / 2) / this.cam.s + this.cam.x, (sy * this.dpr - Hh / 2) / this.cam.s + this.cam.y];
  }
  toScreen(wx, wy) {
    const W = this.cv.width, Hh = this.cv.height;
    return [((wx - this.cam.x) * this.cam.s + W / 2) / this.dpr, ((wy - this.cam.y) * this.cam.s + Hh / 2) / this.dpr];
  }
  tileAt(sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    const fi = (wx / W2 + wy / H2) / 2 + 0.5, fj = (wy / H2 - wx / W2) / 2 + 0.5;
    return { x: Math.floor(fi), y: Math.floor(fj) };
  }
  // 건물 스프라이트 픽셀 단위 판정 (지붕을 눌러도 선택되게)
  pick(state, sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    for (const c of this.coinBoxes) if (Math.abs(sx - c.x) < 18 && Math.abs(sy - c.y) < 18) return { coin: true };
    if (this.crisisBox && Math.abs(sx - this.crisisBox.x) < 22 && Math.abs(sy - this.crisisBox.y) < 24) return { crisis: true };
    const items = [];
    for (const b of state.buildings) items.push({ b, spr: this.sprFor(state, b), i: b.x, j: b.y, d: b.x + b.y });
    if (state.wonder) items.push({ b: { uid: 'wonder', type: 'wonder', x: state.wonder.x, y: state.wonder.y }, spr: S.wonderSprite(state.wonderStage), i: state.wonder.x + 0.5, j: state.wonder.y + 0.5, d: state.wonder.x + state.wonder.y + 2 });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) {
      const [X, Y] = tileToWorld(it.i, it.j);
      const lx = Math.floor(wx - (X - it.spr.ox)), ly = Math.floor(wy - (Y - it.spr.oy));
      if (lx < 0 || ly < 0 || lx >= it.spr.w || ly >= it.spr.h) continue;
      if (S.spriteHit(it.spr, wx - (X - it.spr.ox), wy - (Y - it.spr.oy))) return { building: it.b };
    }
    return { tile: this.tileAt(sx, sy) };
  }
  sprFor(state, b) {
    if (D[b.type]) return S.decorSprite(b.type);
    return S.buildingSprite(b.type, tierOf(b.lv));
  }

  // 잠긴 땅과 섬 바깥 숲 (지도 크기에 따라 다시 생성)
  genScenery(state) {
    const theme = ERAS[state.era]?.theme || '';
    const key = state.mapSize + '|' + (state.wonder ? 1 : 0) + '|' + theme;
    if (key === this.sceneryKey) return;
    this.sceneryKey = key; this.scenery = [];
    const r = S.srand(777);
    for (let j = ISL0; j <= ISL1; j++) for (let i = ISL0; i <= ISL1; i++) {
      const inGrid = i >= 0 && j >= 0 && i < GRID && j < GRID;
      if (inGrid && isActiveTile(state, i, j)) continue;
      const edge = Math.min(i - ISL0, j - ISL0, ISL1 - i, ISL1 - j);
      const ao = activeOffset(state.mapSize), an = state.mapSize;
      const dist = Math.max(ao - i, i - (ao + an - 1), ao - j, j - (ao + an - 1));
      const dens = dist <= 1 ? 0.18 : inGrid ? 0.32 : edge <= 0 ? 0.2 : 0.45;
      const n = r() < dens ? (r() < 0.35 ? 2 : 1) : 0;
      for (let k = 0; k < n; k++) {
        if (theme) { this.scenery.push({ i: i + (r() - 0.5) * 0.6, j: j + (r() - 0.5) * 0.6, spr: S.themeScenery(theme, r()) }); continue; }
        const kind = r() < 0.55 ? 'pine' : r() < 0.6 ? 'round' : r() < 0.5 ? 'rock' : r() < 0.5 ? 'bush' : 'autumn';
        this.scenery.push({ i: i + (r() - 0.5) * 0.6, j: j + (r() - 0.5) * 0.6, spr: S.treeSprite(kind, kind === 'pine' ? (r() < 0.4 ? 1.2 : 1) : 1, r()) });
      }
    }
  }
  spawnPeople(state) {
    const want = Math.min(12, 3 + Math.floor(state.buildings.length / 2));
    while (this.people.length < want) {
      const o = activeOffset(state.mapSize);
      this.people.push({ i: o + Math.random() * state.mapSize - 0.5, j: o + Math.random() * state.mapSize - 0.5, ti: null, tj: null, k: (this.people.length + Math.floor(Math.random() * 2)) % 6, wait: Math.random() * 3 });
    }
    if (this.people.length > want) this.people.length = want;
  }
  stepPeople(state, dt) {
    const o = activeOffset(state.mapSize), n = state.mapSize;
    const occ = occupancy(state);
    for (const p of this.people) {
      if (p.i < o - 0.5 || p.j < o - 0.5 || p.i > o + n - 0.5 || p.j > o + n - 0.5) { p.i = o + n / 2; p.j = o + n / 2; }
      if (p.wait > 0) { p.wait -= dt; continue; }
      if (p.ti == null) {
        for (let tries = 0; tries < 8; tries++) {
          const ti = o + Math.floor(Math.random() * n), tj = o + Math.floor(Math.random() * n);
          if (!occ.has(ti + ',' + tj) || occ.get(ti + ',' + tj).type === 'd_road') { p.ti = ti + (Math.random() - 0.5) * 0.5; p.tj = tj + (Math.random() - 0.5) * 0.5; break; }
        }
        if (p.ti == null) { p.wait = 2; continue; }
      }
      const dx = p.ti - p.i, dy = p.tj - p.j, d = Math.hypot(dx, dy), sp = 0.55 * dt;
      if (d < sp) { p.i = p.ti; p.j = p.tj; p.ti = null; p.wait = 1 + Math.random() * 4; }
      else { p.i += dx / d * sp; p.j += dy / d * sp; p.flip = (dx - dy) < 0; }
    }
  }
  addFx(fx) { this.fx.push({ ...fx, t: 0 }); }
  // 위인이 배치된 건물: 둥근 금테 배지 (초상 그림의 투명한 바탕이 검게 보이지 않도록 크림색 원 안에 그려요)
  heroBadge(g, img, cx, cy) {
    const r = 12;
    g.save();
    g.fillStyle = 'rgba(43,27,16,0.35)'; g.beginPath(); g.ellipse(cx, cy + r + 2, r * 0.8, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c98a14'; g.beginPath(); g.arc(cx, cy, r + 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(cx, cy, r + 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(cx, cy, r - 0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx, cy, r - 0.6, 0, Math.PI * 2); g.clip();
    g.imageSmoothingEnabled = true; g.drawImage(img, cx - r, cy - r + 1, r * 2, r * 2); g.imageSmoothingEnabled = false;
    g.restore();
    // 작은 별
    g.fillStyle = '#ffd84a'; g.strokeStyle = '#8a4a0a'; g.lineWidth = 1; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 2.2 : 5; g.lineTo(cx + r * 0.85 + Math.cos(a) * rr, cy - r * 0.85 + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }
  // 전쟁으로 부서진 건물: 돌무더기 + 연기 + 작은 불
  drawRuin(g, X, Y, seed) {
    const t = this.t;
    g.fillStyle = '#7a6a5a'; for (let k = 0; k < 6; k++) g.fillRect(Math.round(X - 18 + k * 6 + (k % 2) * 2), Math.round(Y - 4 - (k % 3) * 2), 5, 3);
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.5 + k / 3 + seed * 0.13) % 1;
      g.fillStyle = `rgba(90,90,90,${0.55 * (1 - ph)})`; g.beginPath(); g.ellipse(X - 6 + k * 6 + Math.sin(ph * 5) * 4, Y - 30 - ph * 46, 5 + ph * 8, 4 + ph * 6, 0, 0, Math.PI * 2); g.fill();
    }
    const fl = 1 + 0.25 * Math.sin(t * 14 + seed);
    g.fillStyle = '#f05a1a'; g.beginPath(); g.moveTo(X + 6, Y - 14); g.lineTo(X + 10, Y - 14 - 10 * fl); g.lineTo(X + 14, Y - 14); g.fill();
    g.fillStyle = '#ffd34a'; g.beginPath(); g.moveTo(X + 8, Y - 14); g.lineTo(X + 10, Y - 14 - 6 * fl); g.lineTo(X + 12, Y - 14); g.fill();
  }

  draw(state, ui = {}, dt = 0.016) {
    if (this.fitPending) this.fit(state);
    this.t += dt;
    this.genScenery(state); this.spawnPeople(state); this.stepPeople(state, dt);
    const g = this.g, W = this.cv.width, Hh = this.cv.height, s = this.cam.s;
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;

    // --- 배경: 하늘·산·물 ---
    const sky = ERAS[state.era]?.sky || '#9fdcef', theme = ERAS[state.era]?.theme;
    if (theme) this.drawSpace(g, W, Hh, theme);
    else {
      const grd = g.createLinearGradient(0, 0, 0, Hh); grd.addColorStop(0, sky); grd.addColorStop(0.45, S.shade(sky, 0.35)); grd.addColorStop(0.46, '#4aa3df'); grd.addColorStop(1, '#3a8fcf');
      g.fillStyle = grd; g.fillRect(0, 0, W, Hh);
      this.drawMountains(g, W, Hh);
      g.fillStyle = '#7fc8f0';
      for (let k = 0; k < 40; k++) { const x = ((k * 197 + this.t * 12 * (k % 3 + 1)) % (W + 40)) - 20, y = Hh * 0.47 + ((k * 89) % (Hh * 0.53)); g.fillRect(Math.round(x), Math.round(y), 6 * this.dpr, 1 * this.dpr); }
    }

    // --- 월드 좌표 ---
    g.setTransform(s, 0, 0, s, Math.round(W / 2 - this.cam.x * s), Math.round(Hh / 2 - this.cam.y * s));
    const occ = occupancy(state);
    // 지면
    for (let j = ISL0; j <= ISL1; j++) for (let i = ISL0; i <= ISL1; i++) {
      const [X, Y] = tileToWorld(i, j);
      const inGrid = i >= 0 && j >= 0 && i < GRID && j < GRID;
      const act = inGrid && isActiveTile(state, i, j);
      let t;
      const o = occ.get(i + ',' + j);
      if (act && o && (B[o.type] || o.type === 'wonder')) t = S.tileSprite(o.type === 'wonder' ? 'dirt' : 'plaza', (i * 7 + j) % 3, theme);
      else t = S.tileSprite(act ? 'grass' : 'locked', ((i * 13 + j * 7) & 3), theme);
      g.drawImage(t.img, X - t.ox, Y - t.oy);
    }
    for (let k = ISL0; k <= ISL1; k++) {
      let c = S.cliffSprite('L', theme), [X, Y] = tileToWorld(k, ISL1); g.drawImage(c.img, X - c.ox, Y - c.oy);
      c = S.cliffSprite('R', theme); [X, Y] = tileToWorld(ISL1, k); g.drawImage(c.img, X - c.ox, Y - c.oy);
    }
    // 활성 구역 테두리
    this.drawActiveBorder(g, state, !!this.mode);
    // 배치/이동 모드: 가능한 칸 표시
    if (this.mode) this.drawPlacement(g, state, occ);
    if (this.selected) { const b = this.selected; this.diamond(g, b.x, b.y, b.size || 1, 'rgba(255,230,90,' + (0.35 + 0.25 * Math.sin(this.t * 6)) + ')', '#ffe066'); }

    // --- 깊이 정렬 오브젝트 ---
    const objs = [];
    for (const sc of this.scenery) objs.push({ d: sc.i + sc.j, i: sc.i, j: sc.j, spr: sc.spr });
    for (const b of state.buildings) {
      if (this.mode === 'move' && this.selected && this.selected.uid === b.uid && this.hover) continue;
      const spr = this.sprFor(state, b);
      objs.push({ d: b.x + b.y + 0.01, i: b.x, j: b.y, spr, b, aura: b.lv >= 10 && !b.broken, broken: !!b.broken });
    }
    if (state.wonder) objs.push({ d: state.wonder.x + state.wonder.y + 2, i: state.wonder.x + 0.5, j: state.wonder.y + 0.5, spr: S.wonderSprite(state.wonderStage), aura: state.wonderStage >= 5 });
    for (const p of this.people) {
      const fr = p.ti != null ? Math.floor(this.t * 6 + p.k) % 2 : 0;
      objs.push({ d: p.i + p.j + 0.02, i: p.i, j: p.j, spr: S.personSprite(p.k, fr, state.era || 1), flip: p.flip });
    }
    // 고스트(배치 미리보기)
    if (this.ghost && this.hover) objs.push({ d: this.hover.x + this.hover.y + 0.5, i: this.hover.x + (this.ghost.size === 2 ? 0.5 : 0), j: this.hover.y + (this.ghost.size === 2 ? 0.5 : 0), spr: this.ghost.spr, alpha: this.ghost.ok ? 0.75 : 0.35 });
    objs.sort((a, b) => a.d - b.d || a.i - b.i);
    for (const o of objs) {
      const [X, Y] = tileToWorld(o.i, o.j);
      if (o.aura) {
        g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 3 + o.i);
        g.fillStyle = '#ffe27a'; g.beginPath(); g.ellipse(X, Y, 30, 14, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      if (o.alpha) g.globalAlpha = o.alpha;
      if (o.broken) g.filter = 'grayscale(0.75) brightness(0.62) sepia(0.35)';
      if (o.flip) { g.save(); g.translate(X, 0); g.scale(-1, 1); g.drawImage(o.spr.img, -o.spr.ox, Y - o.spr.oy, o.spr.w, o.spr.h); g.restore(); }
      else g.drawImage(o.spr.img, Math.round(X - o.spr.ox), Math.round(Y - o.spr.oy), o.spr.w, o.spr.h);
      g.globalAlpha = 1; if (o.broken) { g.filter = 'none'; this.drawRuin(g, X, Y, o.i + o.j); }
      if (o.aura) for (let k = 0; k < 3; k++) {
        const ph = (this.t * 0.8 + k / 3 + o.i * 0.37) % 1;
        g.fillStyle = `rgba(255,240,150,${1 - ph})`; g.fillRect(Math.round(X - 18 + k * 17 + Math.sin(ph * 6) * 3), Math.round(Y - 10 - ph * 60), 2, 2);
      }
    }

    // 시너지 표시
    const syn = synergyInfo(state);
    const shown = new Set();
    for (const b of state.buildings) {
      const list = syn.byUid.get(b.uid); if (!list) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const n = state.buildings.find(o => o.x === b.x + dx && o.y === b.y + dy);
        if (!n || !list.some(x => x.a === n.type || x.b === n.type)) continue;
        const k = b.uid + n.uid; if (shown.has(k)) continue; shown.add(k);
        const [X, Y] = tileToWorld(b.x + dx / 2, b.y + dy / 2);
        const bob = Math.sin(this.t * 4 + b.x) * 2;
        g.fillStyle = '#ff5c8a'; this.heart(g, X, Y - 8 + bob);
      }
    }

    // 효과
    this.fx = this.fx.filter(f => (f.t += dt) < (f.life || 1));
    for (const f of this.fx) {
      const [X, Y] = tileToWorld(f.i, f.j); const p = f.t / (f.life || 1);
      if (f.kind === 'dust') {
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g.fillStyle = `rgba(240,230,210,${1 - p})`; g.fillRect(X + Math.cos(a) * 30 * p, Y + Math.sin(a) * 15 * p - 6, 3, 3); }
      } else if (f.kind === 'stars') {
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = k % 2 ? `rgba(255,220,80,${1 - p})` : `rgba(255,255,255,${1 - p})`; g.fillRect(X + Math.cos(a) * 40 * p, Y - 30 + Math.sin(a) * 30 * p - 20 * p, 3, 3); }
      }
    }

    // --- 화면 좌표 오버레이: 동전, 위기, 위인 배지 ---
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.coinBoxes = []; this.crisisBox = null;
    const coinImg = ui.coinImg;
    const fillRatio = ui.storageRatio || 0;
    const coinSet = new Set(state.buildings.filter(b => B[b.type] && !b.broken).sort((a, z) => (B[z.type].inc * z.lv) - (B[a.type].inc * a.lv)).slice(0, 8).map(b => b.uid));
    for (const b of state.buildings) {
      if (!B[b.type]) continue;
      const [X, Y] = tileToWorld(b.x, b.y);
      const top = Y - Math.min(96, this.sprFor(state, b).oy - 8);
      const [sx, sy] = this.toScreen(X + 10, top);
      if (b.heroId && H[b.heroId] && ui.portraits) this.heroBadge(g, ui.portraits(H[b.heroId]), ...this.toScreen(X - 18, Y - 20));
      if (fillRatio > 0.05 && coinImg && coinSet.has(b.uid) && !this.mode) {
        const bob = Math.sin(this.t * 3 + b.x * 1.3 + b.y) * 3;
        const r = 9 + Math.min(4, fillRatio * 5);
        g.fillStyle = 'rgba(43,27,16,0.35)'; g.beginPath(); g.ellipse(sx, sy + r + 4, r * 0.7, 2.5, 0, 0, Math.PI * 2); g.fill();
        g.drawImage(coinImg, Math.round(sx - r), Math.round(sy + bob - r), r * 2, r * 2);
        if (fillRatio >= 0.999) { g.fillStyle = '#e8443a'; g.beginPath(); g.arc(sx + r - 1, sy + bob - r + 1, 4, 0, Math.PI * 2); g.fill(); }
        this.coinBoxes.push({ x: sx, y: sy + bob });
      }
    }
    if (state.crisis && !state.crisis.resolved && ui.warnImg) {
      const b = state.buildings.find(x => x.uid === state.crisis.bUid) || state.buildings[0];
      if (b) {
        const [X, Y] = tileToWorld(b.x, b.y); const [sx, sy] = this.toScreen(X + 14, Y - 84);
        const bob = Math.abs(Math.sin(this.t * 5)) * -8;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(sx, sy + bob, 19, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#e8443a'; g.lineWidth = 3; g.stroke();
        g.drawImage(ui.warnImg, sx - 13, sy + bob - 14, 26, 26);
        this.crisisBox = { x: sx, y: sy + bob };
        // 불꽃 효과
        const [fx, fy] = this.toScreen(X, Y - 20);
        for (let k = 0; k < 5; k++) { const ph = (this.t * 1.5 + k / 5) % 1; g.fillStyle = `rgba(255,${120 + k * 20},40,${1 - ph})`; g.fillRect(fx - 20 + k * 9, fy - ph * 40, 5, 5); }
      }
    }
  }
  heart(g, x, y) { g.fillRect(x - 3, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2); g.fillRect(x - 4, y - 1, 8, 2); g.fillRect(x - 3, y + 1, 6, 1); g.fillRect(x - 2, y + 2, 4, 1); g.fillRect(x - 1, y + 3, 2, 1); }
  diamond(g, x, y, size, fill, stroke) {
    const [X, Y] = tileToWorld(x - 0.5, y - 0.5);
    const p = [[X, Y], [X + W2 * size, Y + H2 * size], [X, Y + S.TH * size], [X - W2 * size, Y + H2 * size]];
    g.beginPath(); p.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
  }
  drawActiveBorder(g, state, strong) {
    const o = activeOffset(state.mapSize), n = state.mapSize;
    const [X, Y] = tileToWorld(o - 0.5, o - 0.5);
    g.save(); g.setLineDash([4, 3]); g.lineDashOffset = -this.t * 10;
    g.strokeStyle = strong ? 'rgba(255,235,120,0.95)' : 'rgba(255,255,255,0.35)'; g.lineWidth = strong ? 2 : 1;
    g.beginPath(); g.moveTo(X, Y); g.lineTo(X + W2 * n, Y + H2 * n); g.lineTo(X, Y + S.TH * n); g.lineTo(X - W2 * n, Y + H2 * n); g.closePath(); g.stroke(); g.restore();
  }
  drawPlacement(g, state, occ) {
    const o = activeOffset(state.mapSize), n = state.mapSize;
    const size = this.ghost?.size || 1;
    for (let y = o; y < o + n; y++) for (let x = o; x < o + n; x++) {
      const free = !occ.has(x + ',' + y) || (this.selected && occ.get(x + ',' + y).uid === this.selected.uid);
      if (free) this.diamond(g, x, y, 1, 'rgba(120,255,140,0.18)', null);
    }
    if (this.hover && isActiveTile(state, this.hover.x, this.hover.y)) {
      const ok = this.ghost ? this.ghost.ok : true;
      this.diamond(g, this.hover.x, this.hover.y, size, ok ? 'rgba(255,240,120,0.45)' : 'rgba(255,80,80,0.45)', ok ? '#fff6a0' : '#ff6b6b');
    }
  }
  // 우주·외계 시대 배경: 별이 반짝이는 하늘, 행성
  drawSpace(g, W, Hh, theme) {
    const grd = g.createLinearGradient(0, 0, 0, Hh);
    if (theme === 'space') { grd.addColorStop(0, '#050a1e'); grd.addColorStop(0.6, '#0d1b3d'); grd.addColorStop(1, '#1a2a5a'); }
    else { grd.addColorStop(0, '#12051f'); grd.addColorStop(0.6, '#2a1048'); grd.addColorStop(1, '#4a1a6a'); }
    g.fillStyle = grd; g.fillRect(0, 0, W, Hh);
    const d = this.dpr;
    for (let k = 0; k < 120; k++) {
      const x = (k * 263 + 37) % W, y = (k * 151 + 11) % Hh, tw = 0.5 + 0.5 * Math.sin(this.t * (1 + k % 5) + k);
      g.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * tw})`; g.fillRect(x, y, (k % 7 ? 1 : 2) * d, (k % 7 ? 1 : 2) * d);
    }
    if (theme === 'space') {
      const ex = W * 0.82, ey = Hh * 0.18, er = Math.min(W, Hh) * 0.09;
      g.fillStyle = '#2f6fd0'; g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4fb34a'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.35], [0.25, 0.15, 0.3], [-0.1, 0.4, 0.2]]) { g.beginPath(); g.arc(ex + dx * er, ey + dy * er, r * er, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(ex - er * 0.3, ey - er * 0.35, er * 0.25, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,30,0.35)'; g.beginPath(); g.arc(ex + er * 0.35, ey + er * 0.1, er, 0, Math.PI * 2); g.fill();
    } else {
      const px = W * 0.18, py = Hh * 0.2, pr = Math.min(W, Hh) * 0.11;
      g.fillStyle = '#d08a3a'; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,220,160,0.8)'; g.lineWidth = 3 * d; g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.45, -0.3, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#5ef0e8'; g.beginPath(); g.arc(W * 0.8, Hh * 0.14, pr * 0.35, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff7ad8'; g.beginPath(); g.arc(W * 0.88, Hh * 0.26, pr * 0.2, 0, Math.PI * 2); g.fill();
    }
    // 멀리 떠다니는 작은 별똥별
    const sx = ((this.t * 60) % (W + 400)) - 200, sy = Hh * 0.3 + Math.sin(this.t * 0.3) * 20;
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = d; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 30 * d, sy - 10 * d); g.stroke();
  }
  drawMountains(g, W, Hh) {
    const base = Hh * 0.47;
    const layer = (col, amp, freq, off, hgt) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, base);
      const step = 6 * this.dpr;
      for (let x = 0; x <= W + step; x += step) {
        const y = base - hgt - Math.abs(Math.sin(x * freq + off)) * amp - Math.sin(x * freq * 2.7 + off) * amp * 0.25;
        g.lineTo(x, Math.round(y / step) * step);
      }
      g.lineTo(W, base); g.closePath(); g.fill();
    };
    layer('#a8c9c0', 70 * this.dpr, 0.004 / this.dpr, 1.3, 30 * this.dpr);
    layer('#7fae8e', 46 * this.dpr, 0.007 / this.dpr, 0.4, 10 * this.dpr);
    layer('#5f9a5a', 22 * this.dpr, 0.013 / this.dpr, 2.1, 0);
  }
}
