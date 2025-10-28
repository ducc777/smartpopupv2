(function () {
  function tpl(s,p){ return s.replace(/\{(\w+)\}/g,(_,k)=> (p && p[k]!=null)? String(p[k]) : ''); }

  const DICT = {
    it:{
      consent_privacy_accept:"Ho letto e accetto l’<a href='{privacy_url}' target='_blank' rel='noopener'>Informativa Privacy</a>.",
      consent_newsletter_optin:"Acconsento a ricevere la newsletter.",
      title:"Offerta personalizzata",
      subtitle:"Approfitta dei vantaggi della prenotazione diretta.",
      left_title:"💸 Sconto immediato {p1}%",
      left_desc:"Ottieni subito il codice e copialo con un clic.",
      coupon_label:"Codice sconto",
      coupon_value:"{coupon}",              /* ⬅️ nuovo: via i18n */
      copy:"Copia codice",
      copied:"Copiato ✅",
      right_title:"💌 Sconto {p2}% con email",
      right_desc:"Ricevi il coupon personalizzato direttamente nella tua casella.",
      name_ph:"Nome e cognome",
      email_ph:"email@example.com",
      phone_ph:"Telefono (opzionale)",
      submit:"Ricevi il codice via email",
      done_title:"Fatto! 🎉",
      done_text:"Controlla la tua email: ti abbiamo inviato il coupon del {p2}%.",
      close:"Chiudi",
      fineprint:"Continuando accetti l’informativa privacy. Potrai disiscriverti in qualsiasi momento.",
      err_email:"Inserisci un’email valida.",
      err_cfg:"Configurazione mancante.",
      err_network:"Errore di rete. Riprova.",
      err_submit:"Invio non riuscito: {msg}",
      teaser_saving: "RISPARMIA FINO AL {p2}%"
    }
  };

  const API = {
    _dict: DICT, _locale: 'it',
    t(k,p,fb){ const L=this._dict.it; return tpl((L&&L[k])||fb||k,p); },
    apply(root=document){
      const qs=new URLSearchParams(location.search);
      const p1=parseInt(qs.get('p1')||'5',10);
      const p2=parseInt(qs.get('p2')||'10',10);
      const coupon=qs.get('coupon')||'SAVE5';
      const privacy_url=qs.get('privacy')||'/privacy';
      const params={p1,p2,percent:p2,privacy_url,coupon};
      const Q=sel=>Array.from(root.querySelectorAll(sel));

      Q('[data-i18n]').forEach(el=>{ el.textContent=this.t(el.getAttribute('data-i18n'),params); });
      Q('[data-i18n-placeholder]').forEach(el=>{ el.setAttribute('placeholder',this.t(el.getAttribute('data-i18n-placeholder'),params)); });
      Q('[data-i18n-html]').forEach(el=>{ el.innerHTML=this.t(el.getAttribute('data-i18n-html'),params); });
    }
  };
  window.LPI18N=API;
})();