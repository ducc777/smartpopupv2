// popup-loader.js — base tua + UTM gating + logging
(function () {
  if (window._lpInjected) return; window._lpInjected = true;

  const s = document.currentScript || document.querySelector('script[data-account]');
  const ACCOUNT   = s.getAttribute('data-account') || '';
  const TAGS_BASE = (s.getAttribute('data-tags') || '').trim();
  const TEMPLATE  = (s.getAttribute('data-template') || '2').trim();
  const STYLE     = (s.getAttribute('data-style') || 'v2').trim();
  const DELAY     = parseInt(s.getAttribute('data-delay') || '0', 10);
  const PATH      = (s.getAttribute('data-path') || 'popup-full-v2.php').replace(/^\/+/, '');
  const LANG      = (s.getAttribute('data-lang') || '').toLowerCase();
  const P_COPY_DEF= parseInt(s.getAttribute('data-p-copy')  || '5', 10);
  const P_OPTIN_DEF=parseInt(s.getAttribute('data-p-optin') || '10',10);
  const COUPON_DEF = (s.getAttribute('data-coupon') || 'SAVE5').trim();
  const PRIVACY   = (s.getAttribute('data-privacy') || '').trim();
  const TEASER_POS= (s.getAttribute('data-teaser-pos') || 'bl').toLowerCase();
  const TEASER_INIT = (s.getAttribute('data-teaser-initial') || '0') === '1';

  // UTM arrays sincronizzati: source ↔ coupon-copy ↔ p1 ↔ p2 ↔ tag-per-indice (opzionale)
  const SRC_ARR   = (s.getAttribute('data-utm-sources')  || '').split(',').map(v=>v.trim()).filter(Boolean);
  const CCOPY_ARR = (s.getAttribute('data-coupons-copy') || '').split(',').map(v=>v.trim()).filter(Boolean);
  const V1_ARR    = (s.getAttribute('data-values-copy')  || '').split(',').map(v=>v.trim()).filter(Boolean);
  const V2_ARR    = (s.getAttribute('data-values-email') || '').split(',').map(v=>v.trim()).filter(Boolean);
  const TAGS_ARR  = (s.getAttribute('data-tags-list')    || '').split(',').map(v=>v.trim()); // opzionale, può avere vuoti

  const maxLen = Math.max(1, SRC_ARR.length, CCOPY_ARR.length, V1_ARR.length, V2_ARR.length, TAGS_ARR.length);
  const pad = a => { if (!a.length) a.push(''); while (a.length<maxLen) a.push(a[a.length-1]||''); return a; };
  pad(SRC_ARR); pad(CCOPY_ARR); pad(V1_ARR); pad(V2_ARR); pad(TAGS_ARR);

  if (!ACCOUNT) { console.warn('[LP] manca data-account'); return; }

  let BASE = s.getAttribute('data-base');
  if (!BASE) { try { BASE = new URL('.', s.src).toString().replace(/\/+$/,''); } catch { BASE = location.origin; } }

  let teaserTxt = s.getAttribute('data-teaser') || `RISPARMIA IL ${P_OPTIN_DEF}% — CLICCA QUI`;
  let overlay=null, teaser=null, iframe=null;

  // ---- UTM helpers ----
  function getUTM(){
    const p = new URLSearchParams(window.location.search);
    const out = {};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','coupon','coupon_code']
      .forEach(k=>{ const v=p.get(k); if (v) out[k]=v; });
    return out;
  }
  function findMatch(){
    const u = getUTM();
    const src = (u.utm_source || '').trim();
    if (!src) return -1;
    const cand = [];
    for (let i=0;i<maxLen;i++) if (SRC_ARR[i] === src) cand.push(i);
    if (!cand.length) return -1;

    const uc = (u.coupon || u.coupon_code || '').trim();
    if (!uc) return cand[0];                // se non c'è coupon in URL, basta la source
    for (const i of cand) if (CCOPY_ARR[i] === uc) return i;
    return -1;
  }

  // ---- Teaser (base tua) ----
  function teaserStyle(pos){
    const base = 'position:fixed;z-index:999998;display:inline-flex;align-items:center;'
      +'background:#111827;color:#e5ff63;font-weight:900;letter-spacing:.02em;'
      +'padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);'
      +'cursor:pointer;user-select:none;opacity:.96;transition:transform .15s ease;';
    const pin = p => p==='bl'?'left:16px;bottom:16px;':p==='br'?'right:16px;bottom:16px;':p==='tl'?'left:16px;top:16px;':'right:16px;top:16px;';
    return base + pin(pos);
  }
  function ensureTeaser(){
    if (teaser) return teaser;
    teaser = document.createElement('div');
    teaser.id='lp-teaser';
    teaser.style.cssText = teaserStyle(TEASER_POS);
    teaser.innerHTML = `<span style="font-size:13px;line-height:1">${teaserTxt}</span>`;
    teaser.addEventListener('mouseenter', ()=> teaser.style.transform='scale(1.02)');
    teaser.addEventListener('mouseleave', ()=> teaser.style.transform='scale(1)');
    teaser.addEventListener('click', openPopup);
    document.body.appendChild(teaser);
    placeTeaser(); window.addEventListener('resize', placeTeaser);
    return teaser;
  }
  function placeTeaser(){
    if (!teaser) return;
    const m = window.innerWidth < 480;
    if (m){
      teaser.style.left='50%'; teaser.style.right='auto';
      teaser.style.bottom='12px'; teaser.style.top='auto';
      teaser.style.transform='translateX(-50%)';
      teaser.style.fontSize='12px'; teaser.style.padding='8px 10px';
    } else {
      teaser.style.transform='none'; teaser.style.fontSize='13px';
    }
  }
  function showTeaser(){ ensureTeaser().style.display='inline-flex'; }
  function hideTeaser(){ if (teaser) teaser.style.display='none'; }

  // ---- Popup (base tua) ----
  function openPopup(){
    if (overlay) return;
    hideTeaser();

    overlay = document.createElement('div');
    overlay.id='lp-overlay';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:999999','display:flex',
      'align-items:center','justify-content:center',
      'background:rgba(0,0,0,.55)','backdrop-filter:blur(2px)','-webkit-backdrop-filter:blur(2px)'
    ].join(';');

    iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    iframe.allow   = 'clipboard-write';

    function sizeIframeBase(){
      const vw = Math.max(320, Math.min(window.innerWidth, 1000));
      const w  = (vw < 520 ?  '96vw' : '740px');
      const h  = (vw < 520 ?  560   : 580) + 'px'; // bootstrap, poi LP_SIZE
      iframe.style.cssText = `
        display:block !important;
        border:0 !important;
        outline:none !important;
        width:${w} !important;
        max-width:96vw !important;
        height:${h} !important;
        background:#fff !important;
        border-radius:22px !important;
        box-shadow:0 18px 48px rgba(0,0,0,.22) !important;
      `;
    }
    sizeIframeBase(); window.addEventListener('resize', sizeIframeBase);

    // — valori per indice matchato —
    const idx = findMatch();
    const p1 = idx>=0 ? parseInt(V1_ARR[idx]||P_COPY_DEF,10)  : P_COPY_DEF;
    const p2 = idx>=0 ? parseInt(V2_ARR[idx]||P_OPTIN_DEF,10) : P_OPTIN_DEF;
    const couponCopy = idx>=0 ? (CCOPY_ARR[idx] || COUPON_DEF) : COUPON_DEF;
    const tagIdx = (idx>=0 && TAGS_ARR[idx]) ? TAGS_ARR[idx] : '';
    const tagsCombined = [TAGS_BASE, tagIdx].filter(Boolean).join(',');

    // logging
    console.group('[SmartPopup]');
    const U = getUTM();
    console.log('UTM:', U);
    console.log('Match index:', idx);
    console.log('Coupon:', couponCopy);
    console.log('p1/p2:', p1, '/', p2);
    console.log('Tags:', tagsCombined || '(nessuno)');
    console.groupEnd();

    // pass-through UTM
    const utmQS = Object.entries(U).map(([k,v])=>'&'+encodeURIComponent(k)+'='+encodeURIComponent(v)).join('');

    iframe.src =
      BASE.replace(/\/+$/,'')+'/'+PATH
      + '?tpl=v'+encodeURIComponent(TEMPLATE)
      + '&account_id='+encodeURIComponent(ACCOUNT)
      + (tagsCombined ? '&tags='+encodeURIComponent(tagsCombined) : '')
      + (STYLE ? '&css='+encodeURIComponent(STYLE) : '')
      + (LANG  ? '&lang='+encodeURIComponent(LANG)  : '')
      + `&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`
      + (PRIVACY ? '&privacy='+encodeURIComponent(PRIVACY) : '')
      + (couponCopy ? '&coupon='+encodeURIComponent(couponCopy) : '')
      + utmQS;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    function close(){
      window.removeEventListener('message', onMsg);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', sizeIframeBase);
      if (overlay){ overlay.remove(); overlay=null; showTeaser(); }
    }
    function onMsg(e){
      if (!e || !e.data) return;
      if (e.data.type==='LP_CLOSE' || e.data.type==='LP_SUCCESS') close();
      if (e.data.type==='LP_SIZE' && iframe){
        const maxH = Math.floor((window.innerHeight||800)*0.94);
        const nh   = Math.min(maxH, Math.max(360, Math.round(e.data.h)));
        iframe.style.height = nh + 'px';
      }
    }
    function onKey(e){ if (e.key==='Escape') close(); }

    overlay.addEventListener('click', e => { if (e.target===overlay) close(); });
    window.addEventListener('message', onMsg);
    document.addEventListener('keydown', onKey);
  }

  // ---- Gating: apri solo se match valido ----
  const idx = findMatch();
  if (idx >= 0){
    if (TEASER_INIT) showTeaser(); // opzionale
    if (DELAY>0) window.addEventListener('load', ()=>setTimeout(openPopup, DELAY));
    else openPopup();
  } else {
    console.info('[SmartPopup] Nessun match UTM valido. Popup non aperto.');
  }
})();