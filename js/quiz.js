// =============================================================
//  문제 출제 엔진 — 현재 시대 70% + 이전 시대 30%, 오답 큐 재출제, 자동 생성 문제
// =============================================================
import { QUIZZES, QZ } from './data-quizzes.js?v=202611271114';
import { RELICS, R } from './data-relics.js?v=202611271114';
import { BUILDINGS, B } from './data-buildings.js?v=202611271114';
import { HEROES, H } from './data-heroes.js?v=202611271114';
import { BAL, HISTORY_ERA } from './data-config.js?v=202611271114';
import { mathQuestion, mathById } from './data-math.js?v=202611271114';
import { engById, ENG_IDS, ENG_TYPES } from './data-english.js?v=202611271114';

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

// 설명 속 정답 이름 가리기
function mask(text, name) {
  const parts = new Set([name, name.replace(/\s/g, '')]);
  if (name.replace(/\s/g, '').length >= 3) parts.add(name.replace(/\s/g, '').slice(0, -1));
  name.split(/\s+/).forEach(p => { if (p.length >= 2) parts.add(p); });
  let t = text;
  [...parts].sort((a, b) => b.length - a.length).forEach(p => { if (p.length >= 2) t = t.split(p).join('○'.repeat(Math.min(4, p.length))); });
  return t;
}

