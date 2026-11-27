// =============================================================
//  화면(UI) — HUD, 모달 창, 퀴즈 3모드, 시대 돌파, 위인·유물·연구소·대역사
// =============================================================
import * as E from './economy.js';
import * as GM from './game.js';
import { G } from './game.js';
import * as S from './sprites.js';
import { VERSION } from './mode.js';
import * as Q from './quiz.js';
import { sfx, setBgm, setSfx } from './audio.js';
import { ERAS, BAL, BOSSES, EXPAND, MAX_ERA } from './data-config.js';
import { BUILDINGS, B, DECOR, D, SYNERGIES, WONDER } from './data-buildings.js';
import { HEROES, H } from './data-heroes.js';
import { TECHS, T } from './data-techs.js';
import { RELICS, R, RARITY } from './data-relics.js';
import { QZ } from './data-quizzes.js';
import { sync } from './sync.js';
import { Renderer } from './render.js';

export const ctx = { renderer: null, startPlace: null, endPlace: null, pendingTile: null };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const F = n => E.fmt(n);
const icon = (n, cls = 'ico') => `<img class="${cls}" src="${S.iconURL(n)}" alt="">`;
const costHtml = (kp, gold) => {
  const s = G.s; let h = '';
  if (kp) h += `<span class="cost ${s.kp < kp ? 'lack' : ''}"><img src="${S.iconURL('kp')}" alt="">${F(kp)}</span> `;
  if (gold) h += `<span class="cost ${s.gold < gold ? 'lack' : ''}"><img src="${S.iconURL('coin')}" alt="">${F(gold)}</span>`;
  return h || '<span class="cost">무료</span>';
};
const sprCache = new Map();
export function bldgURL(type, tier = 0) {
  const k = type + tier; if (sprCache.has(k)) return sprCache.get(k);
  const spr = D[type] ? S.decorSprite(type) : S.buildingSprite(type, tier);
  const u = spr.img.toDataURL(); sprCache.set(k, u); return u;
}
const portraitImgs = new Map();
export function portraitImg(h) { if (!portraitImgs.has(h.id)) portraitImgs.set(h.id, S.portraitCanvas(h, 64)); return portraitImgs.get(h.id); }

// ---------- 아바타 ----------
export const AVATARS = [
  { id: 'av0', look: { hat: 'none', hair: '#1d1d1d', robe: '#3d6fb0', trim: '#f2c230' } },
  { id: 'av1', look: { hat: 'none', hair: '#1d1d1d', female: true, robe: '#d84f6a', trim: '#f2c230' } },
  { id: 'av2', look: { hat: 'none', hair: '#3a2a1a', short: true, robe: '#3f9a3a', trim: '#fff' } },
  { id: 'av3', look: { hat: 'none', hair: '#1d1d1d', female: true, braid: true, robe: '#f0a21a', trim: '#fff' } },
  { id: 'av4', look: { hat: 'none', hair: '#1d1d1d', glasses: true, robe: '#6c3c8c', trim: '#f2c230' } },
  { id: 'av5', look: { hat: 'bandana', hatColor: '#c8352b', hair: '#1d1d1d', robe: '#2f78c4', trim: '#fff' } },
];
export const avatarURL = i => S.portraitURL(AVATARS[i % AVATARS.length], 64);

// ---------- 기본 ----------
export function initIcons() {
  document.querySelectorAll('img.ico[data-icon]').forEach(img => { img.src = S.iconURL(img.dataset.icon); });
  document.querySelectorAll('img[data-hero]').forEach(img => { if (H[img.dataset.hero]) img.src = S.portraitURL(H[img.dataset.hero], 64); });
}
export function toast(msg, kind = '', ic = null) {
  if (!msg) return;
  const t = document.createElement('div'); t.className = 'toast ' + kind;
  t.innerHTML = (ic ? `<img src="${S.iconURL(ic)}" alt="">` : '') + `<span>${esc(msg)}</span>`;
  $('toasts').appendChild(t); setTimeout(() => t.remove(), 2700);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
}
export function floater(text, x, y, cls = '') {
  const f = document.createElement('div'); f.className = 'floater ' + cls; f.textContent = text;
  f.style.left = x + 'px'; f.style.top = y + 'px'; $('floaters').appendChild(f); setTimeout(() => f.remove(), 1150);
}
export function flyCoins(points) {
  const target = $('btnGold').getBoundingClientRect();
  const tx = target.left + 30, ty = target.top + target.height / 2;
  points.slice(0, 12).forEach((p, i) => {
    const im = document.createElement('img'); im.className = 'flycoin'; im.src = S.iconURL('coin');
    im.style.left = p.x - 14 + 'px'; im.style.top = p.y - 14 + 'px'; $('floaters').appendChild(im);
    setTimeout(() => { im.style.transform = `translate(${tx - p.x}px, ${ty - p.y}px) scale(0.7)`; im.style.opacity = '0.3'; }, 20 + i * 40);
    setTimeout(() => im.remove(), 900 + i * 40);
  });
  setTimeout(() => { $('btnGold').classList.remove('flash'); void $('btnGold').offsetWidth; $('btnGold').classList.add('flash'); }, 650);
}
function bump(id) { const el = $(id); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

let modalOnClose = null;
export function openModal(html, cls = '', onClose = null) {
  $('sheet').className = 'sheet ' + cls; $('sheet').innerHTML = html; $('modal').classList.remove('hidden');
  modalOnClose = onClose;
  $('sheet').querySelectorAll('[data-close]').forEach(b => b.onclick = () => { sfx('click'); closeModal(); });
}
// 닫히는 창을 복사해 두고 천천히 사라지게 해요 (진짜 창은 바로 비워서 다른 코드에 영향 없음)
export function ghostOut(el, cls = 'ghost-out') {
  if (!el || el.classList.contains('hidden') || !el.parentNode) return;
  const gh = el.cloneNode(true); gh.removeAttribute('id'); gh.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  gh.classList.add(cls); gh.setAttribute('aria-hidden', 'true'); el.after(gh); setTimeout(() => gh.remove(), 450);
}
export function closeModal() {
  ghostOut($('modal'));
  $('modal').classList.add('hidden'); $('sheet').innerHTML = '';
  const f = modalOnClose; modalOnClose = null; f?.(); updateHud(true);
}
export const modalOpen = () => !$('modal').classList.contains('hidden');
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && !quizBusy) closeModal(); });
const head = (title, ic) => `<div class="sh-head">${ic ? icon(ic) : ''}<h2>${title}</h2><button class="close" data-close aria-label="닫기">✕</button></div>`;
function tabs(list, cur, attr = 'data-tab') { return `<div class="tabs">${list.map(([k, n]) => `<button ${attr}="${k}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div>`; }
function bindTabs(fn) { $('sheet').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { sfx('click'); fn(b.dataset.tab); }); }
function confirmBox(msg, yes, okText = '확인', danger = false) {
  openModal(`${head('확인', 'warn')}<div class="sh-body"><p style="font-size:1.3em;font-family:Jua;line-height:1.5">${msg}</p>
    <div style="display:flex;gap:.6em;justify-content:flex-end"><button class="btn gray" data-close>취소</button><button class="btn ${danger ? 'red' : 'green'}" id="cfYes">${okText}</button></div></div>`, 'narrow');
  $('cfYes').onclick = () => { closeModal(); yes(); };
}

// ---------- HUD ----------
let shownGold = 0, shownKp = 0, lastHud = 0;
export function updateHud(force = false) {
  const s = G.s; if (!s) return;
  const t = performance.now(); if (!force && t - lastHud < 90) return; lastHud = t;
  shownGold += (s.gold - shownGold) * 0.35; if (Math.abs(s.gold - shownGold) < 1) shownGold = s.gold;
  shownKp += (s.kp - shownKp) * 0.35; if (Math.abs(s.kp - shownKp) < 1) shownKp = s.kp;
  const goldTxt = shownGold < 1e8 ? E.fmtFull(shownGold) : F(shownGold);
  $('gold').textContent = s.teacher ? '무한' : goldTxt;
  $('kp').textContent = s.teacher ? '무한 KP' : F(shownKp) + ' KP';
  $('fame').textContent = F(s.fame);
  const fev = GM.fever();
  $('rate').textContent = '+' + F(G.inc * (fev ? BAL.feverGold : 1)) + '/초';
  document.querySelector('.rate').classList.toggle('fever-on', fev);
  const ratio = G.cap ? s.storage / G.cap : 0;
  $('storeBar').style.width = Math.min(100, ratio * 100) + '%';
  $('storeTxt').textContent = ratio >= 0.999 ? '창고 가득!' : `창고 ${F(s.storage)}`;
  document.querySelector('.store').classList.toggle('full', ratio >= 0.999);
  $('eraNum').textContent = s.era + '단계'; $('eraNum').classList.toggle('long', s.era >= 10);
  $('eraName').textContent = s.completed ? '역사 완성!' : ERAS[s.era].name;
  $('pName').textContent = s.name || '이름'; $('pNo').textContent = s.teacher ? `테스트 마을 · ${s.classCode}` : `출석번호 ${s.studentNo || 0}번`;
  // 돌파 게이지
  const cs = E.conditions(s);
  const frac = s.completed ? 1 : cs.reduce((a, c) => a + Math.min(1, c.cur / c.need), 0) / cs.length;
  $('gaugeFill').style.height = `calc(${frac * 100}% - 0.5em)`;
  $('gaugeTxt').textContent = s.completed ? '완성' : `${cs.filter(c => c.done).length}/${cs.length}`;
  const ready = E.canChallenge(s);
  $('btnChallenge').classList.toggle('ready', ready);
  $('btnChallenge').classList.toggle('done', !!s.completed);
  $('btnChallenge').textContent = s.completed ? '역사 완성' : '도전하기';
  // 콤보 / 불꽃
  const cb = $('comboBadge'); cb.classList.toggle('on', s.combo >= 2); cb.textContent = s.combo + '연속!';
  const fl = $('flames'); const want = s.combo >= 5 ? 5 : 3;
  if (fl.childElementCount !== want) fl.innerHTML = Array.from({ length: want }, (_, i) => `<i style="left:${i * (want === 5 ? 0.9 : 1.6)}em;animation-delay:${i * 0.12}s;height:${(want === 5 ? 3.4 : 2.6) + (i % 2) * 0.9}em"></i>`).join('');
  $('fever').classList.toggle('hidden', !fev);
  if (fev) $('feverBar').style.width = Math.max(0, (s.feverUntil - Date.now()) / (G.mods.feverSec * 1000) * 100) + '%';
  // 잠금 표시
  const lock = (id, era) => { const el = $(id); el.classList.toggle('locked', s.era < era); el.dataset.lock = era + '단계'; };
  lock('btnLab', 4); lock('btnWonder', 7);
  goalUpdate();
}

// ---------- 다음 목표 ----------
function goal() {
  const s = G.s;
  if (s.completed) return ['모든 시대 완성! 끝없는 연구와 퀴즈로 명성을 올려 보세요', 'quiz'];
  if (!s.buildings.length) return ['건설/상점에서 첫 건물 ‘움집’을 지어 보세요!', 'shop'];
  if (s.storage > G.cap * 0.5 && s.stats.solved < 30) return ['건물 위 엽전을 눌러 창고의 엽전을 거두세요!', 'collect'];
  const cs = E.conditions(s);
  for (const c of cs) {
    if (c.done) continue;
    if (c.type === 'eraTypes') {
      const cand = BUILDINGS.filter(b => b.era === c.era && !s.buildings.some(x => x.type === b.id && x.lv >= c.minLv));
      const built = cand.find(b => s.buildings.some(x => x.type === b.id));
      if (built && c.minLv > 1) return [`${built.name}을(를) Lv.${c.minLv}까지 레벨업해요`, 'shop'];
      const b = cand.filter(b => !s.buildings.some(x => x.type === b.id)).sort((a, z) => a.kp - z.kp)[0];
      if (!b) break;
      const cost = E.buildCost(s, b.id, G.mods);
      if (s.kp < cost.kp) return [`퀴즈로 KP를 모아 ‘${b.name}’을(를) 지어요 (KP ${F(s.kp)}/${F(cost.kp)})`, 'quiz'];
      if (s.gold < cost.gold) return [`엽전을 모아 ‘${b.name}’을(를) 지어요 (${F(s.gold)}/${F(cost.gold)})`, 'collect'];
      return [`‘${b.name}’을(를) 지을 수 있어요!`, 'shop'];
    }
    if (c.type === 'heroes') return ['위인에서 역사 위인을 영입해요', 'heroes'];
    if (c.type === 'mapSize') { const e = GM.nextExpand(); return [`영토를 ${c.size}×${c.size}로 넓혀요 (KP ${F(e?.kp || 0)}, 엽전 ${F(e?.gold || 0)})`, 'expand']; }
    if (c.type === 'relics') return [`유물을 발굴해 서로 다른 유물 ${c.need}종을 모아요 (${c.cur}/${c.need})`, 'dig'];
    if (c.type === 'techs') return [`역사 연구소에서 연구 ${c.need}종을 완료해요 (${c.cur}/${c.need})`, 'lab'];
    if (c.type === 'maxLv') return [`건물 ${c.need}채를 Lv.${c.lv}까지 올려요 (${c.cur}/${c.need})`, 'shop'];
    if (c.type === 'synergy') return [`관련 있는 건물을 붙여 시너지 ${c.need}쌍을 만들어요 (${c.cur}/${c.need})`, 'conds'];
    if (c.type === 'boss') return ['역사 퀴즈 → 보스전에서 침략을 막아요!', 'quiz'];
    if (c.type === 'subj') return [`퀴즈에서 ‘수학’이나 ‘영어’를 골라 ${c.need}문제를 맞혀요 (${c.cur}/${c.need})`, 'quiz'];
    if (c.type === 'wonder') return [s.wonder ? `대역사 공사를 이어 가요 (${s.wonderStage}/5)` : '대역사 부지를 정하고 공사를 시작해요', 'wonder'];
  }
  return ['시대 돌파 조건 완료! 오른쪽 ‘도전하기’를 눌러요!', 'challenge'];
}
let goalAct = 'quiz', lastGoal = '';
function goalUpdate() { const [txt, act] = goal(); goalAct = act; if (txt !== lastGoal) { lastGoal = txt; $('goalTxt').textContent = txt; const g = $('goal'); g.classList.remove('nudge'); void g.offsetWidth; g.classList.add('nudge'); } }
export function goalClick() {
  sfx('click');
  ({ quiz: openQuizMenu, shop: () => openShop('b'), heroes: () => openHeroes('h'), expand: () => openShop('e'), dig: () => openHeroes('dig'), lab: openLab, conds: openConds, wonder: openWonder, challenge: openConds, collect: () => ctx.collect?.() })[goalAct]?.();
}

