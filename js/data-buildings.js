// =============================================================
//  건물 데이터 — kp/gold: 첫 건설(해금) 비용, inc: Lv.1 초당 엽전 수익
//  같은 건물은 최대 BAL.maxCopies 채까지 (추가분은 엽전만, 1.6배씩 비싸짐)
// =============================================================
export const BUILDINGS = [
  // ---- 1단계 고조선·선사 ----
  { id: 'umjip', era: 1, name: '움집', kp: 0, gold: 50, inc: 0.8, maxCopies: 5,
    desc: '신석기 시대 사람들이 땅을 파고 기둥을 세워 지은 집이에요. 한곳에 머물러 살며 농사를 짓기 시작했어요.' },
  { id: 'goindol', era: 1, name: '고인돌', kp: 80, gold: 300, inc: 5.0,
    desc: '청동기 시대 지배자의 무덤이에요. 큰 돌을 옮기려면 많은 사람이 필요했으니, 힘센 지배자가 있었다는 증거예요.' },
  { id: 'altar', era: 1, name: '청동 제단', kp: 180, gold: 1000, inc: 17,
    desc: '고조선의 단군왕검은 제사와 정치를 함께 맡았어요. 청동 거울과 방울은 제사에 쓰인 귀한 물건이에요.' },

  // ---- 2단계 삼국 시대 ----
  { id: 'cheomseong', era: 2, name: '첨성대', kp: 250, gold: 5000, inc: 25,
    desc: '신라 선덕여왕 때 경주에 세운 천문대예요. 하늘과 별을 관찰해 농사와 나랏일에 활용했어요.' },
  { id: 'muryeong', era: 2, name: '무령왕릉', kp: 400, gold: 15000, inc: 75,
    desc: '백제 무령왕과 왕비의 무덤이에요. 1971년 충남 공주에서 발견되었고, 벽돌로 쌓은 무덤 안에서 많은 유물이 나왔어요.' },
  { id: 'gwanggaeto_bi', era: 2, name: '광개토대왕릉비', kp: 600, gold: 40000, inc: 200,
    desc: '고구려 장수왕이 아버지 광개토대왕의 업적을 새겨 세운 비석이에요. 높이가 6m가 넘어요.' },

  // ---- 3단계 통일신라·발해 ----
  { id: 'bulguksa', era: 3, name: '불국사', kp: 700, gold: 70000, inc: 117,
    desc: '통일신라 때 김대성이 짓기 시작한 절이에요. 다보탑과 석가탑이 있고, 유네스코 세계 유산이에요.' },
  { id: 'seokguram', era: 3, name: '석굴암', kp: 900, gold: 120000, inc: 200,
    desc: '김대성이 불국사와 함께 만든, 돌을 쌓아 만든 인공 석굴이에요. 본존불의 아름다움으로 유명해요.' },
  { id: 'sanggyeong', era: 3, name: '상경성 주작대로', kp: 1300, gold: 300000, inc: 500,
    desc: '발해의 수도 상경성에는 넓은 큰길이 곧게 뻗어 있었어요. 발해는 ‘해동성국(바다 동쪽의 번성한 나라)’이라 불렸어요.' },
  { id: 'cheonghaejin', era: 3, name: '청해진', kp: 1800, gold: 700000, inc: 1170,
    desc: '장보고가 지금의 완도에 세운 해상 기지예요. 해적을 물리치고 신라·당·일본을 잇는 바다 무역을 이끌었어요.' },

  // ---- 4단계 고려 ----
  { id: 'kiln', era: 4, name: '청자 가마터', kp: 2500, gold: 2000000, inc: 1330,
    desc: '고려 사람들은 비취색 고려청자를 구웠어요. 무늬를 파내고 다른 흙을 메우는 상감 기법은 고려만의 기술이에요.' },
  { id: 'byeokrando', era: 4, name: '벽란도', kp: 3500, gold: 5000000, inc: 3330,
    desc: '개경 가까운 예성강의 국제 무역항이에요. 아라비아 상인도 찾아와 ‘코리아’라는 이름이 세계에 알려졌어요.' },
  { id: 'janggyeong', era: 4, name: '팔만대장경판전', kp: 5000, gold: 12000000, inc: 8000,
    desc: '몽골이 쳐들어왔을 때 부처의 힘으로 나라를 지키려고 새긴 팔만대장경을 보관하는 건물이에요. 합천 해인사에 있어요.' },

  // ---- 5단계 조선 전기 ----
  { id: 'jiphyeonjeon', era: 5, name: '집현전', kp: 7000, gold: 35000000, inc: 11700,
    desc: '세종대왕이 학자들을 모아 연구하게 한 기관이에요. 학자들은 훈민정음 해례본을 쓰고 많은 책을 펴냈어요.' },
  { id: 'gyeongbok', era: 5, name: '경복궁', kp: 10000, gold: 90000000, inc: 30000,
    desc: '조선을 세운 뒤 한양에 지은 으뜸 궁궐이에요. 임진왜란 때 불탔다가 흥선대원군이 다시 지었어요.' },
  { id: 'turtleship', era: 5, name: '거북선 조선소', kp: 14000, gold: 220000000, inc: 73300,
    desc: '이순신 장군은 임진왜란 때 거북선을 앞세워 왜군을 물리쳤어요. 지붕에 쇠못을 꽂아 적이 올라타지 못하게 했어요.' },

  // ---- 6단계 조선 후기 ----
  { id: 'hwaseong', era: 6, name: '수원 화성', kp: 20000, gold: 600000000, inc: 120000,
    desc: '정조가 정약용의 거중기 등을 이용해 쌓은 성이에요. 유네스코 세계 유산이에요.' },
  { id: 'gyujanggak', era: 6, name: '규장각', kp: 28000, gold: 1500000000, inc: 300000,
    desc: '정조가 세운 왕실 도서관이자 학문 연구 기관이에요. 능력 있는 인재를 길러 개혁을 이끌었어요.' },
  { id: 'daedong_store', era: 6, name: '대동법 창고', kp: 38000, gold: 4000000000, inc: 800000,
    desc: '대동법은 특산물을 바치던 공납을 쌀이나 옷감, 동전으로 내게 한 제도예요. 백성의 부담이 줄었어요.' },

  // ---- 7단계 근현대·대한민국 ----
  { id: 'dongnipmun', era: 7, name: '독립문', kp: 55000, gold: 12000000000, inc: 1500000,
    desc: '독립협회가 자주독립의 뜻을 담아 1897년 서울에 세운 문이에요.' },
  { id: 'gyeongin', era: 7, name: '경인선 철도', kp: 80000, gold: 35000000000, inc: 4380000,
    desc: '1899년 개통한 우리나라 최초의 철도예요. 서울 노량진과 인천 제물포를 이었어요.' },
  { id: 'smarttower', era: 7, name: '스마트 타워', kp: 120000, gold: 100000000000, inc: 12500000,
    desc: '전쟁의 폐허를 딛고 대한민국은 빠르게 경제를 발전시켰어요. 오늘날 반도체·정보 통신 기술을 이끄는 나라가 되었어요.' },
];

