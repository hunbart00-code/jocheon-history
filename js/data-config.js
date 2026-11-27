// =============================================================
//  히스토리 빌더 — 시대 구성 & 밸런스 수치 (여기 숫자만 고치면 게임 전체 난이도가 바뀝니다)
// =============================================================

// 시대별 설정
//  kpPerQ   : 문제 1개 정답 시 기본 KP (콤보·위인·연구 버프가 곱해짐)
//  fee      : 시대 돌파 응시료(KP)
//  streak   : 돌파 퀴즈 연속 정답 수
//  conds    : 돌파 조건 (economy.js 의 checkCond 참고)
//  unlocks  : 이 시대에 새로 열리는 시스템 (안내용)
export const ERAS = [
  null,
  { id: 1, name: '고조선·선사', kpPerQ: 10, fee: 40, streak: 3, sky: '#9fdcef',
    unlocks: ['기본 건설 (4×4 마을)'],
    conds: [{ type: 'eraTypes', era: 1, n: 3, minLv: 1, label: '1단계 건물 3종 건설' }] },
  { id: 2, name: '삼국 시대', kpPerQ: 18, fee: 80, streak: 4, sky: '#a3dcef',
    unlocks: ['역사 위인 영입', '60초 타임어택'],
    conds: [{ type: 'eraTypes', era: 2, n: 3, minLv: 3, label: '삼국 건물 3종 Lv.3 이상' },
            { type: 'heroes', n: 1, label: '역사 위인 1명 영입' }] },
  { id: 3, name: '통일신라·발해', kpPerQ: 28, fee: 200, streak: 4, sky: '#a7dbea',
    unlocks: ['유물 발굴', '6×6 영토 확장', '협동 위기 이벤트'],
    conds: [{ type: 'eraTypes', era: 3, n: 3, minLv: 1, label: '통일신라·발해 건물 3종 건설' },
            { type: 'mapSize', size: 6, label: '마을 6×6 확장' },
            { type: 'relics', n: 5, label: '서로 다른 유물 5종 발굴' }] },
  { id: 4, name: '고려 시대', kpPerQ: 50, fee: 500, streak: 5, sky: '#abd9e6',
    unlocks: ['역사 연구소 (테크트리)'],
    conds: [{ type: 'eraTypes', era: 4, n: 2, minLv: 1, label: '고려 건물 2종 건설' },
            { type: 'techs', n: 3, label: '연구 3종 완료' },
            { type: 'maxLv', lv: 5, n: 1, label: '건물 1채 Lv.5 달성' }] },
  { id: 5, name: '조선 전기', kpPerQ: 110, fee: 1200, streak: 5, sky: '#b2dbe4',
    unlocks: ['8×8 최종 확장', '시너지 강화 (+25% → +50%)'],
    conds: [{ type: 'eraTypes', era: 5, n: 2, minLv: 1, label: '조선 전기 건물 2종 건설' },
            { type: 'mapSize', size: 8, label: '마을 8×8 확장' },
            { type: 'synergy', n: 2, label: '시너지 2쌍 배치' }] },
  { id: 6, name: '조선 후기', kpPerQ: 170, fee: 2500, streak: 6, sky: '#bcdde2',
    unlocks: ['역사 보스전'],
    conds: [{ type: 'eraTypes', era: 6, n: 2, minLv: 1, label: '조선 후기 건물 2종 건설' },
            { type: 'maxLv', lv: 7, n: 2, label: '건물 2채 Lv.7 이상' },
            { type: 'boss', n: 1, label: '보스전 1회 승리' }] },
  { id: 7, name: '근현대·대한민국', kpPerQ: 280, fee: 6000, streak: 7, sky: '#c8e4ec',
    unlocks: ['국보 대역사 (대한민국 역사관)', '무한 명예 랭킹'],
    conds: [{ type: 'wonder', stage: 5, label: '대역사 5단계 완공' }] },
  // ---- v1.7: 역사 너머의 시대 (수학·영어 문제가 함께 나와요) ----
  { id: 8, name: '현대 대한민국', kpPerQ: 420, fee: 12000, streak: 7, sky: '#bfe3f2',
    unlocks: ['수학·영어 문제', '10×10 영토 확장', '첨단 연구'],
    conds: [{ type: 'eraTypes', era: 8, n: 3, minLv: 1, label: '현대 건물 3종 건설' },
            { type: 'mapSize', size: 10, label: '마을 10×10 확장' },
            { type: 'subj', n: 30, label: '수학·영어 문제 30개 맞히기' }] },
  { id: 9, name: '우주 시대', kpPerQ: 600, fee: 25000, streak: 8, sky: '#0d1b3d', theme: 'space',
    unlocks: ['우주 유물', '우주 연구', '달빛 마을'],
    conds: [{ type: 'eraTypes', era: 9, n: 3, minLv: 3, label: '우주 건물 3종 Lv.3 이상' },
            { type: 'techs', n: 18, label: '연구 18종 완료' },
            { type: 'relics', n: 40, label: '서로 다른 유물 40종 발굴' },
            { type: 'subj', n: 80, label: '수학·영어 문제 80개 맞히기' }] },
  { id: 10, name: '외계 시대', kpPerQ: 850, fee: 50000, streak: 8, sky: '#2a1048', theme: 'alien',
    unlocks: ['은하 연합', '외계 유물'],
    conds: [{ type: 'eraTypes', era: 10, n: 4, minLv: 5, label: '외계 건물 4종 Lv.5 이상' },
            { type: 'maxLv', lv: 10, n: 8, label: '건물 8채 Lv.10 달성' },
            { type: 'relics', n: 50, label: '서로 다른 유물 50종 발굴' },
            { type: 'subj', n: 150, label: '수학·영어 문제 150개 맞히기' }] },
];