// ---------- 건설 / 상점 ----------
export function openShop(tab = 'b') {
  const s = G.s;
  let body = '';
  if (tab === 'b') {
    body += ctx.pendingTile ? `<p class="muted" style="margin:0 0 .5em">선택한 빈 칸(${ctx.pendingTile.x + 1}, ${ctx.pendingTile.y + 1})에 바로 지어져요.</p>` : '';
    body += '<div class="grid">';
    for (let era = 1; era <= MAX_ERA; era++) {
      const list = BUILDINGS.filter(b => b.era === era);
      body += `<div class="era-sep"><span>${era}단계 · ${ERAS[era].name}</span>${s.era < era ? `<small>${era}단계에 열려요</small>` : ''}</div>`;
      for (const d of list) {
        const n = E.countType(s, d.id), max = E.maxCopies(d.id), c = E.buildCost(s, d.id, G.mods);
        const locked = s.era < era, chk = GM.buildCheck(d.id);
        const inc = d.inc * E.globalGoldMult(s, G.mods);
        body += `<div class="card ${locked ? 'locked' : ''} ${n ? 'owned' : ''}">
          <span class="tag">${n}/${max}채</span>
          <div class="top"><img src="${bldgURL(d.id)}" alt=""><div><h5>${d.name}</h5><div class="sub">초당 +${F(inc)} 엽전</div></div></div>
          <div class="desc">${d.desc}</div>
          ${locked ? `<button class="btn gray off" disabled>${icon('lock')} ${era}단계</button>` :
            n >= max ? `<button class="btn gray off" disabled>최대 개수</button>` :
            `<button class="btn ${chk.ok ? 'green' : 'off'}" data-build="${d.id}">${icon('hammer')} ${n ? '추가 건설' : '해금·건설'} ${costHtml(c.kp, c.gold)}</button>`}
          ${!locked && !chk.ok && n < max ? `<div class="muted">${chk.msg}</div>` : ''}
        </div>`;
      }
    }
    body += '</div>';
  } else if (tab === 'd') {
    body += '<p class="muted" style="margin:0 0 .5em">꾸미기는 수익이 없지만 마을을 예쁘게 만들어요. 돌길 위로는 마을 사람들이 걸어 다녀요.</p><div class="grid">';
    for (const d of DECOR) {
      const lockF = d.fame && s.fame < d.fame, lockE = s.era < d.era, chk = GM.buildCheck(d.id);
      body += `<div class="card ${lockF || lockE ? 'locked' : ''}"><div class="top"><img src="${bldgURL(d.id)}" alt=""><div><h5>${d.name}</h5><div class="sub">${E.countType(s, d.id)}개 설치</div></div></div>
        <div class="desc">${d.desc}</div>
        ${lockE ? `<button class="btn gray off" disabled>${d.era}단계</button>` : lockF ? `<button class="btn gray off" disabled>${icon('star')} 명성 ${d.fame}</button>` :
        `<button class="btn ${chk.ok ? 'green' : 'off'}" data-build="${d.id}">설치 ${costHtml(0, d.gold)}</button>`}</div>`;
    }
    body += '</div>';
  } else if (tab === 'e') {
    const e = GM.nextExpand();
    body += `<div style="display:flex;gap:1.2em;align-items:center;flex-wrap:wrap">
      <div style="font-family:Jua;font-size:4em;color:#7a4a24">${s.mapSize}×${s.mapSize}</div>
      <div style="flex:1;min-width:16em">
        <h4>${icon('move')} 영토 확장</h4>
        <p>마을 땅을 넓히면 더 많은 건물을 지을 수 있어요. 4×4(16칸) → 6×6(36칸, 3단계) → 8×8(64칸, 5단계)</p>
        ${e ? `<p><b style="font-family:Jua;font-size:1.3em">${e.size}×${e.size}로 확장</b> · ${e.era}단계부터 · ${costHtml(e.kp, e.gold)}</p>
          <button class="btn ${s.era >= e.era && s.kp >= e.kp && s.gold >= e.gold ? 'gold' : 'off'}" id="btnExpand">${icon('up')} 영토 넓히기</button>` : '<p><b>가장 넓은 8×8 마을이에요!</b></p>'}
      </div></div>
      <h4>${icon('star')} 배치 시너지</h4><p class="muted">역사적으로 관련 있는 건물을 상하좌우로 붙이면 두 건물 모두 수익이 +${Math.round(E.synergyRate(s, G.mods) * 100)}% 늘어요. 건물 옮기기는 무료!</p>
      <div class="list">${SYNERGIES.map(x => `<div><span>${B[x.a].name} + ${B[x.b].name}</span><span class="syn-tag">${x.name}${G.syn.active.has(x.id) ? ' ✓' : ''}</span></div>`).join('')}</div>`;
  }
  openModal(`${head('건설 / 상점', 'hammer')}${tabs([['b', '건물'], ['d', '꾸미기'], ['e', '영토 · 시너지']], tab)}<div class="sh-body">${body}</div>`, '', () => { ctx.pendingTile = null; if (ctx.renderer && !ctx.renderer.selected?.uid) ctx.renderer.selected = null; });
  bindTabs(t => { const keep = ctx.pendingTile; modalOnClose = null; openShop(t); ctx.pendingTile = keep; });
  $('sheet').querySelectorAll('[data-build]').forEach(btn => btn.onclick = () => {
    const type = btn.dataset.build; const chk = GM.buildCheck(type);
    if (!chk.ok) { sfx('wrong'); toast(chk.msg, 'bad'); return; }
    sfx('click');
    const tile = ctx.pendingTile;
    if (tile && GM.canPlace(tile.x, tile.y)) { ctx.pendingTile = null; modalOnClose = null; closeModal(); ctx.doBuild(type, tile.x, tile.y); }
    else { modalOnClose = null; ctx.pendingTile = null; closeModal(); ctx.startPlace({ kind: 'build', type }); }
  });
  const ex = $('btnExpand'); if (ex) ex.onclick = () => { const r = GM.expand(); if (r.ok) { sfx('fanfare'); toast(r.msg, 'good', 'up'); ctx.renderer.fitPending = true; ctx.onExpand?.(); closeModal(); } else { sfx('wrong'); toast(r.msg, 'bad'); } };
}

// ---------- 건물 정보 판넬 ----------
let panelUid = null;
export function openBuildingPanel(b) {
  const s = G.s; panelUid = b.uid;
  const el = $('bPanel'); el.classList.remove('hidden');
  if (D[b.type]) {
    const d = D[b.type];
    el.innerHTML = `<button class="x" id="bpX">✕</button><div class="head"><img src="${bldgURL(b.type)}" alt=""><div><h3>${d.name}</h3><div class="muted">꾸미기</div></div></div>
      <p>${d.desc}</p><div class="row"><button class="btn" id="bpMove">${icon('move')} 옮기기</button><button class="btn red" id="bpDel">철거</button></div>`;
  } else {
    const def = B[b.type];
    const inc = E.buildingIncome(s, b, G.mods, G.syn);
    const max = b.lv >= BAL.maxLv;
    const nextB = { ...b, lv: b.lv + 1 };
    const incNext = max ? inc : E.buildingIncome(s, nextB, G.mods, G.syn);
    const uc = max ? 0 : E.upgradeCost(s, b, G.mods);
    const syns = G.syn.byUid.get(b.uid) || [];
    const partners = SYNERGIES.filter(x => x.a === b.type || x.b === b.type);
    const hero = b.heroId ? H[b.heroId] : null;
    const tier = b.lv >= 10 ? 2 : b.lv >= 5 ? 1 : 0;
    const evolveSoon = BAL.evolveLv.includes(b.lv + 1);
    el.innerHTML = `<button class="x" id="bpX">✕</button>
      <div class="head"><img src="${bldgURL(b.type, tier)}" alt=""><div style="flex:1">
        <h3>${def.name}</h3><div class="stars">${'★'.repeat(b.lv)}<span style="color:#d9c9a8">${'★'.repeat(BAL.maxLv - b.lv)}</span></div>
        <div class="muted">${def.era}단계 · ${ERAS[def.era].name} · Lv.${b.lv}</div></div></div>
      <dl class="info"><dt>초당 수익</dt><dd>+${F(inc)}</dd>${max ? '' : `<dt>다음 레벨</dt><dd style="color:#2a8a3a">+${F(incNext)}${evolveSoon ? ' (진화!)' : ''}</dd>`}</dl>
      ${syns.length ? `<div>${syns.map(x => `<span class="syn-tag">♥ ${x.name}</span>`).join('')}</div>` : partners.length ? `<div class="muted">옆에 두면 시너지: ${partners.map(x => B[x.a === b.type ? x.b : x.a].name).join(', ')}</div>` : ''}
      <div class="row" style="align-items:center">
        ${hero ? `<img src="${S.portraitURL(hero, 64)}" style="width:2.6em;height:2.6em;image-rendering:pixelated;border-radius:.4em;border:.12em solid #c99a4b" alt=""><span style="font-family:Jua;flex:1">${hero.name} 배치 중 ×${E.heroMult(s, b).toFixed(2)}</span><button class="btn gray" id="bpHero">바꾸기</button>`
        : s.era >= 2 ? `<button class="btn" id="bpHero" style="flex:1">${icon('people')} 위인 배치</button>` : ''}
      </div>
      ${b.broken ? `<div class="broken-box">${icon('fire')}<span>전쟁으로 부서졌어요! 고칠 때까지 수익 0</span></div>
      <div class="row"><button class="btn ${s.gold >= E.repairCost(s, b) ? 'gold' : 'off'}" id="bpFix" style="flex:1">${icon('repair')} 수리하기 ${costHtml(0, E.repairCost(s, b))}</button></div>` :
      `<div class="row">${max ? '<button class="btn gold off" disabled>최고 레벨!</button>' : `<button class="btn ${s.gold >= uc ? 'gold' : 'off'}" id="bpUp" style="flex:1">${icon('up')} 레벨업 ${costHtml(0, uc)}</button>`}</div>`}
      <div class="row"><button class="btn" id="bpMove" style="flex:1">${icon('move')} 옮기기</button><button class="btn red" id="bpDel">철거</button></div>
      <p>${def.desc}</p>`;
    $('bpUp') && ($('bpUp').onclick = () => {
      const r = GM.upgrade(b.uid);
      if (r.ok) { sfx(r.evolved ? 'fanfare' : 'levelup'); toast(`${def.name} ${r.msg}`, 'good', 'up'); ctx.renderer.addFx({ kind: 'stars', i: b.x, j: b.y, life: 0.9 }); openBuildingPanel(b); }
      else { sfx('wrong'); toast(r.msg, 'bad'); }
    });
    $('bpHero') && ($('bpHero').onclick = () => { sfx('click'); heroChooser(b); });
    $('bpFix') && ($('bpFix').onclick = () => { const r = GM.repair(b.uid); if (r.ok) { sfx('build'); toast(r.msg, 'good', 'repair'); ctx.renderer.addFx({ kind: 'dust', i: b.x, j: b.y, life: 0.8 }); openBuildingPanel(b); } else { sfx('wrong'); toast(r.msg, 'bad'); } });
  }
  $('bpX').onclick = closePanel;
  $('bpMove').onclick = () => { sfx('click'); closePanel(); ctx.startPlace({ kind: 'move', uid: b.uid, type: b.type }); };
  $('bpDel').onclick = () => {
    sfx('click');
    confirmBox(`${(B[b.type] || D[b.type]).name}을(를) 철거할까요?<br><span class="muted">엽전 ${F(GM.demolishRefund(b))}을 돌려받아요. 레벨은 사라져요.</span>`, () => { const r = GM.demolish(b.uid); toast(r.msg); closePanel(); }, '철거하기', true);
  };
  ctx.renderer.selected = b;
}
export function closePanel() { $('bPanel').classList.add('hidden'); panelUid = null; if (ctx.renderer) ctx.renderer.selected = null; }
export function refreshPanel() { if (panelUid) { const b = G.s.buildings.find(x => x.uid === panelUid); if (b) openBuildingPanel(b); else closePanel(); } }

