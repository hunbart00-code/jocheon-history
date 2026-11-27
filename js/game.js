// =============================================================
//  게임 상태 & 행동 — 저장, 수익, 건설, 퀴즈 보상, 시대 돌파 ...
//  (3차 Firebase 연동 때는 save() 안에서 sync.push(state, reason) 만 추가하면 됩니다)
// =============================================================
import * as E from './economy.js?v=202611271441';
import { ERAS, BAL, EXPAND, BOSSES, CRISES, MAX_ERA, ERA_BOSSES } from './data-config.js?v=202611271441';
import { B, D, WONDER } from './data-buildings.js?v=202611271441';
import { H } from './data-heroes.js?v=202611271441';
import { T } from './data-techs.js?v=202611271441';
import { R, RELICS } from './data-relics.js?v=202611271441';
import { sync } from './sync.js?v=202611271441';
import { TEACHER_MODE, INF } from './mode.js?v=202611271441';

export const SAVE_KEY = TEACHER_MODE ? 'historyBuilder.teacher' : 'historyBuilder.v1';
export const G = { s: null, mods: null, syn: null, inc: 0, cap: 100, ls: {} };

export function on(evt, fn) { (G.ls[evt] ||= []).push(fn); }
export function emit(evt, data) { (G.ls[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

const now = () => Date.now();
const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = msg => ({ ok: false, msg });

// ---------- 저장 ----------
export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
export function load() {
  let s = null;
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; }
  if (!s) return false;
  G.s = migrate(s); recalc();
  // 자리를 비운 동안 쌓인 창고 수익 (최대 창고 용량까지)
  const away = Math.max(0, (now() - (G.s.lastSavedAt || now())) / 1000);
  if (away > 5) { const before = G.s.storage; G.s.storage = Math.min(G.cap, G.s.storage + G.inc * away); G.awayGain = G.s.storage - before; }
  dailyReset();
  return true;
}
function migrate(s) {
  // v1.7: 마을 격자 8×8 → 10×10 — 예전 저장은 모든 건물을 한 칸씩 옮겨 가운데를 맞춰요
  if (!s.grid) {
    for (const b of s.buildings || []) { b.x += 1; b.y += 1; }
    if (s.wonder) { s.wonder.x += 1; s.wonder.y += 1; }
    s.grid = 10;
  }
  // v1.7: 7단계 ‘역사 완성’을 한 친구는 새로 열린 8단계(현대)로
  if (s.completed && (s.era || 0) <= 7 && !s.teacher) { s.completed = false; s.era = 8; s.newEraNotice = true; }
  const base = E.newState();
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  s.settings = { ...base.settings, ...(s.settings || {}) };
  s.stats = { ...base.stats, ...(s.stats || {}) };
  s.stats.subj = { ...base.stats.subj, ...(s.stats.subj || {}) };
  return s;
}
// 두 마을 중 어느 쪽이 더 많이 진행했는지 (시대 → 푼 문제 → 플레이 시간 순)
export function progressOf(s) { return [s?.completed ? 99 : (s?.era || 1), s?.stats?.solved || 0, Math.floor(s?.stats?.playSec || 0)]; }
export function moreProgress(a, b) {   // a 가 b 보다 진행이 많으면 true
  const x = progressOf(a), y = progressOf(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}
export function newGame(profile) { G.s = E.newState(profile); recalc(); save('new'); }
// 클라우드(다른 크롬북)에 저장된 마을로 바꾸기
export function adoptState(data) {
  const local = G.s;
  G.s = migrate(JSON.parse(JSON.stringify(data)));
  if (local?.settings) G.s.settings = local.settings;
  delete G.s.cheers; delete G.s.help; delete G.s.owner; delete G.s.updatedAt; delete G.s.summary;
  recalc(); dailyReset();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.s)); } catch (e) {}
}
// 친구가 내 문서에 남긴 것 처리 (칭찬 스티커, 위기 해결)
export function applyRemote(doc) {
  const s = G.s; if (!s) return [];
  const ev = [];
  const cheers = Object.values(doc.cheers || {}).filter(c => c && c.t > (s.lastCheerT || 0)).sort((a, b) => a.t - b.t);
  for (const c of cheers) {
    s.lastCheerT = c.t; s.stats.likes = (s.stats.likes || 0) + 1;
    const fame = E.fameGain(3, G.mods); s.fame += fame;
    ev.push({ type: 'cheer', from: c.n, sticker: c.s, fame });
  }
  const h = doc.help;
  if (h && s.crisis && h.crisisAt === s.crisis.at) {
    const gold = Math.round(Math.max(50, G.inc) * BAL.crisisGoldSec * G.mods.crisisMult);
    s.gold += gold; s.crisis = null; s.nextCrisisAt = now() + BAL.crisisEveryMin * 60000;
    ev.push({ type: 'help', from: h.by, gold });
  }
  if (ev.length) save('remote');
  return ev;
}
// 내가 친구에게 칭찬 스티커를 보냈을 때 보상 (하루 5명)
export function cheerSent() {
  const s = G.s; dailyReset();
  if (s.daily.cheers >= BAL.crisisDaily) { save('cheer'); return { kp: 0 }; }
  s.daily.cheers++; const kp = Math.round(E.baseKp(s, G.mods)); s.kp += kp; save('cheer');
  return { kp, left: BAL.crisisDaily - s.daily.cheers };
}
// 친구 마을 위기를 해결했을 때 내 보상 (하루 5회)
export function helpedFriend() {
  const s = G.s; dailyReset();
  if (s.daily.crisisHelps >= BAL.crisisDaily) return { kp: 0, limit: true };
  s.daily.crisisHelps++;
  const kp = Math.round(E.baseKp(s, G.mods) * BAL.crisisKpQ * G.mods.crisisMult); s.kp += kp; save('crisis');
  return { kp };
}
// 친구 마을 OX 퀴즈 정답 (하루 BAL.oxDaily 문제까지 KP)
export function oxReward(right) {
  const s = G.s; dailyReset(); s.daily.ox ||= 0;
  if (!right) return { kp: 0 };
  if (s.daily.ox >= BAL.oxDaily) return { kp: 0, limit: true };
  s.daily.ox++; const kp = Math.max(1, Math.round(E.baseKp(s, G.mods))); s.kp += kp; save('ox');
  return { kp, left: BAL.oxDaily - s.daily.ox };
}
// 친구 마을 보물 줍기 (하루 BAL.treasureDaily 개까지 엽전)
export const treasureLeft = () => { dailyReset(); return Math.max(0, BAL.treasureDaily - (G.s.daily.treasure || 0)); };
export function treasureReward(big) {
  const s = G.s; dailyReset(); s.daily.treasure ||= 0;
  if (s.daily.treasure >= BAL.treasureDaily) return { gold: 0, limit: true };
  s.daily.treasure++;
  const gold = Math.max(big ? 90 : 30, Math.round((G.inc || 0) * BAL.treasureSec * (big ? 3 : 1)));
  s.gold += gold; save('treasure');
  return { gold, left: BAL.treasureDaily - s.daily.treasure };
}
export const oxLeft = () => { dailyReset(); return Math.max(0, BAL.oxDaily - (G.s.daily.ox || 0)); };
export const dailyLeft = () => { dailyReset(); return { cheers: BAL.crisisDaily - G.s.daily.cheers, helps: BAL.crisisDaily - G.s.daily.crisisHelps }; };
export function save(reason = 'auto') {
  if (!G.s) return;
  G.s.lastSavedAt = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.s)); } catch (e) { /* 저장 공간 문제 */ }
  sync.push(G.s, reason);
}
export function resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G.s = null; }
export function exportCode() {
  const json = JSON.stringify(G.s);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  let h = 0; for (let i = 0; i < b64.length; i++) h = (h * 31 + b64.charCodeAt(i)) >>> 0;
  return 'HB1-' + h.toString(36) + '-' + b64;
}
export function importCode(code) {
  try {
    const m = String(code).trim().match(/^HB1-([a-z0-9]+)-(.+)$/s); if (!m) return no('백업 코드 형식이 아니에요.');
    let h = 0; for (let i = 0; i < m[2].length; i++) h = (h * 31 + m[2].charCodeAt(i)) >>> 0;
    if (h.toString(36) !== m[1]) return no('코드가 손상되었어요. 다시 복사해 주세요.');
    const s = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
    G.s = migrate(s); recalc(); save('import'); return ok('불러왔어요!');
  } catch (e) { return no('코드를 읽을 수 없어요.'); }
}

