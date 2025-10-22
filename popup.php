<?php
// popup.php — router dei template
$tpl = $_GET['tpl'] ?? 'v2';

$map = [
  'v1' => __DIR__ . '/popup-full.php',
  'v2' => __DIR__ . '/popup-full-v2.php',
];

if (isset($map[$tpl])) {
  include $map[$tpl];
} else {
  http_response_code(404);
  echo "<h1>Template non trovato</h1>";
}