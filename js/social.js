// =============================================================
//  친구 전쟁(PvP) · 학급 채팅
//   전쟁 흐름: 공격 쪽 준비(주민·위인·퀴즈) → 선전포고 → 수비 쪽 ‘전쟁할까요?’
//            → 거절 또는 수락 → 수비 쪽 준비 → 결과(양쪽이 각자 자기 마을에 반영)
// =============================================================
import { badWord } from './badwords.js?v=202611271314';
import * as E from './economy.js?v=202611271314';
import * as GM from './game.js?v=202611271314';
import { G } from './game.js?v=202611271314';
import * as S from './sprites.js?v=202611271314';
import * as Q from './quiz.js?v=202611271314';
import { ctx, kit, toast, openModal, closeModal, modalOpen, updateHud, avatarURL, isQuizBusy } from './ui.js?v=202611271314';
import { sfx } from './audio.js?v=202611271314';
import { ERAS, BAL } from './data-config.js?v=202611271314';
import { H } from './data-heroes.js?v=202611271314';
import { sync } from './sync.js?v=202611271314';

const $ = id => document.getElementById(id);
const { head, icon, esc, F } = kit;
const W = BAL.war;
const GRADE = { close: '아슬아슬한', clear: '확실한', crush: '압도적인' };
const now = () => Date.now();

// =============================================================
//  전쟁
// =============================================================
const wars = new Map();      // id → 전쟁 문서
const prompted = new Set();  // 이미 물어본 선전포고
let prepId = null;           // 지금 준비 중인 수비 전쟁
let queue = [];              // 화면이 바쁠 때 기다리는 알림

export function onWars(list) {
  for (const w of list) wars.set(w.id, w);
  process();
}
const isMine = w => w.toId === sync.docId || w.fromId === sync.docId;
const expired = w => w.status === 'pending' && now() - (w.t || 0) > W.pendingMin * 60000;
export const myPending = () => [...wars.values()].find(w => w.fromId === sync.docId && w.status === 'pending' && !expired(w));

function process() {
  const s = G.s; if (!s || !sync.docId) return;
  const done = new Set(s.warsDone || []);
  for (const w of wars.values()) {
    if (!isMine(w)) continue;
    if (w.toId === sync.docId) {
      if (w.status === 'pending' && !expired(w) && !prompted.has(w.id)) { prompted.add(w.id); queue.push(() => incoming(w)); }
      // 수락해 놓고 창을 닫았거나 크롬북을 껐으면 기본 전투력으로 마무리
      if (w.status === 'accepted' && !w.result && prepId !== w.id && now() - (w.answeredAt || 0) > 60000) resolveDefend(w, { ratio: 0.6, heroes: [], skill: 0 }, true);
      if (w.status === 'done' && w.result && !done.has(w.id)) queue.push(() => showResult(w, 'd'));
    } else {
      if (w.status === 'declined' && !done.has(w.id)) { markDone(w.id); toast(`${w.to?.name || '친구'}이(가) 전쟁을 거절했어요. 평화롭게 지내요!`, '', 'shield'); }
      if (expired(w) && !done.has(w.id)) { markDone(w.id); sync.updateWar(w.id, { status: 'expired' }).catch(() => {}); toast(`${w.to?.name || '친구'}의 대답이 없어 선전포고가 취소됐어요.`, '', 'clock'); }
      if (w.status === 'done' && w.result && !done.has(w.id)) queue.push(() => showResult(w, 'a'));
    }
  }
  pump();
}
function markDone(id) { const s = G.s; s.warsDone ||= []; if (!s.warsDone.includes(id)) s.warsDone.push(id); GM.save('war'); }
// 퀴즈·다른 창이 열려 있으면 끝날 때까지 기다렸다가 보여 줘요
function busy() { return isQuizBusy() || modalOpen() || !$('warAlert').classList.contains('hidden') || !$('overlay').classList.contains('hidden'); }
function pump() {
  if (!queue.length) return;
  if (busy()) { clearTimeout(pump.t); pump.t = setTimeout(pump, 1500); return; }
  queue.shift()();
}

// ---------- 선전포고 받기 ----------
function incoming(w) {
  if (wars.get(w.id)?.status !== 'pending' || expired(w)) { pump(); return; }
  sfx('alarm');
  const el = $('warAlert'); el.classList.remove('hidden');
  const f = w.from || {};
  const left = () => Math.max(0, Math.ceil((W.pendingMin * 60000 - (now() - w.t)) / 1000));
  el.innerHTML = `<div class="war-card">
    <div class="war-flag">${icon('war')}<b>선전포고!</b>${icon('war')}</div>
    <div class="war-who"><img src="${avatarURL(f.avatar || 0)}" alt=""><div><b>${esc(f.name)}</b> <span>${f.no}번 · ${f.era}단계 ${ERAS[f.era]?.name || ''}</span></div></div>
    <p class="war-msg"><b>${esc(f.name)}</b>이(가) 우리 마을에 전쟁을 선포했습니다!<br>전쟁하시겠습니까?</p>
    <div class="war-stat"><span>상대 군사 ${F(f.troops)}명</span><span>전투력 ${F(f.power)}</span><span>퀴즈 실력 +${Math.round((f.skill || 0) * 100)}%</span>${f.heroes?.length ? `<span>참전 위인: ${f.heroes.map(esc).join('·')}</span>` : ''}</div>
    <p class="muted">수락하면 우리도 주민을 모으고 위인을 보내 실력 퀴즈를 풀어요. 퀴즈를 빨리, 많이 맞히면 작은 차이는 뒤집을 수 있어요! 진 쪽은 건물이 부서지고 전쟁 배상금(엽전)을 내요. 거절해도 아무 일 없어요.</p>
    <div class="war-btns"><button class="btn gray" id="waNo">${icon('shield')} 거절하기</button><button class="btn red" id="waYes">${icon('war')} 전쟁한다!</button></div>
    <div class="muted" id="waLeft"></div></div>`;
  const tick = setInterval(() => { const l = left(); const t = $('waLeft'); if (t) t.textContent = `${Math.floor(l / 60)}분 ${l % 60}초 안에 대답해요`; if (l <= 0) { clearInterval(tick); close(); toast('선전포고 시간이 지났어요.'); } }, 500);
  const close = () => { clearInterval(tick); el.classList.add('hidden'); el.innerHTML = ''; setTimeout(pump, 300); };
  $('waNo').onclick = async () => {
    sfx('click'); close();
    try { await sync.answerWar(w.id, { status: 'declined' }); } catch (e) { console.warn(e); }
    markDone(w.id); toast('전쟁을 거절했어요. 평화가 최고!', 'good', 'shield');
  };
  $('waYes').onclick = async () => {
    sfx('alarm'); $('waYes').disabled = true;
    let r = null; try { r = await sync.answerWar(w.id, { status: 'accepted' }); } catch (e) { console.warn(e); }
    close();
    if (!r) { toast('이미 끝난 선전포고예요.', 'bad'); return; }
    openPrep({ mode: 'defend', war: { ...w, ...r, id: w.id } });
  };
}

