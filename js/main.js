// =============================================================
//  히스토리 빌더 — 시작점: 게임 루프, 입력(클릭·드래그·확대), 배치 모드
// =============================================================
import * as GM from './game.js';
import { G } from './game.js';
import * as UI from './ui.js';
import { ctx } from './ui.js';
import { Renderer } from './render.js';
import * as S from './sprites.js';
import * as E from './economy.js';
import { B, D } from './data-buildings.js';
import { sfx, setBgm, setSfx, unlockAudio } from './audio.js';
import { sync } from './sync.js';
import { preloadImages, uiImages } from './images.js';
import { initSocial } from './social.js';
import { TEACHER_MODE, TEACHER_CLASS, TEACHER_NO } from './mode.js';

const $ = id => document.getElementById(id);
const cv = $('world');
const R = new Renderer(cv);
ctx.renderer = R;
UI.initIcons();
initSocial();

let coinImg = S.iconCanvas('coin', 32), warnImg = S.iconCanvas('warn', 32);
let placing = null;

// ---------- 배치 모드 ----------
ctx.startPlace = (p) => {
  placing = p; UI.closePanel();
  R.mode = p.kind === 'move' ? 'move' : 'place';
  if (p.kind === 'move') R.selected = G.s.buildings.find(b => b.uid === p.uid);
  const spr = p.kind === 'wonder' ? S.wonderSprite(0) : (D[p.type] ? S.decorSprite(p.type) : S.buildingSprite(p.type, p.kind === 'move' ? lvTier(R.selected?.lv || 1) : 0));
  R.ghost = { spr, size: p.kind === 'wonder' ? 2 : 1, ok: false };
  const name = p.kind === 'wonder' ? '대역사 부지(2×2)' : (B[p.type] || D[p.type]).name;
  $('placeTxt').textContent = p.kind === 'move' ? `${name}을(를) 옮길 칸을 눌러요 (다른 건물을 누르면 자리 바꾸기)` : `${name}을(를) 지을 빈 칸을 눌러요`;
  $('placeBar').classList.remove('hidden');
};
const lvTier = lv => lv >= 10 ? 2 : lv >= 5 ? 1 : 0;
ctx.endPlace = () => { placing = null; R.mode = null; R.ghost = null; R.selected = null; R.hover = null; $('placeBar').classList.add('hidden'); };
$('placeCancel').onclick = () => { sfx('click'); ctx.endPlace(); };

ctx.doBuild = (type, x, y) => {
  const r = GM.build(type, x, y);
  if (r.ok) {
    sfx('build'); R.addFx({ kind: 'dust', i: x, j: y, life: 0.7 });
    UI.toast(r.msg, 'good', 'hammer');
    const syn = G.syn.byUid.get(r.b.uid); if (syn?.length) { setTimeout(() => { sfx('rare'); UI.toast(`시너지 발동! ${syn.map(s => s.name).join(', ')}`, 'good', 'star'); }, 400); }
  } else { sfx('wrong'); UI.toast(r.msg, 'bad'); }
  return r;
};
function placeAt(tile) {
  const p = placing; if (!p) return;
  if (p.kind === 'build') {
    if (!GM.canPlace(tile.x, tile.y)) { sfx('wrong'); UI.toast('여기에는 지을 수 없어요.', 'bad'); return; }
    const r = ctx.doBuild(p.type, tile.x, tile.y);
    // 같은 건물을 연달아 지을 수 있으면 배치 모드 유지
    if (r.ok && GM.buildCheck(p.type).ok && D[p.type]) return;
    ctx.endPlace();
  } else if (p.kind === 'move') {
    const r = GM.moveBuilding(p.uid, tile.x, tile.y);
    if (r.ok) { sfx('build'); R.addFx({ kind: 'dust', i: tile.x, j: tile.y, life: 0.6 }); const syn = G.syn.byUid.get(p.uid); if (syn?.length) UI.toast(`시너지! ${syn.map(s => s.name).join(', ')}`, 'good', 'star'); }
    else { sfx('wrong'); UI.toast(r.msg, 'bad'); return; }
    ctx.endPlace();
  } else if (p.kind === 'wonder') {
    const r = GM.placeWonder(tile.x, tile.y);
    if (r.ok) { sfx('fanfare'); UI.toast(r.msg, 'good', 'museum'); ctx.endPlace(); UI.openWonder(); }
    else { sfx('wrong'); UI.toast(r.msg, 'bad'); }
  }
}
function updateGhost(tile) {
  if (!placing || !tile) return;
  R.hover = tile;
  if (placing.kind === 'wonder') { let ok = true; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) if (!GM.canPlace(tile.x + dx, tile.y + dy)) ok = false; R.ghost.ok = ok; }
  else if (placing.kind === 'move') R.ghost.ok = E.isActiveTile(G.s, tile.x, tile.y) && !(E.occupancy(G.s).get(tile.x + ',' + tile.y)?.uid === 'wonder');
  else R.ghost.ok = GM.canPlace(tile.x, tile.y);
}

