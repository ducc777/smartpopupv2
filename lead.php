<?php
// lead.php — GHL lead collector (GET/POST: account_id, name, email, number?, tags?, consent_newsletter?, lang?)
// PHP >= 7.2

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

include 'config.php';
include 'helpers.php';

/* ========= SETTINGS ========= */
$LEADS_FILE        = __DIR__ . '/leads.log';
$RATE_DIR          = sys_get_temp_dir();
$RATE_LIMIT_WINDOW = 60;   // sec
$RATE_LIMIT_MAX    = 30;   // req/min/IP
$GHL_URL           = 'https://services.leadconnectorhq.com/contacts/';
$GHL_VERSION       = '2021-07-28';

/* ========= INPUT ========= */
$q                 = array_merge($_GET, $_POST);
$account_id        = isset($q['account_id']) ? (int)$q['account_id'] : 0;
$name              = isset($q['name'])       ? clean((string)$q['name'])   : '';
$email             = isset($q['email'])      ? trim((string)$q['email'])   : '';
$number            = isset($q['number'])     ? clean((string)$q['number']) : '';
$tags_raw          = isset($q['tags'])       ? trim((string)$q['tags'])    : '';
$lang_raw          = isset($q['lang'])       ? strtolower(trim((string)$q['lang'])) : '';
$newsletter_optin  = isset($q['consent_newsletter']) && ((string)$q['consent_newsletter'] === '1');

/* ---- lingua normalizzata (2 lettere) ---- */
$lang = 'it';
if ($lang_raw !== '' && preg_match('/^[a-z]{2}/', $lang_raw, $m)) {
    $lang = $m[0];
}

/* ---- tags: tags=a oppure tags=a,b,c ---- */
$tags = [];
if ($tags_raw !== '') {
    $tags = array_filter(array_map('clean', array_map('trim', explode(',', $tags_raw))));
    $tags = array_values(array_unique($tags));
    if (count($tags) > 20) $tags = array_slice($tags, 0, 20);
}

/* ---- aggiungi tag newsletter opt-in o no ---- */
if ($newsletter_optin) {
    $tags[] = 'newsletter_optin_granted';
} else {
    $tags[] = 'newsletter_optin_denied';
}
$tags = array_values(array_unique($tags));

/* ========= VALIDAZIONI ========= */
if ($account_id <= 0 || !isset($ACCOUNTS[$account_id])) {
    out(['ok' => false, 'msg' => 'invalid account_id'], 400);
}
if ($email === '') {
    out(['ok' => false, 'msg' => 'email required'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    out(['ok' => false, 'msg' => 'invalid email'], 400);
}
if (!rate_ok(ip(), $RATE_DIR, $RATE_LIMIT_WINDOW, $RATE_LIMIT_MAX)) {
    out(['ok' => false, 'msg' => 'rate limit exceeded'], 429);
}

/* ========= ACCOUNT ========= */
$acc         = $ACCOUNTS[$account_id];
$token       = $acc['token'];
$locationId  = $acc['locationId'];
$langFieldId  = isset($acc['langIdField']) ? trim((string)$acc['langIdField']) : '';

/* ========= LOG ========= */
$rec = [
    'ts'         => gmdate('Y-m-d\TH:i:s\Z'),
    'ip'         => ip(),
    'account_id' => $account_id,
    'name'       => $name,
    'email'      => $email,
    'number'     => $number,
    'locationId' => $locationId,
    'tags'       => $tags,
    'newsletter_optin' => $newsletter_optin,
    'lang'       => $lang,
    'ua'         => $_SERVER['HTTP_USER_AGENT']  ?? null,
    'ref'        => $_SERVER['HTTP_REFERER']     ?? null,
];
@file_put_contents(
    $LEADS_FILE,
    json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    FILE_APPEND | LOCK_EX
);

/* ========= PAYLOAD GHL ========= */
list($first, $last) = split_name($name);

$payload = [
    'locationId' => $locationId,
    'email'      => $email,
    'firstName'  => $first,
    'lastName'   => $last,
];

if ($number !== '') $payload['phone'] = $number;
if (!empty($tags))  $payload['tags']  = $tags;

// Campo custom lingua via ID per-account
if ($langFieldId !== '') {
    $payload['customFields'][] = [
        'id'    => $langFieldId,
        'value' => $lang,
    ];
}

/* ========= CHIAMATA GHL ========= */
$ch = curl_init($GHL_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer {$token}",
        "Content-Type: application/json",
        "Version: {$GHL_VERSION}",
        "LocationId: {$locationId}",
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

/* ========= RISPOSTA ========= */
if ($code >= 200 && $code < 300) {
    out(['ok' => true, 'msg' => 'lead forwarded']);
}

out([
    'ok'        => false,
    'msg'       => 'GHL error',
    'http_code' => $code,
    'body'      => $resp,
], 502);