// ---------- 선전포고 하기 ----------
ctx.openDeclare = d => {
  if (!sync.enabled) { toast('학급 서버에 연결되어야 전쟁을 할 수 있어요.', 'bad'); return; }
  const chk = GM.canDeclare(d.summary); if (!chk.ok) { sfx('wrong'); toast(chk.msg, 'bad', 'war'); return; }
  if (myPending()) { sfx('wrong'); toast('이미 대답을 기다리는 선전포고가 있어요.', 'bad', 'clock'); return; }
  openPrep({ mode: 'attack', target: d });
};

// 전쟁 준비: 주민 모으기 → 위인 참전 → 전투 준비 퀴즈
function openPrep({ mode, target, war }) {
  const s = G.s, attack = mode === 'attack';
  const foe = attack ? { name: target.summary.name, no: target.summary.studentNo, era: target.summary.era, avatar: target.summary.avatar } : war.from;
  let ratio = 0.6, heroes = [], correct = 0, skill = 0, step = 'setup', finished = false, qTimer = null;
  if (!attack) prepId = war.id;
  kit.setBusy(true);
  const pop = E.population(s);
  const owned = Object.keys(s.heroes);
  const calc = () => E.warPower(s, { ratio, heroes, skill, defend: !attack });
  const onClose = () => {
    kit.setBusy(false); clearInterval(qTimer);
    if (!attack && !finished) { finished = true; resolveDefend(war, { ratio, heroes, skill, correct }); }
    prepId = null; setTimeout(pump, 400);
  };
  const setup = () => {
    const p = calc();
    openModal(`${head(attack ? `${esc(foe.name)}에게 선전포고` : `${esc(foe.name)}의 공격을 막아라!`, 'war')}<div class="sh-body">
      <div class="war-vs"><div><img src="${avatarURL(s.avatar || 0)}" alt=""><b>${esc(s.name)}</b><span>${s.era}단계</span></div><i>VS</i><div><img src="${avatarURL(foe.avatar || 0)}" alt=""><b>${esc(foe.name)}</b><span>${foe.era}단계</span></div></div>
      <h4>${icon('people')} 주민 모으기 <span class="muted">우리 마을 주민 ${F(pop)}명</span></h4>
      <div class="ratio">${[[0.3, '조금', '30%'], [0.6, '절반', '60%'], [1, '모두', '100%']].map(([r, n, t]) => `<button class="${r === ratio ? 'on' : ''}" data-r="${r}"><b>${n}</b><span>${t} · ${F(Math.max(1, Math.round(pop * r)))}명</span></button>`).join('')}</div>
      <p class="muted">많이 보낼수록 강해지지만, 전쟁 뒤 ${W.tiredMin}분 동안 엽전 수익이 줄어요 (모두 보내면 -50%).</p>
      <h4>${icon('star')} 위인 참전 <span class="muted">최대 ${W.maxHeroes}명 · 장군은 보너스 더!</span></h4>
      ${owned.length ? `<div class="hero-pick">${owned.map(id => { const h = H[id], lv = s.heroes[id].lv; const bonus = Math.round((W.heroBase + W.heroPerLv * (lv - 1) + (E.isMilitaryHero(id) ? W.heroMilitary : 0)) * 100);
        return `<button class="${heroes.includes(id) ? 'on' : ''}" data-h="${id}"><img src="${S.portraitURL(h, 64)}" alt=""><b>${h.name}</b><span>+${bonus}%${E.isMilitaryHero(id) ? ' 장군' : ''}</span></button>`; }).join('')}</div>`
        : '<p class="muted">아직 영입한 위인이 없어요. 위인이 있으면 전투력이 올라가요!</p>'}
      <div class="skill-note">${icon('bolt')}<div><b>실력 대결!</b> 퀴즈 ${W.quizN}문제 — 맞히면 +${Math.round(W.quizBonus * 100)}%, <b>빨리</b> 맞히면 최대 +${Math.round((W.quizBonus + W.speedBonus) * 100)}% (최대 +${Math.round(W.quizN * (W.quizBonus + W.speedBonus) * 100)}%).<br>운은 ±${Math.round(W.luck * 100)}%뿐이라, 전투력이 조금 모자라도 실력으로 뒤집을 수 있어요!</div></div>
      <div class="war-foot"><div class="war-power"><span>출전 ${F(p.troops)}명 × ${s.era}단계 무기${!attack ? ' · 성벽 +10%' : ''}</span><b>기본 전투력 ${F(p.base)}</b></div><button class="btn red" id="wpGo" style="font-size:1.25em">${icon('book')} 실력 퀴즈 시작 ▶</button></div></div>`, '', onClose);
    $('sheet').querySelectorAll('[data-r]').forEach(b => b.onclick = () => { sfx('click'); ratio = Number(b.dataset.r); setup(); });
    $('sheet').querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
      const id = b.dataset.h; sfx('click');
      if (heroes.includes(id)) heroes = heroes.filter(x => x !== id);
      else if (heroes.length >= W.maxHeroes) { toast(`위인은 ${W.maxHeroes}명까지 보낼 수 있어요.`, 'bad'); return; }
      else heroes.push(id);
      setup();
    });
    $('wpGo').onclick = () => { sfx('alarm'); step = 'quiz'; quiz(0); };
  };
  const quiz = i => {
    if (i >= W.quizN) { done(); return; }
    const q = Q.nextQuestion(s, { types: ['mc', 'ox'], useWrongQueue: false }); Q.remember(s, q);
    const dots = Array.from({ length: W.quizN }, (_, k) => `<i class="${k < i ? 'on' : ''}">${k < i ? '✓' : k + 1}</i>`).join('');
    openModal(`${head('실력 퀴즈 — 빨리, 정확하게!', 'war')}<div class="qz-top"><span class="combo">${icon('flame')}정답 ${correct}개 · 실력 +${Math.round(skill * 100)}%</span><span class="earn">${i + 1} / ${W.quizN}</span></div>
      <div class="qz-body"><div class="streak">${dots}</div><div class="timebar"><i id="wqBar" style="width:100%"></i></div>${kit.qHtml(q)}${kit.choicesHtml(q)}<div id="fb"></div></div>`, 'quizsheet', onClose);
    const t0 = performance.now(); let answered = false;
    const after = (right, sec, ans, btn) => {
      clearInterval(qTimer); answered = true;
      s.stats.solved++;
      if (right) {
        const add = E.skillFor(sec); skill += add; s.stats.correct++; correct++; sfx('correct');
        $('fb').innerHTML = `<div class="qz-fb ok"><b>정답! 실력 +${Math.round(add * 100)}%</b><span class="grow">${sec.toFixed(1)}초 · ${esc(q.exp)}</span></div>`;
        setTimeout(() => quiz(i + 1), 1300);
      } else {
        sfx('wrong'); s.stats.wrong[q.id] = (s.stats.wrong[q.id] || 0) + 1;
        $('fb').innerHTML = `<div class="qz-fb no"><b>${ans === null ? '시간 초과!' : '아쉬워요'}</b><span class="grow">정답: <b>${esc(Q.answerText(q))}</b> — ${esc(q.exp)}</span><button class="btn" id="wqNext">다음 ▶</button></div>`;
        $('wqNext').onclick = () => { sfx('click'); quiz(i + 1); };
      }
    };
    qTimer = setInterval(() => {
      const sec = (performance.now() - t0) / 1000, bar = $('wqBar');
      if (bar) bar.style.width = Math.max(0, 100 - sec / W.qSec * 100) + '%';
      if (sec >= W.qSec && !answered) { $('sheet').querySelectorAll('.qz-ch button').forEach(x => x.disabled = true); kit.markChoices(q, null, false); after(false, sec, null, null); }
    }, 100);
    kit.bindAnswer(q, (ans, btn) => {
      if (answered) return;
      const right = Q.checkAnswer(q, ans); kit.markChoices(q, btn, right);
      after(right, (performance.now() - t0) / 1000, ans, btn);
    });
  };
  const done = async () => {
    const p = calc(); finished = true; kit.clearOnClose(); kit.setBusy(false); prepId = null;
    const heroNames = heroes.map(id => H[id].name);
    if (attack) {
      try {
        await sync.declareWar({ toId: target.id, to: { name: foe.name, no: foe.no }, from: { name: s.name, no: s.studentNo, era: s.era, avatar: s.avatar || 0, troops: p.troops, base: p.base, skill: Math.round(skill * 1000) / 1000, power: p.power, ratio, heroes: heroNames, correct, gold: Math.floor(s.gold) } });
        GM.declared();
      } catch (e) { console.warn(e); closeModal(); toast('선전포고를 보내지 못했어요. 인터넷을 확인해요.', 'bad'); return; }
      sfx('fanfare');
      openModal(`${head('선전포고 완료!', 'war')}<div class="sh-body" style="text-align:center">
        <div class="war-flag big">${icon('war')}<b>${esc(foe.name)}에게 선전포고!</b>${icon('war')}</div>
        <p style="font-family:Jua;font-size:1.3em">우리 군사 ${F(p.troops)}명 · 기본 ${F(p.base)} × 실력 +${Math.round(skill * 100)}% = 전투력 ${F(p.power)}${heroNames.length ? `<br>참전 위인: ${heroNames.join('·')}` : ''}</p>
        <p class="muted">${esc(foe.name)}이(가) ${W.pendingMin}분 안에 수락하면 전쟁이 시작되고, 결과가 바로 알림으로 와요. 거절할 수도 있어요.<br>기다리는 동안 마을을 계속 키워도 돼요!</p>
        <button class="btn gold" data-close>마을로</button></div>`, 'narrow');
    } else {
      closeModal();
      await resolveDefend(war, { ratio, heroes, skill, correct });
    }
  };
  setup();
}