function heroChooser(b) {
  const s = G.s; const owned = Object.keys(s.heroes);
  if (!owned.length) { toast('먼저 ‘위인’에서 위인을 영입해요!', 'bad'); openHeroes('h'); return; }
  const rows = owned.map(id => { const h = H[id]; const at = GM.heroAt(id); const fav = h.fav === b.type;
    return `<div class="card" style="flex-direction:row;align-items:center"><img src="${S.portraitURL(h, 64)}" style="width:3.4em;height:3.4em;image-rendering:pixelated;border-radius:.5em" alt="">
      <div style="flex:1"><h5>${h.name}${fav ? ' <span class="syn-tag">찰떡 건물 +0.5배</span>' : ''}</h5><div class="sub">${h.passive.text}${at ? ` · 지금: ${B[at.type].name}` : ''}</div></div>
      <button class="btn ${at && at.uid === b.uid ? 'gray' : 'green'}" data-hero="${id}">${at && at.uid === b.uid ? '배치 풀기' : '여기에 배치'}</button></div>`; }).join('');
  openModal(`${head(`${B[b.type].name}에 위인 배치`, 'people')}<div class="sh-body"><p class="muted">위인을 배치하면 건물 수익이 2배 이상! 위인의 고유 능력도 켜져요. 한 위인은 한 건물에만 있을 수 있어요.</p><div class="list" style="gap:.5em">${rows}</div></div>`, 'narrow');
  $('sheet').querySelectorAll('[data-hero]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.hero; const at = GM.heroAt(id);
    const r = GM.assignHero(id, at && at.uid === b.uid ? null : b.uid); sfx('build'); toast(r.msg, 'good'); closeModal(); openBuildingPanel(b);
  });
}

// ---------- 위인 / 유물 (따로 열려요) ----------
export function openHeroes(tab = 'h') {
  const s = G.s; let body = '';
  if (tab === 'h') {
    body += s.era < 2 ? `<p class="muted">${icon('lock')} 역사 위인은 <b>2단계(삼국 시대)</b>부터 영입할 수 있어요.</p>` : `<p class="muted" style="margin:0 0 .4em">위인을 <b>건물에 배치</b>해야 그 건물 수익이 2~3배가 되고 ★고유 능력이 켜져요. 찰떡 건물에 두면 +0.5배 더!</p>`;
    body += '<div class="grid">';
    for (let era = 1; era <= MAX_ERA; era++) {
      body += `<div class="era-sep"><span>${ERAS[era].name}</span></div>`;
      for (const h of HEROES.filter(x => x.era === era)) {
        const st = s.heroes[h.id], avail = E.heroAvailable(s, h), at = GM.heroAt(h.id);
        body += `<div class="card ${!avail ? 'locked' : ''} ${st ? 'owned' : ''}">
          ${st ? `<span class="tag">Lv.${st.lv}</span>` : ''}
          <div class="top"><img class="portrait" src="${S.portraitURL(h, 64)}" alt=""><div><h5>${h.name}</h5><div class="sub">${h.title}</div></div></div>
          <div class="eff">★ ${h.passive.text}</div>
          <div class="sub">찰떡 건물: ${B[h.fav].name} (+0.5배)</div>
          <div class="desc">${h.desc}</div>
          ${!avail ? `<button class="btn gray off" disabled>${icon('lock')} ${Math.max(2, h.era)}단계</button>` :
            !st ? `<button class="btn green" data-recruit="${h.id}">영입 ${costHtml(h.kp, h.gold)}</button>` :
            `<div class="acts"><button class="btn" data-place="${h.id}">${at ? B[at.type].name : '배치하기'}</button>${st.lv < BAL.heroMaxLv ? `<button class="btn gold" data-train="${h.id}">훈련 ${costHtml(0, E.heroTrainCost(s, h.id))}</button>` : '<button class="btn gray off" disabled>훈련 완료</button>'}</div>`}
        </div>`;
      }
    }
    body += '</div>';
  } else if (tab === 'dig') {
    const c = E.relicCost(s, G.mods), rates = E.relicRates(G.mods);
    body += s.era < 3 ? `<p class="muted">${icon('lock')} 유물 발굴은 <b>3단계(통일신라·발해)</b>에 열려요. 그 전에는 도감에서 미리 구경해요!</p>` : '';
    body += `<div class="dig"><div class="box" id="digBox"><img src="${S.iconURL('chest', 64)}" alt=""></div>
      <div style="text-align:center"><div id="digOut" style="min-height:9em;display:grid;place-items:center"><span class="muted">엽전을 써서 땅속 유물을 찾아요!</span></div>
      <button class="btn gold" id="btnDig" ${s.era < 3 ? 'disabled' : ''}>${icon('chest')} 발굴하기 ${costHtml(0, c)}</button>
      <div class="muted" style="margin-top:.4em">${Object.entries(RARITY).map(([k, v]) => `${v.name} ${Math.round(rates[k] * 100)}%`).join(' · ')} · 중복 ${s.relicPity}/${BAL.relicPity}회면 새 유물 확정</div></div></div>`;
  } else {
    body += `<p class="muted" style="margin:0">같은 시대 유물 5종을 모두 모으면 <b>시대 세트 버프</b>: 그 시대 건물 수익 +${BAL.setBonus * 100}%!</p>`;
    for (let era = 1; era <= MAX_ERA; era++) {
      const list = RELICS.filter(r => r.era === era), have = list.filter(r => s.relics[r.id] > 0).length;
      body += `<div class="set-row"><h4 style="margin:0">${era}단계 · ${ERAS[era].name}</h4><span class="${have === 5 ? 'on' : 'muted'}">${have === 5 ? '세트 완성! +50%' : `${have}/5`}</span></div><div class="relic-grid">`;
      for (const r of list) {
        const n = s.relics[r.id] || 0;
        body += `<div class="relic ${n ? '' : 'none'}" title="${n ? esc(r.desc) : '아직 발굴하지 못했어요'}">${n > 1 ? `<span class="cnt">×${n}</span>` : ''}<img src="${S.relicURL(r, 64)}" alt=""><b>${n ? r.name : '???'}</b><span class="rar" style="background:${RARITY[r.rarity].color}">${RARITY[r.rarity].name}</span>${n ? `<div class="muted" style="font-size:.85em;margin-top:.2em;text-align:left">${r.desc}</div>` : ''}</div>`;
      }
      body += '</div>';
    }
  }
  openModal(tab === 'h' ? `${head('역사 위인', 'people')}<div class="sh-body">${body}</div>`
    : `${head('유물', 'chest')}${tabs([['dig', '유물 발굴'], ['book', '유물 도감']], tab)}<div class="sh-body">${body}</div>`);
  bindTabs(t => openHeroes(t));
  $('sheet').querySelectorAll('[data-recruit]').forEach(b => b.onclick = () => {
    const r = GM.recruitHero(b.dataset.recruit);
    if (r.ok) { sfx('fanfare'); toast(r.msg, 'good', 'people'); openHeroes('h'); const h = H[b.dataset.recruit]; const fav = G.s.buildings.find(x => x.type === h.fav && !x.heroId); if (fav || G.s.buildings.some(x => B[x.type])) placeHeroPrompt(h); }
    else { sfx('wrong'); toast(r.msg, 'bad'); }
  });
  $('sheet').querySelectorAll('[data-train]').forEach(b => b.onclick = () => { const r = GM.trainHero(b.dataset.train); if (r.ok) { sfx('levelup'); toast(r.msg, 'good'); openHeroes('h'); } else { sfx('wrong'); toast(r.msg, 'bad'); } });
  $('sheet').querySelectorAll('[data-place]').forEach(b => b.onclick = () => { sfx('click'); placeHeroPrompt(H[b.dataset.place]); });
  const db = $('btnDig'); if (db) db.onclick = () => doDig();
}
function placeHeroPrompt(h) {
  const s = G.s; const list = s.buildings.filter(b => B[b.type]).map(b => ({ b, inc: E.buildingIncome(s, b, G.mods, G.syn) })).sort((a, z) => (z.b.type === h.fav) - (a.b.type === h.fav) || z.inc - a.inc);
  if (!list.length) { toast('먼저 건물을 지어요!', 'bad'); return; }
  openModal(`${head(`${h.name} — 어디에 배치할까요?`, 'people')}<div class="sh-body"><p class="muted">★ ${h.passive.text} · 찰떡 건물: ${B[h.fav].name}</p><div class="list" style="gap:.4em">
    ${list.slice(0, 20).map(({ b, inc }) => `<div style="align-items:center"><img src="${bldgURL(b.type)}" style="width:2.4em;height:4.8em;object-fit:contain;object-position:bottom;image-rendering:pixelated;margin-top:-2em" alt="">
      <span style="flex:1;font-family:Jua">${B[b.type].name} Lv.${b.lv}${b.type === h.fav ? ' <span class="syn-tag">찰떡!</span>' : ''}${b.heroId ? ` <span class="muted">(${H[b.heroId].name})</span>` : ''}</span><span class="muted">+${F(inc)}/초</span>
      <button class="btn green" data-to="${b.uid}">배치</button></div>`).join('')}</div></div>`, 'narrow');
  $('sheet').querySelectorAll('[data-to]').forEach(btn => btn.onclick = () => { const r = GM.assignHero(h.id, btn.dataset.to); sfx('build'); toast(r.msg, 'good'); closeModal(); });
}
function doDig() {
  const box = $('digBox'); const r = GM.dig();
  if (!r.ok) { sfx('wrong'); toast(r.msg, 'bad'); return; }
  sfx('gacha'); box.classList.add('shake'); $('btnDig').disabled = true;
  setTimeout(() => {
    box.classList.remove('shake');
    const rel = r.relic, rar = RARITY[rel.rarity];
    $('digOut').innerHTML = `<div class="reveal ${rel.rarity}"><img src="${S.relicURL(rel, 96)}" alt=""><div style="font-family:Jua;font-size:1.5em">${rel.name}</div>
      <span class="rar" style="background:${rar.color}">${rar.name}</span> ${r.isNew ? '<b style="color:#c8352b;font-family:Jua">NEW!</b>' : `<span class="muted">중복 → 명성 +${r.fame}</span>`}
      ${r.setDone ? `<div style="font-family:Jua;color:#2a8a3a">${rel.era}단계 세트 완성! 수익 +50%</div>` : ''}<div class="muted" style="max-width:24em">${rel.desc}</div></div>`;
    sfx(rel.rarity === 'national' || rel.rarity === 'treasure' ? 'rare' : 'coin');
    if (r.isNew) toast(`새 유물: ${rel.name}`, 'good', 'chest');
    const btn = $('btnDig'); if (btn) { btn.disabled = false; btn.innerHTML = `${icon('chest')} 한 번 더 ${costHtml(0, E.relicCost(G.s, G.mods))}`; }
    updateHud(true);
  }, 800);
}

