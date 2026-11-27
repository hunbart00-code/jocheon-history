// =============================================================
//  경제 엔진 — 순수 계산 함수 모음 (게임과 밸런스 시뮬레이터가 함께 사용)
// =============================================================
import { ERAS, BAL, EXPAND, MAX_ERA } from './data-config.js?v=202611271238';
import { B, D, SYNERGIES, WONDER } from './data-buildings.js?v=202611271238';
import { H } from './data-heroes.js?v=202611271238';
import { T } from './data-techs.js?v=202611271238';
import { RELICS, R } from './data-relics.js?v=202611271238';

export const GRID = 10;   // v1.7: 8 → 10 (예전 저장의 건물 좌표는 game.js migrate 에서 +1 옮겨요)

export function newState(profile = {}) {
  const now = Date.now();
  return {
    v: 1,
    classCode: profile.classCode || '',
    studentNo: profile.studentNo || 0,
    name: profile.name || '',
    avatar: profile.avatar || 0,
    era: 1, mapSize: 4,
    gold: BAL.startGold, kp: 0, fame: 0,
    storage: 0,
    buildings: [],          // {uid,type,x,y,lv,heroId}
    nextUid: 1,
    wonder: null,           // {x,y} 2×2 부지
    wonderStage: 0,
    heroes: {},             // id → {lv}
    techs: {},              // id → lv
    relics: {},             // id → 개수
    relicPity: 0,
    bossWins: {},
    combo: 0, bestCombo: 0, shield: 0,
    wrongQueue: [],         // [{id, wait}]
    recent: [], seen: [],
    pvp: false, warAt: 0, warsDone: [], tired: null, warStats: { win: 0, lose: 0 },
    feverUntil: 0,
    taReadyAt: 0, bossReadyAt: 0,
    crisis: null, nextCrisisAt: now + 3 * 60 * 1000,
    daily: { date: '', crisisHelps: 0, cheers: 0, wars: 0 },
    stats: { solved: 0, correct: 0, wrong: {}, playSec: 0, eraTimes: {}, subj: { math: 0, eng: 0, hist: 0 } },
    subj: 'hist',           // 퀴즈 과목: hist 한국사 · math 수학 · eng 영어 · mix 섞어서
    grid: 10,
    tutorial: 0,
    completed: false,
    settings: { sfx: true, bgm: false },
    createdAt: now, lastSavedAt: now,
    rev: 0,                 // 서버에 저장된 판 번호 (한 번 저장할 때마다 +1)
  };
}

// ---------- 지도 ----------
export function activeOffset(size) { return (GRID - size) / 2; }
export function isActiveTile(s, x, y) {
  const o = activeOffset(s.mapSize);
  return x >= o && y >= o && x < o + s.mapSize && y < o + s.mapSize;
}
export function occupancy(s) {
  const m = new Map();
  for (const b of s.buildings) m.set(b.x + ',' + b.y, b);
  if (s.wonder) for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++)
    m.set((s.wonder.x + dx) + ',' + (s.wonder.y + dy), { type: 'wonder', uid: 'wonder', x: s.wonder.x, y: s.wonder.y });
  return m;
}
export function freeTiles(s) {
  const occ = occupancy(s), out = [];
  const o = activeOffset(s.mapSize);
  for (let y = o; y < o + s.mapSize; y++) for (let x = o; x < o + s.mapSize; x++)
    if (!occ.has(x + ',' + y)) out.push({ x, y });
  return out;
}

// ---------- 보정치 (위인 패시브 + 연구) ----------
export function getMods(s) {
  const m = {
    goldMult: 0, kpMult: 0, buildDisc: 0, upgradeDisc: 0, expandDisc: 0, relicDisc: 0, techDisc: 0,
    storageMin: BAL.storageMin, storageX2: 0, feverSec: BAL.feverSec, comboAdd: 0, bossKp: 0,
    crisisMult: 1, fameMult: 0, taMult: 0, taCooldown: BAL.taCooldownMin, rareBonus: 0, synergyAdd: 0, shield: 0,
  };
  const add = (type, v) => {
    switch (type) {
      case 'crisisMult': m.crisisMult = Math.max(m.crisisMult, v); break;
      case 'shield': m.shield = v; break;
      case 'taCooldown': m.taCooldown -= v; break;
      default: m[type] = (m[type] || 0) + v;
    }
  };
  for (const b of s.buildings) if (b.heroId && H[b.heroId]) add(H[b.heroId].passive.type, H[b.heroId].passive.v);
  for (const [id, lv] of Object.entries(s.techs)) {
    const t = T[id]; if (!t || !lv) continue;
    add(t.type, t.v * lv);
  }
  for (const k of ['buildDisc', 'upgradeDisc', 'expandDisc', 'relicDisc', 'techDisc']) m[k] = Math.min(0.6, m[k]);
  m.taCooldown = Math.max(10, m.taCooldown);
  m.storageSec = m.storageMin * 60 * 2 ** m.storageX2;
  return m;
}

