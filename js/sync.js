// =============================================================
//  Firebase 동기화 (3차) — Firestore 문서 1개 = 학생 1명
//   villages/{학급코드}_{번호} : 마을 전체 + 남이 쓰는 칸(cheers, help)
//   classes/{학급코드}         : 교사 제어 (paused, maxEra) — 1개만 실시간 구독
//   wars/{자동}               : 선전포고 → 수락/거절 → 결과 (양쪽이 각자 자기 마을에 반영)
//   chats/{학급코드}/msgs/{자동}: 학급 채팅 (최근 50개만 구독)
//  firebase-config.js 의 apiKey 가 비어 있으면 아무것도 하지 않습니다(로컬 모드).
// =============================================================
import { firebaseConfig } from './firebase-config.js?v=202611271314';

const V = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;
let F = null;          // firebase 함수 모음
let db = null, uid = null;
const SID = Math.random().toString(36).slice(2, 10);   // 이 창(세션) 표시

export const sync = {
  enabled: false,      // 온라인 연결 성공 여부
  configured: !!firebaseConfig.apiKey,
  docId: null, classCode: '',
  minInterval: 15000, _last: 0, _pending: null, _timer: null, _lastJson: '',
  classControl: { paused: false, maxEra: 7, chatOff: false, warOff: false },
  global: { closed: false, msg: '' },   // 서버 닫기 (교사 화면 — 모든 학급)
  onGlobal: null,
  user: null, isTeacher: false,
  rev: 0, stale: false, onConflict: null, _busy: false,
  saveState: 'idle', lastOkAt: 0, onStatus: null, _inflight: null, _lastBackup: 0,   // 저장 버튼 표시용   // 같은 마을을 두 곳에서 열었을 때   // 선생님(구글 로그인 + 보안 규칙 확인)인지
  onRemote: null,      // (doc) => void  내 문서가 남에 의해 바뀌었을 때
  onClass: null,       // (control) => void
  onWars: null,        // (wars[]) => void  내가 공격·수비하는 전쟁
  onChat: null,        // (msgs[]) => void  학급 채팅 최근 50개
  status: 'local',     // local | connecting | online | error

  async init() {
    if (!this.configured) return false;
    this.status = 'connecting';
    try {
      const [app, fs, au] = await Promise.all([
        import(CDN + 'firebase-app.js'), import(CDN + 'firebase-firestore.js'), import(CDN + 'firebase-auth.js'),
      ]);
      F = { ...fs, ...au };
      const fb = app.initializeApp(firebaseConfig);
      db = fs.getFirestore(fb);
      const auth = au.getAuth(fb);
      // 선생님이 교사 화면에서 구글로 로그인해 둔 경우 그 로그인을 그대로 써요 (학생 크롬북은 익명 로그인)
      if (auth.authStateReady) await auth.authStateReady();
      if (!auth.currentUser) await au.signInAnonymously(auth);
      this.user = auth.currentUser; uid = this.user.uid;
      this.enabled = true; this.status = 'online';
      if (!this.user.isAnonymous) this.isTeacher = await this.checkTeacher();
      return true;
    } catch (e) {
      console.warn('Firebase 연결 실패 — 로컬 모드로 계속합니다', e);
      this.status = 'error'; this.enabled = false; return false;
    }
  },

  idOf(classCode, no) { return `${classCode}_${no}`; },

  // 서버 닫기 스위치 구독 (로그인 전 시작 화면에서도 막아요)
  watchGlobal(cb) {
    if (!this.enabled) return;
    this._unsubG?.();
    // v1.7부터는 config/server (config/global 은 옛 주소(Netlify) 게임을 닫는 안내용)
    this._unsubG = F.onSnapshot(F.doc(db, 'config', 'server'), snap => {
      const d = snap.exists() ? snap.data() : {};
      this.global = { closed: !!d.closed, msg: d.msg || '', reloadAt: d.reloadAt || 0, annText: d.annText || '', annAt: d.annAt || 0 };
      cb?.(this.global);
    }, e => console.warn(e));
  },

  // 선생님 확인: 보안 규칙이 선생님 계정에만 읽기를 허락하는 문서를 읽어 봐요 (이메일을 코드에 적지 않아요)
  async checkTeacher() {
    try { await F.getDoc(F.doc(db, 'teacher', 'check')); return true; } catch (e) { return false; }
  },

  // 학생 문서 읽기 (로그인·다른 크롬북에서 이어하기)
  async fetchVillage(classCode, no) {
    if (!this.enabled) return null;
    try { const snap = await F.getDoc(F.doc(db, 'villages', this.idOf(classCode, no))); return snap.exists() ? snap.data() : null; }
    catch (e) { console.warn(e); return null; }
  },

  // 로그인 후 연결: 내 문서·학급 문서 구독
  attach(state) {
    if (!this.enabled || !state.classCode || (!state.studentNo && !state.teacher)) return;
    this.classCode = state.classCode; this.docId = this.idOf(state.classCode, state.studentNo);
    if (this._unsubV) this._unsubV(); if (this._unsubC) this._unsubC();
    this.rev = state.rev || 0; this.stale = false;
    this._unsubV = F.onSnapshot(F.doc(db, 'villages', this.docId), snap => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      const d = snap.data();
      // 다른 크롬북·다른 창이 이 마을을 더 새로 저장했어요 → 여기는 멈추고 물어봐요
      if ((d.rev || 0) > this.rev && d.sid && d.sid !== SID) { this.conflict(); return; }
      this.onRemote?.(d);
    }, e => console.warn(e));
    this._unsubC = F.onSnapshot(F.doc(db, 'classes', this.classCode), snap => {
      const d = snap.exists() ? snap.data() : {};
      // 예전 교사 화면(v1.6 이전)의 ‘7단계(모두 열기)’는 이제 ‘모두 열기’(10단계)로 봐요
      const me = Number(d.maxEra) || 10;
      this.classControl = { paused: !!d.paused, maxEra: d.maxEraV2 ? me : (me >= 7 ? 10 : me), notice: d.notice || '', chatOff: !!d.chatOff, warOff: !!d.warOff };
      this.onClass?.(this.classControl);
    }, e => console.warn(e));
    if (this.onWars) this.watchWars(this.onWars);
    if (this.onChat) this.watchChat(this.onChat);
  },

  // 저장 (이벤트 기반 + 너무 잦은 쓰기 방지)
  push(state, reason) {
    if (this.global.closed && !state?.teacher) return;   // 서버를 닫은 동안은 저장하지 않아요
    if (!this.enabled || !this.docId || this.stale) return;
    this._pending = state;
    const important = ['era', 'build', 'hero', 'tech', 'relic', 'wonder', 'new', 'import', 'profile', 'close', 'hide', 'crisis', 'expand', 'boss', 'war', 'pvp', 'repair', 'teacher', 'resume', 'sync'].includes(reason);
    if (important || Date.now() - this._last > this.minInterval) this.flush();
    else if (!this._timer) this._timer = setTimeout(() => { this._timer = null; this.flush(); }, this.minInterval);
  },
  // 저장은 한 번에 하나씩, 판 번호(rev)를 1씩 올려요.
  // 보안 규칙이 ‘서버의 판 번호 + 1’만 받아 주므로, 낡은 판을 가진 창은 최신 저장을 덮어쓸 수 없어요.
  flush() {
    if (!this.enabled || !this._pending || !this.docId || this.stale || this._busy) return;
    const s = this._pending; this._pending = null; this._last = Date.now();
    const data = snapshot(s);
    const json = JSON.stringify(data); if (json === this._lastJson) return;
    const rev = (this.rev || 0) + 1;
    this._busy = true; this.setStatus('saving');
    this._inflight = F.setDoc(F.doc(db, 'villages', this.docId), { ...data, rev, sid: SID, owner: uid, updatedAt: F.serverTimestamp() }, { merge: true })
      .then(() => { this.rev = rev; s.rev = rev; this._lastJson = json; this.lastOkAt = Date.now(); this.setStatus('saved'); })
      .catch(e => { if (e?.code === 'permission-denied') { this.conflict(); this.setStatus('stale'); } else { console.warn('저장 실패', e); this.setStatus('error'); } })
      .finally(() => { this._busy = false; this._inflight = null; if (this._pending && !this.stale) this.flush(); });
    return this._inflight;
  },
  setStatus(st) { this.saveState = st; this.onStatus?.(st); },
  // 저장 버튼: 지금 바로 서버에 저장하고 결과를 알려 줘요
  async saveNow(state) {
    if (!this.enabled || !this.docId) return { ok: false, why: 'offline' };
    if (this.stale) return { ok: false, why: 'stale' };
    if (this.global.closed && !state?.teacher) return { ok: false, why: 'closed' };
    for (let k = 0; k < 20 && this._inflight; k++) await this._inflight;
    this._pending = state; this._lastJson = '';
    const p = this.flush(); if (p) await p;
    return this.saveState === 'saved' ? { ok: true, at: this.lastOkAt } : { ok: false, why: this.saveState };
  },
  // 저장 기록 남기기 (저장 버튼·시대 돌파) — 교사 화면에서 이 기록으로 되돌릴 수 있어요
  async backup(state, reason = 'manual') {
    if (!this.enabled || !this.docId || this.stale) return false;
    if (reason === 'manual' && Date.now() - this._lastBackup < 2 * 60 * 1000) return false;
    this._lastBackup = Date.now();
    try {
      await F.addDoc(F.collection(db, 'villages', this.docId, 'backups'), { t: Date.now(), reason, era: state.era, completed: !!state.completed, solved: state.stats?.solved || 0, playSec: Math.round(state.stats?.playSec || 0), fame: state.fame || 0, name: state.name, state: snapshot(state) });
      return true;
    } catch (e) { console.warn('저장 기록 실패', e); return false; }
  },
  conflict() {
    if (this.stale) return;
    this.stale = true; this._pending = null; this.setStatus('stale');
    this.onConflict?.();
  },
  // ‘여기서 이어 하기’: 서버 판을 기준으로 다시 저장할 수 있게
  resume(rev) { this.rev = rev || 0; this.stale = false; this._lastJson = ''; this.setStatus('idle'); },

  // 학급 친구 목록 (문서 1회 쿼리, 60초 캐시)
  async classmates(force = false) {
    if (!this.enabled) return [];
    if (!force && this._mates && Date.now() - this._matesAt < 60000) return this._mates;
    const q = F.query(F.collection(db, 'villages'), F.where('classCode', '==', this.classCode));
    const snap = await F.getDocs(q);
    // 선생님 테스트 마을은 친구 목록·랭킹·전쟁 상대에서 빼요
    this._mates = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.teacher && !d.summary?.teacher && d.studentNo !== 0); this._matesAt = Date.now();
    return this._mates;
  },

  // ---------- 전쟁 ----------
  watchWars(cb) {
    if (!this.enabled || !this.docId) return;
    (this._unsubW || []).forEach(u => u());
    const on = field => F.onSnapshot(F.query(F.collection(db, 'wars'), F.where(field, '==', this.docId)), snap => {
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.warn('전쟁 구독 실패', e));
    this._unsubW = [on('toId'), on('fromId')];
  },
  async declareWar(data) {
    const ref = await F.addDoc(F.collection(db, 'wars'), { ...data, classCode: this.classCode, fromId: this.docId, status: 'pending', t: Date.now() });
    return ref.id;
  },
  // 수비 쪽: 아직 대기 중일 때만 수락/거절 (트랜잭션)
  async answerWar(id, patch) {
    const ref = F.doc(db, 'wars', id);
    return F.runTransaction(db, async tx => {
      const snap = await tx.get(ref); if (!snap.exists()) return null;
      const d = snap.data(); if (d.status !== 'pending') return null;
      tx.update(ref, { ...patch, answeredAt: Date.now() }); return { ...d, ...patch };
    });
  },
  async updateWar(id, patch) { await F.updateDoc(F.doc(db, 'wars', id), patch); },
  async fetchById(id) { try { const s = await F.getDoc(F.doc(db, 'villages', id)); return s.exists() ? { id, ...s.data() } : null; } catch (e) { return null; } },

  // ---------- 학급 채팅 ----------
  watchChat(cb) {
    if (!this.enabled || !this.classCode) return;
    this._unsubChat?.();
    const q = F.query(F.collection(db, 'chats', this.classCode, 'msgs'), F.orderBy('ct', 'desc'), F.limit(50));
    this._unsubChat = F.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse()), e => console.warn('채팅 구독 실패', e));
  },
  // ---------- 친구 마을 함께 놀기: visits/{마을}/people/{내 로그인 번호} ----------
  get myUid() { return uid; },
  async roomPut(vid, data) {
    if (!this.enabled || !vid || !uid) return;
    await F.setDoc(F.doc(db, 'visits', vid, 'people', uid), { ...data, uid, at: Date.now() }, { merge: true });
  },
  async roomLeave(vid) {
    if (!this.enabled || !vid || !uid) return;
    try { await F.deleteDoc(F.doc(db, 'visits', vid, 'people', uid)); } catch (e) { /* 이미 없으면 그만 */ }
  },
  roomWatch(vid, cb) {
    if (!this.enabled || !vid) return () => {};
    return F.onSnapshot(F.collection(db, 'visits', vid, 'people'), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn('room', e));
  },

  async sendChat(me, text, kind = 'msg') {
    await F.addDoc(F.collection(db, 'chats', this.classCode, 'msgs'), { no: me.studentNo, name: me.name, av: me.avatar || 0, text, kind, ct: Date.now(), uid });
  },

  // 칭찬 스티커 (상대 문서의 cheers.{내번호} 칸만 고침)
  async sendCheer(friendId, me, sticker) {
    await F.updateDoc(F.doc(db, 'villages', friendId), { [`cheers.n${me.studentNo}`]: { s: sticker, n: me.name, t: Date.now() } });
  },

  // 협동 위기 해결 (트랜잭션: 이미 다른 친구가 해결했으면 실패)
  async helpCrisis(friendId, me) {
    const ref = F.doc(db, 'villages', friendId);
    return F.runTransaction(db, async tx => {
      const snap = await tx.get(ref); if (!snap.exists()) return false;
      const d = snap.data();
      if (!d.crisis || d.crisis.resolved) return false;
      if (d.help && d.help.crisisAt === d.crisis.at) return false;
      tx.update(ref, { help: { crisisAt: d.crisis.at, by: me.name, byNo: me.studentNo, t: Date.now() } });
      return true;
    });
  },
};