// ---- 8단계 현대 대한민국 ----
BUILDINGS.push(
  { id: 'ktx', era: 8, name: 'KTX 고속 철도역', kp: 90000, gold: 260000000000, inc: 32000000,
    desc: '2004년 개통한 고속 철도 KTX는 서울과 부산 사이를 2시간대로 이어 주었어요. 전국이 하루 생활권이 되었어요.' },
  { id: 'olympic88', era: 8, name: '서울 올림픽 경기장', kp: 120000, gold: 650000000000, inc: 80000000,
    desc: '1988년 서울에서 하계 올림픽이 열렸어요. 전쟁의 폐허를 딛고 일어선 대한민국을 세계에 알린 큰 잔치였어요.' },
  { id: 'semicon', era: 8, name: '반도체 공장', kp: 160000, gold: 1600000000000, inc: 200000000,
    desc: '반도체는 컴퓨터와 스마트폰의 두뇌 역할을 하는 부품이에요. 우리나라는 세계에서 손꼽히는 반도체 생산 국가예요.' },
  { id: 'airport', era: 8, name: '국제공항', kp: 210000, gold: 4000000000000, inc: 500000000,
    desc: '2001년 문을 연 인천국제공항은 세계 여러 나라를 잇는 하늘길의 관문이에요.' },
  // ---- 9단계 우주 시대 ----
  { id: 'naro', era: 9, name: '나로우주센터 발사대', kp: 280000, gold: 10000000000000, inc: 1250000000,
    desc: '전라남도 고흥의 나로우주센터에서 우리 기술로 만든 로켓 ‘누리호’를 쏘아 올렸어요.' },
  { id: 'radiotel', era: 9, name: '전파 망원경', kp: 360000, gold: 25000000000000, inc: 3100000000,
    desc: '아주 먼 우주에서 오는 전파를 커다란 접시 안테나로 모아 별과 은하를 연구해요.' },
  { id: 'spacestation', era: 9, name: '우주 정거장', kp: 460000, gold: 60000000000000, inc: 7500000000,
    desc: '지구 둘레를 도는 우주 정거장에서 우주인들이 여러 나라와 함께 실험하며 지내요.' },
  { id: 'moonbase', era: 9, name: '달 기지', kp: 600000, gold: 150000000000000, inc: 19000000000,
    desc: '달에 기지를 세우면 더 먼 우주로 나아가는 디딤돌이 될 거예요. 우리 반이 상상하는 미래의 기지예요.' },
  // ---- 10단계 외계 시대 (상상의 미래) ----
  { id: 'xenolab', era: 10, name: '외계 교류 센터', kp: 780000, gold: 380000000000000, inc: 47000000000,
    desc: '외계 친구들과 서로의 말과 글을 배우며 역사를 나누는 곳이에요. 훈민정음처럼 쉬운 글자가 우주에서도 인기래요!' },
  { id: 'crystal', era: 10, name: '수정 에너지 발전소', kp: 1000000, gold: 950000000000000, inc: 120000000000,
    desc: '빛나는 외계 수정에서 깨끗한 에너지를 얻는 상상의 발전소예요. 매연이 전혀 나오지 않아요.' },
  { id: 'floatgarden', era: 10, name: '반중력 공중 정원', kp: 1300000, gold: 2400000000000000, inc: 300000000000,
    desc: '땅에서 둥실 떠 있는 정원이에요. 지구의 나무와 외계의 꽃이 함께 자라요.' },
  { id: 'stargate', era: 10, name: '은하 관문', kp: 1700000, gold: 6000000000000000, inc: 750000000000,
    desc: '먼 별까지 한 번에 이어 주는 상상의 문이에요. 은하 연합의 친구들이 우리 마을을 찾아와요.' },
);