export function recalc() {
  const s = G.s;
  G.mods = E.getMods(s); G.syn = E.synergyInfo(s);
  G.inc = E.incomePerSec(s, G.mods, G.syn);
  G.cap = E.storageCap(s, G.mods, G.inc);
}
function dailyReset() { const d = E.todayStr(); if (G.s.daily.date !== d) G.s.daily = { date: d, crisisHelps: 0, cheers: 0, wars: 0 }; G.s.daily.wars ||= 0; }
export const fever = () => G.s.feverUntil > now();

// ---------- 매 프레임 ----------
let saveClock = 0, crisisClock = 0;
export function tick(dt) {
  const s = G.s; if (!s) return;
  if (s.teacher) { if (s.gold < INF) s.gold = INF; if (s.kp < INF) s.kp = INF; }
  s.stats.playSec += dt;
  const mult = fever() ? BAL.feverGold : 1;
  if (s.storage < G.cap) {
    s.storage = Math.min(G.cap, s.storage + G.inc * dt * mult);
    if (s.storage >= G.cap) emit('storageFull');
  }
  saveClock += dt; if (saveClock > 60) { saveClock = 0; save('auto'); }
  if (s.tired && s.tired.until <= now()) { s.tired = null; recalc(); emit('rested'); }
  crisisClock += dt; if (crisisClock > 2) { crisisClock = 0; crisisCheck(); }
}