// 수비 쪽이 결과를 계산해서 전쟁 문서에 적어요 (트랜잭션 대신: 수락한 사람만 계산)
async function resolveDefend(war, { ratio, heroes, skill = 0, correct = 0 }, silent = false) {
  const s = G.s; if (!s || war.result || resolveDefend.busy === war.id) return;
  resolveDefend.busy = war.id;
  const p = E.warPower(s, { ratio, heroes, skill, defend: true });
  const f = war.from;
  const result = E.resolveWar(f.power, p.power, Math.random, { a: f.gold || 0, d: Math.floor(s.gold) }, { a: f.base || f.power, d: p.base });
  const to = { ...(war.to || {}), name: s.name, no: s.studentNo, era: s.era, avatar: s.avatar || 0, troops: p.troops, base: p.base, skill: Math.round(skill * 1000) / 1000, power: p.power, ratio, heroes: heroes.map(id => H[id].name), correct };
  try { await sync.updateWar(war.id, { status: 'done', to, result, doneAt: now() }); }
  catch (e) { console.warn(e); resolveDefend.busy = null; toast('전쟁 결과를 저장하지 못했어요.', 'bad'); return; }
  const w = { ...war, to, result, status: 'done' }; wars.set(war.id, w);
  const winner = result.winner === 'a' ? war.from.name : s.name;
  sendSys(`⚔ ${war.from.name} vs ${s.name} 전쟁 — ${winner}의 ${result.upset ? '실력 역전' : GRADE[result.grade]} 승리!${result.pay ? ` 배상금 엽전 ${F(result.pay)}` : ''}`);
  if (silent) { GM.applyWar(w, 'd'); toast(`${war.from.name}과(와)의 전쟁이 끝났어요. ${result.winner === 'd' ? '승리!' : '패배…'}`, result.winner === 'd' ? 'good' : 'bad', 'war'); updateHud(true); return; }
  showResult(w, 'd');
}