export const MAX_ERA = 10;
export const HISTORY_ERA = 7;   // 한국사 문제가 있는 마지막 시대 (8단계부터는 총복습 + 수학·영어)

// 영토 확장 (지도 크기 → 비용). 4×4는 기본.
export const EXPAND = {
  6: { era: 3, kp: 1200, gold: 400000 },
  8: { era: 5, kp: 6000, gold: 300000000 },
  10: { era: 8, kp: 30000, gold: 500000000000 },
};

export const BAL = {
  startGold: 150,
  // 건물 레벨업: 비용 = 기본가 × upgradeMult^현재레벨, 수익 = 레벨당 +80%
  upgradeMult: 2.1,
  incomePerLv: 0.8,
  maxLv: 10,
  evolveLv: [5, 10],          // 외형 진화 + 수익 2배 보너스
  // 같은 건물 추가 건설: 엽전 = 기본가 × copyMult^(이미 지은 수)
  copyMult: 1.6,
  maxCopies: 3,
  // 창고
  storageMin: 15,
  // 퀴즈
  combo3: 1.5,                // 3연속
  combo5: 2.0,                // 5연속(피버)
  feverSec: 30,               // 피버: 엽전 수익 2배
  feverGold: 2,
  wrongCooldown: 5,           // 오답 쿨타임(초)
  requeueAfter: 3,            // 오답은 n문제 뒤 다시 출제
  prevEraRatio: 0.3,          // 이전 시대 문제 비율
  // 배치 시너지
  synergyBonus: 0.25,
  synergyBonusBoosted: 0.5,   // 5단계(조선 전기)부터
  synergyBoostEra: 5,
  // 위인
  heroBase: 2.0, heroPerLv: 0.125, heroFav: 0.5, heroMaxLv: 5,
  // 유물 세트
  setBonus: 0.5,
  relicRates: { common: 0.55, rare: 0.28, treasure: 0.13, national: 0.04 },
  relicPity: 5,               // 5번 연속 중복이면 다음은 새 유물 확정
  // 타임어택
  taSec: 60, taCooldownMin: 20, taKpRatio: 0.6, taGoldSec: 20,
  // 보스전 (6단계~ 반복 도전) · 시대 돌파 보스전 공통
  bossQ: 8, bossCooldownMin: 20, bossKpQ: 15,
  battleHearts: 5,            // 내 체력(하트)
  battleCrit: 3,              // n연속 정답부터 필살 공격(2칸)
  // 친구 전쟁 (PvP)
  war: {
    minEra: 2,                // 2단계부터 전쟁 가능
    daily: 3,                 // 하루 선전포고 횟수
    pendingMin: 10,           // 선전포고 응답 대기(분)
    protectMin: 20,           // 전쟁 뒤 보호 시간(분) — 이 시간엔 공격받지 않아요
    quizN: 5,                 // 전투 준비 퀴즈 수 (실력 대결)
    quizBonus: 0.10,          // 정답 1개당 전투력 +10%
    speedBonus: 0.05,         // 빨리 맞히면 최대 +5% 더 (3초 안 = 만점, 12초면 0)
    qSec: 15,                 // 문제당 제한 시간(초)
    luck: 0.05,               // 운은 ±5%만 — 실력(퀴즈)이 승부를 가르도록
    payRate: { close: 0.05, clear: 0.1, crush: 0.15 },  // 진 쪽이 내는 배상금(가진 엽전의 %)
    heroBase: 0.15, heroPerLv: 0.05, heroMilitary: 0.15, maxHeroes: 3,
    defendBonus: 0.1,         // 수비 쪽 성벽 보너스
    tiredMin: 10,             // 전쟁 뒤 일손 부족(분)
    winFame: 40, winKpQ: 6, loseKpQ: 2,
    repairRate: 0.25,         // 수리비 = 건물 엽전 가격 × 레벨 × 이 값
  },
  // 학급 채팅
  chat: { maxLen: 60, gapSec: 4, keep: 50 },
  // 협동 위기
  crisisEveryMin: 20, crisisDaily: 5, crisisKpQ: 3, crisisGoldSec: 60,
  // 친구 마을 함께 놀기: OX 퀴즈 정답 KP는 하루 30문제까지, 보물은 하루 25개까지 (엽전 꾸러미 = 15초치 수익, 보물 상자는 3배)
  oxDaily: 30, treasureDaily: 25, treasureSec: 15,
  // 대역사
  wonderIncomeBonus: 0.15,    // 단계당 전체 수익 +15%
  // 명성
  fame: { era: 100, set: 200, wonder: 500, boss: 60, dup: { common: 2, rare: 5, treasure: 12, national: 30 }, endless: 1 },
  // 유물 발굴 비용(엽전) — 현재 시대 기준
  relicCost: [0, 0, 0, 30000, 900000, 25000000, 600000000, 15000000000, 300000000000, 6000000000000, 120000000000000],
};