// ---------- 엽전 거두기 ----------
ctx.collect = () => {
  const pts = R.coinBoxes.map(c => ({ x: c.x, y: c.y }));
  const r = GM.collect();
  if (!r.ok) { UI.toast(r.msg); return; }
  sfx('coin');
  if (!pts.length) { const b = $('btnGold').getBoundingClientRect(); pts.push({ x: b.left + b.width / 2, y: b.bottom + 40 }); }
  UI.flyCoins(pts);
  const b = $('btnGold').getBoundingClientRect(); UI.floater('+' + E.fmt(r.amt), b.left + b.width / 2 - 20, b.bottom);
  UI.refreshPanel();
};

// ---------- 입력 ----------
let down = null, dragging = false;
// 두 손가락으로 벌리고 오므려 확대·축소 (휴대폰)
const touches = new Map(); let pinch = null;
const gap2 = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
cv.addEventListener('pointerdown', e => {
  unlockAudio(); if (e.pointerType === 'touch') touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) { pinch = { d: gap2() }; down = null; dragging = false; cv.classList.remove('dragging'); return; }
  if (touches.size > 2) return;
  down = { x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, id: e.pointerId }; dragging = false;
});
const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2 && pinch) { pinch.done = true; } if (!touches.size) setTimeout(() => { if (!touches.size) pinch = null; }, 0); };
cv.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && !pinch.done && touches.size === 2) {
    const d = gap2(), k = d / pinch.d;
    if (k > 1.22) { R.zoom(1, G.s); pinch.d = d; } else if (k < 0.82) { R.zoom(-1, G.s); pinch.d = d; }
    return;
  }
  if (pinch) return;
  if (down && down.id === e.pointerId) {
    const dx = e.clientX - down.px, dy = e.clientY - down.py;
    if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { dragging = true; cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId); }
    if (dragging) { R.pan(dx, dy); down.px = e.clientX; down.py = e.clientY; }
  }
  if (placing) updateGhost(R.tileAt(e.clientX, e.clientY));
});
cv.addEventListener('pointerup', e => {
  const pinched = !!pinch; endTouch(e);
  const was = dragging; dragging = false; cv.classList.remove('dragging'); down = null;
  if (was || pinched || !G.s) return;
  const hit = R.pick(G.s, e.clientX, e.clientY);
  if (placing) { const t = R.tileAt(e.clientX, e.clientY); updateGhost(t); placeAt(t); return; }
  if (hit.coin) { ctx.collect(); return; }
  if (hit.crisis) { sfx('alarm'); UI.runCrisis(); return; }
  if (hit.building) {
    sfx('click');
    if (hit.building.uid === 'wonder') { UI.openWonder(); return; }
    UI.openBuildingPanel(hit.building); return;
  }
  if (hit.tile && E.isActiveTile(G.s, hit.tile.x, hit.tile.y)) {
    sfx('click'); UI.closePanel(); ctx.pendingTile = hit.tile; R.selected = { x: hit.tile.x, y: hit.tile.y };
    UI.openShop('b');
  } else UI.closePanel();
});
window.addEventListener('pointerup', e => touches.delete(e.pointerId));
window.addEventListener('pointercancel', e => touches.delete(e.pointerId));
cv.addEventListener('pointercancel', e => { endTouch(e); down = null; dragging = false; cv.classList.remove('dragging'); });
cv.addEventListener('wheel', e => { e.preventDefault(); R.zoom(e.deltaY < 0 ? 1 : -1, G.s); }, { passive: false });
$('zoomIn').onclick = () => { sfx('click'); R.zoom(1, G.s); };
$('zoomOut').onclick = () => { sfx('click'); R.zoom(-1, G.s); };
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (placing) ctx.endPlace(); else if (UI.modalOpen() && !UI.isQuizBusy()) UI.closeModal(); else UI.closePanel();
});