// ---------- 엽전 거두기 ----------
export function collect() {
  const s = G.s; const amt = Math.floor(s.storage);
  if (amt <= 0) return no('아직 거둘 엽전이 없어요.');
  s.gold += amt; s.storage -= amt; save('collect');
  return ok('', { amt });
}

// ---------- 건설 ----------
export function canPlace(x, y, ignoreUid = null) {
  if (!E.isActiveTile(G.s, x, y)) return false;
  const o = E.occupancy(G.s).get(x + ',' + y);
  return !o || o.uid === ignoreUid;
}
export function buildCheck(type) {
  const s = G.s;
  if (D[type]) {
    const d = D[type];
    if (d.fame && s.fame < d.fame) return no(`명성 ${d.fame}이 필요해요.`);
    if (s.gold < d.gold) return no('엽전이 부족해요.');
    return ok('');
  }
  const def = B[type];
  if (!E.buildingAvailable(s, def)) return no(`${def.era}단계에 열려요.`);
  if (E.countType(s, type) >= E.maxCopies(type)) return no('더 지을 수 없어요 (최대 개수).');
  const c = E.buildCost(s, type, G.mods);
  if (s.kp < c.kp) return no(`KP가 ${E.fmt(c.kp - s.kp)} 부족해요. 퀴즈를 풀어 보세요!`);
  if (s.gold < c.gold) return no(`엽전이 ${E.fmt(c.gold - s.gold)} 부족해요.`);
  if (!E.freeTiles(s).length) return no('빈 땅이 없어요. 건물을 옮기거나 철거하거나 영토를 넓혀요.');
  return ok('');
}
export function build(type, x, y) {
  const chk = buildCheck(type); if (!chk.ok) return chk;
  if (!canPlace(x, y)) return no('여기에는 지을 수 없어요.');
  const s = G.s, first = !D[type] && E.countType(s, type) === 0;
  const c = E.buildCost(s, type, G.mods);
  s.kp -= c.kp; s.gold -= c.gold;
  const b = { uid: 'b' + (s.nextUid++), type, x, y, lv: 1, heroId: null };
  s.buildings.push(b); recalc(); save('build');
  emit('built', { b, first });
  return ok(first ? `${(B[type] || D[type]).name} 해금!` : `${(B[type] || D[type]).name} 건설!`, { b });
}
export function upgrade(uid) {
  const s = G.s, b = s.buildings.find(x => x.uid === uid); if (!b || !B[b.type]) return no('');
  if (b.lv >= BAL.maxLv) return no('최고 레벨이에요!');
  const c = E.upgradeCost(s, b, G.mods);
  if (s.gold < c) return no(`엽전이 ${E.fmt(c - s.gold)} 부족해요.`);
  s.gold -= c; b.lv++; recalc(); save('upgrade');
  const evolved = BAL.evolveLv.includes(b.lv);
  emit('upgraded', { b, evolved });
  return ok(evolved ? `Lv.${b.lv} 진화! 수익 2배!` : `Lv.${b.lv}!`, { evolved });
}
export function moveBuilding(uid, x, y) {
  const s = G.s, b = s.buildings.find(o => o.uid === uid); if (!b) return no('');
  if (!E.isActiveTile(s, x, y)) return no('마을 안쪽으로만 옮길 수 있어요.');
  const occ = E.occupancy(s).get(x + ',' + y);
  if (occ && occ.uid !== uid) {
    if (occ.uid === 'wonder') return no('대역사 자리에는 옮길 수 없어요.');
    occ.x = b.x; occ.y = b.y; // 자리 바꾸기
  }
  b.x = x; b.y = y; recalc(); save('move');
  return ok('옮겼어요!');
}
export function demolishRefund(b) { return Math.floor((B[b.type]?.gold || D[b.type]?.gold || 0) * 0.5); }
export function demolish(uid) {
  const s = G.s, b = s.buildings.find(o => o.uid === uid); if (!b) return no('');
  const r = demolishRefund(b);
  s.buildings = s.buildings.filter(o => o !== b); s.gold += r; recalc(); save('demolish');
  return ok(`철거했어요. 엽전 ${E.fmt(r)} 돌려받음`);
}

