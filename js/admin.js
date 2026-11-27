// =============================================================
//  교사 화면 (admin.html) — 선생님 구글 계정 전용
//   classes/{학급코드} : paused · notice · maxEra · chatOff · warOff  (학생 게임이 실시간으로 따라요)
//   villages           : 학생 진도 보기 (읽기만)
//   chats/{학급코드}/msgs : 최근 50개 보기 · 지우기
//  누가 선생님인지는 Firestore 보안 규칙이 정해요 (teacher/check 문서를 읽을 수 있으면 선생님).
// =============================================================
import { firebaseConfig } from './firebase-config.js?v=202611271256';
import { ERAS, MAX_ERA } from './data-config.js?v=202611271256';
import { badWord } from './badwords.js?v=202611271256';

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2/';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => { n = Math.floor(n || 0); if (n < 10000) return n.toLocaleString('ko-KR'); for (const [v, u] of [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']]) if (n >= v) return (n / v).toFixed(n / v < 10 ? 1 : 0).replace(/\.0$/, '') + u; return String(n); };
const ago = t => { if (!t) return '-'; const m = Math.floor((Date.now() - t) / 60000); if (m < 1) return '방금'; if (m < 60) return `${m}분 전`; const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const toast = msg => { const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2400); };

let F, db, auth, code = '', unsubs = [], students = [], sortKey = 'no', sortDir = 1, ctl = {}, glob = {}, oldSite = {};

async function main() {
  if (!firebaseConfig.apiKey) { $('loading').textContent = 'Firebase 설정(js/firebase-config.js)이 비어 있어요.'; return; }
  const [app, fs, au] = await Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-firestore.js'), import(CDN + 'firebase-auth.js')]);
  F = { ...fs, ...au };
  const fb = app.initializeApp(firebaseConfig);
  db = fs.getFirestore(fb); auth = au.getAuth(fb);
  $('btnLogin').onclick = async () => {
    try { await F.signInWithPopup(auth, new F.GoogleAuthProvider()); await enter(); }
    catch (e) { console.warn(e); $('loginMsg').textContent = e.code === 'auth/popup-blocked' ? '팝업이 막혔어요. 주소창 오른쪽의 팝업 허용을 눌러 주세요.' : '로그인하지 못했어요. 다시 시도해 주세요.'; }
  };
  const out = async () => { unsubs.forEach(u => u()); unsubs = []; await F.signOut(auth); location.reload(); };
  $('btnLogout').onclick = out; $('btnLogout2').onclick = out;
  await auth.authStateReady();
  await enter();
}

async function isTeacher() { try { await F.getDoc(F.doc(db, 'teacher', 'check')); return true; } catch (e) { return false; } }

async function enter() {
  $('loading').classList.add('hidden');
  const u = auth.currentUser;
  if (!u || u.isAnonymous) { $('loginBox').classList.remove('hidden'); return; }
  if (!(await isTeacher())) {
    $('loginBox').classList.remove('hidden'); $('btnLogout2').classList.remove('hidden');
    $('loginMsg').innerHTML = `<b>${esc(u.email)}</b>은(는) 선생님 계정으로 등록되어 있지 않아요.`; return;
  }
  $('loginBox').classList.add('hidden'); $('dash').classList.remove('hidden');
  $('who').textContent = u.email;
  $('maxEra').innerHTML = ERAS.slice(1).map(e => `<option value="${e.id}">${e.id}단계 ${e.name}${e.id === MAX_ERA ? ' (모두 열기)' : ''}</option>`).join('');
  $('code').value = localStorage.getItem('hb.adminClass') || '5-2';
  $('btnLoad').onclick = () => load($('code').value);
  $('code').onkeydown = e => { if (e.key === 'Enter') load($('code').value); };
  bindControls(); watchServer();
  $('btnOldSite').onclick = toggleOldSite; $('newUrl').textContent = NEW_URL;
  document.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : 1; sortKey = k; drawRows(); });
  load($('code').value);
}

