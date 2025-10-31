<?php
declare(strict_types=1);
function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$accountId = (int)($_GET['account_id'] ?? 0);
$tags      = (string)($_GET['tags'] ?? '');
$lang      = preg_replace('/[^a-zA-Z-]/','', $_GET['lang'] ?? 'it');
$p1        = (int)($_GET['p1'] ?? 5);
$p2        = (int)($_GET['p2'] ?? 10);
$privacy   = $_GET['privacy'] ?? '/privacy';
$css       = $_GET['css'] ?? 'v2';
?>
<!doctype html>
<html lang="<?= h($lang) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Popup</title>
  <link rel="stylesheet" href="css/<?= h($css) ?>.css">
  <script src="./lp-i18n.js"></script>
  <script src="./popup-core.js"></script>
</head>
<body>
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ttl">
    <div class="card" id="card">
      <button class="close" type="button" aria-label="Chiudi"
        onclick="try{window.parent.postMessage({type:'LP_CLOSE'},'*')}catch(e){}">✕</button>

      <h1 id="ttl" class="title" data-i18n="title">Offerta personalizzata</h1>
      <p class="subtitle" data-i18n="subtitle">Approfitta dei vantaggi della prenotazione diretta.</p>

      <div class="grid">
        <!-- 5% immediato -->
        <section class="box">
          <h3 data-i18n="left_title">💸 Sconto immediato <?= (int)$p1 ?>%</h3>
          <p  data-i18n="left_desc">Ottieni subito il codice e copialo con un clic.</p>

          <div class="code-block">
            <span class="code-label" data-i18n="coupon_label">Codice sconto</span>
            <span class="code-value" data-i18n="coupon_value">SAVE5</span>
          </div>

          <button class="btn secondary" style="margin-top:14px" id="copyBtn" data-i18n="copy">Copia codice</button>
          <div class="toast" id="copyToast" style="display:none" data-i18n="copied">Copiato ✅</div>
        </section>

        <!-- 10% con email -->
        <section class="box box--hl">
          <h3 data-i18n="right_title">💌 Sconto <?= (int)$p2 ?>% con email</h3>
          <p  data-i18n="right_desc">Ricevi il coupon personalizzato direttamente nella tua casella.</p>

          <form id="leadForm" action="#" method="get">
            <input type="hidden" name="account_id" value="<?= $accountId ?>">
            <input type="hidden" name="tags" value="<?= h($tags) ?>">

            <div class="inputs">
              <input class="input" name="name"  autocomplete="name"
                     data-i18n-placeholder="name_ph"  placeholder="Nome e cognome" required>
              <input class="input" name="email" type="email" autocomplete="email"
                     data-i18n-placeholder="email_ph" placeholder="email@example.com" required>
            </div>

            <input class="input" name="number" style="margin-top:10px" inputmode="tel"
                   data-i18n-placeholder="phone_ph" placeholder="Telefono (opzionale)">

            <!-- GDPR -->
            <div class="consent">
              <label class="consent__label">
                <input type="checkbox" id="consent_privacy" name="consent_privacy" required>
                <span data-i18n-html="consent_privacy_accept">
                  Ho letto e accetto l’<a href="<?= h($privacy) ?>" target="_blank" rel="noopener">Informativa Privacy</a>.
                </span>
              </label>

              <label class="consent__label">
                <input type="checkbox" id="consent_newsletter" name="consent_newsletter" value="1">
                <span data-i18n-html="consent_newsletter_optin">
                  Acconsento a ricevere la newsletter e comunicazioni promozionali.
                </span>
              </label>
            </div>

            <button class="btn primary" style="margin-top:14px" data-i18n="submit">Ricevi il codice via email</button>
          </form>
          

          <!-- avviso inline -->
          <div id="formNotice" class="notice" style="display:none" role="alert" aria-live="polite"></div>

          <!-- successo -->
          <div id="success" style="display:none; margin-top:10px">
            <h3 data-i18n="done_title">Fatto! 🎉</h3>
            <p data-i18n="done_text">Controlla la tua email: ti abbiamo inviato il coupon del <?= (int)$p2 ?>%.</p>
            <button class="btn secondary" type="button" data-i18n="close" onclick="try{window.parent.postMessage({type:'LP_CLOSE'},'*')}catch(e){}">Chiudi</button>
          </div>
        </section>
      </div>
    </div>
  </div>
</body>
</html>