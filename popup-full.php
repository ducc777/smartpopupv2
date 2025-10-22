<?php
// popup-full.php — SOLO UI (no JS)
// Lettura parametri da query per passarli poi al lead.php via JS (step successivo)
declare(strict_types=1);

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$accountId = isset($_GET['account_id']) ? (int)$_GET['account_id'] : 0;
$tags      = isset($_GET['tags']) ? trim((string)$_GET['tags']) : '';
?>
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Iscrizione offerte</title>
<style>
  :root{
    --panel:#fff; --text:#0f172a; --muted:#64748b; --border:#e2e8f0;
    --brand:#2563eb; --brand-700:#1d4ed8; --radius:14px;
    --ring:0 0 0 4px rgba(37,99,235,.15);
  }
  *{box-sizing:border-box} html,body{height:100%}
  body{margin:0;background:transparent;color:var(--text);
       font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}

  /* NESSUN DIM — overlay trasparente, solo per centratura */
  .overlay{
    position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
    padding:16px; background:transparent;  /* <- niente sfondo/ombra */
  }

  /* Popup “card” minimale, ombra leggerissima */
  .card{
    position:relative; width:min(520px,92vw);
    background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
    box-shadow:0 6px 24px rgba(2,6,23,.10);  /* ombra soft */
    padding:20px;
  }

  .title{margin:0 0 4px; font-size:22px; font-weight:800}
  .subtitle{margin:0 0 14px; color:var(--muted); font-size:14px}

  .close{
    position:absolute; top:10px; right:10px; width:32px; height:32px;
    border-radius:10px; border:1px solid var(--border); background:#fff; color:#0f172a;
    display:grid; place-items:center; cursor:pointer;
  }
  .close:focus-visible{outline:none; box-shadow:var(--ring)}

  form{display:grid; gap:12px; margin-top:8px}
  label{font-size:12px; color:var(--muted); display:block; margin:0 0 6px}
  input[type="text"],input[type="email"],input[type="tel"]{
    width:100%; padding:12px; border:1px solid var(--border); border-radius:12px;
    background:#fff; color:var(--text); transition:border-color .15s, box-shadow .15s;
  }
  input::placeholder{color:#94a3b8}
  input:focus{outline:none; border-color:var(--brand); box-shadow:var(--ring)}

  .actions{display:flex; gap:10px; flex-wrap:wrap; margin-top:4px}
  .btn{border:0; border-radius:12px; padding:10px 14px; font-weight:800; cursor:pointer}
  .btn.primary{background:var(--brand); color:#fff}
  .btn.primary:hover{background:var(--brand-700)}
  .btn.primary:focus-visible{outline:none; box-shadow:var(--ring)}
  .btn.secondary{background:#fff; color:#0f172a; border:1px solid var(--border)}

  .fineprint{margin:8px 0 0; font-size:12px; color:var(--muted)}
  .success{display:none; margin-top:10px}
  .success h3{margin:6px 0 4px; font-size:18px}
  .success p{margin:0; color:var(--muted)}
</style>

</head>
<body>
  <div class="overlay">
    <div class="card">
      <!-- bottone chiudi (funzionerà con JS nel prossimo step) -->
      <button type="button" class="close" aria-label="Chiudi">✕</button>

      <div class="header">
        <div>
          <h1 class="title">Sblocca l’offerta</h1>
          <p class="subtitle">Inserisci i tuoi dati per ricevere subito il codice sconto.</p>
        </div>
      </div>

      <!-- FORM: nessuno script qui. Gli input hidden portano i parametri. -->
      <form id="lead-form" action="#" method="get" novalidate>
        <input type="hidden" name="account_id" value="<?= $accountId ? h($accountId) : '' ?>">
        <input type="hidden" name="tags" value="<?= h($tags) ?>">

        <div>
          <label for="f_name">Nome e cognome</label>
          <input id="f_name" name="name" type="text" placeholder="Mario Rossi" autocomplete="name" required>
        </div>

        <div>
          <label for="f_email">Email</label>
          <input id="f_email" name="email" type="email" placeholder="mario@example.com" autocomplete="email" required>
        </div>

        <div>
          <label for="f_phone">Telefono (opzionale)</label>
          <input id="f_phone" name="number" type="tel" placeholder="333 1234567" autocomplete="tel">
        </div>
        <div class="actions">
          <button class="btn primary" type="submit">Ottieni il codice</button>
          <button class="btn secondary" type="button">Chiudi</button>
        </div>
        <p class="fineprint">
          Continuando accetti la nostra informativa privacy e riceverai aggiornamenti sulle offerte. Potrai disiscriverti in qualsiasi momento.
        </p>
      </form>

      <!-- Stato di successo (per il prossimo step JS) -->
      <div class="success" id="success">
        <h3>Fatto! 🎉</h3>
        <p>Controlla la tua email: ti abbiamo inviato il codice sconto.</p>
        <div class="actions" style="margin-top:10px">
          <button class="btn secondary" type="button">Chiudi</button>
        </div>
      </div>
    </div>
  </div>
<script>
(function () {
  const form       = document.getElementById('lead-form');
  const successBox = document.getElementById('success');
  const card       = document.querySelector('.card');
  if (!form || !card) return;

  const btnPrimary  = form.querySelector('.btn.primary');
  const btnCloseAll = document.querySelectorAll('.close, .btn.secondary');
  const overlayEl   = document.querySelector('.overlay');

  // URL del lead endpoint (modifica se lead.php non è nella stessa cartella)
  const leadUrl = new URL('lead.php', window.location.href).toString();

  // helpers
  const qs = o => Object.entries(o)
    .filter(([,v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
  const getVal = n => (form.elements[n] ? form.elements[n].value.trim() : '');
  const setDisabled = (el, on) => { if (el) { el.disabled = !!on; el.style.opacity = on ? .6 : 1; } };
  const fadeOut = (el, cb) => { el.style.transition='opacity .18s ease'; el.style.opacity='1';
    requestAnimationFrame(()=>{ el.style.opacity='0'; setTimeout(()=>cb&&cb(), 100); });
  };

  async function submitLead() {
    const payload = {
      account_id: getVal('account_id'),
      name: getVal('name'),
      email: getVal('email'),
      number: getVal('number'),
      tags: getVal('tags')
    };

    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      alert('Inserisci un’email valida.');
      form.elements['email']?.focus();
      return;
    }
    if (!payload.account_id) {
      alert('Configurazione mancante.');
      return;
    }

    setDisabled(btnPrimary, true);
    try {
      const res = await fetch(leadUrl + '?' + qs(payload), { method: 'GET', cache: 'no-store' });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (res.ok && data.ok) {
        // mostra il ringraziamento, resta aperto
        form.style.display = 'none';
        successBox.style.display = 'block';
      } else {
        const msg = (data && (data.msg || data.body)) || 'Errore di invio.';
        alert('Invio non riuscito: ' + msg);
      }
    } catch (e) {
      alert('Errore di rete. Riprova più tardi.');
    } finally {
      setDisabled(btnPrimary, false);
    }
  }

  // submit affidabile
  form.addEventListener('submit', e => { e.preventDefault(); submitLead(); });

  // chiudi manuale
  btnCloseAll.forEach(b => b.addEventListener('click', () => {
    fadeOut(card, () => {
      try { window.parent.postMessage({ type:'LP_CLOSE', v:1 }, '*'); } catch(_) {}
    });
  }));

  // click “fuori” (overlay)
  overlayEl?.addEventListener('click', e => {
    if (e.target === overlayEl) {
      fadeOut(card, () => {
        try { window.parent.postMessage({ type:'LP_CLOSE', v:1 }, '*'); } catch(_) {}
      });
    }
  });
})();
</script>
</body>
</html>