// ---------- 버튼 ----------
const btn = (id, fn) => $(id).addEventListener('click', () => { unlockAudio(); sfx('click'); fn(); });
btn('btnQuiz', UI.openQuizMenu);
btn('btnBuild', () => UI.openShop('b'));
btn('btnHeroes', () => UI.openHeroes('h'));
btn('btnFriends', UI.openFriends);
btn('btnSettings', UI.openSettings);
btn('btnLab', UI.openLab);
btn('btnWonder', UI.openWonder);
btn('btnRecord', UI.openRecord);
btn('btnRank', () => UI.openRanking());
btn('btnFame', () => UI.openRanking('fame'));
btn('btnConds', UI.openConds);
btn('tube', UI.openConds);
btn('btnChallenge', () => { if (E.canChallenge(G.s)) UI.runChallenge(); else UI.openConds(); });
// ---------- 저장 버튼 ----------
const SAVE_TXT = { idle: '저장', saving: '저장 중', saved: '저장됨', error: '저장 안 됨', stale: '멈춤', offline: '이 기기' };
function showSaveState(st) {
  const dot = $('saveDot'), lb = $('saveLb'); if (!dot) return;
  dot.className = 'save-dot ' + st; lb.textContent = SAVE_TXT[st] || '저장';
  $('btnSave').title = st === 'saved' ? `학급 서버에 저장됨 (${new Date(sync.lastOkAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})` : '지금 학급 서버에 저장';
}
sync.onStatus = showSaveState;
async function manualSave() {
  if (!G.s) return;
  GM.save('manual');
  if (!sync.enabled) { UI.toast('학급 서버에 연결되지 않아서 이 크롬북에만 저장했어요.', 'bad'); showSaveState('offline'); return; }
  const b = $('btnSave'); b.disabled = true;
  const r = await sync.saveNow(G.s); b.disabled = false;
  if (r.ok) {
    const t = new Date(r.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const backed = await sync.backup(G.s, 'manual');
    UI.toast(`학급 서버에 저장했어요! (${G.s.era}단계 · ${t})${backed ? ' · 저장 기록도 남겼어요' : ''}`, 'good', 'save');
  } else UI.toast({ stale: '이 마을이 다른 곳에서도 열려 있어요. ‘여기서 이어 하기’를 눌러 주세요.', closed: '선생님이 서버를 닫아 두어서 지금은 저장할 수 없어요.', offline: '학급 서버에 연결되지 않았어요.' }[r.why] || '저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', 'bad');
}
btn('btnSave', manualSave);
btn('btnProfile', () => { if (G.s?.teacher) UI.openSettings(); else UI.startScreen(true); });
$('btnGold').addEventListener('click', () => { unlockAudio(); ctx.collect(); });
$('goal').addEventListener('click', UI.goalClick);

// ---------- 게임 이벤트 ----------
GM.on('eraUp', d => { setTimeout(() => sync.backup(G.s, 'era'), 1500); UI.celebrate(d); R.people = []; R.addFx({ kind: 'stars', i: 3.5, j: 3.5, life: 1.5 }); });
GM.on('teacherEra', () => { R.people = []; R.sceneryKey = ''; R.fitPending = true; UI.updateHud(true); });
GM.on('rested', () => UI.toast('주민들이 다시 힘을 냈어요! 엽전 수익이 돌아왔어요', 'good', 'people'));
GM.on('crisis', () => { const c = GM.crisisInfo(); sfx('alarm'); UI.toast(`위기 발생! ${c?.name} — 느낌표를 눌러 막아요!`, 'bad', 'warn'); });
let fullWarned = 0;
GM.on('storageFull', () => { if (Date.now() - fullWarned > 120000) { fullWarned = Date.now(); UI.toast('창고가 가득 찼어요! 엽전을 거둬요', 'bad', 'coin'); } });
GM.on('expanded', () => { R.sceneryKey = ''; R.fitPending = true; const o = E.activeOffset(G.s.mapSize); for (let i = 0; i < G.s.mapSize; i++) R.addFx({ kind: 'dust', i: o + i, j: o + (i * 3) % G.s.mapSize, life: 1 }); });
ctx.onExpand = () => {};

// ---------- 시작 ----------
function boot() {
  $('avatar').src = UI.avatarURL(G.s.avatar || 0);
  setSfx(G.s.settings.sfx); if (G.s.settings.bgm) setBgm(true);
  R.fitPending = true; UI.updateHud(true);
  if (G.awayGain > 1) setTimeout(() => UI.toast(`자리를 비운 동안 창고에 엽전 ${E.fmt(G.awayGain)}이 쌓였어요!`, 'good', 'coin'), 600);
  if (G.s.newEraNotice) { delete G.s.newEraNotice; GM.save('era'); setTimeout(() => UI.newEraNews?.(), 900); }
  requestAnimationFrame(loop);
}
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (G.s && !sync.stale && ((!sync.classControl.paused && !sync.global.closed) || G.s.teacher)) GM.tick(dt);
  if (G.s) {
    if (R.selected && R.selected.uid && !placing && !G.s.buildings.includes(R.selected)) R.selected = G.s.buildings.find(b => b.uid === R.selected.uid) || null;
    R.draw(G.s, { coinImg, warnImg, storageRatio: G.cap ? G.s.storage / G.cap : 0, portraits: UI.portraitImg }, dt);
    UI.updateHud();
  }
  requestAnimationFrame(loop);
}
window.addEventListener('beforeunload', () => GM.save('close'));
document.addEventListener('visibilitychange', () => { if (document.hidden) GM.save('hide'); });