// ---------- 영토 확장 ----------
export function nextExpand() { const s = G.s; const size = s.mapSize === 4 ? 6 : s.mapSize === 6 ? 8 : s.mapSize === 8 ? 10 : null; return size ? { size, ...E.expandCost(s, size, G.mods) } : null; }
export function expand() {
  const s = G.s, e = nextExpand(); if (!e) return no('이미 가장 넓어요!');
  if (s.era < e.era) return no(`${e.era}단계에 넓힐 수 있어요.`);
  if (s.kp < e.kp) return no(`KP가 ${E.fmt(e.kp - s.kp)} 부족해요.`);
  if (s.gold < e.gold) return no(`엽전이 ${E.fmt(e.gold - s.gold)} 부족해요.`);
  s.kp -= e.kp; s.gold -= e.gold;
  const off = (e.size - s.mapSize) / 2;
  s.mapSize = e.size; recalc(); save('expand');
  emit('expanded', { size: e.size });
  return ok(`마을이 ${e.size}×${e.size}${e.size === 8 ? "로" : "으로"} 넓어졌어요!`);
}

// ---------- 위인 ----------
export function recruitHero(id) {
  const s = G.s, h = H[id];
  if (!E.heroAvailable(s, h)) return no(`${Math.max(2, h.era)}단계에 영입할 수 있어요.`);
  if (s.heroes[id]) return no('이미 함께하고 있어요.');
  if (s.kp < h.kp) return no(`KP가 ${E.fmt(h.kp - s.kp)} 부족해요.`);
  if (s.gold < h.gold) return no(`엽전이 ${E.fmt(h.gold - s.gold)} 부족해요.`);
  s.kp -= h.kp; s.gold -= h.gold; s.heroes[id] = { lv: 1 }; recalc(); save('hero');
  emit('hero', { id });
  return ok(`${h.name} 영입!`);
}
export function trainHero(id) {
  const s = G.s; const st = s.heroes[id]; if (!st) return no('');
  if (st.lv >= BAL.heroMaxLv) return no('최고 레벨이에요!');
  const c = E.heroTrainCost(s, id); if (s.gold < c) return no(`엽전이 ${E.fmt(c - s.gold)} 부족해요.`);
  s.gold -= c; st.lv++; recalc(); save('train'); return ok(`${H[id].name} Lv.${st.lv}!`);
}
export function assignHero(heroId, uid) {
  const s = G.s;
  for (const b of s.buildings) if (b.heroId === heroId) b.heroId = null;
  if (uid) { const b = s.buildings.find(o => o.uid === uid); if (!b || !B[b.type]) return no(''); b.heroId = heroId; }
  recalc(); save('assign');
  return ok(uid ? `${H[heroId].name} 배치 완료!` : '배치를 풀었어요.');
}
export function heroAt(heroId) { return G.s.buildings.find(b => b.heroId === heroId) || null; }