// 시대 돌파 보스 — 정답이면 공격, 틀리면 내 하트가 줄어요. hp = 맞혀야 하는 공격 수
export const ERA_BOSSES = [
  null,
  { id: 'e_han',    name: '한나라 대군',        foe: '한나라군',   hp: 5,
    story: '기원전 109년, 한나라 군대가 고조선의 왕검성으로 쳐들어왔어요. 고조선 사람들은 1년 가까이 성을 지키며 맞섰어요. 이번엔 우리가 끝까지 지켜 내요!' },
  { id: 'e_sui',    name: '수나라 113만 대군',  foe: '수나라군',   hp: 6,
    story: '612년 수나라가 113만 대군으로 고구려를 침략했어요. 을지문덕 장군처럼 살수에서 적을 크게 물리쳐 봐요!' },
  { id: 'e_tang',   name: '나당 전쟁',          foe: '당나라군',   hp: 7,
    story: '삼국 통일 뒤 당나라가 한반도 전체를 차지하려 했어요. 신라는 매소성과 기벌포 싸움에서 당나라 군대를 몰아냈어요!' },
  { id: 'b_khitan', name: '거란의 침입',        foe: '거란군',     hp: 8,
    story: '1018년 거란이 10만 대군으로 다시 쳐들어왔어요. 강감찬 장군처럼 귀주에서 크게 물리쳐요!' },
  { id: 'b_imjin',  name: '임진왜란',           foe: '왜군',       hp: 9,
    story: '1592년 일본이 조선을 침략했어요. 바다의 이순신 장군과 곳곳의 의병처럼 나라를 지켜 내요!' },
  { id: 'b_yangyo', name: '병인양요·신미양요',  foe: '서양 함대',  hp: 10,
    story: '프랑스와 미국 함대가 강화도를 공격했어요. 양헌수·어재연 장군처럼 강화도를 지켜요!' },
  { id: 'e_mangak', name: '망각 대마왕',        foe: '역사를 잊게 만드는 그림자', hp: 12,
    story: '“역사를 잊은 민족에게 미래는 없다.” 우리 역사를 잊게 만드는 망각 대마왕이 나타났어요. 반만년 역사 지식으로 물리쳐요!' },
  { id: 'e_smog',   name: '스모그 괴물',        foe: '공장 매연과 미세 먼지', hp: 12, mix: true,
    story: '빠르게 발전한 도시에 매연과 미세 먼지를 먹고 자란 스모그 괴물이 나타났어요. 역사·수학·영어 실력으로 맑은 하늘을 되찾아요!' },
  { id: 'e_meteor', name: '우주 쓰레기 폭풍',   foe: '부서진 인공위성 조각', hp: 14, mix: true,
    story: '고장 난 인공위성과 로켓 조각이 모여 거대한 폭풍이 되었어요. 우주 정거장을 지키려면 정확한 계산과 지식이 필요해요!' },
  { id: 'e_alien',  name: '제노 함대 사령관',   foe: '은하 침략 함대', hp: 16, mix: true,
    story: '은하 저편에서 제노 함대가 나타나 “지식이 없는 행성은 우리 것!”이라고 외쳐요. 지금까지 배운 모든 것으로 지구를 지켜요!' },
];

