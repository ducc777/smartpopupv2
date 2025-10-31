// popup-core.js — accordion mobile + tracking (stabilizzato)
(function(){
  // =========================
  // EVENTS + tracking bridge
  // =========================
  const EVENTS = {
    SHOW: 'show_popup_coupon',
    CLOSE: 'closed_popup_coupon',
    REOPEN: 'reopen_popup_coupon',
    COPY: 'click_btn_copy_coupon',
    SUBMIT_EMAIL: 'submit_btn_email_coupon',
    ACC_OPEN_COPY: 'accordion_open_copy',
    ACC_OPEN_EMAIL: 'accordion_open_email'
  };

  function routeTrack(name, props = {}, interactive = true){
    try {
      window.parent?.postMessage({ type: 'LP_EVENT', name, props, interactive }, '*');
    } catch (_) {}
  }

  // =========================
  // i18n render
  // =========================
  function applyI18N(){
    if (!window.LPI18N) return;
    LPI18N.apply(document);

    const qs = new URLSearchParams(location.search);
    const p1 = parseInt(qs.get('p1') || '5', 10);
    const p2 = parseInt(qs.get('p2') || '10', 10);

    const lt = document.querySelector('[data-i18n="left_title"]');
    const rt = document.querySelector('[data-i18n="right_title"]');
    const doneTxt = document.querySelector('#success [data-i18n="done_text"]');

    if (lt) lt.textContent = LPI18N.t('left_title', { p1 });
    if (rt) rt.textContent = LPI18N.t('right_title', { p2 });
    if (doneTxt) doneTxt.textContent = LPI18N.t('done_text', { p2 });
  }

  // =========================
  // resize → parent
  // =========================
  function sendSize(){
    try {
      const card = document.getElementById('card');
      if (!card) return;
      const h = Math.ceil(card.getBoundingClientRect().height + 16);
      window.parent.postMessage({ type: 'LP_SIZE', h }, '*');
    } catch (_) {}
  }
  function bindResize(){
    const card = document.getElementById('card');
    if (!card) return;
    const ro = new ResizeObserver(sendSize);
    ro.observe(document.body);
    ro.observe(card);
    window.addEventListener('load', sendSize);
    setTimeout(sendSize, 50);
  }

  // =========================
  // toast/notice inline
  // =========================
  function notify(msg){
    const n = document.getElementById('formNotice');
    if (!n) return;
    n.textContent = msg || '';
    n.style.display = msg ? 'block' : 'none';
    sendSize();
  }
  window._lpNotify = notify;

  // =========================
  // copia coupon
  // =========================
  function bindCopy(){
    const btn = document.getElementById('copyBtn');
    if (!btn) return;

    btn.addEventListener('click', async ()=>{
      const el = document.querySelector('.code-value');
      const text = (el?.textContent || '').trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly','');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } finally { ta.remove(); }
      }

      const t = document.getElementById('copyToast');
      if (t){
        t.style.display = 'block';
        setTimeout(()=>{ t.style.display = 'none'; sendSize(); }, 1200);
      }
      try { sessionStorage.setItem('lp_copied', '1'); } catch (_){}
      routeTrack(EVENTS.COPY, { coupon: text }, true);
    });
  }

  // =========================
  // submit lead (email coupon)
  // =========================
  function bindForm(){
    const form = document.getElementById('leadForm');
    if (!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();

      if (!form.checkValidity()){
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      notify('');

      const fd = new FormData(form);
      fd.append('consent_ts', new Date().toISOString());

      try{
        const r = await fetch('lead.php', { method:'POST', body: fd, cache:'no-store' });
        const data = r.ok ? await r.json() : { ok:false };

        if (data.ok){
          const notice = document.getElementById('formNotice');
          if (notice) notice.style.display = 'none';

          form.style.display = 'none';
          const parentBox = form.closest('.box') || form.parentElement;
          if (parentBox){
            const heading = parentBox.querySelector('h3');
            const desc = parentBox.querySelector('p');
            if (heading) heading.style.display = 'none';
            if (desc) desc.style.display = 'none';
          }

          const ok = document.getElementById('success');
          if (ok){
            ok.style.display = 'block';
            const h = ok.querySelector('h4') || ok.querySelector('[data-i18n="done_title"]') || ok;
            try { h.setAttribute('tabindex','-1'); h.focus(); } catch(_){}
          }

          routeTrack(EVENTS.SUBMIT_EMAIL, {}, true);
          sendSize();
        } else {
          notify(window.LPI18N ? LPI18N.t('err_submit', { msg: data.msg || r.status }) : 'Invio non riuscito');
          if (submitBtn) submitBtn.disabled = false;
        }
      }catch{
        notify(window.LPI18N ? LPI18N.t('err_network') : 'Errore di rete');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // =========================
  // Accordion mobile (stabile)
  // =========================
  const MOBILE_BREAKPOINT = 560;
  let ACC = {
    built:false,
    container:null,
    sec1:null, sec2:null,
    leftBox:null, rightBox:null,
    placeholderLeft:null, placeholderRight:null,
    leftH3:null, rightH3:null
  };

  function buildAccordion(){
    if (ACC.built) return;

    const grid = document.querySelector('.lp-grid-2, .grid, #card');
    if (!grid) return;

    const copyBox  = document.querySelector('#copyBtn')?.closest('.box');
    const emailBox = document.querySelector('#leadForm')?.closest('.box');
    if (!copyBox || !emailBox) return;

    ACC.container = grid;
    ACC.leftBox = copyBox;
    ACC.rightBox = emailBox;

    // salva riferimenti agli <h3> da nascondere in mobile
    ACC.leftH3  = copyBox.querySelector('h3') || null;
    ACC.rightH3 = emailBox.querySelector('h3') || null;

    // placeholder per ricollocare i box al destroy
    ACC.placeholderLeft  = document.createElement('div');
    ACC.placeholderRight = document.createElement('div');
    copyBox.parentNode.insertBefore(ACC.placeholderLeft, copyBox);
    emailBox.parentNode.insertBefore(ACC.placeholderRight, emailBox);

    // titoli accordion = titoli dei box (emojis + %)
    const titleCopy  = (ACC.leftH3  ? ACC.leftH3.textContent.trim()  : 'Sconto immediato').replace(/\s+/g,' ').trim();
    const titleEmail = (ACC.rightH3 ? ACC.rightH3.textContent.trim() : 'Sconto con email').replace(/\s+/g,' ').trim();

    const sec1 = makeAccSection(copyBox, titleCopy,  'copy');
    const sec2 = makeAccSection(emailBox, titleEmail, 'email');
    grid.append(sec1, sec2);

    // nascondi gli h3 interni per evitare duplicati in mobile
    if (ACC.leftH3)  ACC.leftH3.style.display  = 'none';
    if (ACC.rightH3) ACC.rightH3.style.display = 'none';

    ACC.sec1 = sec1;
    ACC.sec2 = sec2;
    ACC.built = true;

    // entrambi CHIUSI di default
    sec1.classList.remove('is-open');
    sec1.querySelector('.lp-acc-trigger').setAttribute('aria-expanded','false');
    sec2.classList.remove('is-open');
    sec2.querySelector('.lp-acc-trigger').setAttribute('aria-expanded','false');

    sendSize();
  }

  function destroyAccordion(){
    if (!ACC.built) return;

    // ripristina display degli <h3> interni
    if (ACC.leftH3)  ACC.leftH3.style.display  = '';
    if (ACC.rightH3) ACC.rightH3.style.display = '';

    // rimetti i box nella posizione originale
    if (ACC.leftBox && ACC.placeholderLeft){
      ACC.placeholderLeft.parentNode.insertBefore(ACC.leftBox, ACC.placeholderLeft);
      ACC.placeholderLeft.remove();
    }
    if (ACC.rightBox && ACC.placeholderRight){
      ACC.placeholderRight.parentNode.insertBefore(ACC.rightBox, ACC.placeholderRight);
      ACC.placeholderRight.remove();
    }

    // rimuovi le sezioni
    ACC.sec1?.remove();
    ACC.sec2?.remove();

    // reset stato
    ACC = {
      built:false,
      container:null,
      sec1:null, sec2:null,
      leftBox:null, rightBox:null,
      placeholderLeft:null, placeholderRight:null,
      leftH3:null, rightH3:null
    };

    sendSize();
  }

  function makeAccSection(boxEl, title, kind){
    const sec = document.createElement('section');
    sec.className = 'lp-acc-section';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'lp-acc-trigger';
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML = `
      <span class="lp-acc-title">${title}</span>
      <svg class="lp-acc-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    const panel = document.createElement('div');
    panel.className = 'lp-acc-panel';
    panel.appendChild(boxEl);

    trigger.addEventListener('click', ()=>{
      const isOpen = sec.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', isOpen);
      routeTrack(kind === 'copy' ? EVENTS.ACC_OPEN_COPY : EVENTS.ACC_OPEN_EMAIL, {}, true);
      sendSize();
    });

    sec.append(trigger, panel);
    return sec;
  }

  function handleResize(){
    const w = window.innerWidth;
    if (w < MOBILE_BREAKPOINT && !ACC.built) buildAccordion();
    else if (w >= MOBILE_BREAKPOINT && ACC.built) destroyAccordion();
  }

  // =========================
  // lifecycle
  // =========================
  document.addEventListener('DOMContentLoaded', ()=>{
    applyI18N();
    bindResize();
    bindCopy();
    bindForm();

    routeTrack(EVENTS.SHOW, {}, true);
    handleResize();
    window.addEventListener('resize', handleResize);
  });

  // debug/export
  window.__LP_EVENTS__ = EVENTS;
})();