// ---------- 전투 장면 + 결과 ----------
function showResult(w, side) {
  const s = G.s;
  const r = GM.applyWar(w, side);
  if (!r) { pump(); return; }
  updateHud(true); ctx.renderer && (ctx.renderer.people = []);
  const me = side === 'a' ? w.from : w.to, foe = side === 'a' ? w.to : w.from;
  kit.setBusy(true);
  openModal(`${head(`${esc(me.name)} vs ${esc(foe.name)}`, 'war')}<div class="sh-body">
    <div class="war-scene"><canvas id="warCv" width="760" height="320"></canvas><button class="war-skip" id="warSkip" onclick="document.getElementById('warCv').click()">건너뛰기 ▶</button>
      <div class="wl"><b>${esc(me.name)}</b><span>${F(me.troops)}명 · 실력 +${Math.round((me.skill || 0) * 100)}%</span><span>전투력 ${F(me.power)}</span></div><div class="wr"><b>${esc(foe.name)}</b><span>${F(foe.troops)}명 · 실력 +${Math.round((foe.skill || 0) * 100)}%</span><span>전투력 ${F(foe.power)}</span></div></div>
    <div id="warRes" class="war-res hidden"></div></div>`, '', () => { kit.setBusy(false); setTimeout(pump, 400); });
  battleAnim($('warCv'), { meEra: me.era || s.era, foeEra: foe.era || 1, meN: me.troops, foeN: foe.troops, win: r.win, grade: r.grade, upset: r.upset,
    meHeroes: me.heroes || [], foeHeroes: foe.heroes || [], meSkill: me.skill || 0, foeSkill: foe.skill || 0, meName: me.name, foeName: foe.name }, () => {
    $('warSkip')?.remove();
    const res = $('warRes'); if (!res) return;
    sfx(r.win ? 'fanfare' : 'wrong');
    res.innerHTML = `<div class="war-title ${r.win ? 'win' : 'lose'}">${r.win ? (r.upset ? '실력으로 역전승!' : `${GRADE[r.grade]} 승리!`) : (r.upset ? '실력에 밀려 역전패…' : `${GRADE[r.grade]} 패배…`)}</div>
      ${r.upset ? `<p class="muted" style="text-align:center;margin:.2em 0">${r.win ? '기본 전투력은 약했지만 퀴즈 실력으로 이겼어요!' : '기본 전투력은 강했지만 상대의 퀴즈 실력이 더 좋았어요. 다음엔 더 빨리, 정확하게!'}</p>` : ''}
      <div class="list">
        ${r.pay ? `<div><span>${icon('coin')} 전쟁 배상금</span><b style="color:${r.win ? '#2a8a3a' : '#c8352b'}">${r.win ? `엽전 +${F(r.pay)} (상대가 냄)` : `엽전 -${F(r.pay)} (상대에게 냄)`}</b></div>` : ''}
        ${r.broken.length ? `<div><span>${icon('fire')} 부서진 건물 (수리 전까지 수익 0)</span><b>${r.broken.map(esc).join(', ')}</b></div>` : `<div><span>${icon('shield')} 부서진 건물 없음</span><b>마을을 지켰어요!</b></div>`}
        ${r.collapsed.length ? `<div><span>${icon('warn')} 무너져서 레벨이 1 내려간 건물</span><b>${r.collapsed.map(esc).join(', ')}</b></div>` : ''}
        <div><span>${icon('kp')} 보상</span><b>KP +${F(r.kp)}${r.fame ? ` · 명성 +${r.fame}` : ''}</b></div>
        <div><span>${icon('people')} 주민들이 지쳤어요</span><b>${W.tiredMin}분 동안 엽전 수익 -${Math.round(r.tiredCut * 100)}%</b></div>
      </div>
      <p class="muted">부서진 건물은 눌러서 ‘수리하기’로 고칠 수 있어요. ${W.protectMin}분 동안은 다른 친구가 우리 마을을 공격할 수 없어요.</p>
      <div style="text-align:center"><button class="btn gold" data-close>마을로</button></div>`;
    res.classList.remove('hidden');
    res.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { sfx('click'); closeModal(); });
  });
}