// 자동 생성 문제 (유물·건물·위인 설명으로 이름 맞히기) — 교과서에 나오는 것만
const GEN_SKIP = new Set(['주령구', '발해 치미', '이불병좌상', '칠지도', '해동통보', '나전 경함', '분청사기', '신기전', '문위우표', '청동 제단', '청자 가마터', '대동법 창고', '거북선 조선소', '스마트 타워', '근초고왕']);
// 8단계부터의 건물·유물은 교과서 내용이 아니라서 역사 문제로 만들지 않아요
const RELICS_OK = RELICS.filter(r => !GEN_SKIP.has(r.name) && r.era <= HISTORY_ERA);
const BLD_OK = BUILDINGS.filter(b => !GEN_SKIP.has(b.name) && b.era <= HISTORY_ERA);
const HEROES_OK = HEROES.filter(h => !GEN_SKIP.has(h.name));
function genQuestion(era, kind) {
  if (kind === 'relic') {
    const pool = RELICS_OK.filter(r => r.era <= era);
    const r = pick(pool.filter(x => x.era === era).length && Math.random() < 0.6 ? pool.filter(x => x.era === era) : pool);
    const others = shuffle(RELICS_OK.filter(x => x.id !== r.id && Math.abs(x.era - r.era) <= 1)).slice(0, 3);
    return { id: 'g_' + r.id, era: r.era, type: 'mc', q: '다음 설명에 알맞은 유물은?', ctx: mask(r.desc, r.name), relic: r.id, choices: [r.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${r.name}’이에요. ${r.desc}`, gen: true };
  }
  if (kind === 'bldg') {
    const pool = BLD_OK.filter(b => b.era <= era && !['altar', 'smarttower', 'umjip'].includes(b.id));
    if (!pool.length) return null;
    const b = pick(pool);
    const others = shuffle(BLD_OK.filter(x => x.id !== b.id && !['altar', 'smarttower'].includes(x.id) && Math.abs(x.era - b.era) <= 2)).slice(0, 3);
    return { id: 'g_' + b.id, era: b.era, type: 'mc', q: '다음 설명에 알맞은 문화유산은?', ctx: mask(b.desc, b.name), bldg: b.id, choices: [b.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${b.name}’이에요.`, gen: true };
  }
  if (kind === 'hero') {
    const pool = HEROES_OK.filter(h => h.era <= era);
    const h = pick(pool);
    const others = shuffle(HEROES_OK.filter(x => x.id !== h.id && Math.abs(x.era - h.era) <= 2)).slice(0, 3);
    if (others.length < 3) return null;
    return { id: 'g_' + h.id, era: h.era, type: 'mc', q: '다음 설명에 알맞은 인물은?', ctx: mask(h.desc, h.name), choices: [h.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${h.name}’이에요. ${h.title}.`, gen: true };
  }
  return null;
}

export function getById(id, era) {
  if (QZ[id]) return QZ[id];
  if (id.startsWith('m.')) return mathById(id);
  if (id.startsWith('e.')) return engById(id);
  if (id.startsWith('g_')) {
    const k = id.slice(2);
    if (R[k]) { const r = R[k]; const others = shuffle(RELICS.filter(x => x.id !== r.id && Math.abs(x.era - r.era) <= 1)).slice(0, 3); return { id, era: r.era, type: 'mc', q: '다음 설명에 알맞은 유물은?', ctx: mask(r.desc, r.name), relic: r.id, choices: [r.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${r.name}’이에요. ${r.desc}`, gen: true }; }
    if (B[k]) { const b = B[k]; const others = shuffle(BUILDINGS.filter(x => x.id !== b.id && Math.abs(x.era - b.era) <= 2)).slice(0, 3); return { id, era: b.era, type: 'mc', q: '다음 설명에 알맞은 문화유산은?', ctx: mask(b.desc, b.name), bldg: b.id, choices: [b.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${b.name}’이에요.`, gen: true }; }
    if (H[k]) { const h = H[k]; const others = shuffle(HEROES.filter(x => x.id !== h.id && Math.abs(x.era - h.era) <= 2)).slice(0, 3); return { id, era: h.era, type: 'mc', q: '다음 설명에 알맞은 인물은?', ctx: mask(h.desc, h.name), choices: [h.name, ...others.map(o => o.name)], answer: 0, exp: `정답은 ‘${h.name}’이에요.`, gen: true }; }
  }
  return null;
}

// 보기 섞기 → 화면용 문제 객체
export function present(q) {
  if (!q) return null;
  if (q.type === 'mc') {
    const order = shuffle(q.choices.map((c, i) => i));
    return { ...q, shown: order.map(i => q.choices[i]), correctIdx: order.indexOf(q.answer) };
  }
  return { ...q };
}

/**
 * 문제 고르기
 * @param state 게임 상태 (wrongQueue, recent 사용)
 * @param opt { eras: [출제 시대], types: ['mc','ox','sa'], allowGen, useWrongQueue }
 */
export const SUBJECTS = { hist: '한국사', math: '수학', eng: '영어', mix: '섞어서' };
// 이 과목에서 낼 수 있는 문제 형식이 있나요? (영어는 단답형이 없어요)
function subjectFor(state, opt, types) {
  let subj = opt.subj || (opt.eras ? 'hist' : (state.subj || 'hist'));
  if (subj === 'mix') { const r = Math.random(); subj = r < 0.4 ? 'hist' : r < 0.7 ? 'math' : 'eng'; }
  if (subj === 'eng' && !types.some(t => t === 'mc' || t === 'ox')) subj = 'math';
  return subj;
}
function englishQuestion(state, types, recent) {
  const seen = new Set(state.seen || []);
  const pool = ENG_IDS.filter(id => types.includes(ENG_TYPES(id)));
  let fresh = pool.filter(id => !seen.has(id) && !recent.has(id));
  if (!fresh.length) { const ids = new Set(pool); state.seen = (state.seen || []).filter(id => !ids.has(id)); fresh = pool.filter(id => !recent.has(id)); }
  return present(engById(pick(fresh.length ? fresh : pool)));
}

export function nextQuestion(state, opt = {}) {
  const era = Math.min(state.era, HISTORY_ERA);
  const types = opt.types || ['mc', 'ox'];
  const recent = new Set(state.recent || []);
  const subj = subjectFor(state, opt, types);
  // 1) 오답 큐
  if (opt.useWrongQueue !== false && state.wrongQueue?.length) {
    state.wrongQueue.forEach(w => w.wait--);
    const idx = state.wrongQueue.findIndex(w => w.wait <= 0);
    if (idx >= 0) {
      const w = state.wrongQueue.splice(idx, 1)[0];
      const q = getById(w.id, era);
      if (q && (!opt.eras || opt.eras.includes(q.era)) && types.includes(q.type)) return present({ ...q, retry: true });
      if (q) state.wrongQueue.push({ id: w.id, wait: 1 }); // 이번 모드에 안 맞으면 다음에 다시
    }
  }
  // 1-1) 수학·영어
  if (subj === 'math') { for (let k = 0; k < 6; k++) { const q = mathQuestion(types); if (!recent.has(q.id)) return present(q); } return present(mathQuestion(types)); }
  if (subj === 'eng') return englishQuestion(state, types, recent);
  const seen = new Set(state.seen || []);
  // 2) 자동 생성 (20%) — 이미 본 것은 건너뜀
  if (opt.allowGen !== false && types.includes('mc') && Math.random() < 0.12) {
    for (let k = 0; k < 4; k++) {
      const g = genQuestion(opt.eras ? Math.max(...opt.eras) : era, pick(['relic', 'relic', 'bldg', 'hero']));
      if (g && !recent.has(g.id) && !seen.has(g.id) && (!opt.eras || opt.eras.includes(g.era))) return present(g);
    }
  }
  // 3) 문제 은행: 현재 시대 70% / 이전 시대 30%
  let eras = opt.eras;
  if (!eras && state.era > HISTORY_ERA) eras = Array.from({ length: HISTORY_ERA }, (_, i) => i + 1);   // 8단계부터: 한국사 총복습
  if (!eras) eras = (era > 1 && Math.random() < BAL.prevEraRatio) ? Array.from({ length: era - 1 }, (_, i) => i + 1) : [era];
  let pool = QUIZZES.filter(q => eras.includes(q.era) && types.includes(q.type));
  if (!pool.length) pool = QUIZZES.filter(q => q.era <= era && types.includes(q.type));
  // 3-1) 이 범위의 문제를 한 바퀴 다 풀기 전에는 같은 문제가 다시 나오지 않아요
  let fresh = pool.filter(q => !seen.has(q.id) && !recent.has(q.id));
  if (!fresh.length) {
    const ids = new Set(pool.map(q => q.id));
    state.seen = (state.seen || []).filter(id => !ids.has(id) && !id.startsWith('g_'));
    fresh = pool.filter(q => !recent.has(q.id));
  }
  return present(pick(fresh.length ? fresh : pool));
}

export function remember(state, q) {
  state.recent = [...(state.recent || []).filter(x => x !== q.id), q.id].slice(-30);
  if (q.retry) return;
  const seen = state.seen || (state.seen = []);
  if (!seen.includes(q.id)) seen.push(q.id);
  if (seen.length > 2400) seen.splice(0, seen.length - 2400);
}

export function normalize(s) { return String(s).replace(/[\s·.,!?'"‘’“”()]/g, '').toLowerCase(); }
export function checkAnswer(q, ans) {
  if (q.type === 'mc') return ans === q.correctIdx;
  if (q.type === 'ox') return ans === q.answer;
  if (q.type === 'sa') { const a = normalize(ans); return a.length > 0 && q.answers.some(x => normalize(x) === a); }
  return false;
}
export function answerText(q) {
  if (q.type === 'mc') return q.choices[q.answer];
  if (q.type === 'ox') return q.answer ? 'O' : 'X';
  return q.answers[0];
}