// ---------- 연구 ----------
export function research(id) {
  const s = G.s, t = T[id];
  if (s.era < 4) return no('역사 연구소는 4단계(고려)에 열려요.');
  if (!E.techAvailable(s, t)) return no(`${t.era}단계에 연구할 수 있어요.`);
  const lv = s.techs[id] || 0; if (lv >= t.maxLv) return no('연구를 모두 마쳤어요!');
  const c = E.techCost(s, id, G.mods); if (s.kp < c) return no(`KP가 ${E.fmt(c - s.kp)} 부족해요.`);
  s.kp -= c; s.techs[id] = lv + 1; recalc(); save('tech');
  return ok(`${t.name} ${lv + 1}단계 완료!`);
}

// ---------- 유물 ----------
export function dig(free = false, minRarity = null) {
  const s = G.s;
  if (!free) {
    if (s.era < 3) return no('유물 발굴은 3단계에 열려요.');
    const c = E.relicCost(s, G.mods); if (s.gold < c) return no(`엽전이 ${E.fmt(c - s.gold)} 부족해요.`);
    s.gold -= c;
  }
  const r = E.rollRelic(s, G.mods, Math.random, minRarity);
  const isNew = !(s.relics[r.id] > 0);
  s.relics[r.id] = (s.relics[r.id] || 0) + 1;
  let fame = 0, setDone = false;
  if (isNew) {
    s.relicPity = 0;
    if (E.eraSetComplete(s, r.era)) { setDone = true; fame += E.fameGain(BAL.fame.set, G.mods); }
  } else { s.relicPity++; fame += E.fameGain(BAL.fame.dup[r.rarity], G.mods); }
  s.fame += fame; recalc(); save('relic');
  return ok('', { relic: r, isNew, fame, setDone });
}

// ---------- 대역사 ----------
export function placeWonder(x, y) {
  const s = G.s; if (s.era < 7) return no('대역사는 7단계에 열려요.');
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) if (!canPlace(x + dx, y + dy)) return no('2×2 빈 땅이 필요해요.');
  s.wonder = { x, y }; recalc(); save('wonder');
  return ok('대역사 부지를 정했어요!');
}
export function buildWonder() {
  const s = G.s; if (!s.wonder) return no('먼저 부지를 정해요.');
  const c = E.wonderCost(s); if (!c) return no('이미 완공했어요!');
  if (s.kp < c.kp) return no(`KP가 ${E.fmt(c.kp - s.kp)} 부족해요.`);
  if (s.gold < c.gold) return no(`엽전이 ${E.fmt(c.gold - s.gold)} 부족해요.`);
  s.kp -= c.kp; s.gold -= c.gold; s.wonderStage++; s.fame += E.fameGain(BAL.fame.wonder, G.mods);
  recalc(); save('wonder');
  emit('wonder', { stage: s.wonderStage });
  return ok(`${WONDER.stages[s.wonderStage - 1].name} 완료!`);
}