// 역사 보스전 (6단계~). questionEras: 출제 시대
export const BOSSES = [
  { id: 'b_khitan',  name: '거란의 침입',       foe: '거란군',    era: 4, questionEras: [4],    color: '#6b4f2a', hero: '서희·강감찬',
    story: '993년부터 거란이 세 차례 고려를 침입했어요. 외교와 전투로 나라를 지켜 봅시다!' },
  { id: 'b_mongol',  name: '몽골의 침입',       foe: '몽골군',    era: 4, questionEras: [4],    color: '#4b5a6b', hero: '김윤후·삼별초',
    story: '세계 제국 몽골이 쳐들어왔어요. 강화도로 도읍을 옮기고 끝까지 맞서 싸웁시다!' },
  { id: 'b_imjin',   name: '임진왜란',          foe: '왜군',      era: 5, questionEras: [5],    color: '#7a2f2f', hero: '이순신·의병',
    story: '1592년 일본이 조선을 침략했어요. 바다와 땅에서 나라를 지켜 냅시다!' },
  { id: 'b_byeongja',name: '병자호란',          foe: '청군',      era: 6, questionEras: [6],    color: '#3f4a3c', hero: '남한산성의 사람들',
    story: '1636년 청나라가 침입했어요. 남한산성에서 버틴 역사를 기억하며 문제를 풀어 봐요!' },
  { id: 'b_yangyo',  name: '병인양요·신미양요', foe: '서양 함대', era: 6, questionEras: [6, 7], color: '#2f4a6b', hero: '양헌수·어재연',
    story: '프랑스와 미국 함대가 강화도에 쳐들어왔어요. 강화도를 지켜 냅시다!' },
];

// 협동 위기 이벤트 — 시대에 맞는 위기 문구
export const CRISES = [
  { id: 'c_flood',  name: '큰 홍수',      text: '강물이 넘쳐 마을이 잠기려 해요!' },
  { id: 'c_drought',name: '가뭄',         text: '비가 오지 않아 논밭이 말라 가요!' },
  { id: 'c_fire',   name: '불이 났어요',  text: '마을 건물에 불이 붙었어요!' },
  { id: 'c_pirate', name: '해적 출몰',    text: '바닷가에 해적이 나타났어요!' },
  { id: 'c_plague', name: '돌림병',       text: '마을에 돌림병이 돌아요!' },
  { id: 'c_thief',  name: '도둑 소동',    text: '창고에 도둑이 들었어요!' },
];

// 명성으로 열리는 특수 꾸미기
export const FAME_DECOR = [
  { id: 'd_jangseung', fame: 150 },
  { id: 'd_pond', fame: 500 },
  { id: 'd_lantern', fame: 1200 },
  { id: 'd_flagpole', fame: 3000 },
];