// 꾸미기 (수익 없음, 칸 차지) — fame 값이 있으면 명성으로 해금
export const DECOR = [
  { id: 'd_pine', name: '소나무', era: 1, gold: 40, desc: '사계절 푸른 소나무예요.' },
  { id: 'd_flower', name: '꽃밭', era: 1, gold: 120, desc: '알록달록 꽃밭이에요.' },
  { id: 'd_road', name: '돌길', era: 1, gold: 30, desc: '마을 사이를 잇는 돌길이에요.' },
  { id: 'd_stonetower', name: '돌탑', era: 2, gold: 2000, desc: '소원을 빌며 쌓은 돌탑이에요.' },
  { id: 'd_jangseung', name: '장승', era: 1, gold: 500, fame: 150, desc: '마을 입구를 지키는 수호신이에요. (명성 150)' },
  { id: 'd_pond', name: '연못', era: 1, gold: 5000, fame: 500, desc: '연꽃이 핀 연못이에요. (명성 500)' },
  { id: 'd_lantern', name: '석등', era: 1, gold: 50000, fame: 1200, desc: '어둠을 밝히는 돌 등이에요. (명성 1200)' },
  { id: 'd_flagpole', name: '태극기 게양대', era: 1, gold: 500000, fame: 3000, desc: '자랑스러운 태극기예요. (명성 3000)' },
];