// ---------- 일반 퀴즈 ----------
export function countSubj(q, correct) {
  if (!correct || !q) return;
  const k = q.subj || 'hist'; const st = G.s.stats.subj || (G.s.stats.subj = { math: 0, eng: 0, hist: 0 });
  st[k] = (st[k] || 0) + 1;
}
export function answerNormal(q, correct) {
  const s = G.s, m = G.mods; s.stats.solved++;
  countSubj(q, correct);
  if (correct) {
    s.stats.correct++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (m.shield) s.shield = Math.min(m.shield, (s.shield || 0) + 1);
    const kp = Math.max(1, Math.round(E.kpPerCorrect(s, s.combo, m) * (q.kpw ?? 1))); s.kp += kp;   // 영어·수학은 문제 배율
    let feverStart = false;
    if (s.combo >= 5) { feverStart = !fever(); s.feverUntil = now() + m.feverSec * 1000; }
    let fame = 0; if (s.completed) { fame = E.fameGain(BAL.fame.endless, m); s.fame += fame; }
    save('quiz');
    return { kp, combo: s.combo, feverStart, fame };
  }
  const wk = /^m\.(?!c\.)/.test(q.id) ? q.id.split('.').slice(0, 2).join('.') : q.id;   // 수학 자동 문제는 종류별로 모아 세요
  s.stats.wrong[wk] = (s.stats.wrong[wk] || 0) + 1;
  if (!s.wrongQueue.some(w => w.id === q.id)) s.wrongQueue.push({ id: q.id, wait: BAL.requeueAfter });
  let shieldUsed = false;
  if (m.shield && s.shield >= m.shield && s.combo > 0) { s.shield = 0; shieldUsed = true; } else s.combo = 0;
  save('quiz');
  return { kp: 0, combo: s.combo, shieldUsed };
}

// ---------- 시대 돌파 ----------
export function challengeStart() {
  const s = G.s;
  if (s.completed) return no('모든 시대를 완성했어요!');
  if (!E.canChallenge(s)) return no('아직 돌파 조건을 다 채우지 못했어요.');
  if (!s.teacher && s.era >= sync.classControl.maxEra) return no(`선생님이 아직 ${s.era + 1}단계를 열지 않았어요. 조금만 기다려요!`);
  const fee = ERAS[s.era].fee;
  if (!s.feePaid) { if (s.kp < fee) return no(`응시료 ${fee} KP가 필요해요.`); s.kp -= fee; s.feePaid = true; save('fee'); }
  return ok('');
}
export function challengeWin() {
  const s = G.s; const from = s.era;
  s.feePaid = false; s.stats.eraTimes[from] = Math.round(s.stats.playSec);
  s.fame += E.fameGain(BAL.fame.era * from, G.mods);
  if (from >= MAX_ERA) { s.completed = true; s.fame += E.fameGain(2000, G.mods); }
  else s.era = from + 1;
  s.combo = 0; recalc(); save('era');
  emit('eraUp', { from, to: s.era, completed: s.completed });
}

export const eraBoss = () => ERA_BOSSES[G.s.era] || ERA_BOSSES[1];