// ---------- 학급 서버(Firebase) ----------
sync.onRemote = doc => {
  for (const e of GM.applyRemote(doc)) {
    if (e.type === 'cheer') { const st = UI.STICKERS.find(x => x.id === e.sticker) || UI.STICKERS[0]; sfx('rare'); UI.toast(`${e.from}이(가) ‘${st.label}’ 스티커를 보냈어요! 명성 +${e.fame}`, 'good', st.icon); }
    if (e.type === 'help') { sfx('fanfare'); UI.toast(`${e.from}이(가) 우리 마을 위기를 막아 줬어요! 엽전 +${E.fmt(e.gold)}`, 'good', 'people'); }
  }
  UI.updateHud(true);
};
sync.onClass = c => { if (G.s?.teacher) { UI.showPaused(false); return; } UI.showPaused(c.paused, c.notice); };
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(false), ms))]);

// 이 기기의 마을과 서버의 마을 중 ‘더 많이 진행한 쪽’을 남겨요 (시대 → 푼 문제 → 플레이 시간)
// 예전에는 ‘더 늦게 저장된 쪽’을 골라서, 오래 켜 둔 다른 크롬북이 앞선 진행을 덮어쓰는 일이 있었어요.
function pickNewer(cloud) {
  if (!cloud) return;
  if ((cloud.restoredAt || 0) > (G.s.restoredAt || 0)) { GM.adoptState(cloud); setTimeout(() => UI.toast('선생님이 저장 기록으로 마을을 되돌려 주었어요!', 'good', 'save'), 800); return; }
  if (GM.moreProgress(G.s, cloud)) { G.s.rev = cloud.rev || 0; return; }          // 이 기기가 더 앞서 있음 → 이걸로 이어서 저장
  const same = !GM.moreProgress(cloud, G.s) && (cloud.rev || 0) === (G.s.rev || 0);
  if (same) { G.s.rev = cloud.rev || 0; return; }
  GM.adoptState(cloud);
  setTimeout(() => UI.toast('다른 크롬북에서 한 마을을 불러왔어요!', 'good', 'house'), 800);
}
// 같은 마을이 다른 크롬북·창에서 더 새로 저장됐을 때 → ‘여기서 이어 하기’
async function resolveConflict() {
  const cloud = await sync.fetchVillage(G.s.classCode, G.s.studentNo);
  if (!cloud) { UI.toast('학급 서버에 연결하지 못했어요. 잠시 뒤 다시 눌러 주세요.', 'bad'); return false; }
  const restored = (cloud.restoredAt || 0) > (G.s.restoredAt || 0);
  if (!restored && GM.moreProgress(G.s, cloud)) {
    G.s.rev = cloud.rev || 0; sync.resume(cloud.rev);
    UI.toast('이 화면의 마을이 더 많이 진행돼 있어서 이걸로 이어서 저장해요', 'good', 'house');
  } else {
    GM.adoptState(cloud); sync.resume(cloud.rev);
    R.people = []; R.sceneryKey = ''; R.fitPending = true; $('avatar').src = UI.avatarURL(G.s.avatar || 0);
    UI.toast('가장 최근에 저장된 마을을 불러왔어요!', 'good', 'house');
  }
  GM.save('resume'); UI.updateHud(true);
  return true;
}
sync.onConflict = () => { UI.closePanel?.(); UI.showConflict(resolveConflict); };

