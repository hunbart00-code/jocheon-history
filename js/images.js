// =============================================================
//  그림 파일 불러오기 — img/list.json 에 적힌 그림만 불러옵니다.
//  (‘그림 만들기 도우미’가 img.zip 을 만들 때 list.json 을 함께 넣어 줍니다)
//  그림이 없는 항목은 코드로 그린 도트 그림이 그대로 나옵니다.
//
//  폴더 규칙
//   img/buildings/{건물아이디}.png   예) img/buildings/bulguksa.png
//   img/wonder/stage0.png ~ stage5.png
//   img/decor/{꾸미기아이디}.png     예) img/decor/d_pine.png
//   img/heroes/{위인아이디}.png      예) img/heroes/h_sejong.png
//   img/relics/{유물아이디}.png      예) img/relics/r4_5.png
//   img/icons/{아이콘이름}.png       예) img/icons/coin.png
//   img/bosses/{보스아이디}.png      예) img/bosses/b_mongol.png
//   img/scenery/{이름}.png           배경 나무·바위  예) pine, blossom, maple, rock
//   img/people/e{시대}_{0~5}.png      시대별 주민 6명, s{시대}.png 병사  예) e5_0.png, s5.png
//   img/ui/{이름}.png                버튼·판넬  예) btn_red, panel_wood, tile_cream, ribbon_red
// =============================================================
const reg = new Map();   // 'buildings/bulguksa' → HTMLImageElement

function loadOne(path) {
  return new Promise(res => {
    const im = new Image();
    const t = setTimeout(() => res(null), 6000);
    im.onload = () => { clearTimeout(t); res(im); };
    im.onerror = () => { clearTimeout(t); res(null); };
    im.src = 'img/' + path;
  });
}

export async function preloadImages() {
  let list = [];
  try {
    const r = await fetch('img/list.json?v=202611271205', { cache: 'no-cache' });
    if (r.ok) list = await r.json();
  } catch (e) { list = []; }
  if (!Array.isArray(list) || !list.length) return 0;
  const results = await Promise.all(list.map(async p => [p, await loadOne(p)]));
  for (const [p, im] of results) if (im) reg.set(p.replace(/\.png$/i, ''), im);
  return reg.size;
}

export const getImage = (folder, id) => reg.get(folder + '/' + id) || null;
export const imageCount = () => reg.size;

export const uiImages = () => [...reg.keys()].filter(k => k.startsWith('ui/')).map(k => k.slice(3));
