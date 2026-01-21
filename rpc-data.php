<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$userId = '764834366161420299';
$url = "https://api.lanyard.rest/v1/users/" . $userId;

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_TIMEOUT => 6,
  CURLOPT_CONNECTTIMEOUT => 4,
  CURLOPT_HTTPHEADER => [
    'Accept: application/json',
    'User-Agent: sfymmik-widget/1.0'
  ],
]);

$body = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false || $code < 200 || $code >= 300) {
  http_response_code(502);
  echo json_encode([
    "ok" => false,
    "error" => "lanyard_fetch_failed",
    "http" => $code,
    "curl" => $err
  ]);
  exit;
}

echo $body;