// 학급 코드·번호로 클라우드 마을 연결 (새로 시작 / 다른 크롬북에서 이어하기)
async function linkProfile(profile, err) {
  const cloud = sync.enabled ? await sync.fetchVillage(profile.classCode, profile.studentNo) : null;
  if (cloud && cloud.name && cloud.name !== profile.name) {
    err?.(`${profile.studentNo}번은 이미 ‘${cloud.name}’ 이름으로 저장돼 있어요. 번호와 이름을 확인해 주세요.`); return false;
  }
  if (cloud && (!G.s || !GM.moreProgress(G.s, cloud))) {
    const av = profile.avatar ?? cloud.avatar; GM.adoptState(cloud); G.s.avatar = av;
    setTimeout(() => UI.toast('저장된 마을을 불러왔어요! 이어서 해요', 'good', 'house'), 700);
  } else if (cloud) {
    Object.assign(G.s, { classCode: profile.classCode, studentNo: profile.studentNo, name: profile.name }); G.s.rev = cloud.rev || 0;
  } else if (!G.s) {
    GM.newGame(profile);
    setTimeout(() => UI.toast('환영해요! 먼저 움집을 지어 마을을 시작해요', 'good', 'house'), 500);
  } else Object.assign(G.s, { classCode: profile.classCode, studentNo: profile.studentNo, name: profile.name });
  if (sync.enabled) sync.attach(G.s);
  GM.save('profile');
  return true;
}

// 버튼·판넬 그림(img/ui)이 있으면 CSS 버튼 대신 그 그림을 입혀요 (없는 것은 그대로)
function applySkins() {
  const have = new Set(uiImages()); if (!have.size) return;
  const u = k => `url("img/ui/${k}.png")`;
  // 9분할(border-image): 모서리 장식은 그대로 두고 가운데만 늘려요
  const nine = (k, sel, bw) => have.has(k) ? `${sel}{border:0 solid transparent !important;border-image:${u(k)} 30% 16% fill / ${bw} stretch !important;background:none !important;box-shadow:0 .35em .45em rgba(0,0,0,.32) !important}${sel.split(',').map(x => x + '::after').join(',')}{display:none !important}` : '';
  let css = '';
  css += nine('btn_red', '.big.red', '1.9em 2.1em') + nine('btn_blue', '#btnBuild', '1.9em 2.1em') + nine(have.has('btn_teal') ? 'btn_teal' : 'btn_blue', '#btnHeroes', '1.9em 2.1em') + nine('btn_green', '.big.green', '1.9em 2.1em');
  css += nine('btn_gold', '.challenge', '.8em .95em');
  css += nine('panel_wood', '.hud-top .panel,.g-title', '.8em 1em') + nine('panel_wood', '.tool .t-lb', '.45em .6em');
  const tile = (k, sel) => have.has(k) ? `${sel}{background:${u(k)} center/100% 100% no-repeat !important;border:0 !important;border-radius:0 !important;box-shadow:0 .3em .45em rgba(0,0,0,.3) !important}` : '';
  css += tile('tile_cream', '.tool .t-ic') + tile('tile_blue', '.tool.chat .t-ic') + tile('tile_gold', '.tool.rank .t-ic');
  if (have.has('round_wood')) css += `.gear,.zoom button{background:${u('round_wood')} center/100% 100% no-repeat !important;border:0 !important;box-shadow:0 .2em .3em rgba(0,0,0,.35) !important}`;
  if (have.has('ribbon_red')) css += `.ribbon{background:${u('ribbon_red')} center/100% 100% no-repeat !important;clip-path:none !important;box-shadow:none !important;padding-top:2.2em !important}.ribbon::before{display:none !important}`;
  const st = document.createElement('style'); st.id = 'uiSkins'; st.textContent = css; document.head.appendChild(st);
}

