// =============================================================
//  영어 문제 — 5학년 영어 (낱말·의사소통 표현). 알파벳이 아직 서툰 친구도 풀 수 있게
//  문제는 우리말로 묻고, 그림 이모지로 뜻을 함께 보여 줘요.
//   종류: 뜻 고르기(w) · 영어 고르기(k) · 첫 글자(f) · 뜻 O/X(o) · 상황 표현(x) · 표현의 뜻(xm)
// =============================================================

// [영어, 우리말 뜻, 그림, 묶음]
export const WORDS = [
  // 동물
  ['cat', '고양이', '🐱', 'animal'], ['dog', '개', '🐶', 'animal'], ['bird', '새', '🐦', 'animal'], ['fish', '물고기', '🐟', 'animal'],
  ['horse', '말', '🐴', 'animal'], ['rabbit', '토끼', '🐰', 'animal'], ['tiger', '호랑이', '🐯', 'animal'], ['lion', '사자', '🦁', 'animal'],
  ['monkey', '원숭이', '🐵', 'animal'], ['elephant', '코끼리', '🐘', 'animal'], ['bear', '곰', '🐻', 'animal'], ['duck', '오리', '🦆', 'animal'],
  ['pig', '돼지', '🐷', 'animal'], ['cow', '소', '🐮', 'animal'], ['frog', '개구리', '🐸', 'animal'], ['panda', '판다', '🐼', 'animal'],
  // 음식·과일
  ['apple', '사과', '🍎', 'food'], ['banana', '바나나', '🍌', 'food'], ['grape', '포도', '🍇', 'food'], ['orange', '오렌지', '🍊', 'food'],
  ['strawberry', '딸기', '🍓', 'food'], ['watermelon', '수박', '🍉', 'food'], ['bread', '빵', '🍞', 'food'], ['milk', '우유', '🥛', 'food'],
  ['pizza', '피자', '🍕', 'food'], ['rice', '밥', '🍚', 'food'], ['egg', '달걀', '🥚', 'food'], ['juice', '주스', '🧃', 'food'],
  ['cake', '케이크', '🍰', 'food'], ['carrot', '당근', '🥕', 'food'], ['water', '물', '💧', 'food'], ['chicken', '닭고기', '🍗', 'food'],
  // 색깔
  ['red', '빨간색', '🟥', 'color'], ['blue', '파란색', '🟦', 'color'], ['yellow', '노란색', '🟨', 'color'], ['green', '초록색', '🟩', 'color'],
  ['black', '검은색', '⬛', 'color'], ['white', '흰색', '⬜', 'color'], ['pink', '분홍색', '🩷', 'color'], ['purple', '보라색', '🟪', 'color'],
  ['brown', '갈색', '🟫', 'color'], ['gray', '회색', '🩶', 'color'],
  // 가족·사람
  ['mother', '어머니', '👩', 'family'], ['father', '아버지', '👨', 'family'], ['sister', '언니·누나·여동생', '👧', 'family'], ['brother', '형·오빠·남동생', '👦', 'family'],
  ['grandmother', '할머니', '👵', 'family'], ['grandfather', '할아버지', '👴', 'family'], ['baby', '아기', '👶', 'family'], ['friend', '친구', '🧑‍🤝‍🧑', 'family'],
  ['teacher', '선생님', '🧑‍🏫', 'job'], ['doctor', '의사', '🧑‍⚕️', 'job'], ['cook', '요리사', '🧑‍🍳', 'job'], ['police officer', '경찰관', '👮', 'job'],
  ['firefighter', '소방관', '🧑‍🚒', 'job'], ['singer', '가수', '🎤', 'job'], ['farmer', '농부', '🧑‍🌾', 'job'], ['scientist', '과학자', '🧑‍🔬', 'job'],
  ['pilot', '조종사', '🧑‍✈️', 'job'], ['astronaut', '우주 비행사', '🧑‍🚀', 'job'],
  // 학교·과목·물건
  ['book', '책', '📕', 'school'], ['pencil', '연필', '✏️', 'school'], ['eraser', '지우개', '🧽', 'school'], ['bag', '가방', '🎒', 'school'],
  ['desk', '책상', '🪑', 'school'], ['ruler', '자', '📏', 'school'], ['scissors', '가위', '✂️', 'school'], ['clock', '시계', '🕒', 'school'],
  ['math', '수학', '➗', 'subject'], ['science', '과학', '🔬', 'subject'], ['music', '음악', '🎵', 'subject'], ['art', '미술', '🎨', 'subject'],
  ['English', '영어', '🔤', 'subject'], ['Korean', '국어', '📖', 'subject'], ['P.E.', '체육', '🤸', 'subject'], ['social studies', '사회', '🗺️', 'subject'],
  // 장소
  ['school', '학교', '🏫', 'place'], ['library', '도서관', '📚', 'place'], ['hospital', '병원', '🏥', 'place'], ['park', '공원', '🌳', 'place'],
  ['bank', '은행', '🏦', 'place'], ['museum', '박물관', '🏛️', 'place'], ['zoo', '동물원', '🦓', 'place'], ['market', '시장', '🛒', 'place'],
  ['post office', '우체국', '📮', 'place'], ['bakery', '빵집', '🥐', 'place'], ['house', '집', '🏠', 'place'], ['station', '역', '🚉', 'place'],
  // 날씨·자연
  ['sunny', '맑은', '☀️', 'weather'], ['rainy', '비 오는', '🌧️', 'weather'], ['snowy', '눈 오는', '❄️', 'weather'], ['cloudy', '흐린', '☁️', 'weather'],
  ['windy', '바람 부는', '🌬️', 'weather'], ['hot', '더운', '🥵', 'weather'], ['cold', '추운', '🥶', 'weather'], ['warm', '따뜻한', '🌤️', 'weather'],
  ['sun', '해', '🌞', 'nature'], ['moon', '달', '🌙', 'nature'], ['star', '별', '⭐', 'nature'], ['tree', '나무', '🌲', 'nature'],
  ['flower', '꽃', '🌸', 'nature'], ['sea', '바다', '🌊', 'nature'], ['mountain', '산', '⛰️', 'nature'], ['river', '강', '🏞️', 'nature'],
  // 몸·감정
  ['head', '머리', '🙆', 'body'], ['eye', '눈', '👁️', 'body'], ['ear', '귀', '👂', 'body'], ['nose', '코', '👃', 'body'],
  ['mouth', '입', '👄', 'body'], ['hand', '손', '✋', 'body'], ['foot', '발', '🦶', 'body'], ['tooth', '이(치아)', '🦷', 'body'],
  ['happy', '행복한', '😊', 'feel'], ['sad', '슬픈', '😢', 'feel'], ['angry', '화난', '😠', 'feel'], ['tired', '피곤한', '😪', 'feel'],
  ['hungry', '배고픈', '🤤', 'feel'], ['sick', '아픈', '🤒', 'feel'], ['scared', '무서워하는', '😨', 'feel'], ['excited', '신이 난', '🤩', 'feel'],
  // 탈것·운동
  ['bus', '버스', '🚌', 'move'], ['car', '자동차', '🚗', 'move'], ['bike', '자전거', '🚲', 'move'], ['train', '기차', '🚆', 'move'],
  ['airplane', '비행기', '✈️', 'move'], ['ship', '배', '🚢', 'move'], ['subway', '지하철', '🚇', 'move'], ['rocket', '로켓', '🚀', 'move'],
  ['soccer', '축구', '⚽', 'sport'], ['baseball', '야구', '⚾', 'sport'], ['basketball', '농구', '🏀', 'sport'], ['badminton', '배드민턴', '🏸', 'sport'],
  ['swim', '수영하다', '🏊', 'sport'], ['skate', '스케이트 타다', '⛸️', 'sport'], ['ski', '스키 타다', '⛷️', 'sport'], ['tennis', '테니스', '🎾', 'sport'],
  // 옷
  ['cap', '모자(야구 모자)', '🧢', 'clothes'], ['shirt', '셔츠', '👕', 'clothes'], ['pants', '바지', '👖', 'clothes'], ['shoes', '신발', '👟', 'clothes'],
  ['dress', '원피스', '👗', 'clothes'], ['socks', '양말', '🧦', 'clothes'], ['gloves', '장갑', '🧤', 'clothes'], ['glasses', '안경', '👓', 'clothes'],
  // 요일·달
  ['Monday', '월요일', '📅', 'day'], ['Tuesday', '화요일', '📅', 'day'], ['Wednesday', '수요일', '📅', 'day'], ['Thursday', '목요일', '📅', 'day'],
  ['Friday', '금요일', '📅', 'day'], ['Saturday', '토요일', '📅', 'day'], ['Sunday', '일요일', '📅', 'day'],
  ['January', '1월', '🗓️', 'month'], ['March', '3월', '🗓️', 'month'], ['May', '5월', '🗓️', 'month'], ['July', '7월', '🗓️', 'month'],
  ['August', '8월', '🗓️', 'month'], ['October', '10월', '🗓️', 'month'], ['December', '12월', '🗓️', 'month'],
  // 수
  ['one', '1 (하나)', '1️⃣', 'num'], ['three', '3 (셋)', '3️⃣', 'num'], ['five', '5 (다섯)', '5️⃣', 'num'], ['seven', '7 (일곱)', '7️⃣', 'num'],
  ['ten', '10 (열)', '🔟', 'num'], ['twelve', '12 (열둘)', '🕛', 'num'], ['twenty', '20 (스물)', '2️⃣', 'num'], ['hundred', '100 (백)', '💯', 'num'],
  // 움직임
  ['run', '달리다', '🏃', 'act'], ['jump', '뛰다(점프)', '🦘', 'act'], ['sing', '노래하다', '🎶', 'act'], ['dance', '춤추다', '💃', 'act'],
  ['read', '읽다', '📖', 'act'], ['write', '쓰다', '✍️', 'act'], ['sleep', '자다', '😴', 'act'], ['eat', '먹다', '🍽️', 'act'],
  ['cook', '요리하다', '🍳', 'act2'], ['draw', '그리다', '🖍️', 'act'], ['walk', '걷다', '🚶', 'act'], ['fly', '날다', '🕊️', 'act'],
  // 크기·모양
  ['big', '큰', '🐘', 'adj'], ['small', '작은', '🐜', 'adj'], ['tall', '키가 큰', '🦒', 'adj'], ['short', '키가 작은·짧은', '📏', 'adj'],
  ['long', '긴', '🐍', 'adj'], ['fast', '빠른', '⚡', 'adj'], ['slow', '느린', '🐢', 'adj'], ['new', '새로운', '✨', 'adj'],
];