// Firestore 에 올릴 내용 (남이 쓰는 cheers/help 는 빼고, 크기 큰 기록은 줄여서)
function snapshot(s) {
  const out = {};
  for (const k of Object.keys(s)) {
    if (k === 'cheers' || k === 'help' || k === 'settings' || k === 'rev' || k === 'sid') continue;
    out[k] = s[k];
  }
  out.recent = (s.recent || []).slice(-15);
  out.warsDone = (s.warsDone || []).slice(-30);
  const w = Object.entries(s.stats?.wrong || {}).sort((a, b) => b[1] - a[1]).slice(0, 60);
  out.stats = { ...s.stats, wrong: Object.fromEntries(w) };
  out.summary = { name: s.name, studentNo: s.studentNo, era: s.era, fame: s.fame, avatar: s.avatar || 0, mapSize: s.mapSize, buildings: s.buildings.length, completed: !!s.completed, solved: s.stats?.solved || 0, correct: s.stats?.correct || 0, pvp: !!s.pvp, warAt: s.warAt || 0, win: s.warStats?.win || 0, lose: s.warStats?.lose || 0, combo: s.bestCombo || 0, relics: Object.values(s.relics || {}).filter(v => v > 0).length, heroes: Object.keys(s.heroes || {}).length, bosses: Object.values(s.bossWins || {}).reduce((a, v) => a + v, 0), teacher: !!s.teacher };
  return JSON.parse(JSON.stringify(out));
}
