// =============================================================
//  친구 마을 함께 놀기
//  · 방향키로 걸어 다니기 — 걸음에 맞춰 발을 번갈아 들고 통통 걸어요
//  · 말풍선 채팅 · 감정 표현 6가지 (숫자 1~6)
//  · 역사 OX 퀴즈 — 왼쪽이 O, 오른쪽이 X! 답이라고 생각하는 쪽으로 걸어가요
//  · 보물 줍기 — 마을 곳곳에 엽전 꾸러미·보물 상자가 나타나요 (먼저 주운 친구가 가져요)
//  서버: visits/{마을}/people/{나} · visits/{마을}/game/ox · visits/{마을}/picks/{보물}
//  무료 서버 한도를 아끼려고, 위치는 ‘방향이 바뀔 때’와 3초마다만 보내고 나머지는 예측해서 그려요
// =============================================================
import * as S from './sprites.js?v=202611271343';
import { tileToWorld } from './render.js?v=202611271343';
import { activeOffset, occupancy } from './economy.js?v=202611271343';
import { B } from './data-buildings.js?v=202611271343';
import { QUIZZES } from './data-quizzes.js?v=202611271343';
import { HISTORY_ERA } from './data-config.js?v=202611271343';
import { sync } from './sync.js?v=202611271343';
import { badWord } from './badwords.js?v=202611271343';

const SPEED = 1.7;            // 걷는 빠르기 (칸/초)
const STRIDE = 0.8;           // 두 걸음에 가는 거리 (칸)
const ACCEL = 12;             // 출발·멈춤이 부드러운 정도
const MIN_GAP = 600;          // 위치 보내기 최소 간격
const FIX_EVERY = 3000;       // 같은 방향으로 걷는 동안 위치 맞추기
const SLOW_FIX = 6000;        // 오늘 많이 보냈으면
const DAILY_CAP = 500;
const BEAT = 25000;           // 가만히 있어도 ‘여기 있어요’
const STALE = 70000;          // 이만큼 소식이 없으면 나간 걸로
const BUBBLE = 6500;
const KEYS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
const DIR = { u: [-1, -1], d: [1, 1], l: [-1, 1], r: [1, -1] };   // 화면 방향 → 마을 칸 방향

export const EMOTES = [
  { id: 'hi', e: '👋', label: '안녕', anim: 'wave', dur: 1.5 },
  { id: 'love', e: '❤️', label: '좋아', anim: 'hop', dur: 1.3 },
  { id: 'lol', e: '😆', label: '하하', anim: 'shake', dur: 1.3 },
  { id: 'good', e: '👍', label: '최고', anim: 'hop', dur: 1.3 },
  { id: 'yay', e: '🎉', label: '신나', anim: 'jump', dur: 1.7 },
  { id: 'dance', e: '💃', label: '춤', anim: 'dance', dur: 2.6 },
];
const EMO = Object.fromEntries([...EMOTES, { id: 'crown', e: '👑', anim: 'jump', dur: 2.4 }, { id: 'ok', e: '⭕', anim: 'hop', dur: 2.6 }, { id: 'no', e: '❌', anim: 'shake', dur: 2.6 }].map(e => [e.id, e]));

// OX 퀴즈: 준비 4초 → (생각 10초 + 정답 3.5초) × 5문제
export const OX = { n: 5, lead: 4000, think: 10000, show: 3500 };
const OX_POOL = QUIZZES.filter(q => q.type === 'ox');
// 보물: 15초마다 2개, 30초 동안 있어요
const SLOT = 15000, PER_SLOT = 2;

const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const tsMs = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : null);
const srv = () => Date.now() + (sync.srvOff || 0);     // 서버 시계 (기기 시계가 틀려도 다 같이 맞춰요)

