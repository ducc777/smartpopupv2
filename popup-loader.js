// popup-loader.js — UTM gating + iframe + teaser BR + i18n teaser text + tracking
(function () {
  if (window._spInjected) return; window._spInjected = true;

  // 🔹 Event names centralized
  const EVENTS = {
    SHOW:   'show_popup_coupon',
    CLOSE:  'closed_popup_coupon',
    COPY:   'click_btn_copy_coupon',
    SUBMIT: 'submit_btn_email_coupon',
    REOPEN: 'reopen_popup_coupon'
  };

  const s = document.currentScript || document.querySelector('script[src*="popup-loader"]');

  // Base
  const ACCOUNT   = s.getAttribute('data-account') || '';
  const TAGS_BASE = (s.getAttribute('data-tags') || '').trim();
  const TEMPLATE  = (s.getAttribute('data-template') || '2').trim();
  const PATH      = (s.getAttribute('data-path')  || 'popup-full.php').replace(/^\/+/, '');
  const STYLE     = (s.getAttribute('data-style') || 'v2').trim();
  const LANG_ATTR = (s.getAttribute('data-lang')  || '').trim().toLowerCase();
  const PRIVACY   = (s.getAttribute('data-privacy') || '').trim();
  const DELAY     = parseInt(s.getAttribute('data-delay') || '0', 10);
  const TEASER_ENABLED = (s.getAttribute('data-teaser') || '1') !== '0';

  // Default globali
  const P_COPY_DEFAULT  = parseInt(s.getAttribute('data-p-copy-default')  || s.getAttribute('data-p-copy')  || '5', 10);
  const P_OPTIN_DEFAULT = parseInt(s.getAttribute('data-p-optin-default') || s.getAttribute('data-p-optin') || '10',10);
  const COUPON_DEFAULT  = (s.getAttribute('data-coupon') || '').trim();

  // Array per-indice
  const SRC_ARR   = (s.getAttribute('data-utm-sources')  || '').split(',').map(x=>x.trim()).filter(Boolean);
  const CCOPY_ARR = (s.getAttribute('data-coupons-copy') || '').split(',').map(x=>x.trim()).filter(Boolean);
  const V1_ARR    = (s.getAttribute('data-p-copy')       || '').split(',').map(x=>x.trim()).filter(Boolean);
  const V2_ARR    = (s.getAttribute('data-p-optin')      || '').split(',').map(x=>x.trim()).filter(Boolean);
  const TAGS_ARR  = (s.getAttribute('data-tags-list')    || '').split(',').map(x=>x.trim());

  const maxLen = Math.max(1, SRC_ARR.length, CCOPY_ARR.length, V1_ARR.length, V2_ARR.length, TAGS_ARR.length);
  const pad = a => { if (!a.length) a.push(''); while (a.length<maxLen) a.push(a[a.length-1]||''); return a; };
  pad(SRC_ARR); pad(CCOPY_ARR); pad(V1_ARR); pad(V2_ARR); pad(TAGS_ARR);

  let BASE = s.getAttribute('data-base') || '';
  if (!BASE) { try { BASE = new URL('.', s.src).toString().replace(/\/+$/,''); } catch { BASE = location.origin; } }

  // Tracker router
  const tracker = document.querySelector('smart-tracking');
  function routeTrack(name, props, interactive = true){
    try{
      if (tracker && typeof tracker.track==='function') tracker.track(name, props, interactive);
      else if (typeof window.plausible==='function') window.plausible(name, { props, interactive });
      if (window.dataLayer) window.dataLayer.push({ event:name, ...props, non_interactive:!interactive });
      if (window.gtag) window.gtag('event', name, props || {});
    }catch(_){}
  }

  // Helpers
  function getUTM(){
    const p = new URLSearchParams(window.location.search);
    const out = {};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','coupon','coupon_code','lang']
      .forEach(k=>{ const v=p.get(k); if (v) out[k]=v; });
    return out;
  }
  function normLang(l){
    const v=(l||'').toLowerCase();
    if (!v) return '';
    const b=v.split(/[_-]/)[0];
    return b && /^[a-z]{2}$/.test(b) ? b : '';
  }
  function findMatch(){
    const u = getUTM();
    const src = u.utm_source || '';
    if (!src) return -1;
    const cand = [];
    for (let i=0;i<maxLen;i++) if (SRC_ARR[i] === src) cand.push(i);
    if (!cand.length) return -1;
    const uc = (u.coupon || u.coupon_code || '').trim();
    if (!uc) return cand[0];
    for (const i of cand) if (CCOPY_ARR[i] === uc) return i;
    return -1;
  }

  // Stato UI
  let overlay=null, iframe=null, teaser=null;
  let lastProps=null;

  // 🧩 gestione larghezza iframe: desktop invariato, mobile 96vw con min 320
  const MOBILE_BREAKPOINT = 560;

  function setIframeWidth(i){
    if (!i) return;
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      i.style.width = '740px';     // desktop fisso
      return;
    }
    const w = Math.max(320, Math.round(window.innerWidth * 0.96));
    i.style.width = w + 'px';      // mobile fluido
  }
  
  function onResize(){ setIframeWidth(iframe); }

  function removeTeaser(){ if (teaser){ teaser.remove(); teaser=null; } }

  function teaserLabel(p2){
    try {
      if (window.LPI18N) return LPI18N.t('teaser_saving', { p2: parseInt(p2,10) });
    } catch(_){}
    const v = (p2 && !isNaN(p2)) ? parseInt(p2,10) : null;
    return v ? `RISPARMIA FINO A ${v}%` : 'RISPARMIA';
  }

  function showTeaser(p2){
    if (!TEASER_ENABLED) return;
    removeTeaser();
    teaser = document.createElement('button');
    teaser.type = 'button';
    teaser.id = '_spTeaser';
    teaser.textContent = teaserLabel(p2);
    teaser.setAttribute('aria-label','Apri offerta');
    teaser.style.cssText = [
      'position:fixed','right:16px','bottom:16px','z-index:2147483645',
      'background:#111','color:#fff','border:0','border-radius:999px',
      'padding:10px 14px','font:600 13px/1.1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'box-shadow:0 8px 22px rgba(0,0,0,.25)','cursor:pointer','opacity:.92'
    ].join(';');
    teaser.addEventListener('click', ()=>{
      if (lastProps){
        routeTrack(EVENTS.REOPEN, {
          coupon: lastProps.couponCopy, p1: lastProps.p1, p2: lastProps.p2, tags: lastProps.tagsCombined
        }, true);
        openPopupWith(lastProps);
      }
    });
    document.body.appendChild(teaser);
  }

  function minimizeToTeaser(){
    if (overlay){ overlay.remove(); overlay=null; }
    window.removeEventListener('message', onMsg);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);  // 🔴 cleanup listener width
    showTeaser(lastProps && lastProps.p2);
    routeTrack(EVENTS.CLOSE, {
      coupon: lastProps?.couponCopy, p1: lastProps?.p1, p2: lastProps?.p2, tags: lastProps?.tagsCombined
    }, false);
  }

  function openPopupWith(props){
    lastProps = props;
    removeTeaser();
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center;';
    overlay.addEventListener('click', (e)=>{
      if (e.target === overlay) minimizeToTeaser();
    });

    iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    iframe.allow   = 'clipboard-write';
    // width di default per desktop; mobile viene gestito da setIframeWidth()
    iframe.style.cssText='width:740px;max-width:96vw;height:580px;border:0;border-radius:22px;background:#fff;box-shadow:0 18px 48px rgba(0,0,0,.22);';

    const { p1, p2, couponCopy, tagsCombined, lang, utmQS } = props;

    iframe.src =
      BASE.replace(/\/+$/,'')+'/'+PATH
      + '?tpl=v'+encodeURIComponent(TEMPLATE)
      + '&account_id='+encodeURIComponent(ACCOUNT)
      + (tagsCombined ? '&tags='+encodeURIComponent(tagsCombined) : '')
      + (STYLE ? '&css='+encodeURIComponent(STYLE) : '')
      + (lang  ? '&lang='+encodeURIComponent(lang)  : '')
      + `&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`
      + (PRIVACY ? '&privacy='+encodeURIComponent(PRIVACY) : '')
      + (couponCopy ? '&coupon='+encodeURIComponent(couponCopy) : '')
      + utmQS;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // 🔵 applica larghezza responsiva e attiva listener solo quando aperto
    setIframeWidth(iframe);
    window.addEventListener('resize', onResize);

    window.addEventListener('message', onMsg);
    document.addEventListener('keydown', onKey);

    routeTrack(EVENTS.SHOW, {
      utm_source: (getUTM().utm_source || ''),
      coupon: couponCopy, p1, p2, lang: lang || '(none)', tags: tagsCombined
    }, false);
  }

  function openPopup(idx){
    const U = getUTM();
    const urlLang = normLang(U.lang);
    const lang = normLang(LANG_ATTR) || urlLang || navigator.language?.split('-')[0]?.toLowerCase() || 'it';

    const p1 = idx>=0 ? parseInt(V1_ARR[idx] || P_COPY_DEFAULT, 10)  : P_COPY_DEFAULT;
    const p2 = idx>=0 ? parseInt(V2_ARR[idx] || P_OPTIN_DEFAULT,10)  : P_OPTIN_DEFAULT;
    const couponCopy = idx>=0 ? (CCOPY_ARR[idx] || COUPON_DEFAULT)   : COUPON_DEFAULT;
    const tagIdx = (idx>=0 && TAGS_ARR[idx]) ? TAGS_ARR[idx] : '';
    const tagsCombined = [TAGS_BASE, tagIdx].filter(Boolean).join(',');

    const utmQS = Object.entries(U).map(([k,v])=>'&'+encodeURIComponent(k)+'='+encodeURIComponent(v)).join('');

    const props = { idx, p1, p2, couponCopy, tagsCombined, lang, utmQS };
    openPopupWith(props);
  }

  function closePopup(){ minimizeToTeaser(); }

  function onMsg(e){
    if (!e || !e.data) return;
    const d = e.data;
    if (d.type === 'LP_CLOSE' || d.type === 'LP_SUCCESS') { closePopup(); return; }
    if (d.type === 'LP_SIZE' && iframe){
      const maxH = Math.floor((window.innerHeight||800)*0.94);
      const nh   = Math.min(maxH, Math.max(360, Math.round(d.h || 540)));
      iframe.style.height = nh + 'px';
      return;
    }
    if (d.type === 'LP_EVENT' && d.name){
      routeTrack(d.name, d.props || {}, d.interactive !== false);
    }
  }

  function onKey(e){ if (e.key === 'Escape') closePopup(); }

  const idx = findMatch();
  if (idx >= 0){
    if (DELAY>0) window.addEventListener('load', ()=>setTimeout(()=>openPopup(idx), DELAY));
    else openPopup(idx);
  } else {
    console.info('[SmartPopup] Nessun match UTM valido. Popup non aperto.');
  }
})();