// ---------- 역사 연구소 ----------
export function openLab() {
  const s = G.s;
  if (s.era < 4) { lockedInfo('역사 연구소', 'flask', 4, 'KP를 투자해 영구 능력치를 올리는 12종 연구가 기다려요. 금속활자, 대동법, 측우기, 거중기…'); return; }
  const body = `<p class="muted" style="margin:0 0 .6em">KP를 투자하면 영원히 효과가 이어지는 연구예요. (완료한 연구 ${Object.values(s.techs).filter(v => v > 0).length}/${TECHS.length})</p><div class="grid">${TECHS.map(t => {
    const lv = s.techs[t.id] || 0, avail = s.era >= t.era, max = lv >= t.maxLv, c = E.techCost(s, t.id, G.mods);
    return `<div class="card ${!avail ? 'locked' : ''} ${lv ? 'owned' : ''}"><span class="tag">${lv}/${t.maxLv}</span><h5>${t.name}</h5>
      <div class="lvbar">${Array.from({ length: t.maxLv }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <div class="eff">${lv ? '지금: ' + t.effect(lv) : '효과: ' + t.effect(1)}${!max && lv ? ' → ' + t.effect(lv + 1) : ''}</div>
      <div class="desc">${t.desc}</div>
      ${!avail ? `<button class="btn gray off" disabled>${icon('lock')} ${t.era}단계</button>` : max ? '<button class="btn gray off" disabled>연구 완료</button>' :
        `<button class="btn ${s.kp >= c ? 'green' : 'off'}" data-tech="${t.id}">${icon('flask')} 연구 ${costHtml(c, 0)}</button>`}</div>`;
  }).join('')}</div>`;
  openModal(`${head('역사 연구소', 'flask')}<div class="sh-body">${body}</div>`);
  $('sheet').querySelectorAll('[data-tech]').forEach(b => b.onclick = () => { const r = GM.research(b.dataset.tech); if (r.ok) { sfx('levelup'); toast(r.msg, 'good', 'flask'); openLab(); } else { sfx('wrong'); toast(r.msg, 'bad'); } });
}
function lockedInfo(title, ic, era, text) {
  openModal(`${head(title, ic)}<div class="sh-body" style="text-align:center"><img src="${S.iconURL('lock', 64)}" style="width:5em;image-rendering:pixelated" alt=""><h4 style="justify-content:center">${era}단계 · ${ERAS[era].name}에 열려요</h4><p>${text}</p><button class="btn" data-close>알겠어요</button></div>`, 'narrow');
}

// ---------- 대역사 ----------
export function openWonder() {
  const s = G.s;
  if (s.era < 7) { lockedInfo('국보 대역사', 'museum', 7, '7단계(근현대·대한민국)에서 우리 반의 ‘대한민국 역사관’을 5단계에 걸쳐 짓게 돼요. 완공하면 역사 완성!'); return; }
  const c = E.wonderCost(s);
  const body = `<div style="display:flex;gap:1.2em;flex-wrap:wrap;align-items:center">
    <div class="wonder-view"><img src="${S.wonderSprite(s.wonder ? s.wonderStage : 0).img.toDataURL()}" alt=""></div>
    <div style="flex:1;min-width:16em"><h4>${WONDER.name}</h4><p>${WONDER.desc}</p><p class="muted">단계마다 마을 전체 수익 +${BAL.wonderIncomeBonus * 100}% · 명성 +${BAL.fame.wonder}</p>
    ${!s.wonder ? `<button class="btn gold" id="wPlace">${icon('museum')} 부지 정하기 (2×2 빈 땅)</button>` :
      c ? `<p><b style="font-family:Jua;font-size:1.25em">다음: ${s.wonderStage + 1}단계 ${WONDER.stages[s.wonderStage].name}</b><br>${costHtml(c.kp, c.gold)}</p><button class="btn ${s.kp >= c.kp && s.gold >= c.gold ? 'gold' : 'off'}" id="wBuild">${icon('hammer')} 공사하기</button>` : '<p style="font-family:Jua;font-size:1.4em;color:#2a8a3a">완공! 시대 돌파에 도전하세요!</p>'}
    </div></div>
    <div class="wonder-stages">${WONDER.stages.map((st, i) => `<div class="wstage ${i < s.wonderStage ? 'done' : i === s.wonderStage && s.wonder ? 'now' : ''}">${i + 1}. ${st.name}<div class="muted" style="font-size:.8em">${i < s.wonderStage ? '완료' : `KP ${F(st.kp)}<br>엽전 ${F(st.gold)}`}</div></div>`).join('')}</div>`;
  openModal(`${head('국보 대역사', 'museum')}<div class="sh-body">${body}</div>`);
  $('wPlace') && ($('wPlace').onclick = () => { sfx('click'); closeModal(); ctx.startPlace({ kind: 'wonder' }); });
  $('wBuild') && ($('wBuild').onclick = () => { const r = GM.buildWonder(); if (r.ok) { sfx('fanfare'); toast(r.msg, 'good', 'museum'); ctx.renderer.addFx({ kind: 'stars', i: s.wonder.x + 0.5, j: s.wonder.y + 0.5, life: 1.2 }); openWonder(); } else { sfx('wrong'); toast(r.msg, 'bad'); } });
}

// ---------- 기록 ----------
export function openRecord() {
  const s = G.s, st = s.stats;
  const acc = st.solved ? Math.round(st.correct / st.solved * 100) : 0;
  const h = Math.floor(st.playSec / 3600), m = Math.floor(st.playSec % 3600 / 60);
  const wrongTop = Object.entries(st.wrong).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => { const q = Q.getById(id, s.era); return q ? `<div><span>${esc(q.ctx ? q.q + ' — ' + q.ctx.slice(0, 40) + '…' : q.q)}</span><b style="font-family:Jua;color:#c8352b;white-space:nowrap">${n}번</b></div>` : ''; }).join('');
  const eraRows = Object.entries(st.eraTimes).map(([e, sec]) => `<div><span>${e}단계 ${ERAS[e].name} 돌파</span><span>누적 ${Math.floor(sec / 3600)}시간 ${Math.floor(sec % 3600 / 60)}분</span></div>`).join('');
  openModal(`${head('내 기록', 'trophy')}<div class="sh-body">
    <div class="stats">
      <div class="stat-box"><b>${F(st.solved)}</b><span>푼 문제</span></div><div class="stat-box"><b>${acc}%</b><span>정답률</span></div>
      <div class="stat-box"><b>${s.bestCombo}</b><span>최고 콤보</span></div><div class="stat-box"><b>${h}:${String(m).padStart(2, '0')}</b><span>플레이 시간</span></div>
      <div class="stat-box"><b>${F(s.fame)}</b><span>역사 명성</span></div><div class="stat-box"><b>${Object.keys(s.heroes).length}/16</b><span>위인</span></div>
      <div class="stat-box"><b>${Object.values(s.relics).filter(v => v > 0).length}/35</b><span>유물</span></div><div class="stat-box"><b>${Object.values(s.bossWins).reduce((a, v) => a + v, 0)}</b><span>보스 격퇴</span></div>
    </div>
    <h4>${icon('warn')} 자주 틀린 문제 TOP 5</h4><div class="list">${wrongTop || '<div class="muted">아직 틀린 문제가 없어요!</div>'}</div>
    <h4>${icon('clock')} 시대 돌파 기록</h4><div class="list">${eraRows || '<div class="muted">첫 시대 돌파에 도전해 보세요!</div>'}</div>
  </div>`);
}

// ---------- 설정 ----------
export function openSettings() {
  const s = G.s;
  openModal(`${head('설정', 'gear')}<div class="sh-body">
    <div class="set-line"><span>효과음</span><button class="switch ${s.settings.sfx ? 'on' : ''}" id="swSfx" aria-label="효과음"></button></div>
    <div class="set-line"><span>배경 음악 (가야금 느낌)</span><button class="switch ${s.settings.bgm ? 'on' : ''}" id="swBgm" aria-label="배경 음악"></button></div>
    ${s.teacher ? `<h4>${icon('crown')} 선생님 테스트 마을</h4>
    <p class="muted" style="margin-top:0">재화는 무한, 위인·유물 도감은 모두 열려 있어요. 학생 랭킹·친구 목록·전쟁에는 나오지 않아요.</p>
    <div class="set-line" style="flex-wrap:wrap"><span>시대 바로 가기<br><small class="muted">그 시대의 퀴즈·보스전·건물을 시험해 볼 수 있어요.</small></span><div class="era-jump">${Array.from({ length: MAX_ERA }, (_, i) => i + 1).map(n => `<button class="btn ${n === s.era ? 'gold' : ''}" data-era="${n}" title="${ERAS[n].name}">${n}</button>`).join('')}</div></div>
    <div class="set-line"><span>교사 화면 (진도 보기·멈춤·채팅 관리)</span><a class="btn green" href="admin.html" target="_blank" style="text-decoration:none">교사 화면 열기</a></div>` : `<div class="set-line"><span>전쟁 허용 (친구와 전쟁)<br><small class="muted">켜면 친구가 선전포고할 수 있어요. 거절도 할 수 있어요.</small></span><button class="switch ${s.pvp ? 'on' : ''}" id="swPvp" aria-label="전쟁 허용"></button></div>
    <div class="set-line"><span>내 정보</span><button class="btn" id="stProfile">이름·번호·얼굴 바꾸기</button></div>`}
    <h4>${icon('book')} 백업 코드 (다른 기기로 옮기기)</h4>
    <p class="muted">지금은 이 기기(브라우저)에 저장돼요. 아래 코드를 복사해 두면 다른 크롬북에서도 이어서 할 수 있어요.</p>
    <textarea class="code" id="codeOut" readonly>${GM.exportCode()}</textarea>
    <div style="display:flex;gap:.5em;margin:.4em 0 1em"><button class="btn" id="stCopy">코드 복사</button></div>
    <textarea class="code" id="codeIn" placeholder="여기에 백업 코드를 붙여 넣고 ‘불러오기’를 눌러요"></textarea>
    <div style="display:flex;gap:.5em;margin-top:.4em"><button class="btn green" id="stImport">불러오기</button><span style="flex:1"></span><button class="btn red" id="stReset">처음부터 다시</button></div>
    <p class="muted" style="margin-top:1em">히스토리 빌더 v${VERSION} · ${sync.enabled ? `학급 서버에 자동 저장 중 (학급 코드 ${esc(G.s.classCode)} · ${G.s.studentNo}번)` : sync.configured ? '학급 서버 연결 안 됨 — 이 기기에만 저장 중' : '로컬 저장 모드'}</p>
  </div>`, 'narrow');
  $('swSfx').onclick = () => { s.settings.sfx = !s.settings.sfx; setSfx(s.settings.sfx); $('swSfx').classList.toggle('on', s.settings.sfx); sfx('click'); GM.save('settings'); };
  $('swBgm').onclick = () => { s.settings.bgm = !s.settings.bgm; setBgm(s.settings.bgm); $('swBgm').classList.toggle('on', s.settings.bgm); GM.save('settings'); };
  $('sheet').querySelectorAll('[data-era]').forEach(b => b.onclick = () => { const r = GM.teacherEra(Number(b.dataset.era)); sfx('click'); toast(r.msg, r.ok ? 'good' : 'bad'); openSettings(); });
  if ($('stProfile')) $('stProfile').onclick = () => { closeModal(); startScreen(true); };
  if ($('swPvp')) $('swPvp').onclick = () => { const r = GM.setPvp(!s.pvp); sfx(r.ok ? 'click' : 'wrong'); toast(r.msg, r.ok ? 'good' : 'bad', 'war'); $('swPvp').classList.toggle('on', !!s.pvp); };
  $('stCopy').onclick = async () => { const t = $('codeOut'); t.select(); try { await navigator.clipboard.writeText(t.value); toast('복사했어요!', 'good'); } catch (e) { toast('코드를 길게 눌러 직접 복사해 주세요.'); } };
  $('stImport').onclick = () => { const v = $('codeIn').value.trim(); if (!v) return; confirmBox('지금 마을을 백업 코드의 마을로 바꿀까요?', () => { const r = GM.importCode(v); toast(r.msg, r.ok ? 'good' : 'bad'); ctx.renderer.fitPending = true; ctx.renderer.sceneryKey = ''; }); };
  $('stReset').onclick = () => confirmBox('정말 처음부터 다시 할까요?<br><span class="muted">지금까지의 마을이 모두 사라져요. 백업 코드를 먼저 복사해 두세요.</span>', () => confirmBox('마지막 확인! 정말 지울까요?', () => { GM.resetGame(); location.reload(); }, '모두 지우기', true), '지우기', true);
}

// ---------- 학급 랭킹 ----------
const RANKS = [
  { id: 'fame', name: '역사 명성', icon: 'star', val: m => m.fame || 0, fmt: v => F(v) },
  { id: 'correct', name: '퀴즈 박사', icon: 'book', val: m => m.correct || 0, fmt: v => `${F(v)}문제` },
  { id: 'acc', name: '정답률', icon: 'bolt', val: m => (m.solved || 0) >= 20 ? Math.round((m.correct || 0) / m.solved * 100) : -1, fmt: v => v < 0 ? '20문제 이상' : `${v}%`, note: '20문제 이상 푼 친구만 순위에 올라요' },
  { id: 'war', name: '전쟁 영웅', icon: 'war', val: m => m.win || 0, fmt: (v, m) => `${v}승 ${m.lose || 0}패` },
  { id: 'combo', name: '콤보 왕', icon: 'flame', val: m => m.combo || 0, fmt: v => `${v}연속` },
  { id: 'relic', name: '유물 수집가', icon: 'chest', val: m => m.relics || 0, fmt: v => `${v}/${RELICS.length}종` },
  { id: 'era', name: '시대 진도', icon: 'museum', val: m => (m.completed ? 11 : m.era || 1) * 1e7 + (m.fame || 0), fmt: (v, m) => m.completed ? '역사 완성!' : `${m.era}단계 ${ERAS[m.era]?.name || ''}` },
];
let rankTab = 'fame', rankList = null;
export function openRanking(tab = rankTab) {
  rankTab = tab;
  if (!sync.enabled) {
    openModal(`${head('학급 랭킹', 'crown')}<div class="sh-body" style="text-align:center"><img src="${S.iconURL('crown', 64)}" style="width:5em;image-rendering:pixelated" alt=""><h4 style="justify-content:center">학급 서버에 연결되면 랭킹이 열려요</h4><p>${sync.configured ? '인터넷 연결을 확인하고 새로고침해 보세요.' : '선생님이 Firebase를 연결하면 우리 반 랭킹을 볼 수 있어요.'}</p><button class="btn" data-close>알겠어요</button></div>`, 'narrow');
    return;
  }
  const draw = () => {
    if (!modalOpen() || !$('rankBody')) return;
    const R0 = RANKS.find(r => r.id === rankTab);
    const rows = (rankList || []).filter(d => d.summary).map(d => ({ d, m: d.summary, v: R0.val(d.summary) })).filter(x => x.v >= 0).sort((a, b) => b.v - a.v || (b.m.fame || 0) - (a.m.fame || 0));
    // 같은 값은 같은 등수
    let rank = 0, prev = null; rows.forEach((x, i) => { if (x.v !== prev) { rank = i + 1; prev = x.v; } x.rank = rank; });
    const meRow = rows.find(x => x.d.id === sync.docId);
    const top = rows.slice(0, 3);
    const order = [top[1], top[0], top[2]];
    const podium = top.length ? `<div class="podium">${order.map((x, k) => x ? `<div class="pd p${x.rank <= 3 ? x.rank : 3} ${x.d.id === sync.docId ? 'me' : ''}"><div class="medal">${x.rank}</div><img src="${avatarURL(x.m.avatar || 0)}" alt=""><b>${esc(x.m.name)}</b><span>${R0.fmt(x.v, x.m)}</span><i></i></div>` : '<div class="pd empty"></div>').join('')}</div>` : '';
    const list = rows.slice(3).map(x => `<div class="rk ${x.d.id === sync.docId ? 'me' : ''}"><b>${x.rank}</b><img src="${avatarURL(x.m.avatar || 0)}" alt=""><span class="nm">${esc(x.m.name)} <small>${x.m.studentNo}번</small></span><span class="vl">${R0.fmt(x.v, x.m)}</span></div>`).join('');
    $('rankBody').innerHTML = `<div class="rank-me">${meRow ? `나는 <b>${meRow.rank}위</b> / ${rows.length}명 · ${R0.fmt(meRow.v, meRow.m)}` : R0.note || '아직 순위에 없어요. 열심히 해 봐요!'}</div>
      ${podium}<div class="rk-list">${list || (rows.length ? '' : '<div class="muted" style="text-align:center">아직 같은 학급 코드로 들어온 친구가 없어요.</div>')}</div>
      ${R0.note ? `<p class="muted" style="text-align:center">${R0.note}</p>` : ''}`;
  };
  openModal(`${head(`학급 랭킹 · ${esc(sync.classCode)}`, 'crown')}<div class="tabs rank-tabs">${RANKS.map(r => `<button data-rk="${r.id}" class="${r.id === rankTab ? 'on' : ''}">${icon(r.icon)}${r.name}</button>`).join('')}</div><div class="sh-body" id="rankBody"><p class="muted">랭킹을 불러오는 중…</p></div>`);
  $('sheet').querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { sfx('click'); rankTab = b.dataset.rk; $('sheet').querySelectorAll('[data-rk]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  GM.save('rank'); sync.flush();
  sync.classmates(true).then(list => { rankList = list; draw(); }).catch(e => { console.warn(e); if ($('rankBody')) $('rankBody').innerHTML = '<p>랭킹을 불러오지 못했어요. 잠시 뒤 다시 해 보세요.</p>'; });
}

// ---------- 친구 마을 ----------
export const STICKERS = [
  { id: 'great', label: '최고야!', icon: 'trophy' }, { id: 'cool', label: '멋져요', icon: 'star' },
  { id: 'fire', label: '불타오른다', icon: 'flame' }, { id: 'smart', label: '역사 박사', icon: 'book' },
  { id: 'rich', label: '부자 마을', icon: 'coin' }, { id: 'friend', label: '같이 하자', icon: 'people' },
];
const stickerOf = id => STICKERS.find(x => x.id === id) || STICKERS[0];
export function openFriends() {
  if (!sync.enabled) {
    openModal(`${head('친구 마을 방문', 'people')}<div class="sh-body" style="text-align:center">
      <img src="${S.iconURL('people', 64)}" style="width:5em;image-rendering:pixelated" alt="">
      <h4 style="justify-content:center">${sync.configured ? '인터넷 연결을 확인해 주세요' : '학급 서버가 아직 연결되지 않았어요'}</h4>
      <p>${sync.configured ? '학급 서버에 연결되지 않아 지금은 이 기기에만 저장되고 있어요. 인터넷이 연결되면 새로고침해 보세요.' : '선생님이 Firebase를 연결하면 친구 마을 구경, 칭찬 스티커, 위기 함께 막기, 학급 랭킹이 열려요.'}</p>
      <button class="btn" data-close>알겠어요</button></div>`, 'narrow');
    return;
  }
  openModal(`${head(`우리 반 친구 마을 · ${esc(sync.classCode)}`, 'people')}<div class="sh-body"><p class="muted">친구 마을을 불러오는 중…</p></div>`);
  sync.classmates(true).then(list => {
    if (!modalOpen()) return;
    const me = G.s; const left = GM.dailyLeft();
    const rows = list.filter(d => d.summary).sort((a, b) => (b.summary.fame || 0) - (a.summary.fame || 0));
    const body = rows.map((d, i) => {
      const sm = d.summary, mine = d.id === sync.docId;
      const crisis = d.crisis && !d.crisis.resolved && !(d.help && d.help.crisisAt === d.crisis.at);
      const tags = `${crisis && !mine ? '<span class="syn-tag" style="background:#ffe0dc;color:#c8352b">위기 발생!</span>' : ''}${sm.pvp ? `<span class="syn-tag pvp-tag" title="전쟁 허용">${icon('war')} 전쟁 허용</span>` : ''}`;
      return `<div class="card fr" style="${mine ? 'border-color:#f2b234' : ''}">
        <b style="color:${i < 3 ? '#c8352b' : '#8a6a4a'}">${i + 1}</b>
        <img src="${avatarURL(sm.avatar || 0)}" alt="">
        <div class="fr-info"><h5>${esc(sm.name)} <span class="muted">${sm.studentNo}번${mine ? ' · 나' : ''}</span></h5>
          <div class="sub">${sm.era}단계 ${ERAS[sm.era]?.name || ''} · 명성 ${F(sm.fame || 0)} · 건물 ${sm.buildings}채${sm.completed ? ' · 역사 완성!' : ''}</div>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
        ${mine ? '' : `<div class="fr-act">${sm.pvp && G.s.pvp && !sync.classControl.warOff ? `<button class="btn red" data-war="${esc(d.id)}">${icon('war')} 선전포고</button>` : ''}<button class="btn green" data-visit="${esc(d.id)}">놀러 가기</button></div>`}
      </div>`;
    }).join('');
    $('sheet').querySelector('.sh-body').innerHTML = `<div class="fr-top"><p class="muted">명성 순위예요. 오늘 남은 칭찬 보상 ${left.cheers}번 · 위기 도와주기 보상 ${left.helps}번${me.pvp ? ` · 선전포고 ${GM.warsLeft()}번` : ' · 전쟁을 하려면 설정에서 ‘전쟁 허용’을 켜요'}</p><button class="btn gold" id="toRank" style="font-size:.95em;white-space:nowrap">${icon('crown')} 학급 랭킹</button></div><div class="list" style="gap:.5em">${body || '<div class="muted">아직 같은 학급 코드로 들어온 친구가 없어요.</div>'}</div>`;
    $('sheet').querySelectorAll('[data-visit]').forEach(b => b.onclick = () => { sfx('click'); const d = rows.find(x => x.id === b.dataset.visit); closeModal(); visitFriend(d); });
    $('toRank') && ($('toRank').onclick = () => { sfx('click'); openRanking('fame'); });
    $('sheet').querySelectorAll('[data-war]').forEach(b => b.onclick = () => { sfx('click'); const d = rows.find(x => x.id === b.dataset.war); ctx.openDeclare?.(d); });
  }).catch(e => { console.warn(e); $('sheet').querySelector('.sh-body').innerHTML = '<p>친구 목록을 불러오지 못했어요. 잠시 뒤 다시 해 보세요.</p>'; });
}

let visitR = null, visitRAF = 0;
export function visitFriend(d) {
  const ov = $('overlay'); ov.classList.remove('hidden', 'leaving'); ov.classList.add('visit'); ov.style.background = '#3a8fcf';
  const crisisOn = () => d.crisis && !d.crisis.resolved && !(d.help && d.help.crisisAt === d.crisis.at);
  ov.innerHTML = `<canvas id="visitCv" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <div class="panel" style="position:absolute;top:.8em;left:50%;transform:translateX(-50%);font-size:1.4em;gap:.6em">
      <img src="${avatarURL(d.summary?.avatar || 0)}" style="width:2em;height:2em;image-rendering:pixelated;border-radius:.3em" alt="">
      <span>${esc(d.name)}의 마을 · ${d.era}단계 ${ERAS[d.era]?.name || ''}</span></div>
    <div style="position:absolute;left:0;right:0;bottom:calc(.4em + var(--badge));display:flex;gap:.5em;justify-content:center;flex-wrap:wrap;padding:0 .8em" id="visitBar">
      ${STICKERS.map(st => `<button class="btn gold" data-st="${st.id}">${icon(st.icon)} ${st.label}</button>`).join('')}
      <button class="btn red ${crisisOn() ? '' : 'hidden'}" id="vHelp">${icon('warn')} 위기 막아 주기</button>
      ${d.summary?.pvp && G.s.pvp ? `<button class="btn red" id="vWar">${icon('war')} 선전포고</button>` : ''}
      <button class="btn gray" id="vBack">우리 마을로</button>
    </div>`;
  if (!visitR) visitR = new Renderer($('visitCv')); else { visitR.cv = $('visitCv'); visitR.g = visitR.cv.getContext('2d'); }
  visitR.people = []; visitR.sceneryKey = ''; visitR.userZoom = 0; visitR.resize();
  const warnImg = S.iconCanvas('warn', 32);
  let last = performance.now();
  const loop = t => {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    const view = { ...d, crisis: crisisOn() ? d.crisis : null };
    visitR.draw(view, { warnImg, storageRatio: 0, portraits: portraitImg }, dt);
    visitRAF = requestAnimationFrame(loop);
  };
  visitRAF = requestAnimationFrame(loop);
  const close = () => {
    ov.classList.add('leaving'); updateHud(true);
    setTimeout(() => {
      cancelAnimationFrame(visitRAF);
      if (!ov.querySelector('#visitCv')) return;          // 그사이 다른 창이 열렸으면 그대로 둬요
      ov.classList.add('hidden'); ov.classList.remove('visit', 'leaving'); ov.innerHTML = ''; ov.style.background = '';
    }, 380);
  };
  $('vBack').onclick = () => { sfx('click'); close(); };
  $('vWar') && ($('vWar').onclick = () => { sfx('click'); close(); ctx.openDeclare?.(d); });
  ov.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => {
    const st = stickerOf(b.dataset.st);
    ov.querySelectorAll('[data-st]').forEach(x => x.disabled = true);
    try {
      await sync.sendCheer(d.id, G.s, st.id); const r = GM.cheerSent(); sfx('coin');
      toast(`${d.name}에게 ‘${st.label}’ 스티커를 보냈어요!${r.kp ? ` KP +${F(r.kp)}` : ' (오늘 보상은 다 받았어요)'}`, 'good', st.icon);
    } catch (e) { console.warn(e); toast('스티커를 보내지 못했어요.', 'bad'); }
    setTimeout(() => ov.querySelectorAll('[data-st]').forEach(x => x.disabled = false), 3000);
  });
  const help = () => {
    if (!crisisOn()) return;
    const s = G.s; quizBusy = true;
    const q = Q.nextQuestion(s, { eras: [s.era], types: ['mc', 'ox'], useWrongQueue: false }); Q.remember(s, q);
    openModal(`${head(`${esc(d.name)}의 마을을 지켜 줘요!`, 'warn')}<div class="qz-body">${qHtml(q)}${choicesHtml(q)}<div id="fb"></div><div class="qz-foot"><span class="muted">맞히면 친구는 엽전, 나는 KP를 받아요</span><button class="btn hidden" id="qNext" data-close>확인</button></div></div>`, 'quizsheet', () => { quizBusy = false; });
    bindAnswer(q, async (ans, btn) => {
      const right = Q.checkAnswer(q, ans); markChoices(q, btn, right);
      if (!right) { sfx('wrong'); $('fb').innerHTML = `<div class="qz-fb no"><b>아쉬워요</b><span class="grow">정답: ${esc(Q.answerText(q))} — 다른 친구가 도와줄 수도 있어요!</span></div>`; $('qNext').classList.remove('hidden'); return; }
      let okHelp = false; try { okHelp = await sync.helpCrisis(d.id, G.s); } catch (e) { console.warn(e); }
      if (okHelp) {
        const r = GM.helpedFriend(); d.help = { crisisAt: d.crisis.at }; sfx('fanfare');
        $('fb').innerHTML = `<div class="qz-fb ok"><b>위기 해결!</b><span class="grow">${r.limit ? '오늘 도와주기 보상은 다 받았지만 친구를 지켰어요!' : `KP +${F(r.kp)}`} ${esc(d.name)}에게도 엽전 보너스가 가요.</span></div>`;
        $('vHelp')?.classList.add('hidden');
      } else { $('fb').innerHTML = `<div class="qz-fb ok"><b>정답!</b><span class="grow">그런데 다른 친구가 먼저 위기를 막았어요.</span></div>`; d.help = { crisisAt: d.crisis.at }; $('vHelp')?.classList.add('hidden'); }
      $('qNext').classList.remove('hidden'); updateHud(true);
    });
  };
  $('vHelp').onclick = () => { sfx('alarm'); help(); };
  visitR.cv.addEventListener('pointerup', e => { const hit = visitR.pick({ ...d, crisis: crisisOn() ? d.crisis : null }, e.clientX, e.clientY); if (hit.crisis) help(); });
  visitR.cv.addEventListener('wheel', e => { e.preventDefault(); visitR.zoom(e.deltaY < 0 ? 1 : -1, d); }, { passive: false });
}

// ---------- 선생님 일시정지 ----------
export function showPaused(on, notice = '') {
  let el = $('pausedOv');
  if (!on) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'pausedOv'; el.className = 'overlay'; el.style.zIndex = 60; document.getElementById('app').appendChild(el); }
  el.innerHTML = `<div class="celebrate"><div class="big-title" style="font-size:3em">잠깐 멈춤!</div><div class="sub">선생님이 게임을 잠시 멈췄어요. 앞을 봐 주세요.</div>${notice ? `<ul><li>${esc(notice)}</li></ul>` : ''}</div>`;
}

// 7단계를 완성했던 친구에게: 새 시대가 열렸어요
export function newEraNews() {
  openModal(`${head('새 시대가 열렸어요!', 'trophy')}<div class="sh-body" style="text-align:center">
    <p style="font-family:Jua;font-size:1.5em;margin:.2em 0">역사를 완성한 우리 마을에 새 시대가 찾아왔어요</p>
    <p style="font-family:Jua;font-size:1.3em;color:#2f6aa8">8단계 현대 대한민국 → 9단계 우주 시대 → 10단계 외계 시대</p>
    <p>이제 <b>수학·영어 문제</b>도 풀 수 있어요. 퀴즈에서 과목을 골라 보세요!<br>새 건물 12종, 새 유물 18종, 끝판왕 연구가 기다려요.</p>
    <p class="muted">오른쪽 위 <b>저장</b> 버튼을 누르면 학급 서버에 바로 저장돼요.</p>
    <button class="btn gold" data-close style="font-size:1.3em">출발!</button></div>`, 'narrow');
  sfx('fanfare');
}

// 아이폰 등 전체 화면을 지원하지 않는 브라우저 → 홈 화면에 추가 안내
export function fullHelp(ios) {
  openModal(`${head('전체 화면으로 하기', 'full')}<div class="sh-body" style="text-align:center">
    <p style="font-family:Jua;font-size:1.35em;margin:.2em 0">${ios ? '아이폰은 ‘홈 화면에 추가’로 앱처럼 꽉 찬 화면이 돼요' : '이 브라우저는 전체 화면을 지원하지 않아요'}</p>
    ${ios ? `<ol class="fh-steps"><li>사파리 아래쪽 <b>공유</b> 버튼(네모에 화살표)을 눌러요</li><li><b>홈 화면에 추가</b>를 눌러요</li><li>홈 화면에 생긴 <b>히스토리 빌더</b> 아이콘으로 들어와요</li></ol>
    <p class="muted">처음 한 번은 학급 코드·번호·이름을 다시 넣으면 내 마을이 그대로 이어져요.</p>` : '<p>크롬에서 열면 전체 화면으로 할 수 있어요.</p>'}
    <button class="btn gold" data-close style="font-size:1.2em;margin-top:.4em">알겠어요</button></div>`, 'narrow');
}

// 첫 화면의 ‘새 소식’
export function newsModal() {
  const row = (ic, b, t) => `<li>${icon(ic)}<div><b>${b}</b><span>${t}</span></div></li>`;
  openModal(`${head('새 소식', 'star')}<div class="sh-body"><ul class="news-list">
    ${row('clock', '새 시대 3개가 열렸어요', '8 현대 대한민국 → 9 우주 시대 → 10 외계 시대')}
    ${row('book', '수학·영어 문제', '퀴즈에서 과목(한국사·수학·영어·섞어서)을 골라 풀어요')}
    ${row('museum', '새 건물 12종 · 유물 18종', '끝없이 올릴 수 있는 연구도 생겼어요')}
    ${row('save', '저장 버튼', '오른쪽 위 저장 버튼을 누르면 바로 학급 서버에 저장돼요')}
    ${row('star', '새 첫 화면', '밤하늘에 떠 있는 시대의 섬에서 출발해요')}
  </ul><p class="muted" style="text-align:center;margin:.6em 0 0">히스토리 빌더 v${VERSION}</p>
  <div style="text-align:center;margin-top:.6em"><button class="btn gold" data-close style="font-size:1.25em">확인</button></div></div>`, 'narrow');
}

// 같은 마을이 다른 곳에서 열려 있을 때 (진행이 사라지지 않게 이 화면은 멈춰요)
export function showConflict(onResume) {
  let el = $('conflictOv');
  if (!el) { el = document.createElement('div'); el.id = 'conflictOv'; el.className = 'closed-ov conflict-ov'; document.body.appendChild(el); }
  el.innerHTML = `<div class="closed-card"><img src="${S.iconURL('people', 64)}" alt="" style="width:64px;image-rendering:pixelated"><b>이 마을이 다른 곳에서도 열려 있어요</b>
    <p>다른 크롬북이나 다른 창에서 같은 마을을 하고 있어서,<br>진행이 사라지지 않게 이 화면은 잠깐 멈췄어요.</p>
    <button class="btn gold" id="cfGo" style="font-size:18px;padding:10px 22px">여기서 이어 하기</button>
    <small>누르면 더 많이 진행된 마을로 이어서 해요. 다른 곳의 게임 창은 닫아 주세요.</small></div>`;
  $('cfGo').onclick = async () => { const b = $('cfGo'); b.disabled = true; b.textContent = '불러오는 중…'; if (await onResume()) el.remove(); else { b.disabled = false; b.textContent = '여기서 이어 하기'; } };
}

// 서버 닫힘 (교사 화면의 ‘서버 닫기’) — 게임 전체를 덮어요
export function showClosed(on, msg = '') {
  let el = $('closedOv');
  if (!on) { if (el) { el.remove(); if (G.s) GM.save('reopen'); } return; }
  if (!el) { el = document.createElement('div'); el.id = 'closedOv'; el.className = 'closed-ov'; document.body.appendChild(el); }
  el.innerHTML = `<div class="closed-card"><div class="moon" aria-hidden="true"></div><b>히스토리 빌더 문을 닫았어요</b><p>선생님이 지금은 서버를 닫아 두었어요.<br>다음 시간에 다시 만나요!</p>${msg ? `<p class="closed-msg">${esc(msg)}</p>` : ''}<small>문이 열리면 이 화면이 저절로 사라져요.</small></div>`;
}

// ---------- 시대 돌파 조건 ----------
export function openConds() {
  const s = G.s;
  if (s.completed) { openModal(`${head('역사 완성!', 'trophy')}<div class="sh-body" style="text-align:center"><h4 style="justify-content:center">모든 시대를 돌파했어요!</h4><p>이제 퀴즈를 풀 때마다 명성이 올라가요. 학급 최고의 역사가에 도전하세요!</p><button class="btn" data-close>좋아요</button></div>`, 'narrow'); return; }
  const cs = E.conditions(s), era = ERAS[s.era], ready = cs.every(c => c.done);
  const next = ERAS[s.era + 1];
  openModal(`${head(`${s.era}단계 · ${era.name} 돌파 조건`, 'star')}<div class="sh-body">
    <div class="conds">${cs.map(c => `<div class="cond ${c.done ? 'done' : ''}"><span class="ck">${c.done ? '✓' : ''}</span><span>${c.label}</span><span class="n">${c.type === 'mapSize' ? (c.done ? '완료' : `${s.mapSize}×${s.mapSize}`) : `${Math.min(c.cur, c.need)}/${c.need}`}</span></div>`).join('')}
      <div class="cond boss-cond"><img src="${S.bossURL(GM.eraBoss().id)}" alt=""><span>보스 <b>${GM.eraBoss().name}</b> 물리치기 (체력 ${GM.eraBoss().hp})</span><span class="n">응시료 ${s.feePaid ? '납부 완료' : era.fee + ' KP'}</span></div></div>
    <p class="muted">정답이면 공격, 틀리면 내 하트가 1개 줄어요(하트 ${BAL.battleHearts}개). 응시료는 이길 때까지 한 번만 내요.</p>
    ${next ? `<h4>${icon('star')} 돌파하면 열리는 것 — ${next.name}</h4><div class="list">${next.unlocks.map(u => `<div><span>${u}</span></div>`).join('')}</div>` : '<h4>마지막 시대예요! 돌파하면 역사 완성!</h4>'}
    <div style="text-align:right;margin-top:1em"><button class="btn ${ready ? 'gold' : 'off'}" id="cGo">${icon('bolt')} 도전하기</button></div></div>`, 'narrow');
  $('cGo').onclick = () => { if (!ready) { sfx('wrong'); toast('조건을 먼저 모두 채워요!', 'bad'); return; } runChallenge(); };
}

// =============================================================
//  퀴즈
// =============================================================
let quizBusy = false;
export const isQuizBusy = () => quizBusy;
// 문제 위 꼬리표: 한국사는 시대, 수학·영어는 단원
function qChip(q) {
  if (q.subj === 'math') return `<span class="era-chip subj-math">수학 · ${esc(q.unit || '')}</span>`;
  if (q.subj === 'eng') return `<span class="era-chip subj-eng">영어 · ${esc(q.unit || '')}</span>`;
  return `<span class="era-chip">${q.era}단계 ${ERAS[q.era]?.name || ''}</span>`;
}
function qHtml(q) {
  let extra = '';
  if (q.relic && R[q.relic]) extra += `<img src="${S.relicURL(R[q.relic], 64)}" alt="">`;
  if (q.ctx) extra += `<div class="ctx">${esc(q.ctx)}</div>`;
  const label = q.type === 'ox' ? '<span class="muted" style="font-size:.5em">맞으면 O, 틀리면 X</span>' : '';
  return `<div class="qz-q">${q.retry ? '<span class="muted" style="font-size:.5em">다시 나온 문제! 이번엔 맞혀 봐요</span>' : ''}${esc(q.q)}${label}${extra}</div>`;
}
function choicesHtml(q) {
  if (q.type === 'ox') return `<div class="qz-ch ox"><button class="o" data-a="1">O</button><button class="x" data-a="0">X</button></div>`;
  if (q.type === 'sa') return `<form class="qz-sa" id="saForm"><input id="saIn" autocomplete="off" placeholder="정답을 입력해요"><button class="btn green" type="submit">확인</button></form>`;
  return `<div class="qz-ch">${q.shown.map((c, i) => `<button data-a="${i}"><i>${i + 1}</i>${esc(c)}</button>`).join('')}</div>`;
}
function bindAnswer(q, cb) {
  ctx.lastQ = q;
  if (q.type === 'sa') {
    const f = $('saForm'), inp = $('saIn'); setTimeout(() => inp?.focus(), 50);
    f.onsubmit = e => { e.preventDefault(); if (!inp.value.trim()) return; inp.disabled = true; cb(inp.value); };
    return;
  }
  $('sheet').querySelectorAll('.qz-ch button').forEach(b => b.onclick = () => {
    $('sheet').querySelectorAll('.qz-ch button').forEach(x => x.disabled = true);
    const a = q.type === 'ox' ? b.dataset.a === '1' : Number(b.dataset.a);
    cb(a, b);
  });
}
function markChoices(q, picked, right) {
  if (q.type === 'mc') $('sheet').querySelectorAll('.qz-ch button').forEach((b, i) => { if (i === q.correctIdx) b.classList.add('right'); else if (b === picked) b.classList.add('wrong'); });
  if (q.type === 'ox') $('sheet').querySelectorAll('.qz-ch button').forEach(b => { const v = b.dataset.a === '1'; if (v === q.answer) b.classList.add('right'); else if (b === picked) b.classList.add('wrong'); });
  if (q.type === 'sa') { const i = $('saIn'); if (i) { i.style.background = right ? '#d8f5d0' : '#ffd8d0'; } }
}
document.addEventListener('keydown', e => {
  if (!quizBusy || $('modal').classList.contains('hidden')) return;
  if (e.target.tagName === 'INPUT') return;
  const n = { '1': 0, '2': 1, '3': 2, '4': 3, 'o': 1, 'O': 1, 'x': 0, 'X': 0 }[e.key];
  if (n === undefined) { if (e.key === 'Enter') $('qNext')?.click(); return; }
  const btns = [...$('sheet').querySelectorAll('.qz-ch button')];
  if (btns.length === 2 && (e.key === 'o' || e.key === 'O')) btns[0].click();
  else if (btns.length === 2 && (e.key === 'x' || e.key === 'X')) btns[1].click();
  else btns[n]?.click();
});

// ---------- 퀴즈 모드 선택 ----------
export function openQuizMenu() {
  const s = G.s;
  const taLeft = Math.max(0, s.taReadyAt - Date.now()), bossLeft = Math.max(0, s.bossReadyAt - Date.now());
  const mmss = ms => `${Math.floor(ms / 60000)}분 ${Math.floor(ms % 60000 / 1000)}초`;
  const subjBtns = Object.entries(Q.SUBJECTS).map(([k, v]) => `<button class="subj-btn ${(s.subj || 'hist') === k ? 'on' : ''}" data-subj="${k}">${{ hist: '📜', math: '➗', eng: '🔤', mix: '🎲' }[k]} ${v}</button>`).join('');
  openModal(`${head('퀴즈', 'book')}<div class="sh-body"><div class="subj-row"><span>과목</span>${subjBtns}</div>
    <p class="muted subj-note">${{ hist: s.era > 7 ? '한국사 1~7단계 총복습 문제가 나와요.' : '5학년 2학기 사회(역사) 교과서 문제예요.', math: '5학년 수학: 혼합 계산·약수와 배수·약분과 통분·분수와 소수의 계산·넓이·평균 등', eng: '5학년 영어: 낱말 뜻, 첫 글자, 자주 쓰는 표현. 문제는 우리말로 나와요.', mix: '한국사·수학·영어가 골고루 섞여 나와요.' }[s.subj || 'hist']}</p>
    <div class="modes">
    <button class="mode m1" id="mNormal">${icon('book')}<h3>일반 탐구 퀴즈</h3><p>${(s.subj || 'hist') === 'hist' ? '현재 시대 70% + 이전 시대 30%.' : '고른 과목 문제를 풀어요.'} 3연속 정답 KP 1.5배, 5연속이면 피버! 엽전 2배</p><span class="state">문제당 기본 ${F(E.baseKp(s, G.mods))} KP</span></button>
    <button class="mode m2" id="mTA" ${taLeft ? 'disabled' : ''}>${icon('clock')}<h3>60초 타임어택</h3><p>60초 동안 O/X와 단답형을 빠르게! 맞힌 만큼 KP와 엽전을 왕창</p><span class="state">${taLeft ? mmss(taLeft) + ' 뒤 가능' : '지금 도전 가능!'}</span></button>
    <button class="mode m3" id="mBoss" ${s.era < 6 || bossLeft ? 'disabled' : ''}>${icon('boss')}<h3>역사 보스전</h3><p>거란·몽골·임진왜란… 정답으로 공격하고 하트를 지켜요. 이기면 희귀 이상 유물 상자!</p><span class="state">${s.era < 6 ? '6단계에 열려요' : bossLeft ? mmss(bossLeft) + ' 뒤 가능' : '지금 도전 가능!'}</span></button>
  </div></div>`);
  $('sheet').querySelectorAll('[data-subj]').forEach(b => b.onclick = () => { sfx('click'); G.s.subj = b.dataset.subj; GM.save('subj'); openQuizMenu(); });
  $('mNormal').onclick = () => { sfx('click'); runNormal(); };
  $('mTA').onclick = () => { sfx('click'); runTimeAttack(); };
  $('mBoss').onclick = () => { sfx('click'); openBossSelect(); };
}

// ---------- 일반 퀴즈 ----------
export function runNormal() {
  quizBusy = true; let session = 0, solved = 0, cooldown = null, auto = null, alive = true;
  const render = () => {
    if (!alive) return;
    const s = G.s; const q = Q.nextQuestion(s, { types: ['mc', 'ox'] }); Q.remember(s, q);
    const fev = GM.fever();
    const shieldReady = G.mods.shield && s.shield >= G.mods.shield;
    openModal(`${head('일반 탐구 퀴즈', 'book')}
      <div class="qz-top">${qChip(q)}
        <span class="combo">${icon('flame')}<span id="qCombo">${s.combo}</span>연속</span><span id="qFever" style="color:#e08a1a">${fev ? '피버 중! 엽전 2배' : ''}</span>${shieldReady ? '<span style="color:#2a6ab0">콤보 보호 준비</span>' : ''}
        <span class="earn" id="qEarn">이번에 +${F(session)} KP · ${solved}문제</span></div>
      <div class="qz-body">${qHtml(q)}${choicesHtml(q)}<div id="fb"></div>
        <div class="qz-foot"><button class="btn gray" id="qStop">그만 풀기</button><button class="btn hidden" id="qNext">다음 문제 ▶</button></div></div>`, 'quizsheet', () => { quizBusy = false; alive = false; clearInterval(cooldown); clearTimeout(auto); });
    $('qStop').onclick = () => { sfx('click'); closeModal(); };
    bindAnswer(q, (ans, btn) => {
      const right = Q.checkAnswer(q, ans); solved++;
      markChoices(q, btn, right);
      const r = GM.answerNormal(q, right);
      const next = $('qNext');
      if (right) session += r.kp;
      $('qCombo').textContent = r.combo; $('qEarn').textContent = `이번에 +${F(session)} KP · ${solved}문제`;
      if (GM.fever()) $('qFever').textContent = '피버 중! 엽전 2배';
      if (right) {
        sfx('correct');
        const rect = (btn || $('sheet')).getBoundingClientRect(); floater(`+${F(r.kp)} KP`, rect.left + rect.width / 2 - 30, rect.top, 'kp');
        $('fb').innerHTML = `<div class="qz-fb ok"><b>정답!${r.combo >= 3 ? ` ${r.combo}연속 ×${E.comboMult(r.combo, G.mods)}` : ''}</b><span class="grow">${esc(q.exp)}</span></div>`;
        if (r.feverStart) { sfx('fever'); toast('피버! 30초 동안 엽전 2배!', 'good', 'flame'); }
        next.classList.remove('hidden'); next.focus();
        auto = setTimeout(() => next.click(), 2400);
        next.onclick = () => { clearTimeout(auto); sfx('click'); render(); };
      } else {
        sfx('wrong');
        $('fb').innerHTML = `<div class="qz-fb no"><b>아쉬워요!</b><span class="grow">정답: <b>${esc(Q.answerText(q))}</b> — ${esc(q.exp)}${r.shieldUsed ? ' <br><span style="color:#2a6ab0">서희의 외교로 콤보를 지켰어요!</span>' : ''}</span></div>`;
        let left = BAL.wrongCooldown; next.classList.remove('hidden'); next.disabled = true; next.textContent = `잠깐! ${left}초 뒤에 다음 문제`;
        cooldown = setInterval(() => { left--; if (left <= 0) { clearInterval(cooldown); next.disabled = false; next.textContent = '다음 문제 ▶'; } else next.textContent = `잠깐! ${left}초 뒤에 다음 문제`; }, 1000);
        next.onclick = () => { if (next.disabled) return; sfx('click'); render(); };
      }
      updateHud(true); bump('kp');
    });
  };
  render();
}

// ---------- 60초 타임어택 ----------
export function runTimeAttack() {
  if (!GM.taReady()) { toast('아직 타임어택을 할 수 없어요.', 'bad'); return; }
  quizBusy = true; let n = 0, solved = 0, end = Date.now() + BAL.taSec * 1000, timer = null, done = false;
  const s = G.s;
  const finish = () => {
    if (done) return; done = true; clearInterval(timer);
    const r = GM.taFinish(n, solved); sfx('fanfare');
    openModal(`${head('타임어택 결과', 'clock')}<div class="sh-body" style="text-align:center">
      <div style="font-family:Jua;font-size:4em;color:#c8352b">${n}<span style="font-size:.4em;color:#7a4a24">문제 정답 / ${solved}문제</span></div>
      <p style="font-family:Jua;font-size:1.5em">${costHtml(r.kp, 0)} &nbsp; ${costHtml(0, r.gold)}</p>
      <p class="muted">다음 타임어택은 ${G.mods.taCooldown}분 뒤에 할 수 있어요.</p><button class="btn gold" data-close>받기!</button></div>`, 'narrow', () => { quizBusy = false; });
    updateHud(true);
  };
  const render = () => {
    if (Date.now() >= end) return finish();
    const q = Q.nextQuestion(s, { types: ['ox', 'sa'], useWrongQueue: false, allowGen: false }); Q.remember(s, q);
    openModal(`${head('60초 타임어택', 'clock')}<div class="qz-top"><span class="combo">${icon('bolt')}${n}개 정답</span><span class="earn" id="taLeft"></span></div>
      <div class="qz-body"><div class="timebar"><i id="taBar" style="width:100%"></i></div>${qHtml(q)}${choicesHtml(q)}<div id="fb"></div></div>`, 'quizsheet', () => { if (!done) finish(); });
    tickUI();
    bindAnswer(q, (ans, btn) => {
      const right = Q.checkAnswer(q, ans); solved++; markChoices(q, btn, right);
      GM.countSubj(q, right);
      if (right) { n++; sfx('correct'); } else { sfx('wrong'); end -= 2000; $('fb').innerHTML = `<div class="qz-fb no"><b>-2초</b><span class="grow">정답: ${esc(Q.answerText(q))}</span></div>`; }
      setTimeout(() => { if (!done) render(); }, right ? 350 : 1100);
    });
  };
  const tickUI = () => { const left = Math.max(0, end - Date.now()); const bar = $('taBar'); if (bar) bar.style.width = left / (BAL.taSec * 1000) * 100 + '%'; const l = $('taLeft'); if (l) l.textContent = Math.ceil(left / 1000) + '초'; if (left <= 0) finish(); };
  timer = setInterval(tickUI, 200);
  render();
}

// ---------- 보스전 ----------
function openBossSelect() {
  const s = G.s;
  openModal(`${head('역사 보스전 — 어떤 침략을 막을까요?', 'boss')}<div class="sh-body"><div class="grid">${BOSSES.map(b => `<div class="card">
    <span class="tag">격퇴 ${s.bossWins[b.id] || 0}회</span><div class="top"><img class="relic" src="${S.bossURL(b.id)}" style="${S.hasBossImage(b.id) ? '' : `filter:hue-rotate(${b.color.length * 20}deg)`}" alt=""><div><h5>${b.name}</h5><div class="sub">${b.questionEras.map(e => ERAS[e].name).join('·')} 문제 · 영웅: ${b.hero}</div></div></div>
    <div class="desc">${b.story}</div><button class="btn red" data-boss="${b.id}">${icon('sword')} 출전!</button></div>`).join('')}</div></div>`);
  $('sheet').querySelectorAll('[data-boss]').forEach(btn => btn.onclick = () => { sfx('alarm'); runBoss(BOSSES.find(b => b.id === btn.dataset.boss)); });
}
function runBoss(boss) {
  if (!GM.bossReady()) { toast('아직 보스전을 할 수 없어요.', 'bad'); return; }
  runBattle({
    title: boss.name, boss: { ...boss, hp: BAL.bossQ }, eras: boss.questionEras,
    onWin: () => {
      const r = GM.bossFinish(boss.id, true);
      return `<p style="font-family:Jua;font-size:1.4em">${costHtml(r.kp, 0)} · 명성 +${r.fame}</p>
        <div class="reveal ${r.relic.rarity}"><img src="${S.relicURL(r.relic, 96)}" alt=""><div style="font-family:Jua;font-size:1.4em">${r.relic.name} ${r.isNew ? '<b style="color:#c8352b">NEW!</b>' : ''}</div><span class="rar" style="background:${RARITY[r.relic.rarity].color}">${RARITY[r.relic.rarity].name}</span></div>`;
    },
    onLose: () => { GM.bossFinish(boss.id, false); return '<p class="muted">5분 뒤 다시 도전할 수 있어요. 틀린 문제는 일반 퀴즈에서 다시 나와요!</p>'; },
  });
}

// =============================================================
//  보스 전투 — 정답이면 우리 병사가 공격, 틀리면 보스가 공격해 내 하트가 줄어요
//  opt: { title, boss:{id,name,foe,hp,story}, eras, intro, onWin()→html, onLose()→html, retry }
// =============================================================
function soldierURL(era, side, f) { return S.soldierSprite(era, side, f).img.toDataURL(); }
export function runBattle(opt) {
  const s = G.s, boss = opt.boss, maxHp = boss.hp, maxHeart = BAL.battleHearts;
  let hp = maxHp, hearts = maxHeart, streak = 0, over = false, timer = null, lastQ = null, n = 0;
  quizBusy = true;
  const sol = [0, 1].map(f => soldierURL(s.era, 'me', f));
  const heartsHtml = () => Array.from({ length: maxHeart }, (_, i) => `<img src="${S.iconURL(i < hearts ? 'heart' : 'heartx')}" class="${i < hearts ? '' : 'lost'}" alt="">`).join('');
  const stage = `<div class="battle" id="bt">
      <div class="bt-side me"><div class="army">${[0, 1, 2].map(i => `<img src="${sol[i % 2]}" style="animation-delay:${i * 0.18}s" alt="">`).join('')}</div>
        <div class="hearts" id="btHearts">${heartsHtml()}</div><b>${esc(s.name || '우리')} 마을</b></div>
      <div class="bt-vs">VS</div>
      <div class="bt-side foe"><img class="boss" id="btBoss" src="${S.bossURL(boss.id)}" alt="">
        <div class="hpbar"><i id="btHp" style="width:100%"></i><em id="btHpTxt">${hp} / ${maxHp}</em></div><b>${esc(boss.foe)}</b></div>
      <div class="bt-fx" id="btFx"></div>
    </div>`;
  const shell = `${head(esc(opt.title), 'war')}<div class="qz-top"><span class="combo">${icon('flame')}<span id="btStreak">0</span>연속 · ${BAL.battleCrit}연속부터 필살 공격!</span><span class="earn" id="btInfo">정답 = 공격 · 오답 = 내 하트 -1</span></div>
    <div class="qz-body">${stage}<div id="btQ"></div></div>`;
  const cleanup = () => { quizBusy = false; clearTimeout(timer); };
  openModal(shell, 'quizsheet battle-sheet', () => { if (!over) { over = true; cleanup(); opt.onLose?.(); } });
  const fx = (cls, text) => { const el = document.createElement('div'); el.className = 'bfx ' + cls; el.textContent = text || ''; $('btFx')?.appendChild(el); setTimeout(() => el.remove(), 1100); };
  const updBars = () => {
    $('btHp').style.width = Math.max(0, hp / maxHp * 100) + '%'; $('btHpTxt').textContent = `${Math.max(0, hp)} / ${maxHp}`;
    $('btHearts').innerHTML = heartsHtml(); $('btStreak').textContent = streak;
  };
  const finish = win => {
    over = true; cleanup();
    const extra = win ? opt.onWin?.() || '' : opt.onLose?.() || '';
    if (win && opt.closeOnWin) { modalOnClose = null; closeModal(); return; }
    modalOnClose = null;
    if (win) {
      sfx('fanfare');
      openModal(`${head('승리!', 'trophy')}<div class="sh-body" style="text-align:center"><img src="${S.bossURL(boss.id)}" class="boss-down" alt=""><h4 style="justify-content:center;font-size:1.7em">${esc(boss.name)}을(를) 물리쳤어요!</h4>${extra}<button class="btn gold" data-close>좋아요!</button></div>`, 'narrow');
    } else {
      sfx('wrong');
      openModal(`${head('후퇴…', 'war')}<div class="sh-body" style="text-align:center"><img src="${S.bossURL(boss.id)}" style="width:7em;image-rendering:pixelated" alt=""><h4 style="justify-content:center">${esc(boss.foe)}에게 밀렸어요. 하트를 모두 잃었어요</h4>
        ${lastQ ? `<div class="qz-fb no" style="text-align:left"><b>마지막 문제</b><span class="grow">정답: ${esc(Q.answerText(lastQ))} — ${esc(lastQ.exp)}</span></div>` : ''}${extra}
        <div class="qz-foot" style="justify-content:center;gap:.6em"><button class="btn gray" data-close>마을로</button>${opt.retry ? `<button class="btn gold" id="btRetry">${icon('war')} 다시 도전</button>` : ''}</div></div>`, 'narrow');
      $('btRetry') && ($('btRetry').onclick = () => { sfx('click'); modalOnClose = null; opt.retry(); });
    }
    updateHud(true);
  };
  const ask = () => {
    if (over) return;
    const q = Q.nextQuestion(s, { eras: opt.eras, subj: opt.subj, types: ['mc', 'ox'], useWrongQueue: false }); Q.remember(s, q); lastQ = q; n++;
    $('btQ').innerHTML = `${opt.subj ? `<div style="text-align:center">${qChip(q)}</div>` : ''}${qHtml(q)}${choicesHtml(q)}<div id="fb"></div>`;
    bindAnswer(q, (ans, btn) => {
      if (over) return;
      const right = Q.checkAnswer(q, ans); markChoices(q, btn, right);
      s.stats.solved++; GM.countSubj(q, right);
      if (right) {
        s.stats.correct++; streak++;
        const dmg = streak >= BAL.battleCrit ? 2 : 1; hp -= dmg;
        sfx(dmg > 1 ? 'fever' : 'correct');
        $('bt').classList.remove('atk', 'hurt'); void $('bt').offsetWidth; $('bt').classList.add('atk');
        fx('spear', ''); setTimeout(() => fx('dmg' + (dmg > 1 ? ' crit' : ''), dmg > 1 ? `필살! -${dmg}` : `-${dmg}`), 380);
        updBars();
        $('fb').innerHTML = `<div class="qz-fb ok"><b>${dmg > 1 ? '필살 공격!' : '공격 성공!'}</b><span class="grow">${esc(q.exp)}</span></div>`;
        timer = setTimeout(() => { if (hp <= 0) { $('btBoss').classList.add('down'); setTimeout(() => finish(true), 700); } else ask(); }, 1500);
      } else {
        streak = 0; hearts--;
        s.stats.wrong[q.id] = (s.stats.wrong[q.id] || 0) + 1;
        if (!s.wrongQueue.some(w => w.id === q.id)) s.wrongQueue.push({ id: q.id, wait: BAL.requeueAfter });
        sfx('wrong');
        $('bt').classList.remove('atk', 'hurt'); void $('bt').offsetWidth; $('bt').classList.add('hurt');
        $('sheet').classList.remove('shake'); void $('sheet').offsetWidth; $('sheet').classList.add('shake');
        fx('hit', '-♥'); updBars();
        $('fb').innerHTML = `<div class="qz-fb no"><b>${hearts > 0 ? '보스의 반격!' : '쓰러졌어요…'}</b><span class="grow">정답: <b>${esc(Q.answerText(q))}</b> — ${esc(q.exp)}</span>${hearts > 0 ? '<button class="btn" id="btNext">계속 싸우기 ▶</button>' : ''}</div>`;
        if (hearts > 0) { const nx = $('btNext'); nx.focus(); nx.onclick = () => { sfx('click'); ask(); }; }
        else timer = setTimeout(() => finish(false), 1800);
      }
      GM.save('quiz');
    });
  };
  // 보스 소개
  $('btQ').innerHTML = `<div class="bt-intro"><p>${esc(boss.story || '')}</p><p class="muted">보스 체력 ${maxHp} · 내 하트 ${maxHeart}개 · ${BAL.battleCrit}연속 정답부터는 2칸씩 깎는 필살 공격!</p><button class="btn red" id="btGo" style="font-size:1.3em">${icon('war')} 출전!</button></div>`;
  $('btGo').onclick = () => { sfx('alarm'); ask(); };
}

// ---------- 시대 돌파 보스전 ----------
export function runChallenge() {
  const r = GM.challengeStart(); if (!r.ok) { sfx('wrong'); toast(r.msg, 'bad'); return; }
  const s = G.s, boss = GM.eraBoss();
  runBattle({
    title: `시대 돌파 — ${ERAS[s.era].name} 지키기!`, boss, eras: boss.mix ? undefined : [s.era], subj: boss.mix ? 'mix' : undefined, closeOnWin: true,
    onWin: () => { GM.challengeWin(); ctx.onEraWin?.(boss); return ''; },
    onLose: () => { GM.save('challenge'); return '<p class="muted">응시료는 다시 내지 않아요. 틀린 문제를 복습하고 바로 다시 도전해요!</p>'; },
    retry: () => runChallenge(),
  });
}

// ---------- 협동 위기 ----------
export function runCrisis() {
  const s = G.s; if (!s.crisis) return;
  if (s.crisis.retryAt > Date.now()) { toast(`${Math.ceil((s.crisis.retryAt - Date.now()) / 1000)}초 뒤에 다시 막을 수 있어요!`, 'bad'); return; }
  const info = GM.crisisInfo(); const rw = GM.crisisReward();
  quizBusy = true;
  const q = Q.nextQuestion(s, { eras: [s.era], types: ['mc', 'ox'], useWrongQueue: false }); Q.remember(s, q);
  openModal(`${head(`위기! ${info?.name || ''}`, 'warn')}<div class="qz-top"><span class="combo">${esc(info?.text || '')}</span><span class="earn">해결 보상 ${F(rw.kp)} KP + 엽전 ${F(rw.gold)}</span></div>
    <div class="qz-body">${qHtml(q)}${choicesHtml(q)}<div id="fb"></div><div class="qz-foot"><span class="muted">오늘 해결 ${s.daily.crisisHelps}/${BAL.crisisDaily}회</span><button class="btn hidden" id="qNext" data-close>마을로</button></div></div>`, 'quizsheet', () => { quizBusy = false; });
  bindAnswer(q, (ans, btn) => {
    const right = Q.checkAnswer(q, ans); markChoices(q, btn, right);
    const r = GM.crisisFinish(right);
    if (right) { sfx('fanfare'); $('fb').innerHTML = `<div class="qz-fb ok"><b>위기 해결!</b><span class="grow">+${F(r.kp)} KP, 엽전 +${F(r.gold)} · ${esc(q.exp)}</span></div>`; }
    else { sfx('wrong'); $('fb').innerHTML = `<div class="qz-fb no"><b>막지 못했어요</b><span class="grow">정답: ${esc(Q.answerText(q))} — 30초 뒤 다시 도전!</span></div>`; }
    $('qNext').classList.remove('hidden'); updateHud(true);
  });
}

// ---------- 시대 돌파 축하 ----------
export function celebrate({ from, to, completed }) {
  sfx('fanfare');
  const era = ERAS[to];
  const html = completed
    ? `<div class="celebrate"><div class="big-title">역사 완성!</div><div class="sub">고조선부터 대한민국까지, 반만년 역사를 모두 지켰어요!</div><ul><li>무한 명성 랭킹 시작 — 퀴즈를 풀 때마다 명성 +1</li><li>명성 보너스 +2000</li></ul><button class="btn gold" id="celOk" style="font-size:1.4em">계속하기</button></div>`
    : `<div class="celebrate"><div style="font-size:1.6em">${from}단계 돌파!</div><div class="big-title">${era.name} 개막!</div><div class="sub">새로운 시대가 열렸어요</div><ul>${era.unlocks.map(u => `<li>${u}</li>`).join('')}<li>문제당 기본 KP ${ERAS[from].kpPerQ} → ${era.kpPerQ}</li></ul><button class="btn gold" id="celOk" style="font-size:1.4em">새 시대로!</button></div>`;
  const ov = $('overlay'); ov.innerHTML = html; ov.classList.remove('hidden', 'visit', 'leaving'); ov.style.background = '';
  const cols = ['#ffd84a', '#e8443a', '#3d8fe0', '#3cbf5a', '#ffffff', '#b06ae0'];
  for (let i = 0; i < 70; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length]; c.style.animationDuration = 2 + Math.random() * 2.5 + 's'; c.style.animationDelay = Math.random() * 1.2 + 's'; ov.appendChild(c); }
  $('celOk').onclick = () => { sfx('click'); ghostOut(ov); ov.classList.add('hidden'); ov.innerHTML = ''; updateHud(true); };
}

