// =============================================================
//  수학 문제 — 5학년 수학 범위 (2022 개정 교육과정 5~6학년군 중 5학년 내용)
//   자연수의 혼합 계산 · 약수와 배수 · 규칙과 대응 · 약분과 통분 · 분수의 덧셈과 뺄셈 ·
//   다각형의 둘레와 넓이 · 수의 범위와 어림하기 · 분수의 곱셈 · 합동과 대칭 · 소수의 곱셈 ·
//   직육면체 · 평균과 가능성
//  숫자를 바꿔 가며 문제를 만들어요 (id 에 숫자가 들어 있어서 오답 다시 풀기도 똑같이 나와요)
// =============================================================

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const comma = n => Number(n).toLocaleString('ko-KR');


// 조사 붙이기: 받침이 있으면 a, 없으면 b (숫자·분수는 읽는 소리로)
// 숫자 + (으)로: 3·6·0으로 끝나면 ‘으로’, 나머지(1·7·8 ㄹ받침 포함)는 ‘로’
export const ro = n => String(n) + (/[360]$/.test(String(n)) ? '으로' : '로');
export function j(word, a, b) {
  const w = String(word).trim(); let ch = w.slice(-1);
  if (w.includes('/')) ch = w.split('/')[0].replace(/^.*\s/, '').slice(-1);   // 3/4 → ‘4분의 3’ → 3
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return w + ((code - 0xac00) % 28 ? a : b);
  if (/[0-9]/.test(ch)) return w + ('013678'.includes(ch) ? a : b);
  if (/[a-zA-Z]/.test(ch)) return w + ('lmnLMN'.includes(ch) ? a : b);
  return w + a;
}

// 분수 글자: 3/4, 1과 1/6 (대분수), 2 (자연수)
export function fracStr(n, d) {
  const g = gcd(Math.abs(n), d); n /= g; d /= g;
  if (d === 1) return String(n);
  if (n > d) { const w = Math.floor(n / d), r = n % d; return r ? `${w}과 ${r}/${d}` : String(w); }
  return `${n}/${d}`;
}
const fracRaw = (n, d) => `${n}/${d}`;
// 소수 글자 (부동소수점 오차 없이): v 는 정수, k 는 소수 자릿수
const decStr = (v, k) => { if (!k) return String(v); const s = String(Math.abs(v)).padStart(k + 1, '0'); const t = (v < 0 ? '-' : '') + s.slice(0, -k) + '.' + s.slice(-k); return t.replace(/\.?0+$/, ''); };

// 보기 4개 만들기 (정답 + 그럴듯한 오답, 중복·음수 없이)
function opts(ans, cands, fmt = String, more = d => [ans + d, ans - d]) {
  const out = [fmt(ans)]; const seen = new Set(out);
  for (const c of cands) { if (out.length >= 4) break; if (c === null || c === undefined || (typeof c === 'number' && (c < 0 || !isFinite(c) || (Number.isInteger(ans) && !Number.isInteger(c))))) continue; const s = fmt(c); if (!seen.has(s)) { seen.add(s); out.push(s); } }
  for (let d = 1; out.length < 4 && d < 50; d++) for (const c of more(d)) { if (out.length >= 4) break; if (typeof c === 'number' && c < 0) continue; const s = fmt(c); if (!seen.has(s)) { seen.add(s); out.push(s); } }
  return out;
}

const SHAPES = {
  rect: '직사각형', square: '정사각형', para: '평행사변형', tri: '삼각형', trap: '사다리꼴', rhom: '마름모',
};
const POLY = { 3: '정삼각형', 4: '정사각형', 5: '정오각형', 6: '정육각형', 8: '정팔각형' };
const PAIRS = [
  ['세발자전거 1대', '바퀴', 3, '대'], ['문어 1마리', '다리', 8, '마리'], ['탁자 1개', '의자', 4, '개'], ['연필 1타', '연필', 12, '타'],
  ['오징어 1마리', '다리', 10, '마리'], ['꽃 1송이', '꽃잎', 5, '송이'], ['자동차 1대', '바퀴', 4, '대'], ['거미 1마리', '다리', 8, '마리'],
  ['상자 1개', '사과', 6, '개'], ['봉지 1개', '사탕', 9, '개'],
];
const NUMS_DIV = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 64, 72, 80, 84, 90, 96, 100];
const divisors = n => { const a = []; for (let i = 1; i <= n; i++) if (n % i === 0) a.push(i); return a; };
const PLACE = { 10: '십', 100: '백', 1000: '천' };

