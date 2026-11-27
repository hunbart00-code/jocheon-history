// =============================================================
//  친구 마을 함께 놀기 — 방향키로 걸어 다니고, 말풍선으로 채팅해요
//  · 같은 친구 마을에 들어온 친구들끼리 서로 보여요 (visits/{마을}/people/{나})
//  · 마을 주인은 내 마을에서 놀러 온 친구들을 볼 수 있어요 (host 모드)
//  · 위치는 1초에 한 번쯤만 보내요 (무료 서버 사용량 아끼기)
// =============================================================
import * as S from './sprites.js?v=202611271314';
import { tileToWorld } from './render.js?v=202611271314';
import { activeOffset, occupancy } from './economy.js?v=202611271314';
import { B } from './data-buildings.js?v=202611271314';
import { sync } from './sync.js?v=202611271314';
import { badWord } from './badwords.js?v=202611271314';

const SPEED = 2.4;            // 내 캐릭터 걷는 빠르기 (칸/초)
// 무료 서버(하루 읽기 5만·쓰기 2만) 한도를 넘지 않게 아껴서 보내요
const SEND_EVERY = 2000;      // 움직이는 동안 위치 보내는 간격
const SLOW_EVERY = 8000;      // 오늘 많이 보냈으면 이 간격으로
const DAILY_CAP = 400;        // 하루에 자주 보내는 횟수
const BEAT = 25000;           // 가만히 있어도 ‘여기 있어요’ 알리는 간격
const STALE = 70000;          // 이만큼 소식이 없으면 나간 걸로 봐요
const BUBBLE = 6500;          // 말풍선 보이는 시간
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const KEYS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
// 화면 방향 → 마을 칸 방향 (아이소메트릭)
const DIR = { u: [-1, -1], d: [1, 1], l: [-1, 1], r: [1, -1] };

/**
 * opt: { vid, village(state), renderer, layer(태그를 붙일 요소), me(내 정보 | null = 구경만), onToast, onSay }
 */
