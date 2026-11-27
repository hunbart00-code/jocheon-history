// =============================================================
//  카카오톡·네이버·밴드 같은 앱 안에서 열었을 때 → 크롬(기본 브라우저)으로 옮겨요
//  앱 안 브라우저에서는 전체 화면·가로 고정·저장이 잘 안 될 때가 있어요.
//  (모듈이 아닌 일반 스크립트 — 화면이 그려지기 전에 가장 먼저 실행돼요)
// =============================================================
(function () {
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var kakao = /KAKAOTALK/i.test(ua), line = /\bLine\//i.test(ua);
  var knownApp = /NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|BAND\/|DaumApps|KAKAOSTORY|everytimeApp/i.test(ua);
  var webview = isAndroid && /; wv\)/i.test(ua);
  if (!(kakao || line || knownApp || webview)) return;
  try { if (sessionStorage.getItem('hb.stayInapp')) return; } catch (e) {}

  var url = location.href.replace(/[?&]openExternalBrowser=1/, '');
  var canOpen = kakao || line || isAndroid;
  function open() {
    if (kakao) location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    else if (line) location.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'openExternalBrowser=1';
    else if (isAndroid) location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
  }
  function copy(btn) {
    var done = function () { btn.textContent = '주소를 복사했어요!'; };
    try { navigator.clipboard.writeText(url).then(done, fallback); } catch (e) { fallback(); }
    function fallback() {
      var t = document.createElement('textarea'); t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = url; } t.remove();
    }
  }
  var target = isIOS ? '사파리(브라우저)' : '크롬';
  var ov = document.createElement('div'); ov.className = 'inapp'; ov.id = 'inapp';
  ov.innerHTML = '<div class="inapp-card">' +
    '<svg class="inapp-ic" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#2a3a7a" stroke="#ffe07a" stroke-width="3"/><path d="M24 9l5 15-5 15-5-15z" fill="#ffe07a"/><path d="M24 24l5 0-5 15z" fill="#e2463a"/><circle cx="24" cy="24" r="2.5" fill="#fff"/></svg>' +
    '<b>' + target + '에서 열어 주세요</b>' +
    '<p>앱 안에서 열면 전체 화면·저장이 잘 안 될 수 있어요.</p>' +
    (canOpen ? '<button class="go" id="inappGo" type="button">' + (isIOS ? '사파리로 열기' : '크롬으로 열기') + '</button>' +
      (kakao || line ? '<p class="small">새 창이 열렸으면 이 창은 닫아도 돼요.</p>' : '')
      : '<p class="steps">화면 아래(또는 위)의 <b>⋯</b> 또는 <b>공유</b> 버튼을 누르고<br>‘<b>Safari로 열기</b>’(또는 ‘기본 브라우저로 열기’)를 눌러 주세요.</p>') +
    '<button class="copy" id="inappCopy" type="button">주소 복사하기</button>' +
    '<button class="stay" id="inappStay" type="button">그냥 여기서 할래요</button></div>';
  document.body.appendChild(ov);
  var go = document.getElementById('inappGo');
  if (go) go.onclick = open;
  document.getElementById('inappCopy').onclick = function () { copy(this); };
  document.getElementById('inappStay').onclick = function () { try { sessionStorage.setItem('hb.stayInapp', '1'); } catch (e) {} ov.remove(); };
  // 카카오톡·라인·안드로이드 앱(네이버·밴드 등)은 바로 크롬으로 보내 봐요
  if (kakao || line || (isAndroid && knownApp)) setTimeout(open, 300);
})();
