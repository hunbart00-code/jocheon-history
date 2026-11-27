// =============================================================
//  역사 위인 16명 — 건물에 배치하면 그 건물 수익 2~3배 + 고유 패시브 발동
//  fav: 이 건물에 배치하면 추가 +0.5배 (역사적으로 관련된 건물)
//  passive.type 은 economy.js 의 getMods 에서 처리
//  look: 도트 초상화 생성 옵션 (sprites.js)
// =============================================================
export const HEROES = [
  { id: 'h_dangun', era: 1, name: '단군왕검', title: '고조선을 세운 임금', kp: 150, gold: 3000, fav: 'altar',
    passive: { type: 'goldMult', v: 0.10, text: '홍익인간: 모든 건물 수익 +10%' },
    desc: '“널리 인간을 이롭게 하라(홍익인간)”는 뜻을 품고 우리 역사 최초의 나라 고조선을 세웠어요.',
    look: { hat: 'headband', hair: '#e8e4dc', beard: 'long', beardColor: '#eeeae2', robe: '#e9dcc0', trim: '#a0522d' } },

  { id: 'h_gwanggaeto', era: 2, name: '광개토대왕', title: '고구려의 정복 군주', kp: 250, gold: 12000, fav: 'gwanggaeto_bi',
    passive: { type: 'expandDisc', v: 0.30, text: '영토 확장 비용 -30%' },
    desc: '고구려의 영토를 크게 넓힌 왕이에요. 신라를 도와 왜를 물리치기도 했어요.',
    look: { hat: 'crown', hatColor: '#e8b730', hair: '#222', beard: 'short', robe: '#b8322b', trim: '#e8b730' } },
  { id: 'h_geunchogo', era: 2, name: '근초고왕', title: '백제 전성기의 왕', kp: 300, gold: 20000, fav: 'muryeong',
    passive: { type: 'buildDisc', v: 0.15, text: '건물 건설 엽전 -15%' },
    desc: '4세기 백제의 전성기를 이끈 왕이에요. 마한을 정복하고 바다 건너 왜와 활발히 교류했어요.',
    look: { hat: 'blackcrown', hatColor: '#e8b730', hair: '#222', beard: 'short', robe: '#6c3c8c', trim: '#e8b730' } },
  { id: 'h_seondeok', era: 2, name: '선덕여왕', title: '신라 최초의 여왕', kp: 350, gold: 28000, fav: 'cheomseong',
    passive: { type: 'kpMult', v: 0.10, text: '퀴즈 KP +10%' },
    desc: '신라 최초의 여왕으로, 첨성대와 황룡사 9층 목탑을 세웠어요.',
    look: { hat: 'goldcrown', hatColor: '#f0c23a', hair: '#1d1d1d', female: true, robe: '#d84f6a', trim: '#f0c23a' } },

  { id: 'h_jangbogo', era: 3, name: '장보고', title: '바다의 왕', kp: 900, gold: 300000, fav: 'cheonghaejin',
    passive: { type: 'storageMin', v: 10, text: '창고 용량 +10분' },
    desc: '청해진을 세워 해적을 물리치고, 신라·당·일본을 잇는 바다 무역을 이끌었어요.',
    look: { hat: 'bandana', hatColor: '#2f6fb3', hair: '#222', beard: 'short', robe: '#3c7fc4', trim: '#f2e3b3' } },
  { id: 'h_daejoyoung', era: 3, name: '대조영', title: '발해를 세운 임금', kp: 1100, gold: 600000, fav: 'sanggyeong',
    passive: { type: 'relicDisc', v: 0.20, text: '유물 발굴 비용 -20%' },
    desc: '고구려가 멸망한 뒤 고구려 사람들과 말갈 사람들을 모아 698년 발해를 세웠어요.',
    look: { hat: 'helmet', hatColor: '#6f7680', hair: '#222', beard: 'short', robe: '#2e6b4f', trim: '#c9a648' } },

  { id: 'h_seohee', era: 4, name: '서희', title: '말로 땅을 얻은 외교관', kp: 2000, gold: 5000000, fav: 'byeokrando',
    passive: { type: 'shield', v: 8, text: '오답 1번 콤보 보호 (정답 8개마다 충전)' },
    desc: '993년 거란 장수 소손녕과 담판을 벌여 전쟁 없이 강동 6주를 얻었어요.',
    look: { hat: 'samo', hair: '#222', beard: 'long', beardColor: '#2a2a2a', robe: '#3e6fb0', trim: '#e9e1c9' } },
  { id: 'h_gangamchan', era: 4, name: '강감찬', title: '귀주 대첩의 영웅', kp: 2500, gold: 9000000, fav: 'janggyeong',
    passive: { type: 'bossKp', v: 0.50, text: '보스전 KP +50%' },
    desc: '1019년 귀주에서 거란의 대군을 크게 물리쳤어요(귀주 대첩).',
    look: { hat: 'helmet', hatColor: '#c99a2e', hair: '#222', beard: 'long', beardColor: '#2a2a2a', robe: '#a33b2f', trim: '#c99a2e' } },

  { id: 'h_sejong', era: 5, name: '세종대왕', title: '훈민정음을 만든 임금', kp: 5000, gold: 80000000, fav: 'jiphyeonjeon',
    passive: { type: 'kpMult', v: 0.15, text: '퀴즈 KP +15%' },
    desc: '백성을 위해 훈민정음을 만들고, 과학 기구와 농사책을 펴내 나라를 발전시켰어요.',
    look: { hat: 'king', hair: '#222', beard: 'short', robe: '#c62f2f', trim: '#f0c23a' } },
  { id: 'h_jangyeongsil', era: 5, name: '장영실', title: '조선의 과학자', kp: 6000, gold: 120000000, fav: 'gyeongbok',
    passive: { type: 'techDisc', v: 0.15, text: '연구 KP 비용 -15%' },
    desc: '신분은 낮았지만 뛰어난 재주로 자격루(물시계)와 앙부일구(해시계) 등을 만들었어요.',
    look: { hat: 'samo', hair: '#222', beard: 'short', robe: '#7a5a3a', trim: '#e9e1c9' } },
  { id: 'h_yisunsin', era: 5, name: '이순신', title: '바다를 지킨 장군', kp: 7000, gold: 200000000, fav: 'turtleship',
    passive: { type: 'crisisMult', v: 2, text: '위기 해결 보상 2배' },
    desc: '임진왜란 때 거북선과 학익진으로 왜군을 물리쳤어요. 명량에서는 13척으로 적을 이겼어요.',
    look: { hat: 'helmet', hatColor: '#3d3d46', hair: '#222', beard: 'long', beardColor: '#2a2a2a', robe: '#7a2b2b', trim: '#c9a648' } },

  { id: 'h_jeongjo', era: 6, name: '정조', title: '개혁 군주', kp: 12000, gold: 1200000000, fav: 'gyujanggak',
    passive: { type: 'feverSec', v: 15, text: '피버 시간 +15초' },
    desc: '규장각을 세워 인재를 기르고, 수원 화성을 쌓아 새로운 정치를 꿈꿨어요.',
    look: { hat: 'king', hair: '#222', beard: 'short', robe: '#c62f2f', trim: '#f0c23a' } },
  { id: 'h_jeongyakyong', era: 6, name: '정약용', title: '실학자', kp: 14000, gold: 2000000000, fav: 'hwaseong',
    passive: { type: 'upgradeDisc', v: 0.15, text: '건물 레벨업 비용 -15%' },
    desc: '거중기를 만들어 수원 화성을 쌓는 데 도움을 주었고, 『목민심서』 등 많은 책을 썼어요.',
    look: { hat: 'gat', hair: '#222', beard: 'long', beardColor: '#333', robe: '#e8eef2', trim: '#9fb6c8' } },

  { id: 'h_yugwansun', era: 7, name: '유관순', title: '3·1 운동의 꽃', kp: 25000, gold: 20000000000, fav: 'dongnipmun',
    passive: { type: 'taMult', v: 0.50, text: '60초 타임어택 보상 +50%' },
    desc: '1919년 3·1 운동 때 천안 아우내 장터에서 독립 만세를 외쳤어요.',
    look: { hat: 'none', hair: '#1d1d1d', female: true, braid: true, robe: '#f4f1ea', trim: '#2b2b33' } },
  { id: 'h_anjunggeun', era: 7, name: '안중근', title: '독립운동가', kp: 30000, gold: 40000000000, fav: 'gyeongin',
    passive: { type: 'fameMult', v: 0.50, text: '명성 획득 +50%' },
    desc: '1909년 하얼빈역에서 나라를 빼앗는 데 앞장선 이토 히로부미를 처단했어요.',
    look: { hat: 'none', hair: '#1d1d1d', beard: 'mustache', robe: '#2b2b33', trim: '#e9e9e9' } },
  { id: 'h_kimgu', era: 7, name: '김구', title: '대한민국 임시 정부 주석', kp: 35000, gold: 70000000000, fav: 'smarttower',
    passive: { type: 'goldMult', v: 0.20, text: '문화의 힘: 모든 건물 수익 +20%' },
    desc: '대한민국 임시 정부를 이끌었어요. 『백범일지』에서 문화의 힘이 강한 나라를 꿈꿨어요.',
    look: { hat: 'none', hair: '#3a3a3a', short: true, glasses: true, robe: '#8a8f96', trim: '#5c6168' } },
];

export const H = Object.fromEntries(HEROES.map(h => [h.id, h]));