function load(raw) {
  code = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, '').slice(0, 16);
  if (!code) { toast('학급 코드를 넣어 주세요'); return; }
  $('code').value = code; localStorage.setItem('hb.adminClass', code);
  $('btnTest').href = `index.html?teacher=${encodeURIComponent(code)}`;
  unsubs.forEach(u => u()); unsubs = [];
  // 학급 제어
  unsubs.push(F.onSnapshot(F.doc(db, 'classes', code), snap => { ctl = snap.exists() ? snap.data() : {}; drawControls(); }, e => console.warn(e)));
  // 학생 진도
  unsubs.push(F.onSnapshot(F.query(F.collection(db, 'villages'), F.where('classCode', '==', code)), snap => {
    students = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.teacher && d.studentNo !== 0);
    $('updated').textContent = `· ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준 (자동 새로고침)`;
    drawRows();
  }, e => { console.warn(e); $('rows').innerHTML = '<tr><td colspan="9">학생 목록을 불러오지 못했어요.</td></tr>'; }));
  // 채팅
  unsubs.push(F.onSnapshot(F.query(F.collection(db, 'chats', code, 'msgs'), F.orderBy('ct', 'desc'), F.limit(50)), snap => {
    drawChat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, e => { console.warn(e); $('chat').innerHTML = '<div class="dim">채팅을 불러오지 못했어요.</div>'; }));
}

// ---------- 서버 열기·닫기 (모든 학급) ----------
function watchServer() {
  F.onSnapshot(F.doc(db, 'config', 'server'), snap => { glob = snap.exists() ? snap.data() : {}; drawServer(); }, e => console.warn(e));
  F.onSnapshot(F.doc(db, 'config', 'global'), snap => { oldSite = snap.exists() ? snap.data() : {}; drawOldSite(); }, e => console.warn(e));
  $('btnAnn').onclick = async () => {
    const text = $('annIn').value.trim().slice(0, 60);
    if (!text) { toast('공지할 글을 써 주세요'); $('annIn').focus(); return; }
    try { await F.setDoc(F.doc(db, 'config', 'server'), { annText: text, annAt: Date.now() }, { merge: true }); toast('모든 학생 화면에 공지를 보냈어요'); $('annIn').value = ''; }
    catch (e) { console.warn(e); toast('보내지 못했어요. 선생님 계정을 확인해 주세요.'); }
  };
  $('annIn').onkeydown = e => { if (e.key === 'Enter') $('btnAnn').click(); };
  $('btnUpdate').onclick = async () => {
    if (!confirm('게임을 켜 놓은 모든 학생 화면을 새 버전으로 새로고침할까요?\n(저장한 뒤 바뀌고, 진행은 그대로 이어져요)')) return;
    try { await F.setDoc(F.doc(db, 'config', 'server'), { reloadAt: Date.now() }, { merge: true }); toast('모든 학생 화면에 새로고침 신호를 보냈어요'); }
    catch (e) { console.warn(e); toast('보내지 못했어요. 선생님 계정을 확인해 주세요.'); }
  };
  $('btnServer').onclick = async () => {
    const closing = !glob.closed;
    if (closing && !confirm('서버를 닫을까요?\n모든 학생 화면이 ‘문을 닫았어요’로 바뀌어요.')) return;
    try {
      await F.setDoc(F.doc(db, 'config', 'server'), { closed: closing, msg: $('srvMsg').value.trim().slice(0, 40), updatedAt: Date.now() }, { merge: true });
      toast(closing ? '서버를 닫았어요' : '서버를 열었어요');
    } catch (e) { console.warn(e); toast('바꾸지 못했어요. 선생님 계정·보안 규칙을 확인해 주세요.'); }
  };
}
// 옛 주소(Netlify) 게임 닫기 — 예전 버전은 config/global 을 보고 ‘문을 닫았어요’ 화면을 띄워요
const NEW_URL = location.origin + location.pathname.replace(/admin\.html$/, '');
function drawOldSite() {
  const on = !!oldSite.closed; const b = $('btnOldSite'); if (!b) return;
  $('oldTxt').textContent = on ? '닫힘 — 옛 주소로 들어오면 새 주소 안내가 떠요' : '열림 — 옛 주소에서도 예전 버전 게임이 열려요';
  b.textContent = on ? '옛 주소 다시 열기' : '옛 주소 닫고 새 주소 안내';
  b.className = `btn small ${on ? 'gray' : 'red'}`;
}
async function toggleOldSite() {
  const closing = !oldSite.closed;
  if (closing && !confirm(`옛 주소(jocheon-history.netlify.app) 게임을 닫고\n새 주소(${NEW_URL})를 안내할까요?`)) return;
  try { await F.setDoc(F.doc(db, 'config', 'global'), { closed: closing, msg: closing ? `새 주소로 이사했어요! ${NEW_URL.replace(/^https?:\/\//, '')}` : '', updatedAt: Date.now() }, { merge: true }); toast(closing ? '옛 주소를 닫았어요' : '옛 주소를 열었어요'); }
  catch (e) { console.warn(e); toast('바꾸지 못했어요.'); }
}