// ---------- 종류별 문제 (p = 숫자들) ----------
const K = {
  // 자연수의 혼합 계산
  mix: {
    unit: '자연수의 혼합 계산', sa: true,
    gen: r => { const f = ri(r, 0, 5); if (f === 2 || f === 4) { const c = ri(r, 2, 9), b = c * ri(r, 2, 9); return [f, ri(r, b / c + 3, 60), b, c, ri(r, 2, 20)]; } return [f, ri(r, 2, 30), ri(r, 2, 12), ri(r, 2, 9), ri(r, 1, 20)]; },
    build: ([f, a, b, c, d]) => {
      let expr, ans, wrong;
      if (f === 0) { expr = `${a} + ${b} × ${c}`; ans = a + b * c; wrong = (a + b) * c; }
      else if (f === 1) { expr = `(${a} + ${b}) × ${c}`; ans = (a + b) * c; wrong = a + b * c; }
      else if (f === 2) { expr = `${a} - ${b} ÷ ${c}`; ans = a - b / c; wrong = (a - b) / c; }
      else if (f === 3) { expr = `${a} × ${b} - ${c} × ${d}`; ans = a * b - c * d; if (ans < 0) { expr = `${c} × ${d} + ${a} × ${b}`; ans = a * b + c * d; } wrong = (a * b - c) * d; }
      else if (f === 4) { expr = `(${a} - ${b / c}) × ${c} + ${d}`; ans = (a - b / c) * c + d; wrong = a - b / c * c + d; }
      else { const dd = Math.min(d, a + b * c - 1); expr = `${a} + ${b} × ${c} - ${dd}`; ans = a + b * c - dd; wrong = (a + b) * c - dd; }
      return { q: '다음 식을 계산하면 얼마일까요?', ctx: expr, ans, choices: opts(ans, [wrong, ans + 10, ans - 10, ans + c]), exp: `곱셈·나눗셈을 먼저, ( )가 있으면 ( ) 안을 가장 먼저 계산해요. ${expr} = ${ans}` };
    },
  },
  // 약수의 개수
  divcount: {
    unit: '약수와 배수', sa: true,
    gen: r => [pick(r, NUMS_DIV)],
    build: ([n]) => { const ds = divisors(n); return { q: `${n}의 약수는 모두 몇 개일까요?`, ans: ds.length, choices: opts(ds.length, [ds.length - 1, ds.length + 1, ds.length + 2], v => `${v}개`), sa: String(ds.length), exp: `${n}의 약수: ${ds.join(', ')} → ${ds.length}개` }; },
  },
  // 약수가 아닌 것
  notdiv: {
    unit: '약수와 배수',
    gen: r => [pick(r, NUMS_DIV), ri(r, 0, 999)],
    build: ([n, k]) => {
      const dv = divisors(n).filter(x => x > 1 && x < n);
      const non = []; for (let i = 2; i < n && non.length < 6; i++) if (n % i) non.push(i);
      const bad = non[k % non.length]; const good = [0, 1, 2].map(j => dv[(k + j) % dv.length]);
      return { q: `다음 중 ${n}의 약수가 아닌 것은?`, ansS: String(bad), choices: [String(bad), ...new Set(good.map(String))], exp: `${n} ÷ ${j(bad, '은', '는')} 나누어떨어지지 않아요. ${n}의 약수: ${divisors(n).join(', ')}` };
    },
  },
  // 배수 고르기
  multiple: {
    unit: '약수와 배수',
    gen: r => [ri(r, 3, 9), ri(r, 3, 11)],
    build: ([k, m]) => {
      const ans = k * m; const others = [ans + 1, ans + 2, ans - 1, ans + k - 1].filter(v => v % k);
      return { q: `다음 중 ${k}의 배수는 어느 것일까요?`, ans, choices: opts(ans, others), exp: `${k} × ${m} = ${ans} 이므로 ${j(ans, '은', '는')} ${k}의 배수예요.` };
    },
  },
  // 최대공약수
  gcd: {
    unit: '약수와 배수', sa: true,
    gen: r => { const g = ri(r, 2, 9); let p = ri(r, 2, 7), q = ri(r, 2, 7); while (gcd(p, q) !== 1 || p === q) { p = ri(r, 2, 7); q = ri(r, 2, 8); } return [g * p, g * q]; },
    build: ([a, b]) => { const g = gcd(a, b), l = lcm(a, b); return { q: `${j(a, '과', '와')} ${b}의 최대공약수는?`, ans: g, choices: opts(g, [l, g * 2, g / 2 === Math.floor(g / 2) ? g / 2 : g + 1, 1]), sa: String(g), exp: `두 수를 모두 나누어떨어지게 하는 가장 큰 수 → ${g}` }; },
  },
  // 최소공배수
  lcm: {
    unit: '약수와 배수', sa: true,
    gen: r => { const g = ri(r, 2, 6); let p = ri(r, 2, 6), q = ri(r, 2, 7); while (gcd(p, q) !== 1 || p === q) { p = ri(r, 2, 6); q = ri(r, 2, 7); } return [g * p, g * q]; },
    build: ([a, b]) => { const g = gcd(a, b), l = lcm(a, b); return { q: `${j(a, '과', '와')} ${b}의 최소공배수는?`, ans: l, choices: opts(l, [a * b, g, l * 2, l + g]), sa: String(l), exp: `두 수의 공통인 배수 중 가장 작은 수 → ${l}` }; },
  },
  // 약분 (기약분수)
  reduce: {
    unit: '약분과 통분',
    gen: r => { const k = ri(r, 2, 8); let p = ri(r, 1, 8), q = ri(r, 2, 11); while (p >= q || gcd(p, q) !== 1) { p = ri(r, 1, 8); q = ri(r, 2, 11); } return [k * p, k * q]; },
    build: ([n, d]) => {
      const g = gcd(n, d), ans = fracRaw(n / g, d / g);
      const half = g % 2 === 0 && g > 2 ? fracRaw(n / 2, d / 2) : null;
      return { q: `${j(n + '/' + d, '을', '를')} 기약분수로 나타내면?`, ansS: ans, choices: [ans, ...[half, fracRaw(n / g + 1, d / g), fracRaw(d / g, n / g + d / g), fracRaw(Math.max(1, n / g - 1), d / g + 1)].filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i && v !== '0/1').slice(0, 4), exp: `분모와 분자를 최대공약수 ${g}로 나누면 ${ans}` };
    },
  },
  // 분수의 크기 비교 (통분) — O/X
  cmp: {
    unit: '약분과 통분', ox: true,
    gen: r => { let a, b, c, d; do { b = ri(r, 3, 12); d = ri(r, 3, 12); a = ri(r, 1, b - 1); c = ri(r, 1, d - 1); } while (b === d || a * d === b * c); return [a, b, c, d, ri(r, 0, 1)]; },
    build: ([a, b, c, d, flip]) => {
      const big = a * d > b * c, L = lcm(b, d);
      const q = flip ? `${j(a + '/' + b, '은', '는')} ${c}/${d}보다 작아요.` : `${j(a + '/' + b, '은', '는')} ${c}/${d}보다 커요.`;
      return { type: 'ox', q, answer: flip ? !big : big, exp: `통분하면 ${j(a * L / b + '/' + L, '과', '와')} ${c * L / d}/${L} → ${j(big ? `${a}/${b}` : `${c}/${d}`, '이', '가')} 더 커요.` };
    },
  },
  // 분모가 다른 분수의 덧셈
  fadd: {
    unit: '분수의 덧셈과 뺄셈',
    gen: r => { const D = [2, 3, 4, 5, 6, 8, 9, 10, 12]; let b, d; do { b = pick(r, D); d = pick(r, D); } while (b === d); return [ri(r, 1, b - 1), b, ri(r, 1, d - 1), d]; },
    build: ([a, b, c, d]) => {
      const L = lcm(b, d), n = a * L / b + c * L / d; const ans = fracStr(n, L);
      return { q: '다음을 계산하면?', ctx: `${a}/${b} + ${c}/${d}`, ansS: ans, choices: [ans, fracStr(a + c, b + d), fracStr(n + 1, L), fracStr(Math.max(1, n - 1), L), fracStr(a * d + c * b, b * d * 2)].filter((v, i, x) => x.indexOf(v) === i).slice(0, 4), exp: `분모를 ${ro(L)} 통분해서 더해요: ${a * L / b}/${L} + ${c * L / d}/${L} = ${fracRaw(n, L)} = ${ans}` };
    },
  },
  // 분모가 다른 분수의 뺄셈
  fsub: {
    unit: '분수의 덧셈과 뺄셈',
    gen: r => { const D = [2, 3, 4, 5, 6, 8, 9, 10, 12]; let a, b, c, d; do { b = pick(r, D); d = pick(r, D); a = ri(r, 1, b - 1); c = ri(r, 1, d - 1); } while (b === d || a * d <= c * b); return [a, b, c, d]; },
    build: ([a, b, c, d]) => {
      const L = lcm(b, d), n = a * L / b - c * L / d; const ans = fracStr(n, L);
      return { q: '다음을 계산하면?', ctx: `${a}/${b} - ${c}/${d}`, ansS: ans, choices: [ans, Math.abs(a - c) ? fracStr(Math.abs(a - c), Math.abs(b - d) || 1) : null, fracStr(n + 1, L), fracStr(n * 2, L), fracStr(n, L * 2)].filter((v, i, x) => v && x.indexOf(v) === i).slice(0, 4), exp: `분모를 ${ro(L)} 통분해서 빼요: ${a * L / b}/${L} - ${c * L / d}/${L} = ${ans}` };
    },
  },
  // 분수 × 자연수
  fmuln: {
    unit: '분수의 곱셈',
    gen: r => { const b = ri(r, 3, 12); return [ri(r, 1, b - 1), b, ri(r, 2, 9)]; },
    build: ([a, b, n]) => { const ans = fracStr(a * n, b); return { q: '다음을 계산하면?', ctx: `${a}/${b} × ${n}`, ansS: ans, choices: [ans, fracStr(a * n, b * n), fracStr(a, b * n), fracStr(a + n, b), fracStr(a * n + 1, b)].filter((v, i, x) => x.indexOf(v) === i).slice(0, 4), exp: `분자에 자연수를 곱해요: ${a} × ${n} = ${a * n} → ${fracRaw(a * n, b)} = ${ans}` }; },
  },
  // 분수 × 분수
  fmul: {
    unit: '분수의 곱셈',
    gen: r => { const b = ri(r, 2, 9), d = ri(r, 2, 9); return [ri(r, 1, b - 1), b, ri(r, 1, d - 1), d]; },
    build: ([a, b, c, d]) => { const ans = fracStr(a * c, b * d); return { q: '다음을 계산하면?', ctx: `${a}/${b} × ${c}/${d}`, ansS: ans, choices: [ans, fracStr(a + c, b + d), fracStr(a * d, b * c), fracStr(a * c, b + d), fracStr(a * c + 1, b * d)].filter((v, i, x) => x.indexOf(v) === i).slice(0, 4), exp: `분자끼리, 분모끼리 곱해요: ${a}×${c} / ${b}×${d} = ${fracRaw(a * c, b * d)} = ${ans}` }; },
  },
  // 소수의 곱셈 (값×10 또는 ×100 정수로 저장)
  dmul: {
    unit: '소수의 곱셈', sa: true,
    gen: r => { const f = ri(r, 0, 2); if (f === 0) return [0, ri(r, 11, 99), ri(r, 2, 9)]; if (f === 1) return [1, ri(r, 1, 9), ri(r, 1, 9)]; return [2, ri(r, 11, 49), ri(r, 2, 9)]; },
    build: ([f, x, y]) => {
      let expr, v, k, w1, w2;
      if (f === 0) { expr = `${decStr(x, 1)} × ${y}`; v = x * y; k = 1; }             // 1.2 × 3
      else if (f === 1) { expr = `${decStr(x, 1)} × ${decStr(y, 1)}`; v = x * y; k = 2; } // 0.4 × 0.7
      else { expr = `${decStr(x, 1)} × ${decStr(y, 1)}`; v = x * y; k = 2; }              // 2.3 × 0.6
      const ans = decStr(v, k); w1 = decStr(v, k - 1 >= 0 ? k - 1 : 0); w2 = decStr(v, k + 1);
      return { q: '다음을 계산하면?', ctx: expr, ansS: ans, choices: [ans, w1, w2, decStr(v + (k === 1 ? 1 : 10), k)].filter((s, i, a) => a.indexOf(s) === i).slice(0, 4), sa: ans, exp: `자연수처럼 곱한 뒤 소수점 아래 자리 수만큼 소수점을 찍어요: ${expr} = ${ans}` };
    },
  },
  // 수의 범위
  range: {
    unit: '수의 범위와 어림하기',
    gen: r => [ri(r, 0, 3), ri(r, 15, 80), ri(r, 3, 9), ri(r, 0, 999)],
    build: ([t, A, w, k]) => {
      const B = A + w; const names = ['이상', '이하', '초과', '미만'];
      let lo, hi, txt;
      if (t === 0) { txt = `${A} 이상 ${B} 미만`; lo = A; hi = B - 1; }
      else if (t === 1) { txt = `${A} 초과 ${B} 이하`; lo = A + 1; hi = B; }
      else if (t === 2) { txt = `${A} 이상 ${B} 이하`; lo = A; hi = B; }
      else { txt = `${A} 초과 ${B} 미만`; lo = A + 1; hi = B - 1; }
      const ins = lo + (k % (hi - lo + 1));
      const outs = [lo - 1, hi + 1, lo - 3, hi + 4].filter(v => v < lo || v > hi);
      return { q: `다음 중 ${txt}인 수는 어느 것일까요?`, ans: ins, choices: opts(ins, outs), exp: `이상·이하는 그 수를 포함하고, 초과·미만은 포함하지 않아요. ${txt}인 수는 ${lo}부터 ${hi}까지예요.` };
    },
  },
  // 어림하기 (올림·버림·반올림)
  round: {
    unit: '수의 범위와 어림하기', sa: true,
    gen: r => [ri(r, 0, 2), pick(r, [10, 100, 1000]), ri(r, 1012, 9987)],
    build: ([t, u, n]) => {
      const up = Math.ceil(n / u) * u, down = Math.floor(n / u) * u, rd = Math.round(n / u) * u;
      const name = ['올림', '버림', '반올림'][t], ans = [up, down, rd][t];
      return { q: `${j(comma(n), '을', '를')} ${name}하여 ${PLACE[u]}의 자리까지 나타내면?`, ans, choices: opts(ans, [up, down, rd, ans + u, ans - u, Math.round(n / (u * 10)) * u * 10], comma), sa: String(ans), exp: `${name}: ${PLACE[u]}의 자리 아래 수를 ${t === 0 ? '올려요' : t === 1 ? '버려요' : '보고 5 이상이면 올리고 4 이하면 버려요'} → ${comma(ans)}` };
    },
  },
  // 다각형의 넓이
  area: {
    unit: '다각형의 둘레와 넓이', sa: true,
    gen: r => { const sh = ri(r, 0, 5); let a = ri(r, 4, 15), b = ri(r, 2, 12), c = ri(r, 2, a - 1); if (sh === 3 || sh === 5) { if ((a * b) % 2) b++; } if (sh === 4 && ((a + c) * b) % 2) b++; return [sh, a, b, c]; },
    build: ([sh, a, b, c]) => {
      let q, ans, wrong, how;
      if (sh === 0) { q = `가로 ${a} cm, 세로 ${b} cm인 직사각형의 넓이는?`; ans = a * b; wrong = (a + b) * 2; how = '가로 × 세로'; }
      else if (sh === 1) { q = `한 변이 ${a} cm인 정사각형의 넓이는?`; ans = a * a; wrong = a * 4; how = '한 변 × 한 변'; }
      else if (sh === 2) { q = `밑변이 ${a} cm, 높이가 ${b} cm인 평행사변형의 넓이는?`; ans = a * b; wrong = a * b / 2; how = '밑변 × 높이'; }
      else if (sh === 3) { q = `밑변이 ${a} cm, 높이가 ${b} cm인 삼각형의 넓이는?`; ans = a * b / 2; wrong = a * b; how = '밑변 × 높이 ÷ 2'; }
      else if (sh === 4) { q = `윗변 ${c} cm, 아랫변 ${a} cm, 높이 ${b} cm인 사다리꼴의 넓이는?`; ans = (a + c) * b / 2; wrong = (a + c) * b; how = '(윗변 + 아랫변) × 높이 ÷ 2'; }
      else { q = `두 대각선이 ${a} cm, ${b} cm인 마름모의 넓이는?`; ans = a * b / 2; wrong = a * b; how = '한 대각선 × 다른 대각선 ÷ 2'; }
      return { q, ans, choices: opts(ans, [wrong, ans + a, ans - b], v => `${comma(v)} cm²`), sa: String(ans), exp: `${how} = ${comma(ans)} cm²` };
    },
  },
  // 둘레
  perim: {
    unit: '다각형의 둘레와 넓이', sa: true,
    gen: r => [ri(r, 0, 1), pick(r, [3, 4, 5, 6, 8]), ri(r, 3, 15), ri(r, 2, 12)],
    build: ([t, n, a, b]) => {
      if (t === 0) { const ans = n * a; return { q: `한 변이 ${a} cm인 ${POLY[n]}의 둘레는?`, ans, choices: opts(ans, [a * (n - 1), a * (n + 1), a * a], v => `${v} cm`), sa: String(ans), exp: `${j(POLY[n], '은', '는')} 변이 ${n}개이고 길이가 모두 같아요: ${a} × ${n} = ${ans} cm` }; }
      const ans = (a + b) * 2; return { q: `가로 ${a} cm, 세로 ${b} cm인 직사각형의 둘레는?`, ans, choices: opts(ans, [a + b, a * b, (a + b) * 4], v => `${v} cm`), sa: String(ans), exp: `(가로 + 세로) × 2 = (${a} + ${b}) × 2 = ${ans} cm` };
    },
  },
  // 평균
  avg: {
    unit: '평균과 가능성', sa: true,
    gen: r => { const n = ri(r, 3, 5), m = ri(r, 4, 30); const xs = []; let tot = 0; for (let i = 0; i < n - 1; i++) { const x = m + ri(r, -5, 5); xs.push(Math.max(1, x)); tot += xs[i]; } const last = m * n - tot; if (last < 1) return [3, 10, 12, 14]; return [n, ...xs, last]; },
    build: ([n, ...xs]) => { const s = xs.reduce((a, b) => a + b, 0), ans = s / xs.length; return { q: `다음 수들의 평균은 얼마일까요?`, ctx: xs.join(', '), ans, choices: opts(ans, [s, ans + 2, ans - 1, Math.max(...xs)]), sa: String(ans), exp: `(자료 값을 모두 더한 수) ÷ (자료 수) = ${s} ÷ ${xs.length} = ${ans}` }; },
  },
  // 규칙과 대응
  corr: {
    unit: '규칙과 대응', sa: true,
    gen: r => [ri(r, 0, PAIRS.length - 1), ri(r, 3, 15)],
    build: ([i, n]) => {
      const [one, what, k, unit] = PAIRS[i]; const ans = k * n; const thing = one.replace(/ 1.*$/, '');
      return { q: `${one}에 ${j(what, '이', '가')} ${k}개씩 있어요. ${thing} ${n}${unit}에는 ${j(what, '이', '가')} 모두 몇 개 있을까요?`, ans, choices: opts(ans, [k + n, ans + k, ans - k], v => `${v}개`), sa: String(ans), exp: `(${what} 수) = (${thing} 수) × ${k} → ${n} × ${k} = ${ans}` };
    },
  },
  // 가능성
  prob: {
    unit: '평균과 가능성',
    gen: r => [ri(r, 0, 9)],
    build: ([i]) => {
      const L = [
        ['주사위를 한 번 굴릴 때 7의 눈이 나올 가능성', '0', '주사위에는 1부터 6까지만 있어서 불가능해요.'],
        ['주사위를 한 번 굴릴 때 6 이하의 눈이 나올 가능성', '1', '주사위 눈은 모두 6 이하라서 확실해요.'],
        ['주사위를 한 번 굴릴 때 짝수의 눈이 나올 가능성', '1/2', '짝수(2, 4, 6)와 홀수(1, 3, 5)가 3개씩이라 반반이에요.'],
        ['동전을 한 번 던질 때 그림 면이 나올 가능성', '1/2', '그림 면과 숫자 면 두 가지 중 하나라서 반반이에요.'],
        ['흰 공만 4개 든 주머니에서 공을 꺼낼 때 흰 공일 가능성', '1', '흰 공만 있으니 확실해요.'],
        ['흰 공만 4개 든 주머니에서 공을 꺼낼 때 검은 공일 가능성', '0', '검은 공이 없으니 불가능해요.'],
        ['빨간 공 2개, 파란 공 2개 든 주머니에서 빨간 공을 꺼낼 가능성', '1/2', '빨간 공과 파란 공의 수가 같아 반반이에요.'],
        ['내일 해가 동쪽에서 뜰 가능성', '1', '해는 항상 동쪽에서 떠요. 확실해요.'],
        ['12월 다음에 13월이 올 가능성', '0', '13월은 없어요. 불가능해요.'],
        ['절반은 빨간색, 절반은 노란색인 회전판을 돌릴 때 빨간색에 멈출 가능성', '1/2', '빨간색과 노란색의 넓이가 같아 반반이에요.'],
      ][i];
      return { q: `${L[0]}을 수로 나타내면?`, ansS: L[1], choices: ['0', '1/2', '1', '1/4'], exp: L[2] };
    },
  },
};

