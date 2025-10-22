<?php
declare(strict_types=1);
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$accountId = isset($_GET['account_id']) ? (int)$_GET['account_id'] : 0;
$tags      = isset($_GET['tags']) ? (string)$_GET['tags'] : '';
$code5     = $_GET['code5'] ?? 'SAVE5';
$lang      = preg_replace('/[^a-zA-Z-]/','', $_GET['lang'] ?? 'it');  // it|en|fr|de...
$p1        = (int)($_GET['p1'] ?? 5);
$p2        = (int)($_GET['p2'] ?? 10);
?>
<!doctype html>
<html lang="<?= h($lang) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Popup</title>
  <link rel="stylesheet" href="css/v2.css">
  <style>
    /* leggera riduzione padding verticale */
    .card{ padding:20px 28px; }
    @media (max-width:600px){ .card{ padding:18px; } }
  </style>
  <script src="./lp-i18n.js"></script>
  <script>
    // Inizializza i18n prima del render dei testi
    (function(){
      const qs = new URLSearchParams(location.search);
      const lang = "<?= h($lang) ?>";
      if (window.LPI18N) {
        if (lang) LPI18N.setLocale(lang);
        // Passa p1/p2 dinamici per i titoli
        document.addEventListener('DOMContentLoaded', function(){
          // Applica traduzioni base
          LPI18N.apply(document);
          // Titoli con percentuali
          const lt = document.querySelector('[data-i18n="left_title"]');
          const rt = document.querySelector('[data-i18n="right_title"]');
          if (lt) lt.textContent = LPI18N.t('left_title', {p1: <?= $p1 ?>});
          if (rt) rt.textContent = LPI18N.t('right_title',{p2: <?= $p2 ?>});
          // Testo successo con p2
          const done = document.querySelector('#success [data-i18n="done_text"]');
          if (done) done.textContent = LPI18N.t('done_text', {p2: <?= $p2 ?>});
        });
      }
    })();
  </script>
</head>
<body>
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ttl">
    <div class="card" id="card">
      <button class="close" type="button" aria-label="Chiudi"
              onclick="try{window.parent.postMessage({type:'LP_CLOSE'},'*')}catch(e){}">✕</button>

      <h1 id="ttl" class="title" data-i18n="title">Offerta personalizzata</h1>
      <p class="subtitle" data-i18n="subtitle">Scegli come risparmiare oggi.</p>

      <div class="grid">
        <!-- 5% -->
        <section class="box">
          <h3 data-i18n="left_title">💸 Sconto immediato <?= (int)$p1 ?>%</h3>
          <p  data-i18n="left_desc">Ottieni subito il codice e copialo con un clic.</p>

          <div class="code-block">
            <span class="code-label" data-i18n="coupon_label">Codice sconto</span>
            <span class="code-value" id="code5"><?= h($code5) ?></span>
          </div>

          <button class="btn secondary" style="margin-top:14px" id="copyBtn" data-i18n="copy">Copia codice</button>
          <div class="toast" id="copyToast" style="display:none" data-i18n="copied">Copiato ✅</div>
        </section>

        <!-- 10% -->
        <section class="box box--hl">
          <h3 data-i18n="right_title">💌 Sconto <?= (int)$p2 ?>% con email</h3>
          <p  data-i18n="right_desc">Ricevi il coupon personalizzato direttamente nella tua casella.</p>

          <form id="leadForm" action="#" method="get" novalidate>
            <input type="hidden" name="account_id" value="<?= $accountId ?>">
            <input type="hidden" name="tags" value="<?= h($tags) ?>">

            <div class="inputs">
              <input class="input" name="name"  data-i18n-placeholder="name_ph"  placeholder="Nome e cognome" required>
              <input class="input" name="email" type="email" data-i18n-placeholder="email_ph" placeholder="email@example.com" required>
            </div>

            <input class="input" name="number" style="margin-top:10px"
                   data-i18n-placeholder="phone_ph" placeholder="Telefono (opzionale)">

            <button class="btn primary" style="margin-top:14px" data-i18n="submit">Ricevi il codice via email</button>
          </form>

          <div id="success" style="display:none; margin-top:10px">
            <h4 data-i18n="done_title">Fatto! 🎉</h4>
            <p  data-i18n="done_text">Controlla la tua email: ti abbiamo inviato il coupon del <?= (int)$p2 ?>%.</p>
            <button class="btn secondary" type="button" data-i18n="close"
              onclick="try{window.parent.postMessage({type:'LP_CLOSE'},'*')}catch(e){}">Chiudi</button>
          </div>
        </section>
      </div>

      <p class="fineprint" data-i18n="fineprint">
        Continuando accetti l’informativa privacy. Potrai disiscriverti in qualsiasi momento.
      </p>
    </div>
  </div>

<script>
(function(){
  // auto-resize: comunica al parent l’altezza reale della card
  function sendSize(){
    try{
      const card = document.getElementById('card');
      const h = Math.ceil(card.getBoundingClientRect().height + 16);
      window.parent.postMessage({ type:'LP_SIZE', h }, '*');
    }catch(_){}
  }
  const ro = new ResizeObserver(sendSize);
  ro.observe(document.body); ro.observe(document.getElementById('card'));
  window.addEventListener('load', sendSize);
  setTimeout(sendSize, 50);

  // copia codice
  const copyBtn = document.getElementById('copyBtn');
  copyBtn?.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(document.getElementById('code5').textContent.trim());
      const t=document.getElementById('copyToast'); t.style.display='block';
      setTimeout(()=>{ t.style.display='none'; sendSize(); },1200);
    }catch(e){
      alert(window.LPI18N ? LPI18N.t('err_network') : 'Clipboard non disponibile');
    }
  });

  // submit lead
  const form = document.getElementById('leadForm');
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const qs = new URLSearchParams(fd).toString();
    const url = new URL('lead.php', location.href).toString() + '?' + qs;
    try{
      const r = await fetch(url, {method:'GET', cache:'no-store'});
      const data = r.ok ? await r.json() : {ok:false};
      if (data.ok){
        form.style.display='none';
        document.getElementById('success').style.display='block';
        window.parent.postMessage({type:'LP_SUCCESS'}, '*');
        sendSize();
      } else {
        alert(window.LPI18N ? LPI18N.t('err_submit',{msg:data.msg||r.status}) : 'Invio non riuscito');
      }
    }catch{
      alert(window.LPI18N ? LPI18N.t('err_network') : 'Errore di rete');
    }
  });
})();
</script>
</body>
</html>