function drawServer() {
  const c = !!glob.closed;
  $('serverCard').classList.toggle('closed', c);
  $('srvTxt').textContent = c ? '닫힘' : '열림';
  $('srvSub').textContent = c ? `학생들은 게임을 할 수 없어요${glob.updatedAt ? ` · ${new Date(glob.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 닫음` : ''}` : '학생들이 게임을 할 수 있어요.';
  $('btnServer').textContent = c ? '서버 열기' : '서버 닫기';
  $('btnServer').className = `btn ${c ? 'green' : 'red'}`;
  if (document.activeElement !== $('srvMsg')) $('srvMsg').value = glob.msg || '';
  if ($('annLast')) $('annLast').textContent = glob.annAt && glob.annText ? `마지막 공지 (${new Date(glob.annAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}): ${glob.annText}` : '아직 보낸 공지가 없어요.';
  if ($('updSub')) $('updSub').textContent = glob.reloadAt ? `마지막으로 보낸 때: ${new Date(glob.reloadAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '게임을 새로 고쳐 올렸을 때 눌러요.';
}

// ---------- 수업 제어 ----------
async function setCtl(patch, msg) {
  try { await F.setDoc(F.doc(db, 'classes', code), { ...patch, updatedAt: Date.now() }, { merge: true }); toast(msg); }
  catch (e) { console.warn(e); toast('저장하지 못했어요. 선생님 계정·보안 규칙을 확인해 주세요.'); drawControls(); }
}
function bindControls() {
  $('swPause').onclick = () => setCtl({ paused: !ctl.paused, notice: $('notice').value.trim().slice(0, 40) }, !ctl.paused ? '게임을 멈췄어요' : '게임을 다시 시작했어요');
  $('btnNotice').onclick = () => setCtl({ notice: $('notice').value.trim().slice(0, 40) }, '안내 문구를 바꿨어요');
  $('maxEra').onchange = () => { const n = Number($('maxEra').value); setCtl({ maxEra: n, maxEraV2: true }, `${n}단계까지 열었어요`); };
  $('swChat').onclick = () => setCtl({ chatOff: !ctl.chatOff }, !ctl.chatOff ? '채팅을 껐어요' : '채팅을 켰어요');
  $('swWar').onclick = () => setCtl({ warOff: !ctl.warOff }, !ctl.warOff ? '전쟁을 껐어요' : '전쟁을 켰어요');
}
function drawControls() {
  $('swPause').classList.toggle('on', !!ctl.paused); $('ctlPause').classList.toggle('on', !!ctl.paused);
  $('swChat').classList.toggle('on', !!ctl.chatOff); $('ctlChat').classList.toggle('on', !!ctl.chatOff);
  $('swWar').classList.toggle('on', !!ctl.warOff); $('ctlWar').classList.toggle('on', !!ctl.warOff);
  if (document.activeElement !== $('notice')) $('notice').value = ctl.notice || '';
  const me = Number(ctl.maxEra) || MAX_ERA; $('maxEra').value = String(ctl.maxEraV2 ? me : (me >= 7 ? MAX_ERA : me));
}

// ---------- 학생 진도 ----------
const val = (d, k) => {
  const st = d.stats || {}, sm = d.summary || {};
  switch (k) {
    case 'no': return d.studentNo || 0;
    case 'name': return d.name || '';
    case 'era': return (d.completed ? 11 : d.era || 1) * 1e9 + (d.fame || 0);
    case 'fame': return d.fame || 0;
    case 'solved': return st.solved || sm.solved || 0;
    case 'acc': { const s = st.solved || sm.solved || 0; return s ? (st.correct || sm.correct || 0) / s : -1; }
    case 'bld': return (d.buildings || []).length;
    case 'war': return (d.warStats?.win || 0) * 1000 - (d.warStats?.lose || 0) + (d.pvp ? 0.5 : 0);
    case 'seen': return d.lastSavedAt || 0;
  }
  return 0;
};
function drawRows() {
  const now = Date.now();
  const list = [...students].sort((a, b) => { const x = val(a, sortKey), y = val(b, sortKey); return (typeof x === 'string' ? x.localeCompare(y, 'ko') : x - y) * sortDir; });
  const active = students.filter(d => now - (d.lastSavedAt || 0) < 5 * 60000).length;
  const avgEra = students.length ? students.reduce((a, d) => a + (d.era || 1), 0) / students.length : 0;
  const totSolved = students.reduce((a, d) => a + (d.stats?.solved || 0), 0), totCorrect = students.reduce((a, d) => a + (d.stats?.correct || 0), 0);
  $('sum').innerHTML = `<span class="pill">학생 ${students.length}명</span><span class="pill">지금 하는 중 ${active}명</span><span class="pill">평균 ${avgEra.toFixed(1)}단계</span><span class="pill">반 전체 정답률 ${totSolved ? Math.round(totCorrect / totSolved * 100) : 0}%</span>`;
  $('rows').innerHTML = list.length ? list.map(d => {
    const st = d.stats || {}, solved = st.solved || 0, acc = solved ? Math.round((st.correct || 0) / solved * 100) : null;
    const w = d.warStats || {};
    return `<tr class="${now - (d.lastSavedAt || 0) < 5 * 60000 ? 'now' : ''}">
      <td>${d.studentNo || '-'}</td><td>${esc(d.name)}</td>
      <td><span class="era">${d.completed ? '완성' : `${d.era || 1}단계`}</span> <span class="dim">${d.completed ? '역사 완성!' : esc(ERAS[d.era || 1]?.name || '')}</span></td>
      <td class="num">${fmt(d.fame)}</td><td class="num">${fmt(solved)}</td><td class="num">${acc === null ? '-' : acc + '%'}</td><td class="num">${(d.buildings || []).length}</td>
      <td>${d.pvp ? '<span class="tag war">허용</span> ' : '<span class="tag">평화</span> '}<span class="dim">${w.win || 0}승 ${w.lose || 0}패</span></td>
      <td>${ago(d.lastSavedAt)}</td><td><button class="btn small" data-bk="${esc(d.id)}">기록·되돌리기</button></td></tr>`;
  }).join('') : '<tr><td colspan="10" class="dim">아직 이 학급 코드로 들어온 학생이 없어요.</td></tr>';
  document.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => openBackups(b.dataset.bk));
  document.querySelectorAll('th[data-k]').forEach(th => { th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (th.dataset.k === sortKey ? (sortDir > 0 ? ' ▲' : ' ▼') : ''); });
}

// ---------- 저장 기록 · 되돌리기 ----------
const REASON = { manual: '저장 버튼', era: '시대 돌파', auto: '자동' };
async function openBackups(id) {
  const st = students.find(d => d.id === id); const box = $('bkBox');
  box.innerHTML = `<div class="dim">불러오는 중…</div>`; $('bkName').textContent = `${st?.studentNo || ''}번 ${st?.name || ''}`; $('bkModal').classList.remove('hidden');
  try {
    const snap = await F.getDocs(F.query(F.collection(db, 'villages', id, 'backups'), F.orderBy('t', 'desc'), F.limit(30)));
    const rows = snap.docs.map(x => ({ bid: x.id, ...x.data() }));
    const cur = st ? `<p class="note">지금: <b>${st.completed ? '완성' : (st.era || 1) + '단계'}</b> · 푼 문제 ${fmt(st.stats?.solved || 0)} · 명성 ${fmt(st.fame || 0)}</p>` : '';
    box.innerHTML = cur + (rows.length ? `<table><thead><tr><th>시각</th><th>남긴 까닭</th><th>시대</th><th class="num">푼 문제</th><th class="num">명성</th><th></th></tr></thead><tbody>${rows.map(r => `<tr>
      <td>${new Date(r.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${REASON[r.reason] || esc(r.reason)}</td>
      <td>${r.completed ? '완성' : (r.era || 1) + '단계'}</td><td class="num">${fmt(r.solved)}</td><td class="num">${fmt(r.fame)}</td>
      <td><button class="btn small gold" data-restore="${r.bid}">이 기록으로 되돌리기</button></td></tr>`).join('')}</tbody></table>` : '<p class="dim">아직 저장 기록이 없어요. 학생이 ‘저장’ 버튼을 누르거나 시대를 돌파하면 기록이 남아요.</p>');
    box.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => restore(id, rows.find(r => r.bid === b.dataset.restore)));
  } catch (e) { console.warn(e); box.innerHTML = '<p>기록을 불러오지 못했어요.</p>'; }
}
async function restore(id, bk) {
  if (!bk || !confirm(`${new Date(bk.t).toLocaleString('ko-KR')} 기록(${bk.era}단계)으로 되돌릴까요?\n학생 화면에는 ‘선생님이 되돌려 주었어요’라고 나와요.`)) return;
  try {
    await F.runTransaction(db, async tx => {
      const ref = F.doc(db, 'villages', id); const cur = await tx.get(ref);
      const rev = ((cur.exists() && cur.data().rev) || 0) + 1;
      tx.set(ref, { ...bk.state, rev, sid: 'teacher', owner: auth.currentUser.uid, restoredAt: Date.now(), updatedAt: F.serverTimestamp() });
    });
    toast('되돌렸어요! 학생 화면에 바로 반영돼요'); $('bkModal').classList.add('hidden');
  } catch (e) { console.warn(e); toast('되돌리지 못했어요. 잠시 뒤 다시 해 주세요.'); }
}

// ---------- 채팅 관리 ----------
function drawChat(msgs) {
  const box = $('chat');
  box.innerHTML = msgs.length ? msgs.map(m => {
    const bad = m.kind !== 'sys' && badWord(m.text || '');
    const who = m.kind === 'sys' ? '알림' : m.kind === 'teacher' ? '선생님' : `${m.no}번 ${esc(m.name)}`;
    return `<div class="msg ${m.kind === 'sys' ? 'sys' : ''} ${m.kind === 'teacher' ? 'teacher' : ''} ${bad ? 'bad' : ''}">
      <span class="who">${who}</span><span class="txt">${esc(m.text)}${bad ? ' <span class="tag war">금칙어</span>' : ''}</span>
      <small>${ago(m.ct)}</small><button class="btn red small" data-del="${m.id}">지우기</button></div>`;
  }).join('') : '<div class="dim">아직 메시지가 없어요.</div>';
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('이 메시지를 지울까요? 학생 화면에서도 사라져요.')) return;
    try { await F.deleteDoc(F.doc(db, 'chats', code, 'msgs', b.dataset.del)); toast('지웠어요'); }
    catch (e) { console.warn(e); toast('지우지 못했어요. 보안 규칙을 확인해 주세요.'); }
  });
}

main().catch(e => { console.error(e); $('loading').textContent = '학급 서버에 연결하지 못했어요. 새로고침해 주세요.'; });