// ---------- 개념 문제 (직육면체·합동과 대칭 등) ----------
const CONCEPT = [
  ['mc', '직육면체의 면은 모두 몇 개일까요?', ['6개', '8개', '12개', '4개'], 0, '직육면체는 직사각형 6개로 둘러싸인 도형이에요.', '직육면체'],
  ['mc', '직육면체의 모서리는 모두 몇 개일까요?', ['12개', '8개', '6개', '10개'], 0, '면과 면이 만나는 선분(모서리)은 12개예요.', '직육면체'],
  ['mc', '직육면체의 꼭짓점은 모두 몇 개일까요?', ['8개', '6개', '12개', '4개'], 0, '모서리와 모서리가 만나는 점(꼭짓점)은 8개예요.', '직육면체'],
  ['mc', '정사각형 6개로 둘러싸인 도형은?', ['정육면체', '직육면체만', '삼각기둥', '원기둥'], 0, '정사각형 6개로 둘러싸인 도형을 정육면체라고 해요.', '직육면체'],
  ['ox', '정육면체는 직육면체라고 할 수 있어요.', null, true, '정육면체는 모든 면이 정사각형인 특별한 직육면체예요.', '직육면체'],
  ['ox', '직육면체는 정육면체라고 할 수 있어요.', null, false, '직육면체의 면은 직사각형이라 모두 정사각형은 아니에요.', '직육면체'],
  ['mc', '직육면체의 겨냥도에서 보이지 않는 모서리는 몇 개를 점선으로 그릴까요?', ['3개', '4개', '2개', '6개'], 0, '겨냥도에서 보이지 않는 모서리 3개는 점선으로 그려요.', '직육면체'],
  ['mc', '직육면체에서 서로 평행한 면은 모두 몇 쌍일까요?', ['3쌍', '2쌍', '4쌍', '6쌍'], 0, '마주 보는 두 면이 평행해요: 3쌍', '직육면체'],
  ['mc', '직육면체에서 한 면과 수직인 면은 몇 개일까요?', ['4개', '2개', '3개', '5개'], 0, '평행한 면 1개를 뺀 4개가 수직이에요.', '직육면체'],
  ['ox', '모양과 크기가 같아서 포개었을 때 완전히 겹치는 두 도형을 합동이라고 해요.', null, true, '맞아요. 합동인 도형에서 대응변의 길이와 대응각의 크기는 같아요.', '합동과 대칭'],
  ['ox', '합동인 두 도형에서 대응변의 길이는 서로 달라요.', null, false, '합동이면 대응변의 길이가 서로 같아요.', '합동과 대칭'],
  ['mc', '정사각형의 대칭축은 모두 몇 개일까요?', ['4개', '2개', '1개', '8개'], 0, '가로·세로·대각선 2개, 모두 4개예요.', '합동과 대칭'],
  ['mc', '정삼각형의 대칭축은 모두 몇 개일까요?', ['3개', '1개', '6개', '없어요'], 0, '각 꼭짓점에서 마주 보는 변의 가운데로 3개예요.', '합동과 대칭'],
  ['mc', '원의 대칭축은 몇 개일까요?', ['셀 수 없이 많아요', '1개', '2개', '4개'], 0, '원의 중심을 지나는 직선은 모두 대칭축이에요.', '합동과 대칭'],
  ['ox', '한 직선을 따라 접었을 때 완전히 겹치는 도형을 선대칭도형이라고 해요.', null, true, '그 직선이 대칭축이에요.', '합동과 대칭'],
  ['ox', '한 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는 도형을 점대칭도형이라고 해요.', null, true, '그 점이 대칭의 중심이에요.', '합동과 대칭'],
  ['mc', '다음 중 점대칭도형인 것은?', ['평행사변형', '정삼각형', '이등변삼각형', '사다리꼴'], 0, '평행사변형은 가운데 점을 중심으로 180° 돌리면 겹쳐요.', '합동과 대칭'],
  ['ox', '1은 모든 자연수의 약수예요.', null, true, '어떤 자연수도 1로 나누면 나누어떨어져요.', '약수와 배수'],
  ['ox', '어떤 수의 배수 중 가장 작은 수는 그 수 자신이에요.', null, true, '배수는 그 수를 1배, 2배, 3배… 한 수예요.', '약수와 배수'],
  ['ox', '두 수의 공약수는 두 수의 최대공약수의 약수예요.', null, true, '예: 12와 18의 최대공약수 6 → 공약수 1, 2, 3, 6', '약수와 배수'],
  ['ox', '‘20 미만인 수’에는 20이 들어가요.', null, false, '미만은 그 수를 포함하지 않아요.', '수의 범위와 어림하기'],
  ['ox', '‘15 이상인 수’에는 15가 들어가요.', null, true, '이상은 그 수를 포함해요.', '수의 범위와 어림하기'],
  ['ox', '반올림할 때는 구하려는 자리 바로 아래 숫자가 5 이상이면 올려요.', null, true, '0, 1, 2, 3, 4이면 버리고 5, 6, 7, 8, 9이면 올려요.', '수의 범위와 어림하기'],
  ['ox', '1보다 작은 진분수끼리 곱하면 곱이 처음 수보다 작아져요.', null, true, '1보다 작은 수를 곱하면 크기가 작아져요.', '분수의 곱셈'],
  ['ox', '분모와 분자를 같은 수로 나누어 간단히 하는 것을 통분이라고 해요.', null, false, '그것은 약분이에요. 통분은 분모를 같게 만드는 것이에요.', '약분과 통분'],
  ['mc', '분모를 같게 하는 것을 무엇이라고 할까요?', ['통분', '약분', '어림', '대응'], 0, '분모가 다른 분수를 더하거나 비교할 때 통분해요.', '약분과 통분'],
  ['mc', '자료 값을 모두 더해 자료의 수로 나눈 값은?', ['평균', '합동', '대응', '어림'], 0, '평균은 자료를 대표하는 값이에요.', '평균과 가능성'],
  ['ox', '혼합 계산에서 곱셈과 나눗셈은 덧셈과 뺄셈보다 먼저 계산해요.', null, true, '( ) → ×, ÷ → +, - 순서로 계산해요.', '자연수의 혼합 계산'],
  ['mc', '‘일이 일어날 가능성’이 확실하면 수로 얼마일까요?', ['1', '0', '1/2', '2'], 0, '불가능 0, 반반 1/2, 확실 1로 나타내요.', '평균과 가능성'],
  ['ox', '1 cm²는 한 변이 1 cm인 정사각형의 넓이예요.', null, true, '넓이의 단위예요.', '다각형의 둘레와 넓이'],
  ['mc', '1 m²는 몇 cm²일까요?', ['10000 cm²', '100 cm²', '1000 cm²', '1000000 cm²'], 0, '1 m = 100 cm 이므로 100 × 100 = 10000 cm²', '다각형의 둘레와 넓이'],
  ['ox', '삼각형의 넓이는 밑변 × 높이 ÷ 2로 구해요.', null, true, '평행사변형 넓이의 절반이에요.', '다각형의 둘레와 넓이'],
];

