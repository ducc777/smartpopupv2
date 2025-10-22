(function () {
  if (window._lpInjected) return; window._lpInjected = true;

  const s = document.currentScript || document.querySelector('script[data-account]');
  const ACCOUNT   = s.getAttribute('data-account') || '';
  const TAGS      = s.getAttribute('data-tags') || '';
  const TEMPLATE  = s.getAttribute('data-template') || '2';
  const STYLE     = s.getAttribute('data-style') || 'v2';
  const DELAY     = parseInt(s.getAttribute('data-delay') || '0', 10);
  const PATH      = (s.getAttribute('data-path') || 'popup-full-v2.php').replace(/^\/+/, '');
  const LANG      = (s.getAttribute('data-lang') || '').toLowerCase();
  const P_COPY    = parseInt(s.getAttribute('data-p-copy')  || '5', 10);
  const P_OPTIN   = parseInt(s.getAttribute('data-p-optin') || '10',10);
  const COUPON    = s.getAttribute('data-coupon') || 'SAVE5';
  const PRIVACY   = s.getAttribute('data-privacy') || '';
  const TEASER_POS= (s.getAttribute('data-teaser-pos') || 'bl').toLowerCase();
  const TEASER_INIT = (s.getAttribute('data-teaser-initial') || '0') === '1';

  if (!ACCOUNT) return console.warn('[LP] manca data-account');

  let BASE = s.getAttribute('data-base');
  if (!BASE) { try { BASE = new URL('.', s.src).toString().replace(/\/+$/,''); } catch { BASE = location.origin; } }

  let teaserTxt = s.getAttribute('data-teaser') || `RISPARMIA IL ${P_OPTIN}% — CLICCA QUI`;
  let overlay=null, teaser=null, iframe=null;

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
      // altezza di bootstrap: verrà subito rimpiazzata dal messaggio LP_SIZE
      const h  = (vw < 520 ?  560   : 580) + 'px';
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

    iframe.src =
      BASE.replace(/\/+$/,'')+'/'+PATH
      + '?tpl=v'+encodeURIComponent(TEMPLATE)
      + '&account_id='+encodeURIComponent(ACCOUNT)
      + (TAGS  ? '&tags='+encodeURIComponent(TAGS)  : '')
      + (STYLE ? '&css='+encodeURIComponent(STYLE) : '')
      + (LANG  ? '&lang='+encodeURIComponent(LANG)  : '')
      + `&p1=${encodeURIComponent(P_COPY)}&p2=${encodeURIComponent(P_OPTIN)}`
      + (PRIVACY ? '&privacy='+encodeURIComponent(PRIVACY) : '')
      + (COUPON ? '&coupon='+encodeURIComponent(COUPON) : '');

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

  if (TEASER_INIT) showTeaser();
  if (DELAY>0) window.addEventListener('load', ()=>setTimeout(openPopup, DELAY));
  else openPopup();
})();