// ---------- 시너지 ----------
export function synergyInfo(s) {
  const occ = occupancy(s);
  const byUid = new Map();       // uid → [synergy]
  const active = new Set();
  for (const b of s.buildings) {
    for (const syn of SYNERGIES) {
      if (b.type !== syn.a && b.type !== syn.b) continue;
      const partner = b.type === syn.a ? syn.b : syn.a;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = occ.get((b.x + dx) + ',' + (b.y + dy));
        if (n && n.type === partner) {
          if (!byUid.has(b.uid)) byUid.set(b.uid, []);
          if (!byUid.get(b.uid).includes(syn)) byUid.get(b.uid).push(syn);
          active.add(syn.id);
          break;
        }
      }
    }
  }
  return { byUid, active };
}
export function synergyRate(s, mods) {
  return (s.era >= BAL.synergyBoostEra ? BAL.synergyBonusBoosted : BAL.synergyBonus) + mods.synergyAdd;
}

// ---------- 수익 ----------
export function lvMult(lv) {
  let m = 1 + BAL.incomePerLv * (lv - 1);
  if (lv >= BAL.evolveLv[0]) m *= 2;
  if (lv >= BAL.evolveLv[1]) m *= 2;
  return m;
}
export function eraSetComplete(s, era) {
  return RELICS.filter(r => r.era === era).every(r => (s.relics[r.id] || 0) > 0);
}
export function heroMult(s, b) {
  if (!b.heroId || !H[b.heroId]) return 1;
  const h = H[b.heroId], lv = s.heroes[b.heroId]?.lv || 1;
  return BAL.heroBase + BAL.heroPerLv * (lv - 1) + (h.fav === b.type ? BAL.heroFav : 0);
}
export function buildingIncome(s, b, mods, syn) {
  const def = B[b.type]; if (!def || b.broken) return 0;
  let inc = def.inc * lvMult(b.lv);
  const n = syn.byUid.get(b.uid)?.length || 0;
  inc *= 1 + synergyRate(s, mods) * n;
  inc *= heroMult(s, b);
  if (eraSetComplete(s, def.era)) inc *= 1 + BAL.setBonus;
  return inc * globalGoldMult(s, mods);
}
export function globalGoldMult(s, mods) {
  return (1 + mods.goldMult) * (1 + s.wonderStage * BAL.wonderIncomeBonus);
}
export function incomePerSec(s, mods = getMods(s), syn = synergyInfo(s)) {
  let t = 0;
  for (const b of s.buildings) t += buildingIncome(s, b, mods, syn);
  // 전쟁에 주민을 보낸 뒤 잠시 일손 부족
  if (s.tired && s.tired.until > Date.now()) t *= 1 - s.tired.cut;
  return t;
}