const KIND_LIST = Object.keys(K);
// 시간 제한 놀이(타임어택)에서 쓸 수 있는 종류 (단답형·OX)
const SA_KINDS = KIND_LIST.filter(k => K[k].sa);

// 문제 객체로 만들기
function make(kind, p, form) {
  const k = K[kind]; const o = k.build(p);
  const id = `m.${kind}.${p.join('_')}${form ? '.' + form : ''}`;
  const base = { id, subj: 'math', unit: k.unit, exp: o.exp, ctx: o.ctx || '' };
  if (o.type === 'ox') return { ...base, type: 'ox', q: o.q, answer: o.answer };
  const sa = o.sa ?? (typeof o.ans === 'number' ? String(o.ans) : undefined);
  if (form === 'sa' && sa !== undefined) return { ...base, type: 'sa', q: o.q, answers: [sa, sa + 'cm²', sa + 'cm', sa + '개', sa.replace(/,/g, '')] };
  const right = o.ansS ?? String(o.choices[0]);
  const choices = o.choices.map(String);
  if (form === 'ox') { // 맞을까요? 꼴
    const show = p.reduce((a, b) => a + b, 0) % 2 ? right : (choices[1] || right);
    return { ...base, type: 'ox', q: `${o.q} 답이 ‘${show}’일까요?`, answer: show === right };
  }
  return { ...base, type: 'mc', q: o.q, choices, answer: choices.indexOf(right) };
}