// ---------- 친구 전쟁 (PvP) ----------
const WAR = BAL.war;
export function setPvp(on) {
  const s = G.s;
  if (on && s.teacher) return no('선생님 테스트 마을은 전쟁에 나가지 않아요.');
  if (on && s.era < WAR.minEra) return no(`전쟁은 ${WAR.minEra}단계(삼국 시대)부터 할 수 있어요.`);
  s.pvp = !!on; save('pvp');
  return ok(on ? '전쟁 허용! 친구가 선전포고를 할 수 있어요.' : '평화 모드! 이제 아무도 선전포고를 할 수 없어요.');
}
export function warsLeft() { dailyReset(); return Math.max(0, WAR.daily - (G.s.daily.wars || 0)); }
// 선전포고 가능한지 (상대 요약 정보 sm 으로 판단)
export function canDeclare(sm) {
  const s = G.s, t = now();
  if (s.teacher || sm?.teacher) return no('선생님 마을은 전쟁에 나가지 않아요.');
  if (sync.classControl.warOff) return no('선생님이 지금은 전쟁을 막아 두었어요.');
  if (!s.pvp) return no('먼저 설정에서 ‘전쟁 허용’을 켜야 해요.');
  if (s.era < WAR.minEra) return no(`전쟁은 ${WAR.minEra}단계부터 할 수 있어요.`);
  if (!sm?.pvp) return no('이 친구는 평화 모드예요. 전쟁을 걸 수 없어요.');
  if ((sm.era || 1) < WAR.minEra) return no('아직 전쟁을 할 수 없는 마을이에요.');
  if ((sm.era || 1) < s.era - 1) return no('나보다 두 시대 이상 약한 마을은 공격할 수 없어요.');
  if (sm.warAt && t - sm.warAt < WAR.protectMin * 60000) return no(`방금 전쟁을 치른 마을이에요. ${Math.ceil((WAR.protectMin * 60000 - (t - sm.warAt)) / 60000)}분 뒤에 다시 해요.`);
  if (warsLeft() <= 0) return no(`선전포고는 하루 ${WAR.daily}번까지예요.`);
  if (sync.classControl.paused) return no('선생님이 게임을 멈췄어요.');
  return ok('');
}
export function declared() { dailyReset(); G.s.daily.wars = (G.s.daily.wars || 0) + 1; save('war'); }
// 전쟁 결과를 내 마을에 반영 (side: 'a' 공격 / 'd' 수비)
export function applyWar(war, side) {
  const s = G.s; if (!war?.result) return null;
  s.warsDone ||= []; if (s.warsDone.includes(war.id)) return null;
  s.warsDone.push(war.id); if (s.warsDone.length > 40) s.warsDone.splice(0, s.warsDone.length - 40);
  const r = war.result, mine = r[side], win = r.winner === side, m = G.mods;
  const pool = s.buildings.filter(b => B[b.type] && !b.broken).sort(() => Math.random() - 0.5);
  const broken = [], collapsed = [];
  for (const b of pool.slice(0, mine.broken)) { b.broken = true; broken.push(B[b.type].name); }
  for (const b of pool.slice(0, mine.collapse)) { if (b.lv > 1) { b.lv--; collapsed.push(B[b.type].name); } }
  const kp = Math.round(E.baseKp(s, m) * (win ? WAR.winKpQ : WAR.loseKpQ));
  const fame = win ? E.fameGain(WAR.winFame, m) : 0;
  s.kp += kp; s.fame += fame;
  // 전쟁 배상금: 진 쪽이 내고 이긴 쪽이 받아요 (진 쪽은 가진 엽전까지만)
  let pay = 0;
  if (r.pay > 0) { if (win) { pay = r.pay; s.gold += pay; } else { pay = Math.min(r.pay, Math.floor(s.gold)); s.gold -= pay; } }
  s.warStats ||= { win: 0, lose: 0 }; s.warStats[win ? 'win' : 'lose']++;
  s.warAt = now();
  const ratio = side === 'a' ? war.from?.ratio || 0.5 : war.to?.ratio || 0.5;
  s.tired = { until: now() + WAR.tiredMin * 60000, cut: Math.round(ratio * 50) / 100 };
  recalc(); save('war');
  return { win, grade: r.grade, broken, collapsed, kp, fame, pay, upset: !!r.upset, tiredCut: s.tired.cut };
}
export function repair(uid) {
  const s = G.s, b = s.buildings.find(x => x.uid === uid); if (!b?.broken) return no('');
  const c = E.repairCost(s, b); if (s.gold < c) return no(`엽전이 ${E.fmt(c - s.gold)} 부족해요.`);
  s.gold -= c; b.broken = false; recalc(); save('repair');
  return ok(`${B[b.type].name} 수리 완료!`);
}