// ---------- 주민 · 전쟁 ----------
// 주민 수: 건물마다 (2 + 레벨)명, 대역사 단계마다 5명
export function population(s) {
  let n = 5;
  for (const b of s.buildings) if (B[b.type]) n += b.broken ? 1 : 2 + b.lv;
  return n + (s.wonderStage || 0) * 5;
}
const ERA_POWER = [0, 1, 1.5, 2.2, 3, 4, 5.5, 7, 9, 11.5, 14];
const MILITARY = ['h_gwanggaeto', 'h_geunchogo', 'h_daejoyoung', 'h_jangbogo', 'h_gangamchan', 'h_yisunsin'];
export const isMilitaryHero = id => MILITARY.includes(id);
export function heroWarBonus(s, ids) {
  const W = BAL.war; let b = 0;
  for (const id of ids.slice(0, W.maxHeroes)) { const st = s.heroes[id]; if (!st) continue; b += W.heroBase + W.heroPerLv * (st.lv - 1) + (isMilitaryHero(id) ? W.heroMilitary : 0); }
  return b;
}
// 전투력 = 출전 주민 × 시대 무기 × (1 + 위인 + 수비)  →  × (1 + 실력)
//  실력(skill) = 전투 준비 퀴즈에서 얻은 보너스 합 (정답 +10%, 빠르면 최대 +5% 더 → 최대 +75%)
export function warPower(s, { ratio = 1, heroes = [], skill = 0, defend = false } = {}) {
  const troops = Math.max(1, Math.round(population(s) * ratio));
  const base = Math.round(troops * ERA_POWER[s.era] * 10 * (1 + heroWarBonus(s, heroes) + (defend ? BAL.war.defendBonus : 0)));
  return { troops, base, skill, power: Math.round(base * (1 + skill)) };
}
// 퀴즈 1문제의 실력 점수 (정답일 때만) — 3초 안이면 만점, 12초에 0
export function skillFor(sec) {
  const W = BAL.war; const sp = Math.max(0, Math.min(1, (12 - sec) / 9));
  return Math.round((W.quizBonus + W.speedBonus * sp) * 1000) / 1000;
}
// 전쟁 결과: 실제 전투력에 운(±5%)을 더해 비교. 차이(margin)가 클수록 진 쪽 피해·배상금이 커요
export function resolveWar(pa, pd, rand = Math.random, gold = { a: 0, d: 0 }, base = null) {
  const L = BAL.war.luck;
  const ra = pa * (1 - L + rand() * 2 * L), rd = pd * (1 - L + rand() * 2 * L);
  const winner = ra >= rd ? 'a' : 'd', loser = winner === 'a' ? 'd' : 'a';
  const hi = Math.max(ra, rd), lo = Math.min(ra, rd), margin = hi > 0 ? (hi - lo) / hi : 0;
  const grade = margin < 0.15 ? 'close' : margin < 0.4 ? 'clear' : 'crush';
  // 건물 피해는 확률로 정해요 (아슬아슬하게 지면 40%로 1채, 확실히 지면 70%로 1채, 크게 지면 1~2채)
  const lose = {
    broken: grade === 'close' ? (rand() < 0.4 ? 1 : 0) : grade === 'clear' ? (rand() < 0.7 ? 1 : 0) : 1 + (rand() < 0.35 ? 1 : 0),
    collapse: grade === 'crush' && rand() < 0.25 ? 1 : 0,
  };
  const win = { broken: grade === 'close' && rand() < 0.15 ? 1 : 0, collapse: 0 };
  const pay = Math.floor(Math.max(0, gold[loser] || 0) * BAL.war.payRate[grade]);
  const upset = !!(base && base[winner] < base[loser]);   // 기본 전투력이 약했는데 실력으로 이김
  return { winner, grade, margin: Math.round(margin * 100) / 100, pay, upset, a: winner === 'a' ? win : lose, d: winner === 'd' ? win : lose };
}
export function repairCost(s, b) {
  const base = B[b.type]?.gold || 0;
  return Math.max(10, Math.round(base * Math.max(1, b.lv) * BAL.war.repairRate));
}
export function storageCap(s, mods, inc) {
  return Math.max(100, inc * mods.storageSec);
}

// ---------- 비용 ----------
export function countType(s, type) { return s.buildings.filter(b => b.type === type).length; }
export function maxCopies(type) { return B[type]?.maxCopies || (D[type] ? 99 : BAL.maxCopies); }
export function buildCost(s, type, mods = getMods(s)) {
  if (D[type]) return { kp: 0, gold: D[type].gold };
  const def = B[type], n = countType(s, type);
  return {
    kp: n === 0 ? def.kp : 0,
    gold: Math.ceil(def.gold * BAL.copyMult ** n * (1 - mods.buildDisc)),
  };
}
export function upgradeCost(s, b, mods = getMods(s)) {
  const def = B[b.type];
  return Math.ceil(def.gold * BAL.upgradeMult ** b.lv * (1 - mods.upgradeDisc));
}
export function expandCost(s, size, mods = getMods(s)) {
  const e = EXPAND[size];
  return { kp: Math.ceil(e.kp * (1 - mods.expandDisc)), gold: Math.ceil(e.gold * (1 - mods.expandDisc)), era: e.era };
}
export function heroTrainCost(s, id) {
  const lv = s.heroes[id]?.lv || 1;
  return Math.ceil(H[id].gold * 2.5 ** lv);
}
export function techCost(s, id, mods = getMods(s)) {
  const lv = s.techs[id] || 0;
  return Math.ceil(T[id].kp * (T[id].growth || 2.2) ** lv * (1 - mods.techDisc));
}
export function relicCost(s, mods = getMods(s)) {
  return Math.ceil(BAL.relicCost[Math.max(3, s.era)] * (1 - mods.relicDisc));
}
export function wonderCost(s) { return WONDER.stages[s.wonderStage] || null; }