// ---------- 시작 화면 ----------
export function startScreen(edit = false, onDone = null, opt = {}) {
  const s = G.s; let av = s?.avatar || 0;
  const ov = $('overlay'); ov.classList.remove('hidden', 'visit', 'leaving'); ov.style.background = '';
  ov.innerHTML = `<form class="start" id="startForm">
    <h1 class="logo">히스토리 빌더<small>초등 한국사 시대 발전 타이쿤</small></h1>
    <div class="avatars">${AVATARS.map((a, i) => `<button type="button" data-av="${i}" class="${i === av ? 'on' : ''}"><img src="${avatarURL(i)}" alt="얼굴 ${i + 1}"></button>`).join('')}</div>
    <div class="two"><label>출석번호<input id="stNo" type="number" min="1" max="99" required value="${s?.studentNo || ''}" inputmode="numeric"></label>
    <label>이름<input id="stName" maxlength="8" required value="${esc(s?.name || '')}" placeholder="예: 김민준"></label></div>
    <label>학급 코드${sync.configured ? '' : ' (선택)'}<input id="stClass" maxlength="16" value="${esc(s?.classCode || '')}" placeholder="선생님이 알려 준 코드" ${sync.configured ? 'required' : ''} ${edit && sync.configured ? 'readonly' : ''}></label>
    <p class="muted" id="stMsg" style="margin:.2em 0 0;min-height:1.2em"></p>
    <button class="btn gold" type="submit" style="font-size:1.5em;width:100%;margin-top:.4em">${edit ? '저장하기' : '역사 마을 시작하기!'}</button>
    ${edit ? '' : `<p class="muted" style="margin:.8em 0 0">${sync.configured ? '다른 크롬북에서 하던 마을도 같은 학급 코드·번호·이름으로 들어오면 이어서 할 수 있어요.' : '다른 기기에서 하던 마을이 있으면 시작 후 ‘설정 → 백업 코드’로 불러올 수 있어요.'}</p>`}
    ${opt.onCancel ? '<button type="button" class="st-back" id="stBack">처음 화면으로</button>' : ''}
  </form>`;
  if (opt.onCancel) $('stBack').onclick = () => { sfx('click'); ghostOut(ov); ov.classList.add('hidden'); ov.innerHTML = ''; opt.onCancel(); };
  ov.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { av = Number(b.dataset.av); ov.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); });
  $('startForm').onsubmit = e => {
    e.preventDefault();
    const profile = { studentNo: Number($('stNo').value) || 0, name: $('stName').value.trim().slice(0, 8), classCode: $('stClass').value.trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, '').slice(0, 16), avatar: av };
    if (!profile.name || (sync.configured && !profile.classCode)) return;
    const finish = () => { ghostOut(ov); ov.classList.add('hidden'); ov.innerHTML = ''; };
    if (edit && G.s) { finish(); Object.assign(G.s, { name: profile.name, avatar: av, studentNo: sync.enabled ? G.s.studentNo : profile.studentNo, classCode: sync.enabled ? G.s.classCode : profile.classCode }); GM.save('profile'); $('avatar').src = avatarURL(av); updateHud(true); opt.onSaved?.(); return; }
    const btn = $('startForm').querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = '마을 찾는 중…';
    Promise.resolve(onDone?.(profile, msg => { $('stMsg').textContent = msg; $('stMsg').style.color = '#c8352b'; btn.disabled = false; btn.textContent = '역사 마을 시작하기!'; })).then(ok => { if (ok !== false) finish(); });
  };
}

// 다른 화면 모듈(전쟁·채팅)에서 쓰는 도구 모음
export const kit = {
  head, icon, esc, F, costHtml, qHtml, choicesHtml, bindAnswer, markChoices, confirmBox,
  setBusy: v => { quizBusy = v; }, clearOnClose: () => { modalOnClose = null; },
};