// 선생님이 넣은 그림(img 폴더)을 먼저 불러온 뒤 시작
preloadImages().then(async n => {
  if (n) { S.clearIconCache(); UI.initIcons(); coinImg = S.iconCanvas('coin', 32); warnImg = S.iconCanvas('warn', 32); applySkins(); }
  const online = sync.configured ? await withTimeout(sync.init(), 9000) : false;
  if (online) sync.watchGlobal(g => UI.showClosed(g.closed && !(TEACHER_MODE && sync.isTeacher), g.msg));
  if (TEACHER_MODE) { await teacherBoot(online); return; }
  if (GM.load()) {
    if (online && G.s.classCode && G.s.studentNo) {
      const cloud = await sync.fetchVillage(G.s.classCode, G.s.studentNo);
      pickNewer(cloud);
      sync.attach(G.s); GM.save('sync'); boot();
    } else if (online) {
      boot(); UI.startScreen(false, (profile, err) => linkProfile(profile, err).then(ok => { if (ok) { $('avatar').src = UI.avatarURL(G.s.avatar || 0); UI.updateHud(true); } return ok; }));
    } else boot();
  } else {
    UI.startScreen(false, (profile, err) => linkProfile(profile, err).then(ok => { if (ok) boot(); return ok; }));
  }
});

// ---------- 선생님 테스트 마을 (?teacher=학급코드) ----------
async function teacherBoot(online) {
  if (!online || !sync.isTeacher) {
    const ov = $('overlay'); ov.classList.remove('hidden');
    ov.innerHTML = `<div class="start"><h1 class="logo" style="font-size:2.4em">선생님 테스트 마을<small>선생님 계정 확인이 필요해요</small></h1>
      <p>${online ? '교사 화면에서 선생님 구글 계정으로 로그인한 뒤 ‘테스트 마을 열기’를 눌러 주세요.' : '학급 서버에 연결되지 않았어요. 인터넷을 확인해 주세요.'}</p>
      <a class="btn gold" href="admin.html" style="font-size:1.3em;text-decoration:none">교사 화면으로 가기</a></div>`;
    return;
  }
  const code = TEACHER_CLASS;
  const has = GM.load();
  if (!has || G.s.classCode !== code) {
    const cloud = await sync.fetchVillage(code, TEACHER_NO);
    if (cloud) GM.adoptState(cloud);
    else GM.newGame({ studentNo: TEACHER_NO, name: '선생님', classCode: code, avatar: 0 });
  }
  G.s.classCode = code; GM.teacherSetup();
  sync.attach(G.s); GM.save('teacher'); boot();
  setTimeout(() => UI.toast(`선생님 테스트 마을 (${code}) — 재화 무한 · 위인·유물 모두 열림 · 설정에서 시대 바꾸기`, 'good', 'crown'), 700);
}

// 디버그/교사 확인용 (콘솔에서 HB.G.s 로 상태 확인)
window.HB = { G, GM, E, R };

// ---------- 휴대폰은 가로 화면으로만 ----------
{
  const go = document.getElementById('rotateGo'), de = document.documentElement;
  const can = !!(de.requestFullscreen && screen.orientation && screen.orientation.lock);
  if (go && can) {
    go.classList.remove('hidden');
    go.onclick = async () => {
      try { await de.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation.lock('landscape'); }
      catch (e) { go.textContent = '휴대폰을 직접 가로로 돌려 주세요'; }
    };
  }
}