// ---------- 퀴즈 보상 ----------
export function comboMult(combo, mods) {
  if (combo >= 5) return BAL.combo5 + mods.comboAdd;
  if (combo >= 3) return BAL.combo3 + mods.comboAdd;
  return 1;
}
export function kpPerCorrect(s, combo, mods = getMods(s)) {
  return Math.round(ERAS[s.era].kpPerQ * comboMult(combo, mods) * (1 + mods.kpMult));
}
export function baseKp(s, mods = getMods(s)) {
  return ERAS[s.era].kpPerQ * (1 + mods.kpMult);
}
export function fameGain(base, mods) { return Math.round(base * (1 + mods.fameMult)); }

// ---------- 시대 돌파 조건 ----------
export function checkCond(s, c, syn = synergyInfo(s)) {
  switch (c.type) {
    case 'eraTypes': {
      const set = new Set(s.buildings.filter(b => B[b.type]?.era === c.era && b.lv >= c.minLv).map(b => b.type));
      return { cur: set.size, need: c.n };
    }
    case 'heroes': return { cur: Object.keys(s.heroes).length, need: c.n };
    case 'mapSize': return { cur: s.mapSize >= c.size ? 1 : 0, need: 1 };
    case 'relics': return { cur: Object.values(s.relics).filter(v => v > 0).length, need: c.n };
    case 'techs': return { cur: Object.values(s.techs).filter(v => v > 0).length, need: c.n };
    case 'maxLv': return { cur: s.buildings.filter(b => B[b.type] && b.lv >= c.lv).length, need: c.n };
    case 'synergy': return { cur: syn.active.size, need: c.n };
    case 'boss': return { cur: Object.values(s.bossWins).reduce((a, v) => a + v, 0), need: c.n };
    case 'wonder': return { cur: s.wonderStage, need: c.stage };
    case 'subj': return { cur: (s.stats.subj?.math || 0) + (s.stats.subj?.eng || 0), need: c.n };
  }
  return { cur: 0, need: 1 };
}
export function conditions(s) {
  const syn = synergyInfo(s);
  const era = ERAS[s.era];
  return era.conds.map(c => { const r = checkCond(s, c, syn); return { ...c, ...r, done: r.cur >= r.need }; });
}
export function canChallenge(s) {
  return s.era <= MAX_ERA && !s.completed && conditions(s).every(c => c.done);
}

// ---------- 유물 발굴 ----------
export function relicRates(mods) {
  const r = { ...BAL.relicRates };
  const shift = Math.min(0.3, mods.rareBonus);
  r.common -= shift; r.rare += shift * 0.5; r.treasure += shift * 0.35; r.national += shift * 0.15;
  return r;
}
export function rollRelic(s, mods, rand = Math.random, minRarity = null) {
  const pool = RELICS.filter(r => r.era <= Math.max(3, s.era));
  const owned = id => (s.relics[id] || 0) > 0;
  let cands;
  if (s.relicPity >= BAL.relicPity && pool.some(r => !owned(r.id))) {
    cands = pool.filter(r => !owned(r.id));
  } else {
    const rates = relicRates(mods);
    const order = ['common', 'rare', 'treasure', 'national'];
    const allowed = order.filter((k, i) => (!minRarity || i >= order.indexOf(minRarity)) && pool.some(r => r.rarity === k));
    const tot = allowed.reduce((a, k) => a + rates[k], 0);
    let x = rand() * tot, pick = allowed[allowed.length - 1];
    for (const k of allowed) { if (x < rates[k]) { pick = k; break; } x -= rates[k]; }
    cands = pool.filter(r => r.rarity === pick);
  }
  let r = cands[Math.floor(rand() * cands.length)];
  if (owned(r.id)) r = cands[Math.floor(rand() * cands.length)]; // 중복이면 한 번 더 굴림
  return r;
}

// ---------- 기타 ----------
export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function heroAvailable(s, h) { return s.era >= Math.max(2, h.era); }
export function techAvailable(s, t) { return s.era >= t.era; }
export function buildingAvailable(s, def) { return s.era >= def.era; }

export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('ko-KR');
  if (n >= 1e24) return '무한';
  const units = [[1e20, '해'], [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
  for (const [v, u] of units) {
    if (n >= v) {
      const a = n / v;
      return (a >= 100 ? Math.floor(a).toLocaleString('ko-KR') : a >= 10 ? (Math.floor(a * 10) / 10) : (Math.floor(a * 100) / 100)) + u;
    }
  }
  return String(n);
}
export function fmtFull(n) { return Math.floor(n).toLocaleString('ko-KR'); }