// [상황(우리말), 정답 영어, 오답 3개, 정답 뜻(우리말)]
export const EXPR = [
  ['처음 만난 친구에게 하는 인사는?', 'Nice to meet you.', ['See you later.', 'Good night.', "I'm sorry."], '만나서 반가워.'],
  ['헤어질 때 하는 인사는?', 'See you later.', ['Nice to meet you.', 'How are you?', 'Thank you.'], '나중에 봐.'],
  ['친구가 “Thank you.”라고 했을 때 알맞은 대답은?', "You're welcome.", ["I'm fine.", 'Yes, I can.', "It's sunny."], '천만에.'],
  ['친구가 “I\'m sorry.”라고 했을 때 알맞은 대답은?', "That's okay.", ["You're welcome.", 'Nice to meet you.', 'Me, too.'], '괜찮아.'],
  ['“어디에서 왔니?”라고 물을 때는?', 'Where are you from?', ['How old are you?', 'What time is it?', 'Where is the bank?'], '너는 어디에서 왔니?'],
  ['“나는 한국에서 왔어.”는?', "I'm from Korea.", ["I'm in Korea.", "I'm Korean food.", "I'm ten."], '나는 한국에서 왔어.'],
  ['“너는 몇 학년이니?”라고 물을 때는?', 'What grade are you in?', ['How old are you?', 'What day is it?', 'What do you want?'], '너는 몇 학년이니?'],
  ['“나는 5학년이야.”는?', "I'm in the fifth grade.", ["I'm five years old.", "I'm in the fifth class.", 'It is five.'], '나는 5학년이야.'],
  ['“지금 몇 시니?”라고 물을 때는?', 'What time is it?', ['What day is it?', 'How much is it?', 'Where is it?'], '몇 시니?'],
  ['“7시야.”라고 대답할 때는?', "It's seven o'clock.", ["It's Monday.", "It's seven dollars.", "I'm seven."], '7시야.'],
  ['“오늘 무슨 요일이니?”라고 물을 때는?', 'What day is it today?', ['What time is it?', 'How is the weather?', 'When is your birthday?'], '오늘 무슨 요일이니?'],
  ['“날씨가 어떠니?”라고 물을 때는?', "How's the weather?", ['What time is it?', "What's wrong?", 'How much is it?'], '날씨가 어떠니?'],
  ['“맑아.”라고 날씨를 말할 때는?', "It's sunny.", ["It's rainy.", "I'm sunny.", "It's Sunday."], '맑아.'],
  ['친구가 아파 보일 때 “무슨 일이니?”라고 묻는 말은?', "What's wrong?", ["What's your name?", 'What time is it?', 'Where are you from?'], '무슨 일이니? (어디 아프니?)'],
  ['“나는 머리가 아파.”는?', 'I have a headache.', ['I have a cold.', 'I have a book.', 'I like my head.'], '나는 머리가 아파.'],
  ['“나는 감기에 걸렸어.”는?', 'I have a cold.', ['I have a fever.', "I'm cold water.", 'I have a cat.'], '나는 감기에 걸렸어.'],
  ['아픈 친구에게 “그 말을 들으니 안됐구나.”라고 할 때는?', "I'm sorry to hear that.", ["That's great!", 'Me, too.', 'Good job!'], '그 말을 들으니 안됐구나.'],
  ['“너는 수영할 수 있니?”라고 물을 때는?', 'Can you swim?', ['Do you swim?', 'Where do you swim?', 'Swim, please.'], '너는 수영할 수 있니?'],
  ['“응, 할 수 있어.”라고 대답할 때는?', 'Yes, I can.', ['Yes, I am.', 'No, I don\'t.', 'Yes, it is.'], '응, 할 수 있어.'],
  ['“도서관은 어디에 있니?”라고 물을 때는?', 'Where is the library?', ['What is the library?', 'Who is the library?', 'How is the library?'], '도서관은 어디에 있니?'],
  ['길을 알려 줄 때 “곧장 가세요.”는?', 'Go straight.', ['Turn left.', 'Turn right.', 'Stop here.'], '곧장 가세요.'],
  ['길을 알려 줄 때 “왼쪽으로 도세요.”는?', 'Turn left.', ['Turn right.', 'Go straight.', 'Go back.'], '왼쪽으로 도세요.'],
  ['물건 값을 물을 때는?', 'How much is it?', ['How many is it?', 'What time is it?', 'How old is it?'], '얼마예요?'],
  ['“너는 무엇을 하고 싶니?”라고 물을 때는?', 'What do you want to do?', ['What do you do?', 'What did you do?', 'Where do you want to go?'], '너는 무엇을 하고 싶니?'],
  ['“나는 축구를 하고 싶어.”는?', 'I want to play soccer.', ['I like soccer ball.', 'I play soccer yesterday.', 'I want to soccer.'], '나는 축구를 하고 싶어.'],
  ['“어제 무엇을 했니?”라고 물을 때는?', 'What did you do yesterday?', ['What do you do?', 'What will you do?', 'What day is it?'], '어제 무엇을 했니?'],
  ['“나는 할머니 댁을 방문했어.”는?', 'I visited my grandmother.', ['I visit my grandmother tomorrow.', 'I will visit my grandmother.', 'I am my grandmother.'], '나는 할머니 댁을 방문했어.'],
  ['“이번 주말에 무엇을 할 거니?”라고 물을 때는?', 'What will you do this weekend?', ['What did you do last weekend?', 'What day is it?', 'What do you like?'], '이번 주말에 무엇을 할 거니?'],
  ['“나는 캠핑을 갈 거야.”는?', 'I will go camping.', ['I went camping.', 'I like camping.', 'I go camping yesterday.'], '나는 캠핑을 갈 거야.'],
  ['“너는 커서 무엇이 되고 싶니?”라고 물을 때는?', 'What do you want to be?', ['What do you want to eat?', 'What are you doing?', 'Who are you?'], '너는 무엇이 되고 싶니?'],
  ['“나는 의사가 되고 싶어.”는?', 'I want to be a doctor.', ['I want a doctor.', 'I am a doctor now.', 'I like doctor.'], '나는 의사가 되고 싶어.'],
  ['“네가 가장 좋아하는 과목은 무엇이니?”라고 물을 때는?', "What's your favorite subject?", ["What's your name?", 'What subject is it?', 'Do you like math?'], '가장 좋아하는 과목이 뭐니?'],
  ['“내가 가장 좋아하는 과목은 수학이야.”는?', 'My favorite subject is math.', ['I am math.', 'My favorite color is math.', 'Math is a book.'], '내가 가장 좋아하는 과목은 수학이야.'],
  ['“들어가도 되나요?”라고 허락을 구할 때는?', 'May I come in?', ['Can you come in?', 'Come in, please.', 'Where can I go?'], '들어가도 되나요?'],
  ['친구에게 “배드민턴 치자.”라고 제안할 때는?', "Let's play badminton.", ['I played badminton.', 'Do you like badminton?', 'Badminton is fun.'], '배드민턴 치자.'],
  ['친구의 제안에 “좋아!”라고 할 때는?', 'Sounds good!', ["I'm sorry.", "You're welcome.", 'See you.'], '좋아!'],
  ['“이것은 누구의 모자니?”라고 물을 때는?', 'Whose cap is this?', ['Who is this cap?', 'What cap is this?', 'Where is my cap?'], '이것은 누구의 모자니?'],
  ['“그것은 내 거야.”는?', "It's mine.", ["It's me.", "It's yours.", "I'm mine."], '그것은 내 거야.'],
  ['“내 고양이는 어디에 있니?”라는 물음에 “탁자 밑에 있어.”는?', "It's under the table.", ["It's on the table.", "It's in the table.", "It's a table."], '탁자 밑에 있어.'],
  ['“네 생일은 언제니?”라고 물을 때는?', 'When is your birthday?', ['What is your birthday?', 'How old are you?', 'Where is your party?'], '네 생일은 언제니?'],
  ['“5월 5일이야.”는?', "It's May fifth.", ["It's five May.", "It's March fifth.", "I'm May."], '5월 5일이야.'],
  ['식당에서 “무엇을 드시겠어요?”라고 물을 때는?', 'What would you like?', ['What do you do?', 'How are you?', 'Where are you?'], '무엇을 드시겠어요?'],
  ['“피자로 할게요.”는?', "I'd like pizza.", ['I like pizza yesterday.', 'Pizza is mine.', 'I am pizza.'], '피자로 주세요.'],
  ['“그는 어떻게 생겼니?”라고 물을 때는?', 'What does he look like?', ['What does he like?', 'Where does he live?', 'How old is he?'], '그는 어떻게 생겼니?'],
  ['“그는 짧은 머리를 가졌어.”는?', 'He has short hair.', ['He is short hair.', 'He has long hair.', 'He likes short hair.'], '그는 짧은 머리야.'],
  ['“너는 얼마나 자주 운동하니?”라고 물을 때는?', 'How often do you exercise?', ['How much do you exercise?', 'What do you exercise?', 'When is exercise?'], '얼마나 자주 운동하니?'],
  ['“일주일에 두 번.”은?', 'Twice a week.', ['Two weeks.', 'Once a day.', 'Two days ago.'], '일주일에 두 번.'],
  ['“잘했어!”라고 칭찬할 때는?', 'Good job!', ['Good night!', 'Good morning!', 'No, thanks.'], '잘했어!'],
  ['“도와줄까?”라고 물을 때는?', 'Can I help you?', ['Can you help me?', 'Help me, please.', 'Do you help?'], '도와줄까?'],
  ['“창문을 열어 줄래?”라고 부탁할 때는?', 'Can you open the window?', ['Can I open the window?', 'Open the door.', 'Is the window open?'], '창문을 열어 줄래?'],
  ['“나도 그래.”라고 맞장구칠 때는?', 'Me, too.', ['Me, two.', 'Not me.', 'You, too.'], '나도 그래.'],
  ['“너는 무엇을 하고 있니?”라고 물을 때는?', 'What are you doing?', ['What do you do?', 'What did you do?', 'What will you do?'], '너는 무엇을 하고 있니?'],
  ['“나는 책을 읽고 있어.”는?', "I'm reading a book.", ['I read a book yesterday.', 'I will read a book.', 'I like a book.'], '나는 책을 읽고 있어.'],
];

