// popup-core.js — gestisce i18n, resize, copy, submit e tracking eventi
(function(){
  // 🔹 Eventi tracciati
  const EVENTS = {
    SHOW:   'show_popup_coupon',
    CLOSE:  'closed_popup_coupon',
    COPY:   'click_btn_copy_coupon',
    SUBMIT: 'submit_btn_email_coupon',
    REOPEN: 'reopen_popup_coupon'
  };

  // --- i18n render ---
  function applyI18N(){
    if (!window.LPI18N) return;
    LPI18N.apply(document);
    const qs = new URLSearchParams(location.search);
    const p1 = parseInt(qs.get('p1')||'5',10);
    const p2 = parseInt(qs.get('p2')||'10',10);
    const lt = document.querySelector('[data-i18n="left_title"]');
    const rt = document.querySelector('[data-i18n="right_title"]');
    const doneTxt = document.querySelector('#success [data-i18n="done_text"]');
    if (lt) lt.textContent = LPI18N.t('left_title', {p1});
    if (rt) rt.textContent = LPI18N.t('right_title',{p2});
    if (doneTxt) doneTxt.textContent = LPI18N.t('done_text',{p2});
  }

  // --- invia altezza al parent ---
  function sendSize(){
    try{
      const card = document.getElementById('card');
      if (!card) return;
      const h = Math.ceil(card.getBoundingClientRect().height + 16);
      window.parent.postMessage({ type:'LP_SIZE', h }, '*');
    }catch(_){}
  }

  function bindResize(){
    const card = document.getElementById('card');
    if (!card) return;
    const ro = new ResizeObserver(sendSize);
    ro.observe(document.body); ro.observe(card);
    window.addEventListener('load', sendSize);
    setTimeout(sendSize, 50);
  }

  // --- notify inline ---
  function notify(msg){
    const n = document.getElementById('formNotice');
    if (!n) return;
    n.textContent = msg || '';
    n.style.display = msg ? 'block' : 'none';
    sendSize();
  }

  // --- copia coupon ---
  function bindCopy(){
    const btn = document.getElementById('copyBtn');
    if (!btn) return;
    btn.addEventListener('click', async ()=>{
      const el = document.querySelector('.code-value');
      const text = (el?.textContent || '').trim();
      if (!text) return;
      try{
        await navigator.clipboard.writeText(text);
      }catch{
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly','');
        ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); } finally { ta.remove(); }
      }
      const t = document.getElementById('copyToast');
      if (t){
        t.style.display='block';
        setTimeout(()=>{ t.style.display='none'; sendSize(); },1200);
      }
      try{
        window.parent.postMessage({ type:'LP_EVENT', name:EVENTS.COPY, props:{ coupon:text } }, '*');
      }catch(_){}
    });
  }

  // --- submit lead form ---
  function bindForm(){
    const form = document.getElementById('leadForm');
    if (!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!form.checkValidity()){
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
      if (submitBtn){
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        submitBtn.setAttribute('aria-busy','true');
      }
      notify('');

      try{
        window.parent.postMessage({ type:'LP_EVENT', name:EVENTS.SUBMIT }, '*');
      }catch(_){}

      const fd = new FormData(form);
      fd.append('consent_ts', new Date().toISOString());
      if (form.querySelector('#consent_newsletter')?.checked) {
        fd.append('newsletter_optin', '1');
      }

      try{
        const r = await fetch('lead.php', { method:'POST', body: fd, cache:'no-store' });
        const data = r.ok ? await r.json() : {ok:false};

        if (data.ok){
          const notice = document.getElementById('formNotice');
          if (notice) notice.style.display='none';
          form.style.display='none';

          const parentBox = form.closest('.box') || form.parentElement;
          if (parentBox){
            const heading = parentBox.querySelector('h3');
            const desc = parentBox.querySelector('p');
            if (heading) heading.style.display='none';
            if (desc) desc.style.display='none';
          }

          const ok = document.getElementById('success');
          if (ok){
            ok.style.display='block';
            const h = ok.querySelector('h3,[data-i18n="done_title"]') || ok;
            try{ h.setAttribute('tabindex','-1'); h.focus(); }catch(_){}
          } else {
            notify((window.LPI18N && LPI18N.t) ? LPI18N.t('done_text') : 'Controlla la tua email.');
          }

          sendSize();
        } else {
          notify(window.LPI18N ? LPI18N.t('err_submit',{msg:data.msg||r.status}) : 'Invio non riuscito');
        }
      }catch{
        notify(window.LPI18N ? LPI18N.t('err_network') : 'Errore di rete');
      }finally{
        if (submitBtn){
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          submitBtn.removeAttribute('aria-busy');
        }
      }
    });
  }

  // --- init + tracking base ---
  document.addEventListener('DOMContentLoaded', ()=>{
    applyI18N();
    bindResize();
    bindCopy();
    bindForm();

    try {
      window.parent.postMessage({ type:'LP_EVENT', name:EVENTS.SHOW }, '*');
    } catch(_){}
  });

  // --- eventi globali per chiusura/riapertura ---
  window.addEventListener('message', (ev)=>{
    if (!ev.data || !ev.data.type) return;
    if (ev.data.type === 'LP_CLOSE'){
      try{
        window.parent.postMessage({ type:'LP_EVENT', name:EVENTS.CLOSE }, '*');
      }catch(_){}
    }
    if (ev.data.type === 'LP_REOPEN'){
      try{
        window.parent.postMessage({ type:'LP_EVENT', name:EVENTS.REOPEN }, '*');
      }catch(_){}
    }
  });

  // --- orientamento e visibilità ---
  window.addEventListener('orientationchange', () => setTimeout(sendSize, 150));
  window.addEventListener('resize', () => setTimeout(sendSize, 80));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(sendSize, 80);
  });
})();