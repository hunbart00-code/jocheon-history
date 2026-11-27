// =============================================================
//  선생님 테스트 마을 모드 — 주소 끝에 ?teacher=학급코드 (교사 화면의 ‘테스트 마을 열기’)
//  학생 마을과 섞이지 않게 저장 칸(localStorage)도 따로 씁니다.
// =============================================================
const q = new URLSearchParams(location.search);
export const TEACHER_MODE = q.has('teacher');
export const TEACHER_CLASS = TEACHER_MODE ? (q.get('teacher') || '5-2').trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, '').slice(0, 16) || '5-2' : '';
export const TEACHER_NO = 0;          // 선생님 마을 번호 (문서 이름: 학급코드_0)
export const INF = 1e30;              // ‘무한’ 재화 (화면에는 ‘무한’으로 보여요)
export const VERSION = '1.9';
