(function () {
  function norm(lc){ if(!lc) return 'en'; lc=(lc+'').toLowerCase().replace('_','-'); return lc.split('-')[0]||'en'; }
  function tpl(s,p){ return s.replace(/\{(\w+)\}/g,(_,k)=> (p && p[k]!=null)? String(p[k]) : ''); }

  const DICT = {
    it:{
      title:"Offerta personalizzata",
      subtitle:"Approfitta dei vantaggi della prenotazione diretta.",
      left_title:"💸 Sconto immediato {p1}%",
      left_desc:"Ottieni subito il codice e copialo con un clic.",
      coupon_label:"Codice sconto",
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
      teaser:"Risparmia il {percent}% — clicca qui"
    },
    en:{
      title:"Personalized offer",
      subtitle:"Choose how to save today.",
      left_title:"💸 Instant {p1}% off",
      left_desc:"Get your code now and copy it with one click.",
      coupon_label:"Discount code",
      copy:"Copy code",
      copied:"Copied ✅",
      right_title:"💌 {p2}% off with email",
      right_desc:"Receive your personalized coupon straight to your inbox.",
      name_ph:"Full name",
      email_ph:"email@example.com",
      phone_ph:"Phone (optional)",
      submit:"Get the code by email",
      done_title:"All set! 🎉",
      done_text:"Check your inbox: we sent you the {p2}% coupon.",
      close:"Close",
      fineprint:"By continuing you accept our privacy policy. You can unsubscribe at any time.",
      err_email:"Enter a valid email.",
      err_cfg:"Missing configuration.",
      err_network:"Network error. Try again.",
      err_submit:"Submit failed: {msg}",
      teaser:"Save {percent}% — click here"
    },
    fr:{
      title:"Offre personnalisée",
      subtitle:"Choisissez comment économiser aujourd’hui.",
      left_title:"💸 Réduction immédiate de {p1} %",
      left_desc:"Obtenez votre code maintenant et copiez-le en un clic.",
      coupon_label:"Code de réduction",
      copy:"Copier le code",
      copied:"Copié ✅",
      right_title:"💌 {p2} % avec e-mail",
      right_desc:"Recevez votre coupon personnalisé directement par e-mail.",
      name_ph:"Nom et prénom",
      email_ph:"email@example.com",
      phone_ph:"Téléphone (optionnel)",
      submit:"Recevoir le code par e-mail",
      done_title:"C’est fait ! 🎉",
      done_text:"Vérifiez votre boîte mail : nous avons envoyé le coupon de {p2} %.",
      close:"Fermer",
      fineprint:"En continuant, vous acceptez notre politique de confidentialité. Désinscription possible à tout moment.",
      err_email:"Saisissez un e-mail valide.",
      err_cfg:"Configuration manquante.",
      err_network:"Erreur réseau. Réessayez.",
      err_submit:"Échec d’envoi : {msg}",
      teaser:"Économisez {percent}% — cliquez ici"
    },
    de:{
      title:"Personalisierte Aktion",
      subtitle:"Wähle, wie du heute sparst.",
      left_title:"💸 Sofort {p1} % Rabatt",
      left_desc:"Hol dir jetzt den Code und kopiere ihn mit einem Klick.",
      coupon_label:"Rabattcode",
      copy:"Code kopieren",
      copied:"Kopiert ✅",
      right_title:"💌 {p2} % mit E-Mail",
      right_desc:"Erhalte deinen persönlichen Coupon direkt in dein Postfach.",
      name_ph:"Vollständiger Name",
      email_ph:"email@example.com",
      phone_ph:"Telefon (optional)",
      submit:"Code per E-Mail erhalten",
      done_title:"Fertig! 🎉",
      done_text:"Prüfe dein Postfach: Wir haben dir den {p2}%-Coupon gesendet.",
      close:"Schließen",
      fineprint:"Mit dem Fortfahren akzeptierst du unsere Datenschutzrichtlinie. Abmeldung jederzeit möglich.",
      err_email:"Gib eine gültige E-Mail ein.",
      err_cfg:"Konfiguration fehlt.",
      err_network:"Netzwerkfehler. Bitte erneut versuchen.",
      err_submit:"Senden fehlgeschlagen: {msg}",
      teaser:"Spare {percent}% — hier klicken"
    }
  };

  const API = {
    _dict: DICT,
    _locale: norm(navigator.language||'en'),
    setLocale(lc){ this._locale = norm(lc); },
    t(key, params, fb){
      const L = this._dict[this._locale] || this._dict.en;
      const s = (L && L[key]) || (this._dict.en && this._dict.en[key]) || fb || key;
      return tpl(s, params);
    },
    apply(root=document){
      const q = (sel)=> Array.prototype.slice.call(root.querySelectorAll(sel));
      q('[data-i18n]').forEach(el=>{
        const k = el.getAttribute('data-i18n');
        const p1 = parseInt(new URLSearchParams(location.search).get('p1')||'5',10);
        const p2 = parseInt(new URLSearchParams(location.search).get('p2')||'10',10);
        el.textContent = this.t(k, {p1, p2});
      });
      q('[data-i18n-placeholder]').forEach(el=>{
        const k = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', this.t(k));
      });
    },
    extend(lc, entries={}){ lc=norm(lc); this._dict[lc]=Object.assign({},this._dict[lc]||{},entries); }
  };

  window.LPI18N = API;
})();