// 대역사(원더) — 7단계, 2×2 칸, 5단계 완공
export const WONDER = {
  id: 'wonder', name: '대한민국 역사관', size: 2,
  desc: '우리 반이 함께 지켜 온 반만년 역사를 담는 국보급 박물관이에요. 5단계를 모두 완공하면 역사 완성!',
  stages: [
    { name: '터 다지기', kp: 15000, gold: 20000000000 },
    { name: '기둥 세우기', kp: 20000, gold: 50000000000 },
    { name: '전시관 짓기', kp: 25000, gold: 100000000000 },
    { name: '지붕 올리기', kp: 30000, gold: 200000000000 },
    { name: '완공 및 개관', kp: 40000, gold: 400000000000 },
  ],
};

// 배치 시너지 — 상하좌우로 붙어 있으면 두 건물 모두 수익 증가
export const SYNERGIES = [
  { id: 's_bronze', a: 'goindol', b: 'altar', name: '청동기의 지배자' },
  { id: 's_kings', a: 'muryeong', b: 'gwanggaeto_bi', name: '삼국의 위대한 왕' },
  { id: 's_balhae', a: 'sanggyeong', b: 'gwanggaeto_bi', name: '고구려를 이은 발해' },
  { id: 's_daeseong', a: 'bulguksa', b: 'seokguram', name: '김대성의 두 걸작' },
  { id: 's_science', a: 'cheomseong', b: 'jiphyeonjeon', name: '하늘을 연구한 과학' },
  { id: 's_sea', a: 'cheonghaejin', b: 'byeokrando', name: '바닷길 무역' },
  { id: 's_goryeo', a: 'kiln', b: 'janggyeong', name: '고려의 문화유산' },
  { id: 's_sejong', a: 'jiphyeonjeon', b: 'gyeongbok', name: '세종의 학문 정치' },
  { id: 's_navy', a: 'turtleship', b: 'cheonghaejin', name: '바다를 지킨 사람들' },
  { id: 's_jeongjo', a: 'hwaseong', b: 'gyujanggak', name: '정조의 개혁' },
  { id: 's_people', a: 'daedong_store', b: 'umjip', name: '백성의 살림' },
  { id: 's_modern', a: 'dongnipmun', b: 'gyeongin', name: '근대의 시작' },
  { id: 's_future', a: 'gyeongin', b: 'smarttower', name: '발전하는 대한민국' },
  { id: 's_rail', a: 'ktx', b: 'gyeongin', name: '철길 120년' },
  { id: 's_world', a: 'olympic88', b: 'airport', name: '세계로 나아가는 대한민국' },
  { id: 's_chip', a: 'semicon', b: 'smarttower', name: '반도체 강국' },
  { id: 's_launch', a: 'naro', b: 'radiotel', name: '우주를 향한 눈과 날개' },
  { id: 's_orbit', a: 'spacestation', b: 'moonbase', name: '지구와 달 사이' },
  { id: 's_sky', a: 'cheomseong', b: 'radiotel', name: '천 년을 이은 하늘 관측' },
  { id: 's_xeno', a: 'xenolab', b: 'jiphyeonjeon', name: '우주로 간 한글' },
  { id: 's_energy', a: 'crystal', b: 'floatgarden', name: '깨끗한 외계 에너지' },
  { id: 's_gate', a: 'stargate', b: 'spacestation', name: '은하 고속도로' },
];

export const B = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const D = Object.fromEntries(DECOR.map(d => [d.id, d]));