export function startRoom(opt) {
  const { vid, village, renderer, layer } = opt;
  const meInfo = opt.me || null;
  const n = village.mapSize || 4, o = activeOffset(n);
  const occ = occupancy(village);
  const blocked = (i, j) => { const t = occ.get(Math.round(i) + ',' + Math.round(j)); return !!t && (!!B[t.type] || t.type === 'wonder'); };
  const inside = (i, j) => i >= o - 0.45 && j >= o - 0.45 && i <= o + n - 0.55 && j <= o + n - 0.55;
  const others = new Map();          // id → 아바타
  let me = null, keys = new Set(), lastSent = 0, sentX = null, sentY = null, beatT = 0, unsub = null, alive = true;

  // 오늘 보낸 횟수 (기기에 기록)
  const dayKey = 'hb.roomWrites.' + new Date().toDateString();
  let sentToday = 0; try { sentToday = Number(localStorage.getItem(dayKey) || 0); } catch (e) {}
  // ---------- 내 캐릭터 ----------
  if (meInfo) {
    let best = null;
    for (let j = o; j < o + n; j++) for (let i = o; i < o + n; i++) {
      if (blocked(i, j)) continue;
      const d = Math.hypot(i - (o + n * 0.55), j - (o + n * 0.8));
      if (!best || d < best.d) best = { i, j, d };
    }
    const sp = best || { i: o + n / 2, j: o + n / 2 };
    me = { id: 'me', me: true, i: sp.i, j: sp.j, k: (meInfo.av || 0) % 6, era: meInfo.era || 1, label: meInfo.label, moving: false, flip: false };
    put({ name: meInfo.name, no: meInfo.no, cls: meInfo.cls, av: meInfo.av || 0, era: meInfo.era || 1, x: r2(me.i), y: r2(me.j), msg: '', msgAt: 0 });
    sentX = me.i; sentY = me.j; lastSent = Date.now();
  }
  function r2(v) { return Math.round(v * 100) / 100; }
  function put(data) {
    if (!meInfo || !alive) return;
    sentToday++; try { localStorage.setItem(dayKey, String(sentToday)); } catch (e) {}
    sync.roomPut(vid, data).catch(e => console.warn('room', e));
  }

  // ---------- 다른 친구들 ----------
  unsub = sync.roomWatch(vid, list => {
    const now = Date.now(), seenIds = new Set();
    for (const p of list) {
      if (!p || p.id === sync.myUid) continue;
      seenIds.add(p.id);
      let a = others.get(p.id);
      if (!a) {
        a = { id: p.id, i: p.x ?? o + n / 2, j: p.y ?? o + n / 2, ti: p.x, tj: p.y, at: p.at, seen: now, msgAt: p.msgAt || 0, moving: false, flip: false };
        others.set(p.id, a);
        if (!meInfo && opt.onToast) opt.onToast(`${p.no ? p.no + '번 ' : ''}${p.name} 친구가 우리 마을에 놀러 왔어요!`);
      }
      a.k = (p.av || 0) % 6; a.era = p.era || 1; a.label = `${p.no ? p.no + '번 ' : ''}${p.name || '친구'}`;
      if (typeof p.x === 'number') { a.ti = p.x; a.tj = p.y; }
      if (p.at !== a.at) { a.at = p.at; a.seen = now; }
      if ((p.msgAt || 0) > a.msgAt) { a.msgAt = p.msgAt; if (p.msg && !badWord(p.msg)) { a.msg = p.msg; a.msgUntil = now + BUBBLE; } }
    }
    for (const id of [...others.keys()]) if (!seenIds.has(id)) others.delete(id);
  });

  // ---------- 키보드 · 화면 방향 버튼 ----------
  const typing = () => { const el = document.activeElement; return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'); };
  const kd = e => { const k = KEYS[e.key]; if (!k || typing() || !me) return; keys.add(k); e.preventDefault(); };
  const ku = e => { const k = KEYS[e.key]; if (k) keys.delete(k); };
  const blur = () => keys.clear();
  if (me) { window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur); }

  // ---------- 매 프레임 ----------
  function step(dt) {
    const now = Date.now();
    if (me) {
      let di = 0, dj = 0; for (const k of keys) { di += DIR[k][0]; dj += DIR[k][1]; }
      const len = Math.hypot(di, dj);
      me.moving = len > 0;
      if (len) {
        const vi = di / len * SPEED * dt, vj = dj / len * SPEED * dt;
        const ni = me.i + vi, nj = me.j + vj;
        if (inside(ni, nj) && !blocked(ni, nj)) { me.i = ni; me.j = nj; }
        else if (inside(ni, me.j) && !blocked(ni, me.j)) me.i = ni;          // 벽에 비스듬히 닿으면 미끄러지듯
        else if (inside(me.i, nj) && !blocked(me.i, nj)) me.j = nj;
        me.flip = (di - dj) < 0;
      }
      const moved = sentX == null || Math.hypot(me.i - sentX, me.j - sentY) > 0.15;
      const every = sentToday > DAILY_CAP ? SLOW_EVERY : SEND_EVERY;
      if (moved && (now - lastSent > every || (!me.moving && now - lastSent > Math.min(every, 900)))) {
        put({ x: r2(me.i), y: r2(me.j) }); sentX = me.i; sentY = me.j; lastSent = now; beatT = now;
      }
      if (now - beatT > BEAT) { put({}); beatT = now; }
    }
    for (const a of others.values()) {
      if (a.ti == null) continue;
      const dx = a.ti - a.i, dy = a.tj - a.j, d = Math.hypot(dx, dy);
      if (d > 9) { a.i = a.ti; a.j = a.tj; a.moving = false; continue; }   // 너무 멀면 순간 이동
      const sp = Math.max(SPEED, d * 2.5) * dt;
      if (d <= sp) { a.i = a.ti; a.j = a.tj; a.moving = false; }
      else { a.i += dx / d * sp; a.j += dy / d * sp; a.moving = true; a.flip = (dx - dy) < 0; }
    }
    renderer.avatars = list();
  }
  function list() {
    const now = Date.now(), out = [];
    for (const a of others.values()) if (now - a.seen < STALE) out.push(a);
    if (me) out.push(me);
    return out;
  }

  // ---------- 이름표 · 말풍선 (글자는 HTML로 또렷하게) ----------
  const tags = new Map();
  function drawTags() {
    const now = Date.now(), live = new Set();
    for (const a of list()) {
      live.add(a.id);
      let el = tags.get(a.id);
      if (!el) { el = document.createElement('div'); el.className = 'av-tag' + (a.me ? ' me' : ''); el.innerHTML = '<p class="av-bubble"></p><span class="av-name"></span>'; layer.appendChild(el); tags.set(a.id, el); }
      const [X, Y] = tileToWorld(a.i, a.j);
      const [sx, sy] = renderer.toScreen(X, Y - 30);
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      const nm = el.querySelector('.av-name'); if (nm.textContent !== a.label) nm.textContent = a.label;
      const bb = el.querySelector('.av-bubble'), show = a.msg && a.msgUntil > now;
      if (show && bb.dataset.t !== String(a.msgUntil)) { bb.textContent = a.msg; bb.dataset.t = String(a.msgUntil); }
      bb.classList.toggle('on', !!show);
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
    alive = false; unsub?.();
    if (me) { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); sync.roomLeave(vid); }
    for (const el of tags.values()) el.remove(); tags.clear();
    renderer.avatars = [];
  }
  return { step, drawTags, say, press, stop, count: () => list().length };
}