export function oxQuestions(seed, era, n = OX.n) {
  const pool = OX_POOL.filter(q => q.era <= era), r = S.srand(seed), a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

/**
 * opt: { vid, village, renderer, layer, me(내 정보 | null = 구경만), onToast, onSay, onReward(ev), canTreasure(), onOx(info), onOxEnd(res) }
 */
export function startRoom(opt) {
  const { vid, village, renderer, layer } = opt;
  const meInfo = opt.me || null;
  const n = village.mapSize || 4, o = activeOffset(n);
  const occ = occupancy(village);
  const blocked = (i, j) => { const t = occ.get(Math.round(i) + ',' + Math.round(j)); return !!t && (!!B[t.type] || t.type === 'wonder'); };
  const inside = (i, j) => i >= o - 0.45 && j >= o - 0.45 && i <= o + n - 0.55 && j <= o + n - 0.55;
  const others = new Map();
  let me = null, keys = new Set(), alive = true;
  let lastSent = 0, sentDir = '0', wantSend = false, beatT = Date.now();
  const unsubs = [];

  const dayKey = 'hb.roomWrites.' + new Date().toDateString();
  let sentToday = 0; try { sentToday = Number(localStorage.getItem(dayKey) || 0); } catch (e) {}
  function put(data) {
    if (!meInfo || !alive) return;
    sentToday++; try { localStorage.setItem(dayKey, String(sentToday)); } catch (e) {}
    sync.roomPut(vid, data).catch(e => console.warn('room', e));
  }
  const r2 = v => Math.round(v * 100) / 100;

  // ---------- OX 퀴즈 상태 ----------
  let game = null, oxQs = [], oxKey = '', oxScore = 0, oxJudged = new Set(), oxSawThink = new Set(), oxEnded = '', oxInfoKey = '';
  const oxActive = () => { if (!game) return false; const t = srv() - game.startAt; return t > -OX.lead - 3000 && t < game.n * (OX.think + OX.show) + 1500; };
  const ghost = () => oxActive();          // 퀴즈 하는 동안은 건물 위로도 지나가요 (어느 쪽이든 갈 수 있게)
  const free = (i, j) => inside(i, j) && (ghost() || !blocked(i, j));

  // ---------- 내 캐릭터 ----------
  if (meInfo) {
    let best = null;
    for (let j = o; j < o + n; j++) for (let i = o; i < o + n; i++) {
      if (blocked(i, j)) continue;
      const d = Math.hypot(i - (o + n * 0.55), j - (o + n * 0.8)) + Math.random() * 0.8;
      if (!best || d < best.d) best = { i, j, d };
    }
    const sp = best || { i: o + n / 2, j: o + n / 2 };
    me = { id: 'me', me: true, i: sp.i, j: sp.j, vx: 0, vy: 0, k: (meInfo.av || 0) % 6, era: meInfo.era || 1, label: meInfo.label, flip: false, ph: 0, amp: 0 };
    put({ name: meInfo.name, no: meInfo.no, cls: meInfo.cls, av: meInfo.av || 0, era: meInfo.era || 1, x: r2(me.i), y: r2(me.j), vx: 0, vy: 0, msg: '', msgAt: 0 });
    lastSent = Date.now();
  }

  // ---------- 다른 친구들 ----------
  unsubs.push(sync.roomWatch(vid, list => {
    const now = Date.now(), seenIds = new Set();
    for (const p of list) {
      if (!p) continue;
      if (p.id === sync.myUid) {                       // 내 문서: 서버 시계와 내 시계 차이 재기
        const st = tsMs(p.st);
        if (st && p.at) { const off = st - p.at; sync.srvOff = sync.srvOffN ? sync.srvOff * 0.6 + off * 0.4 : off; sync.srvOffN = (sync.srvOffN || 0) + 1; }
        continue;
      }
      seenIds.add(p.id);
      let a = others.get(p.id);
      if (!a) {
        a = { id: p.id, i: p.x ?? o + n / 2, j: p.y ?? o + n / 2, ax: p.x, ay: p.y, avx: 0, avy: 0, aT: performance.now(), maxT: 0, at: p.at, seen: now, msgAt: p.msgAt || 0, emoAt: p.emoAt || 0, flip: false, ph: 0, amp: 0 };
        others.set(p.id, a);
        if (!meInfo && opt.onToast) opt.onToast(`${p.no ? p.no + '번 ' : ''}${p.name} 친구가 우리 마을에 놀러 왔어요!`);
      }
      a.k = (p.av || 0) % 6; a.era = p.era || 1; a.label = `${p.no ? p.no + '번 ' : ''}${p.name || '친구'}`; a.name = p.name || '친구';
      if ((p.oxg || '') !== a.oxg) { a.oxg = p.oxg || ''; a.oxs = p.oxs || 0; } else a.oxs = Math.max(a.oxs || 0, p.oxs || 0);   // 늦게 온 옛 소식에 점수가 줄지 않게
      if (typeof p.x === 'number' && (p.x !== a.ax || p.y !== a.ay || (p.vx || 0) !== a.avx || (p.vy || 0) !== a.avy || p.at !== a.at)) {
        a.ax = p.x; a.ay = p.y; a.avx = p.vx || 0; a.avy = p.vy || 0; a.aT = performance.now(); a.maxT = runTime(p.x, p.y, a.avx, a.avy);
      }
      if (p.at !== a.at) { a.at = p.at; a.seen = now; }
      if ((p.msgAt || 0) > a.msgAt) { a.msgAt = p.msgAt; if (p.msg && !badWord(p.msg)) { a.msg = p.msg; a.msgUntil = now + BUBBLE; } }
      if ((p.emoAt || 0) > a.emoAt) { a.emoAt = p.emoAt; if (EMO[p.emo] && now - p.emoAt < 8000) setEmo(a, p.emo); }
    }
    for (const id of [...others.keys()]) if (!seenIds.has(id)) others.delete(id);
  }));
  // 친구가 걷는 방향으로 몇 초 동안 갈 수 있는지 (벽에 닿으면 멈춰요)
  function runTime(x, y, vx, vy) {
    if (!vx && !vy) return 0;
    let t = 0; const h = 0.05;
    while (t < 3.5) { const nx = x + vx * (t + h), ny = y + vy * (t + h); if (!free(nx, ny)) break; t += h; }
    return t;
  }

  // ---------- OX 퀴즈 · 보물 구독 (참가자만) ----------
  const picked = new Map();     // 보물 → 주운 사람
  const myClaims = new Set();
  let treasureNoticed = false;
  if (meInfo) {
    unsubs.push(sync.roomGameWatch(vid, g => {
      if (!g || typeof g.startAt !== 'number') return;
      const key = String(g.seed);
      if (key !== oxKey) { game = g; oxKey = key; oxQs = oxQuestions(g.seed, Math.max(1, Math.min(HISTORY_ERA, g.era || 1)), g.n || OX.n); oxScore = 0; oxJudged = new Set(); oxSawThink = new Set(); oxEnded = ''; }
    }));
    const joinSlot = Math.floor(srv() / SLOT) - 40;
    unsubs.push(sync.roomPicksWatch(vid, joinSlot, list => {
      for (const p of list) {
        if (picked.has(p.id)) continue;
        picked.set(p.id, p.uid);
        if (p.uid !== sync.myUid) { const it = itemsNow().find(x => x.key === p.id); if (it) renderer.addFx({ kind: 'stars', i: it.i, j: it.j, life: 0.7 }); }
      }
    }));
  }
  function startOx() {
    if (!meInfo || oxActive()) return false;
    if (sync.enabled && !(sync.srvOffN > 0)) return 'wait';        // 서버 시계를 아직 못 쟀어요 (들어온 지 1초 안)
    const g = { startAt: Math.round(srv() + OX.lead), seed: (Math.random() * 2147483646 | 0) + 1, n: OX.n, by: meInfo.name, era: Math.max(1, Math.min(HISTORY_ERA, village.era || 1)), at: Date.now() };
    game = g; oxKey = String(g.seed); oxQs = oxQuestions(g.seed, g.era, g.n); oxScore = 0; oxJudged = new Set(); oxSawThink = new Set(); oxEnded = '';
    sync.roomGameSet(vid, g).catch(e => console.warn('ox', e));
    return true;
  }
  const zoneOf = a => { const d = a.i - a.j; return d <= -0.5 ? 'O' : d >= 0.5 ? 'X' : ''; };
  function oxState() {
    if (!game) return null;
    const t = srv() - game.startAt, total = game.n * (OX.think + OX.show);
    if (t < -OX.lead - 3000 || t > total + 9000) return null;
    if (t < 0) return { phase: 'ready', sec: Math.ceil(-t / 1000), round: 0 };
    if (t >= total) return { phase: 'done', round: game.n - 1, sec: 0 };
    const round = Math.floor(t / (OX.think + OX.show)), within = t - round * (OX.think + OX.show);
    if (within < OX.think) return { phase: 'think', round, sec: Math.ceil((OX.think - within) / 1000) };
    return { phase: 'show', round, sec: 0 };
  }
  function stepOx() {
    const st = oxState();
    renderer.groundFx = st && st.phase !== 'done' ? drawOxGround : null;
    renderer.overFx = st && st.phase !== 'done' ? drawOxSigns : null;
    oxNow = st;
    if (!st) { if (oxInfoKey) { oxInfoKey = ''; opt.onOx?.(null); } return; }
    const q = oxQs[st.round];
    if (st.phase === 'think') oxSawThink.add(st.round);
    if (st.phase === 'show' && q && !oxJudged.has(st.round)) {
      oxJudged.add(st.round);
      // 모두에게 ⭕ / ❌ 표시 (친구들은 보이는 위치로)
      for (const a of list()) { const z = zoneOf(a); const ok = !!z && (z === 'O') === q.answer; setEmo(a, ok ? 'ok' : 'no'); }
      if (me && oxSawThink.has(st.round)) {
        const z = zoneOf(me), right = !!z && (z === 'O') === q.answer;
        if (right) oxScore++;
        put({ oxs: oxScore, oxg: oxKey });
        opt.onReward?.({ type: 'ox', right, zone: z, answer: q.answer });
      }
    }
    if (st.phase === 'done' && oxEnded !== oxKey) {
      oxEnded = oxKey;
      const key = oxKey, n = game.n;
      const board = update => {
        if (!alive || key !== oxKey) return;
        const rows = [];
        if (me) rows.push({ name: meInfo.name, no: meInfo.no, score: oxScore, me: true });
        for (const a of others.values()) if (a.oxg === key) rows.push({ name: a.name, no: a.label.match(/^(\d+)번/)?.[1], score: a.oxs || 0 });
        rows.sort((x, y) => y.score - x.score || (y.me ? 1 : 0) - (x.me ? 1 : 0));
        const top = rows[0]?.score || 0;
        if (!update && me && top > 0 && oxScore === top) { setEmo(me, 'crown'); put({ emo: 'crown', emoAt: Date.now() }); }
        opt.onOxEnd?.({ rows, top, mine: oxScore, n, update });
      };
      setTimeout(() => board(false), 1200);
      setTimeout(() => board(true), 3500);       // 늦게 도착한 친구 점수까지 다시 모아요
    }
    const info = { ...st, n: game.n, q: q?.q || '', answer: q?.answer, exp: q?.exp || '', zone: me ? zoneOf(me) : '', by: game.by, score: oxScore, judged: oxSawThink.has(st.round) };
    const key = `${st.phase}|${st.round}|${st.sec}|${info.zone}|${oxScore}`;
    if (key !== oxInfoKey) { oxInfoKey = key; opt.onOx?.(info); }
  }
  let oxNow = null;
  // OX 바닥: 왼쪽 파랑(O) · 오른쪽 빨강(X) · 가운데 흰 띠는 ‘어느 쪽도 아님’
  function drawOxGround(g, r) {
    const st = oxNow; if (!st) return;
    const [tx, ty] = tileToWorld(o - 0.5, o - 0.5), H = S.TH * n, Wd = S.TW / 2 * n;
    const ans = st.phase === 'show' ? (oxQs[st.round]?.answer ? 'O' : 'X') : '';
    const pulse = 0.5 + 0.5 * Math.sin(r.t * 5);
    g.save();
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Wd, ty + H / 2); g.lineTo(tx, ty + H); g.lineTo(tx - Wd, ty + H / 2); g.closePath(); g.clip();
    const band = S.TW / 4;
    const side = (zone, x0, x1, col) => {
      const on = !ans ? 0.34 + 0.06 * pulse : ans === zone ? 0.5 + 0.18 * pulse : 0;
      if (ans && ans !== zone) { g.fillStyle = 'rgba(15,15,25,0.42)'; g.fillRect(x0, ty, x1 - x0, H); return; }
      g.fillStyle = `rgba(${col},${on})`; g.fillRect(x0, ty, x1 - x0, H);
    };
    side('O', tx - Wd, tx - band, '40,120,255');
    side('X', tx + band, tx + Wd, '255,40,70');
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(tx - band, ty, band * 2, H);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(tx - band - 0.75, ty, 1.5, H); g.fillRect(tx + band - 0.75, ty, 1.5, H);
    g.restore();
  }
  // 둥실 떠 있는 큰 O · X 표지판
  function drawOxSigns(g, r) {
    const st = oxNow; if (!st) return;
    const ans = st.phase === 'show' ? (oxQs[st.round]?.answer ? 'O' : 'X') : '';
    const [cx, cy] = tileToWorld(o + (n - 1) / 2, o + (n - 1) / 2), Wd = S.TW / 2 * n;
    const R = Math.max(14, Math.min(30, n * 3.2));
    for (const z of ['O', 'X']) {
      const x = cx + (z === 'O' ? -1 : 1) * Wd / 3, y = cy - R * 1.6 + Math.sin(r.t * 2 + (z === 'O' ? 0 : 1.5)) * 2;
      const win = ans === z, lose = ans && !win, sc = win ? 1.15 + 0.08 * Math.sin(r.t * 8) : 1;
      g.save(); g.translate(x, y); g.scale(sc, sc); g.globalAlpha = lose ? 0.3 : 0.95;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const path = () => { g.beginPath(); if (z === 'O') g.arc(0, 0, R * 0.62, 0, Math.PI * 2); else { g.moveTo(-R * 0.55, -R * 0.55); g.lineTo(R * 0.55, R * 0.55); g.moveTo(R * 0.55, -R * 0.55); g.lineTo(-R * 0.55, R * 0.55); } };
      path(); g.strokeStyle = '#ffffff'; g.lineWidth = R * 0.42; g.stroke();
      path(); g.strokeStyle = z === 'O' ? '#2f7fe8' : '#e8443a'; g.lineWidth = R * 0.26; g.stroke();
      g.restore();
    }
    g.globalAlpha = 1;
  }

  // ---------- 보물 ----------
  const vh = hashStr(vid);
  function slotItems(s) {
    const r = S.srand((vh ^ Math.imul(s, 2654435761)) >>> 0), out = [];
    for (let k = 0; k < PER_SLOT; k++) {
      for (let t = 0; t < 14; t++) {
        const i = o + Math.floor(r() * n), j = o + Math.floor(r() * n), big = r() < 0.18;
        if (blocked(i, j)) continue;
        out.push({ key: `${s}_${k}`, slot: s, i, j, big }); break;
      }
    }
    return out;
  }
  function itemsNow() {
    if (!meInfo || oxActive()) return [];
    const now = srv(), s = Math.floor(now / SLOT), out = [];
    for (const sl of [s - 1, s]) for (const it of slotItems(sl)) {
      if (picked.has(it.key) || myClaims.has(it.key)) continue;
      it.fade = now > (sl + 2) * SLOT - 4000;     // 사라지기 4초 전부터 깜빡깜빡
      out.push(it);
    }
    return out;
  }
  function stepItems() {
    const items = itemsNow(); renderer.items = items;
    if (!me) return;
    for (const it of items) {
      if (Math.hypot(me.i - it.i, me.j - it.j) > 0.45) continue;
      if (opt.canTreasure && !opt.canTreasure()) {
        if (!treasureNoticed) { treasureNoticed = true; opt.onToast?.('오늘 보물은 충분히 주웠어요! 내일 또 주우러 와요.'); }
        return;
      }
      myClaims.add(it.key);
      renderer.addFx({ kind: 'stars', i: it.i, j: it.j, life: 0.8 });
      sync.roomPick(vid, it.key, it.slot, meInfo.name)
        .then(() => { if (alive) opt.onReward?.({ type: 'treasure', big: it.big }); })
        .catch(() => { if (alive) opt.onToast?.('앗, 친구가 한발 먼저 주웠어요!'); });
      return;
    }
  }

  // ---------- 감정 표현 ----------
  function setEmo(a, id) { const e = EMO[id]; if (!e) return; a.emo = { id, e: e.e, anim: e.anim, dur: e.dur, t: 0, n: (a.emo?.n || 0) + 1 }; }
  let emoT = 0;
  function emote(id) {
    if (!me || !EMO[id] || performance.now() - emoT < 1200) return false;
    emoT = performance.now(); setEmo(me, id); put({ emo: id, emoAt: Date.now() }); return true;
  }
  function stepEmo(a, dt) {
    a.jump = 0; a.tilt = 0; a.squash = 0; a.flipOv = undefined;
    const m = a.emo; if (!m) return;
    m.t += dt; const t = m.t, p = t / m.dur;
    if (p >= 1.6) { a.emo = null; return; }          // 머리 위 그림은 조금 더 남아요
    if (p >= 1) return;
    const fade = 1 - p;
    switch (m.anim) {
      case 'wave': a.tilt = Math.sin(t * 11) * 0.09 * fade; break;
      case 'hop': if (t < 0.5) { a.jump = Math.sin(t / 0.5 * Math.PI) * 6; a.squash = t < 0.08 ? -0.08 : 0.04; } break;
      case 'shake': a.tilt = Math.sin(t * 34) * 0.06 * fade; break;
      case 'jump': { const per = 0.55, c = Math.floor(t / per); if (c < 2) { const u = (t % per) / per; a.jump = Math.sin(u * Math.PI) * 9; a.squash = u < 0.12 || u > 0.9 ? -0.1 : 0.05; } break; }
      case 'dance': { const per = 0.32, u = (t % per) / per; a.flipOv = Math.floor(t / per) % 2 === 0; a.jump = Math.sin(u * Math.PI) * 3.5; a.tilt = (a.flipOv ? 1 : -1) * 0.12; break; }
    }
  }

  // ---------- 걸음 ----------
  function animate(a, moved, dt) {
    a.ph = (a.ph || 0) + moved * (Math.PI * 2 / STRIDE);
    const sp = moved / Math.max(dt, 1e-3), want = Math.min(1, sp / (SPEED * 0.55));
    a.amp = (a.amp || 0) + (want - (a.amp || 0)) * (1 - Math.exp(-dt * 12));
    if (a.amp < 0.03) a.ph = Math.round(a.ph / Math.PI) * Math.PI;      // 멈추면 두 발을 땅에
    const stepNo = Math.floor(a.ph / Math.PI);
    if (stepNo !== a.stepNo) { if (a.stepNo != null && a.amp > 0.55 && (a.stepNo & 1)) renderer.addFx({ kind: 'step', i: a.i + 0.05, j: a.j + 0.05, life: 0.45 }); a.stepNo = stepNo; }
  }

  // ---------- 키보드 · 화면 방향 버튼 ----------
  const typing = () => { const el = document.activeElement; return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'); };
  const kd = e => {
    if (typing() || !me) return;
    const k = KEYS[e.key];
    if (k) { keys.add(k); e.preventDefault(); return; }
    const num = Number(e.key); if (num >= 1 && num <= EMOTES.length && !e.repeat) { if (emote(EMOTES[num - 1].id)) opt.onEmote?.(EMOTES[num - 1].id); }
  };
  const ku = e => { const k = KEYS[e.key]; if (k) keys.delete(k); };
  const blur = () => keys.clear();
  if (me) { window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur); }

  // ---------- 매 프레임 ----------
  function step(dt) {
    const now = Date.now();
    if (me) {
      let di = 0, dj = 0; for (const k of keys) { di += DIR[k][0]; dj += DIR[k][1]; }
      const len = Math.hypot(di, dj), tvx = len ? di / len * SPEED : 0, tvy = len ? dj / len * SPEED : 0;
      const f = 1 - Math.exp(-ACCEL * dt);
      me.vx += (tvx - me.vx) * f; me.vy += (tvy - me.vy) * f;
      if (!len && Math.hypot(me.vx, me.vy) < 0.04) { me.vx = 0; me.vy = 0; }
      const ni = me.i + me.vx * dt, nj = me.j + me.vy * dt, oi = me.i, oj = me.j;
      if (free(ni, nj)) { me.i = ni; me.j = nj; }
      else if (free(ni, me.j)) { me.i = ni; me.vy *= 0.5; }            // 벽에 비스듬히 닿으면 미끄러지듯
      else if (free(me.i, nj)) { me.j = nj; me.vx *= 0.5; }
      else { me.vx = 0; me.vy = 0; }
      const mi = me.i - oi, mj = me.j - oj;
      if (Math.abs(mi - mj) > 0.002) me.flip = (mi - mj) < 0;
      animate(me, Math.hypot(mi, mj), dt);
      stepEmo(me, dt);
      // 보내기: 방향이 바뀌거나 멈췄을 때 + 걷는 중 3초마다
      const dirKey = len ? `${Math.sign(di)},${Math.sign(dj)}` : '0';
      const moving = Math.hypot(me.vx, me.vy) > 0.04;
      if (dirKey !== sentDir && (dirKey !== '0' || !moving)) wantSend = true;
      if (len && now - lastSent > (sentToday > DAILY_CAP ? SLOW_FIX : FIX_EVERY)) wantSend = true;
      if (wantSend && now - lastSent >= MIN_GAP) {
        put({ x: r2(me.i), y: r2(me.j), vx: r2(tvx), vy: r2(tvy) });
        sentDir = dirKey; lastSent = now; beatT = now; wantSend = false;
      }
      if (now - beatT > BEAT) { put({}); beatT = now; }
    }
    const pnow = performance.now();
    for (const a of others.values()) {
      if (a.ax == null) continue;
      const el = Math.min(a.maxT, (pnow - a.aT) / 1000);
      const px = a.ax + a.avx * el, py = a.ay + a.avy * el;
      const dx = px - a.i, dy = py - a.j, d = Math.hypot(dx, dy);
      let mi = 0, mj = 0;
      if (d > 5) { a.i = px; a.j = py; }
      else if (d > 0.001) {
        const f = 1 - Math.exp(-dt * 7); mi = dx * f; mj = dy * f;
        const cap = SPEED * 1.6 * dt, m = Math.hypot(mi, mj); if (m > cap) { mi *= cap / m; mj *= cap / m; }
        a.i += mi; a.j += mj;
      }
      if (Math.abs(mi - mj) > 0.002) a.flip = (mi - mj) < 0;
      animate(a, Math.hypot(mi, mj), dt);
      stepEmo(a, dt);
    }
    if (meInfo) { stepOx(); stepItems(); }
    renderer.avatars = list();
  }
  function list() {
    const now = Date.now(), out = [];
    for (const a of others.values()) if (now - a.seen < STALE) out.push(a);
    if (me) out.push(me);
    return out;
  }

  // ---------- 이름표 · 말풍선 · 감정 표현 (글자는 HTML로 또렷하게) ----------
  const tags = new Map();
  function drawTags() {
    const now = Date.now(), live = new Set();
    for (const a of list()) {
      live.add(a.id);
      let el = tags.get(a.id);
      if (!el) { el = document.createElement('div'); el.className = 'av-tag' + (a.me ? ' me' : ''); el.innerHTML = '<i class="av-emo"></i><p class="av-bubble"></p><span class="av-name"></span>'; layer.appendChild(el); tags.set(a.id, el); }
      const [X, Y] = tileToWorld(a.i, a.j);
      const [sx, sy] = renderer.toScreen(X, Y - 30 - (a.jump || 0));
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      const nm = el.querySelector('.av-name'); if (nm.textContent !== a.label) nm.textContent = a.label;
      const bb = el.querySelector('.av-bubble'), show = a.msg && a.msgUntil > now;
      if (show && bb.dataset.t !== String(a.msgUntil)) { bb.textContent = a.msg; bb.dataset.t = String(a.msgUntil); }
      bb.classList.toggle('on', !!show);
      const em = el.querySelector('.av-emo'), m = a.emo;
      if (m && em.dataset.n !== String(m.n)) { em.textContent = m.e; em.dataset.n = String(m.n); em.classList.remove('on'); void em.offsetWidth; em.classList.add('on'); }
      if (!m && em.classList.contains('on')) em.classList.remove('on');
    }
    for (const [id, el] of tags) if (!live.has(id)) { el.remove(); tags.delete(id); }
  }

  // ---------- 말하기 ----------
  function say(text) {
    text = String(text || '').trim().slice(0, 40);
    if (!text || !me) return { ok: false };
    if (badWord(text)) return { ok: false, why: 'bad' };
    if (sync.classControl?.chatOff) return { ok: false, why: 'off' };
    me.msg = text; me.msgUntil = Date.now() + BUBBLE;
    put({ msg: text, msgAt: Date.now() });
    opt.onSay?.(text);
    return { ok: true };
  }
  function press(dir, on) { if (!me) return; if (on) keys.add(dir); else keys.delete(dir); }
  function stop() {
    alive = false; unsubs.forEach(u => { try { u?.(); } catch (e) {} });
    if (me) { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); sync.roomLeave(vid); }
    for (const el of tags.values()) el.remove(); tags.clear();
    renderer.avatars = []; renderer.items = []; renderer.groundFx = null; renderer.overFx = null;
  }
  return { step, drawTags, say, press, stop, emote, startOx, oxBusy: oxActive, count: () => list().length - (me ? 1 : 0), peek: () => ({ me, others, items: renderer.items, ox: oxNow }) };
}