export function mathById(id) {
  const parts = id.split('.');
  if (parts[1] === 'c') { const c = CONCEPT[Number(parts[2])]; return c ? concept(Number(parts[2])) : null; }
  const kind = parts[1]; if (!K[kind]) return null;
  const p = parts[2].split('_').map(Number); const form = parts[3] || '';
  try { return make(kind, p, form); } catch (e) { return null; }
}
function concept(i) {
  const [t, q, ch, a, exp, unit] = CONCEPT[i];
  const base = { id: `m.c.${i}`, subj: 'math', unit, exp, ctx: '' };
  return t === 'ox' ? { ...base, type: 'ox', q, answer: a } : { ...base, type: 'mc', q, choices: ch, answer: a };
}

// 수학 문제 하나 (types: 쓸 수 있는 형식)
export function mathQuestion(types = ['mc', 'ox'], r = Math.random) {
  const canMc = types.includes('mc'), canOx = types.includes('ox'), canSa = types.includes('sa');
  for (let t = 0; t < 8; t++) {
    if (r() < 0.15 && (canMc || canOx)) {
      const pool = CONCEPT.map((c, i) => i).filter(i => (CONCEPT[i][0] === 'ox' ? canOx : canMc));
      if (pool.length) return concept(pool[Math.floor(r() * pool.length)]);
    }
    let kind, form = '';
    if (!canMc) { kind = canSa && r() < 0.7 ? SA_KINDS[Math.floor(r() * SA_KINDS.length)] : KIND_LIST[Math.floor(r() * KIND_LIST.length)]; form = K[kind].ox ? '' : (canSa && K[kind].sa && r() < 0.75 ? 'sa' : 'ox'); }
    else kind = KIND_LIST[Math.floor(r() * KIND_LIST.length)];
    if (K[kind].ox && !canOx) continue;
    try { const q = make(kind, K[kind].gen(r), form); if (q && (q.type !== 'mc' || (q.choices.length >= 2 && q.answer >= 0))) return q; } catch (e) { /* 다시 */ }
  }
  return concept(0);
}

export const MATH_UNITS = [...new Set([...Object.values(K).map(k => k.unit), ...CONCEPT.map(c => c[5])])];