// ---------- 타임어택 ----------
export function taReady() { return now() >= G.s.taReadyAt; }
export function taReward(n) {
  const m = G.mods; const mult = 1 + m.taMult;
  return { kp: Math.round(n * E.baseKp(G.s, m) * BAL.taKpRatio * mult), gold: Math.round(n * Math.max(20, G.inc) * BAL.taGoldSec * mult) };
}
export function taFinish(n, solved, weighted = n) {
  const s = G.s, r = taReward(weighted);
  s.kp += r.kp; s.gold += r.gold; s.taReadyAt = now() + G.mods.taCooldown * 60000;
  s.stats.solved += solved; s.stats.correct += n; save('ta');
  return r;
}

// ---------- 보스전 ----------
export function bossReady() { return G.s.era >= 6 && now() >= G.s.bossReadyAt; }
export function bossFinish(id, win) {
  const s = G.s, m = G.mods;
  if (!win) { s.bossReadyAt = now() + 5 * 60000; save('boss'); return { win }; }
  const kp = Math.round(E.baseKp(s, m) * BAL.bossKpQ * (1 + m.bossKp));
  s.kp += kp; s.bossWins[id] = (s.bossWins[id] || 0) + 1; s.bossReadyAt = now() + BAL.bossCooldownMin * 60000;
  const fame = E.fameGain(BAL.fame.boss, m); s.fame += fame;
  const d = dig(true, 'rare'); recalc(); save('boss');
  return { win, kp, fame, relic: d.relic, isNew: d.isNew };
}

// ---------- 협동 위기 ----------
function crisisCheck() {
  const s = G.s; dailyReset();
  if (s.era < 3 || s.crisis || !s.buildings.some(b => B[b.type])) return;
  if (s.daily.crisisHelps >= BAL.crisisDaily) return;
  if (now() < s.nextCrisisAt) return;
  const list = s.buildings.filter(b => B[b.type]);
  const c = CRISES[Math.floor(Math.random() * CRISES.length)];
  s.crisis = { id: c.id, bUid: list[Math.floor(Math.random() * list.length)].uid, at: now(), retryAt: 0 };
  save('crisis'); emit('crisis', s.crisis);
}
export function crisisReward() {
  const m = G.mods; return { kp: Math.round(E.baseKp(G.s, m) * BAL.crisisKpQ * m.crisisMult), gold: Math.round(Math.max(50, G.inc) * BAL.crisisGoldSec * m.crisisMult) };
}
export function crisisFinish(correct) {
  const s = G.s; if (!s.crisis) return null;
  if (!correct) { s.crisis.retryAt = now() + 30000; save('crisis'); return { correct }; }
  const r = crisisReward(); s.kp += r.kp; s.gold += r.gold;
  s.daily.crisisHelps++; s.crisis = null; s.nextCrisisAt = now() + BAL.crisisEveryMin * 60000; save('crisis');
  return { correct, ...r };
}
export const crisisInfo = () => CRISES.find(c => c.id === G.s.crisis?.id);

// ---------- 선생님 테스트 마을 ----------
// 재화 무한 · 모든 위인·유물(도감) 열림 · 7단계(모든 건물 열림) · 가장 큰 땅
export function teacherSetup() {
  const s = G.s; if (!s) return;
  s.teacher = true; s.pvp = false; s.studentNo = 0; s.name = '선생님';
  s.gold = INF; s.kp = INF;
  if (!s.teacherInit) { s.era = MAX_ERA; s.teacherInit = true; }
  s.mapSize = 10;
  for (const id of Object.keys(H)) if (!s.heroes[id]) s.heroes[id] = { lv: 1 };
  for (const r of RELICS) if (!(s.relics[r.id] > 0)) s.relics[r.id] = 1;
  recalc(); save('teacher');
}
// 시대 바로 가기 (선생님만) — 그 시대의 퀴즈·보스·건물을 시험해 볼 때
export function teacherEra(n) {
  const s = G.s; if (!s?.teacher) return no('선생님만 쓸 수 있어요.');
  n = Math.max(1, Math.min(MAX_ERA, n | 0));
  s.era = n; s.completed = false; s.feePaid = false; s.combo = 0;
  recalc(); save('era'); emit('teacherEra', { era: n });
  return ok(`${n}단계 ${ERAS[n].name}(으)로 옮겼어요.`);
}