// =============================================================
//  전투 장면 (약 8초) — 1라운드 화살 공격 → 2라운드 돌격 → 3라운드 위인의 힘 → 승패
//  결과(war.result)는 이미 정해져 있고, 장면은 그 결과에 맞게 연출돼요.
// =============================================================
const heroByName = n => Object.values(H).find(h => h.name === n);
function battleAnim(cv, o, cb) {
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const Wd = cv.width, Hd = cv.height, ground = Hd - 54, mid = Wd / 2;
  const loser = o.win ? 'foe' : 'me', winner = o.win ? 'me' : 'foe';
  const killRate = { close: [0.5, 0.3], clear: [0.68, 0.22], crush: [0.85, 0.12] }[o.grade || 'clear'];
  const cnt = n => Math.max(6, Math.min(15, Math.round(Math.sqrt(n || 1) * 2)));
  const army = [];
  for (const side of ['me', 'foe']) {
    const n = cnt(side === 'me' ? o.meN : o.foeN), rate = side === loser ? killRate[0] : killRate[1];
    const dead = Math.round(n * rate);
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const rank = order.indexOf(i);   // 앞쪽 순서일수록 먼저 쓰러져요
      let dieAt = null;
      if (rank < dead) { const f = rank / dead; dieAt = f < 0.3 ? 0.9 + f / 0.3 * 1.3 : f < 0.8 ? 3.1 + (f - 0.3) / 0.5 * 1.5 : 5.2 + (f - 0.8) / 0.2 * 1.2; }
      army.push({ side, row: i % 3, col: Math.floor(i / 3), ph: Math.random() * 6, dieAt, fall: 0 });
    }
  }
  const heroImgs = side => (side === 'me' ? o.meHeroes : o.foeHeroes || []).map(heroByName).filter(Boolean).map(h => S.portraitCanvas(h, 64));
  const heroes = { me: heroImgs('me'), foe: heroImgs('foe') };
  const arrows = [], dust = [], sparks = [], confetti = [];
  const T = 8.6; let t0 = null, ended = false, skip = false, shake = 0, lastArrow = 0, lastSfx = '';
  const sound = (k, n) => { if (lastSfx !== k + n) { lastSfx = k + n; sfx(n); } };
  cv.onclick = () => { skip = true; };
  const pos = (u, t) => {
    const dir = u.side === 'me' ? 1 : -1, base = u.side === 'me' ? 160 : Wd - 160;
    let x = base + dir * (-u.col * 22 + u.row * 6);
    const charge = Math.max(0, Math.min(1, (t - 2.6) / 0.9));
    if (t > 2.6) x += dir * charge * (mid - 185);
    if (t > 3.5 && t < 5.0) x += Math.sin(t * 28 + u.ph) * 3;
    if (t > 6.6) { if (u.side === loser) x -= dir * (t - 6.6) * 170; else x += dir * Math.min(30, (t - 6.6) * 40); }
    return { x, y: ground - 30 + u.row * 18, dir };
  };
  // 배경: 하늘 · 먼 산 · 구름 · 들판 · 양쪽 성벽
  const sky = g.createLinearGradient(0, 0, 0, Hd); sky.addColorStop(0, '#7ec8ef'); sky.addColorStop(0.6, '#cdeef8'); sky.addColorStop(1, '#e8f6ee');
  function scene(t) {
    g.fillStyle = sky; g.fillRect(0, 0, Wd, Hd);
    if (t > 6.6 && !o.win) { g.fillStyle = `rgba(40,30,60,${Math.min(0.25, (t - 6.6) * 0.2)})`; g.fillRect(0, 0, Wd, Hd); }
    g.fillStyle = '#ffffffcc'; for (let k = 0; k < 4; k++) { const cx = ((k * 211 + t * 12) % (Wd + 160)) - 80, cy = 34 + (k % 2) * 18; g.beginPath(); g.ellipse(cx, cy, 34, 10, 0, 0, Math.PI * 2); g.ellipse(cx + 22, cy - 6, 20, 9, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#9cc7a8'; g.beginPath(); g.moveTo(0, ground - 70); for (let x = 0; x <= Wd; x += 40) g.lineTo(x, ground - 80 - Math.abs(Math.sin(x * 0.013)) * 50); g.lineTo(Wd, ground); g.lineTo(0, ground); g.fill();
    g.fillStyle = '#7fb98a'; g.beginPath(); g.moveTo(0, ground - 40); for (let x = 0; x <= Wd; x += 30) g.lineTo(x, ground - 46 - Math.abs(Math.sin(x * 0.021 + 1)) * 30); g.lineTo(Wd, ground); g.lineTo(0, ground); g.fill();
    g.fillStyle = '#7cc05a'; g.fillRect(0, ground - 34, Wd, Hd); g.fillStyle = '#6aae4a'; for (let k = 0; k < 40; k++) g.fillRect((k * 53) % Wd, ground - 26 + (k * 17) % 70, 6, 2);
    wall(18, '#2f8fe0', t, 'me'); wall(Wd - 18, '#e0402f', t, 'foe');
  }
  function wall(x, col, t, side) {
    const dir = side === 'me' ? 1 : -1, w = 46, top = ground - 96;
    g.fillStyle = '#a39e92'; g.fillRect(x - (dir > 0 ? 0 : w), top, w, 96);
    g.fillStyle = '#8a857a'; for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) g.fillRect(x - (dir > 0 ? 0 : w) + c * 12 + (r % 2) * 6, top + r * 12, 11, 1);
    for (let c = 0; c < 4; c++) { g.fillStyle = '#a39e92'; g.fillRect(x - (dir > 0 ? 0 : w) + c * 12, top - 8, 8, 8); }
    g.fillStyle = '#4a2c16'; g.fillRect(x - (dir > 0 ? 0 : w) + 14, ground - 34, 18, 34);
    // 깃발 (진 쪽은 마지막에 쓰러져요)
    const fallen = t > 6.8 && side === loser ? Math.min(1.4, (t - 6.8) * 1.6) : 0;
    g.save(); g.translate(x + dir * 23, top - 8); g.rotate(-dir * fallen);
    g.fillStyle = '#5a3a1e'; g.fillRect(-2, -54, 3, 54);
    const wave = Math.sin(t * 6) * 3; g.fillStyle = col; g.beginPath(); g.moveTo(1, -54); g.lineTo(dir * 34, -48 + wave); g.lineTo(1, -36); g.fill();
    g.restore();
  }
  function soldier(u, t) {
    const p = pos(u, t);
    if (u.dieAt != null && t >= u.dieAt) u.fall = Math.min(1, (t - u.dieAt) * 3);
    const f = u.fall ? 0 : Math.floor(t * (t > 2.6 && t < 3.5 ? 12 : 6) + u.ph) % 2;
    const spr = S.soldierSprite(u.side === 'me' ? o.meEra : o.foeEra, u.side, f);
    g.save(); g.translate(p.x, p.y); if (p.dir < 0) g.scale(-1, 1);
    if (u.fall) { g.globalAlpha = 1 - u.fall * 0.55; g.rotate(-u.fall * 1.45); g.translate(0, u.fall * 4); }
    g.drawImage(spr.img, -spr.ox * 2, -spr.oy * 2, spr.w * 2, spr.h * 2); g.restore();
    return p;
  }
  function caption(text, sub, t0c, col = '#fff') {
    const a = Math.min(1, (t - t0c) * 3); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = 'bold 34px Jua, "Malgun Gothic", sans-serif';
    const y = 92 - (1 - a) * 10; g.lineWidth = 7; g.strokeStyle = '#2b1b10'; g.strokeText(text, mid, y); g.fillStyle = col; g.fillText(text, mid, y);
    if (sub) { g.font = 'bold 17px Jua, "Malgun Gothic", sans-serif'; g.lineWidth = 5; g.strokeText(sub, mid, y + 26); g.fillStyle = '#fff6dc'; g.fillText(sub, mid, y + 26); }
    g.restore();
  }
  let t = 0;
  function morale(side) {
    const alive = army.filter(u => u.side === side && !(u.dieAt != null && t >= u.dieAt)).length, all = army.filter(u => u.side === side).length;
    return alive / all;
  }
  function bars() {
    const bw = Wd / 2 - 60;
    for (const side of ['me', 'foe']) {
      const v = morale(side), x = side === 'me' ? 20 : Wd - 20 - bw;
      g.fillStyle = '#2b1b10'; g.fillRect(x - 2, 10, bw + 4, 16);
      g.fillStyle = side === 'me' ? '#2f8fe0' : '#e0402f';
      if (side === 'me') g.fillRect(x, 12, bw * v, 12); else g.fillRect(x + bw * (1 - v), 12, bw * v, 12);
      g.fillStyle = '#fff'; g.font = 'bold 12px Jua, sans-serif'; g.textAlign = side === 'me' ? 'left' : 'right';
      g.fillText(`사기 ${Math.round(v * 100)}%`, side === 'me' ? x + 4 : x + bw - 4, 22);
    }
    g.fillStyle = '#ffe14a'; g.font = 'bold 18px Jua, sans-serif'; g.textAlign = 'center'; g.fillText('VS', mid, 24);
  }
  const frame = ts => {
    if (!cv.isConnected) return;
    if (t0 == null) t0 = ts;
    t = skip ? T : (ts - t0) / 1000;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0, shakeY = shake > 0 ? (Math.random() - 0.5) * shake : 0; shake = Math.max(0, shake - 0.5);
    g.setTransform(1, 0, 0, 1, shakeX, shakeY);
    scene(t);
    // 1라운드: 화살
    if (t > 0.6 && t < 2.6 && t - lastArrow > 0.09) {
      lastArrow = t;
      for (const side of ['me', 'foe']) {
        const shooters = army.filter(u => u.side === side && u.row === 0 && !(u.dieAt != null && t >= u.dieAt));
        if (!shooters.length) continue;
        const s0 = shooters[Math.floor(Math.random() * shooters.length)], p0 = pos(s0, t);
        const targets = army.filter(u => u.side !== side); const tg = targets[Math.floor(Math.random() * targets.length)], p1 = pos(tg, t);
        arrows.push({ x0: p0.x, y0: p0.y - 40, x1: p1.x, y1: p1.y - 20, t0: t, dur: 0.7, side });
      }
      sound('a', 'click');
    }
    // 병사
    const list = army.map(u => ({ u, y: ground - 30 + u.row * 18 })).sort((a, b) => a.y - b.y);
    for (const { u } of list) soldier(u, t);
    // 화살 날아가기
    for (const ar of arrows) {
      const k = (t - ar.t0) / ar.dur; if (k < 0 || k > 1) continue;
      const x = ar.x0 + (ar.x1 - ar.x0) * k, y = ar.y0 + (ar.y1 - ar.y0) * k - Math.sin(k * Math.PI) * 70;
      const dx = (ar.x1 - ar.x0) / ar.dur, dy = (ar.y1 - ar.y0) / ar.dur - Math.cos(k * Math.PI) * 70 * Math.PI / ar.dur, ang = Math.atan2(dy, dx);
      g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = '#5a3a1e'; g.fillRect(-9, -1, 14, 2); g.fillStyle = '#cfd6dc'; g.fillRect(5, -2, 4, 4); g.fillStyle = ar.side === 'me' ? '#2f8fe0' : '#e0402f'; g.fillRect(-10, -2, 3, 4); g.restore();
    }
    // 2라운드: 충돌 — 먼지·불꽃·화면 흔들림
    if (t > 3.4 && t < 5.0) {
      if (Math.random() < 0.6) dust.push({ x: mid + (Math.random() - 0.5) * 140, y: ground - 10 - Math.random() * 30, r: 5 + Math.random() * 10, life: 1 });
      if (Math.random() < 0.5) sparks.push({ x: mid + (Math.random() - 0.5) * 100, y: ground - 40 - Math.random() * 40, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 1 });
      if (t < 3.6) shake = 9; else if (Math.random() < 0.08) shake = 5;
      sound('c', 'fever');
    }
    for (const d of dust) { d.life -= 0.025; d.y -= 0.5; if (d.life > 0) { g.fillStyle = `rgba(235,225,205,${d.life * 0.8})`; g.beginPath(); g.arc(d.x, d.y, d.r * (1.8 - d.life), 0, Math.PI * 2); g.fill(); } }
    for (const sp of sparks) { sp.life -= 0.05; sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.2; if (sp.life > 0) { g.fillStyle = sp.life > 0.5 ? '#fff36a' : '#ff9a3a'; g.fillRect(sp.x, sp.y, 3, 3); } }
    // 3라운드: 위인의 힘
    if (t > 5.0 && t < 6.6) {
      sound('h', 'rare');
      for (const side of ['me', 'foe']) {
        const imgs = heroes[side], dir = side === 'me' ? 1 : -1, k = Math.min(1, (t - 5.0) * 3);
        imgs.slice(0, 3).forEach((im, i) => {
          const x = (side === 'me' ? 150 : Wd - 150) + dir * i * 46 - 23, y = 104;
          g.save(); g.globalAlpha = k; g.fillStyle = side === 'me' ? '#2f8fe0' : '#e0402f'; g.shadowColor = '#ffe14a'; g.shadowBlur = 16;
          g.beginPath(); g.arc(x + 20, y + 20, 23, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
          g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(x + 20, y + 20, 20, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(x + 20, y + 20, 20, 0, Math.PI * 2); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(im, x, y, 40, 40); g.restore(); g.imageSmoothingEnabled = false;
        });
        const sk = Math.round((side === 'me' ? o.meSkill : o.foeSkill) * 100);
        g.save(); g.globalAlpha = k; g.font = 'bold 15px Jua, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#2b1b10';
        const tx = side === 'me' ? 170 : Wd - 170, txt = `퀴즈 실력 +${sk}%${imgs.length ? '' : ''}`;
        g.strokeText(txt, tx, 164); g.fillStyle = '#ffe14a'; g.fillText(txt, tx, 164); g.restore();
      }
      // 이긴 쪽에서 진 쪽으로 빛줄기
      if (t > 5.5) {
        const fromX = winner === 'me' ? 180 : Wd - 180, toX = winner === 'me' ? Wd - 200 : 200;
        g.save(); g.strokeStyle = `rgba(255,236,120,${0.5 + 0.5 * Math.sin(t * 30)})`; g.lineWidth = 4; g.shadowColor = '#fff36a'; g.shadowBlur = 12;
        g.beginPath(); g.moveTo(fromX, 130); for (let k = 1; k <= 6; k++) g.lineTo(fromX + (toX - fromX) * k / 6, 130 + (k % 2 ? -12 : 12) + (ground - 160) * k / 6); g.stroke(); g.restore();
        if (Math.random() < 0.15) shake = 4;
      }
    }
    // 승리 쪽 꽃가루
    if (t > 6.8 && o.win) { if (confetti.length < 120) for (let k = 0; k < 4; k++) confetti.push({ x: Math.random() * Wd, y: -10, vy: 1 + Math.random() * 2, vx: (Math.random() - 0.5), c: ['#ffd84a', '#e8443a', '#3d8fe0', '#3cbf5a', '#fff'][k % 5] }); }
    for (const c of confetti) { c.y += c.vy; c.x += c.vx; g.fillStyle = c.c; g.fillRect(c.x, c.y, 4, 3); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    bars();
    // 라운드 안내
    if (t < 2.5) caption('1라운드 · 화살 공격!', '활을 쏘아 적의 기세를 꺾어요', 0.1);
    else if (t < 4.9) caption('2라운드 · 돌격!', '주민 병사들이 맞부딪혀요', 2.6);
    else if (t < 6.6) caption('3라운드 · 위인의 힘!', o.upset ? '퀴즈 실력이 승부를 뒤집어요!' : '위인과 퀴즈 실력이 힘을 더해요', 5.0, '#ffe14a');
    else caption(o.win ? '승리!' : '패배…', o.win ? `${o.meName}의 깃발이 펄럭여요!` : `${o.foeName}에게 밀렸어요`, 6.7, o.win ? '#ffe14a' : '#d8d0e0');
    if (t >= T && !ended) { ended = true; cv.onclick = null; cb(); }
    if (t < T + 2.5) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// =============================================================
//  학급 채팅
// =============================================================
// 금칙어 목록은 js/badwords.js
const PRIVATE = /(\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4})|(https?:|www\.|\.com|\.kr|\.net)/i;

let msgs = [], lastSent = 0, unread = 0, chatOpen = false;
const READ_KEY = 'hb.chatRead';
const readAt = () => Number(localStorage.getItem(READ_KEY) || 0);

export function onChat(list) {
  msgs = list;
  const mine = G.s?.studentNo;
  const r = readAt();
  unread = chatOpen ? 0 : msgs.filter(m => m.ct > r && !(m.no === mine && m.kind !== 'sys')).length;
  badge();
  if (chatOpen) renderChat(true);
}
function badge() { const b = $('chatBadge'); if (!b) return; b.textContent = unread > 9 ? '9+' : unread; b.classList.toggle('hidden', !unread); }
function fmtTime(ms) { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }
function renderChat(scroll) {
  const box = $('chatList'); if (!box) return;
  const me = G.s?.studentNo, atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = msgs.length ? msgs.map(m => m.kind === 'sys'
    ? `<div class="cm sys">${esc(m.text)}</div>`
    : `<div class="cm ${m.no === me ? 'me' : ''} ${m.kind === 'teacher' ? 'teacher' : ''}"><img src="${avatarURL(m.av || 0)}" alt=""><div><small>${m.kind === 'teacher' ? '선생님' : `${m.no}번 ${esc(m.name)}`} · ${fmtTime(m.ct)}</small><p>${esc(badWord(m.text) ? '♡♡♡ (고운 말을 써요)' : m.text)}</p></div></div>`).join('')
    : '<div class="cm sys">아직 메시지가 없어요. 먼저 인사해 볼까요?</div>';
  if (scroll || atBottom) box.scrollTop = box.scrollHeight;
}
export function toggleChat(force) {
  chatOpen = force ?? !chatOpen;
  $('chatPanel').classList.toggle('hidden', !chatOpen);
  if (!chatOpen) return;
  const ok = sync.enabled && sync.classCode;
  $('chatHead').textContent = ok ? `우리 반 채팅 · ${sync.classCode}` : '우리 반 채팅';
  $('chatForm').classList.toggle('hidden', !ok);
  if (!ok) { $('chatList').innerHTML = `<div class="cm sys">${sync.configured ? '학급 서버에 연결되면 채팅을 할 수 있어요. 인터넷을 확인해 주세요.' : '선생님이 학급 서버(Firebase)를 연결하면 채팅이 열려요.'}</div>`; return; }
  localStorage.setItem(READ_KEY, String(now())); unread = 0; badge();
  const off = sync.classControl.chatOff && !G.s?.teacher;
  $('chatIn').disabled = off; $('chatIn').placeholder = off ? '선생님이 채팅을 꺼 두었어요' : `고운 말로 이야기해요 (${BAL.chat.maxLen}자)`;
  renderChat(true); if (!off) setTimeout(() => $('chatIn')?.focus(), 60);
}
async function sendChat(e) {
  e.preventDefault();
  const inp = $('chatIn'); const text = inp.value.trim().replace(/\s+/g, ' ');
  if (!text) return;
  const teacher = !!G.s?.teacher;
  if (!teacher && sync.classControl.paused) { toast('선생님이 게임을 멈춘 동안은 채팅할 수 없어요.', 'bad'); return; }
  if (!teacher && sync.classControl.chatOff) { toast('선생님이 지금은 채팅을 꺼 두었어요.', 'bad'); return; }
  if (text.length > BAL.chat.maxLen) { toast(`${BAL.chat.maxLen}자까지 쓸 수 있어요.`, 'bad'); return; }
  if (badWord(text)) { sfx('wrong'); toast('고운 말을 써 주세요! 친구가 상처받을 수 있어요.', 'bad', 'warn'); return; }
  if (PRIVATE.test(text)) { sfx('wrong'); toast('전화번호나 인터넷 주소는 보낼 수 없어요.', 'bad', 'warn'); return; }
  const wait = BAL.chat.gapSec * 1000 - (now() - lastSent);
  if (wait > 0 && !teacher) { toast(`${Math.ceil(wait / 1000)}초 뒤에 보낼 수 있어요.`, 'bad'); return; }
  lastSent = now(); inp.value = '';
  try { await sync.sendChat(G.s, text, teacher ? 'teacher' : 'msg'); sfx('click'); localStorage.setItem(READ_KEY, String(now())); }
  catch (err) { console.warn(err); toast('메시지를 보내지 못했어요.', 'bad'); inp.value = text; }
}
// 시스템 알림 (시대 돌파, 전쟁 결과)
export function sendSys(text) { if (!sync.enabled || !G.s || G.s.teacher) return; sync.sendChat(G.s, text.slice(0, 80), 'sys').catch(e => console.warn(e)); }
ctx.onEraWin = () => { const s = G.s; sendSys(s.completed ? `🎉 ${s.name}이(가) 모든 시대를 돌파해 역사를 완성했어요!` : `🎉 ${s.name}이(가) ${s.era}단계 ${ERAS[s.era].name}로 돌파했어요!`); };

export function initSocial() {
  $('btnChat').addEventListener('click', () => { sfx('click'); toggleChat(); });
  $('chatX').addEventListener('click', () => { sfx('click'); toggleChat(false); });
  $('chatForm').addEventListener('submit', sendChat);
  $('chatIn').addEventListener('keydown', e => e.stopPropagation());
  sync.onWars = onWars; sync.onChat = onChat;
  setInterval(() => { if (wars.size) process(); }, 20000);   // 대기 시간 지난 선전포고 정리
}