const batchim = w => { const t = String(w).replace(/\s*\(.*\)$/, ''); const c = t.charCodeAt(t.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const CAT_NAME = { animal: '동물', food: '음식', color: '색깔', family: '가족', job: '직업', school: '학교 물건', subject: '과목', place: '장소', weather: '날씨', nature: '자연', body: '몸', feel: '기분', move: '탈것', sport: '운동', clothes: '옷', day: '요일', month: '달', num: '수', act: '움직임', act2: '움직임', adj: '모양·크기' };
const shuffleBy = (arr, seed) => { const a = [...arr]; let s = seed * 9301 + 49297; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sameCat = (i, n) => { const c = WORDS[i][3].replace('act2', 'act'); const pool = WORDS.map((w, k) => k).filter(k => k !== i && WORDS[k][3].replace('act2', 'act') === c && WORDS[k][1] !== WORDS[i][1] && WORDS[k][0] !== WORDS[i][0]); const extra = WORDS.map((w, k) => k).filter(k => k !== i && !pool.includes(k)); return [...shuffleBy(pool, i), ...shuffleBy(extra, i + 7)].slice(0, n); };

// 난이도: 1 쉬움 · 2 보통 · 3 어려움 — 어느 단계든 문제는 우리말, 그림 힌트도 그대로예요
const EASY_CAT = new Set(['animal', 'food', 'color', 'num', 'family', 'body', 'weather', 'school', 'clothes', 'nature', 'sport']);
export function engTier(kind, i) {
  if (kind === 'x' || kind === 'xm') return 3;
  const easy = EASY_CAT.has(WORDS[i]?.[3]);
  if (kind === 'w' || kind === 'o') return easy ? 1 : 2;
  return easy ? 2 : 3;          // k(영어 고르기) · f(첫 글자)
}
// 문제당 KP 배율 (한국사 = 1) — 그림 힌트가 있어 빨리 풀리므로 낮게
const ENG_KPW = { 1: 0.45, 2: 0.6, 3: 0.8 };
function word(kind, i) {
  const [en, ko, em, cat] = WORDS[i]; const id = `e.${kind}.${i}`;
  const tier = engTier(kind, i);
  const base = { id, subj: 'eng', unit: `낱말 · ${CAT_NAME[cat] || '낱말'}`, ctx: '', tier, kpw: ENG_KPW[tier] };
  const others = sameCat(i, 3);
  if (kind === 'w') return { ...base, type: 'mc', q: `${em} ‘${en}’의 뜻은 무엇일까요?`, choices: [ko, ...others.map(k => WORDS[k][1])], answer: 0, exp: `${en} = ${ko}` };
  if (kind === 'k') return { ...base, type: 'mc', q: `${em} ‘${ko}’을(를) 영어로 하면?`.replace('을(를)', /[가-힣]$/.test(ko) && (ko.charCodeAt(ko.length - 1) - 0xac00) % 28 ? '을' : '를'), choices: [en, ...others.map(k => WORDS[k][0])], answer: 0, exp: `${ko} = ${en}` };
  if (kind === 'f') {
    const first = en[0].toLowerCase(); const letters = 'abcdefghijklmnoprstw'.split('').filter(c => c !== first);
    const wrong = shuffleBy(letters, i).slice(0, 3);
    return { ...base, unit: '알파벳 첫 글자', type: 'mc', q: `${em} ${ko} ‘${en}’의 첫 글자는 무엇일까요?`, choices: [first, ...wrong], answer: 0, exp: `${en}의 첫 글자는 ${first} (대문자 ${first.toUpperCase()})예요.` };
  }
  // o: 뜻 O/X — 짝수 번째는 맞는 뜻, 홀수 번째는 다른 뜻
  const right = i % 2 === 0; const shown = right ? ko : WORDS[others[0]][1];
  return { ...base, type: 'ox', q: `${em} ‘${en}’의 뜻은 ‘${shown}’${batchim(shown) ? '이에요' : '예요'}.`, answer: right, exp: `${en} = ${ko}` };
}
function expr(kind, i) {
  const [sit, ans, wrong, mean] = EXPR[i]; const id = `e.${kind}.${i}`;
  const base = { id, subj: 'eng', unit: '의사소통 표현', ctx: '', tier: 3, kpw: ENG_KPW[3] };
  if (kind === 'x') return { ...base, type: 'mc', q: sit, choices: [ans, ...wrong], answer: 0, exp: `${ans} = ${mean}` };
  // xm: 표현의 뜻 고르기
  const others = shuffleBy(EXPR.map((e, k) => k).filter(k => k !== i), i).slice(0, 3).map(k => EXPR[k][3]);
  return { ...base, type: 'mc', q: `‘${ans}’의 뜻으로 알맞은 것은?`, choices: [mean, ...others], answer: 0, exp: `${ans} = ${mean}` };
}

export function engById(id) {
  const [, kind, n] = id.split('.'); const i = Number(n);
  if (['w', 'k', 'f', 'o'].includes(kind) && WORDS[i]) return word(kind, i);
  if (['x', 'xm'].includes(kind) && EXPR[i]) return expr(kind, i);
  return null;
}
// 모든 영어 문제 id (같은 문제가 바로 다시 나오지 않게 한 바퀴씩 돌아요)
export const ENG_IDS = [
  ...WORDS.flatMap((w, i) => ['w', 'k', 'f', 'o'].map(k => `e.${k}.${i}`)),
  ...EXPR.flatMap((e, i) => ['x', 'x', 'xm'].map((k, t) => `e.${k}.${i}`)).filter((v, i, a) => a.indexOf(v) === i),
];
export const ENG_TYPES = id => (id.split('.')[1] === 'o' ? 'ox' : 'mc');
export const ENG_TIER = id => { const [, k, n] = id.split('.'); return engTier(k, Number(n)); };
