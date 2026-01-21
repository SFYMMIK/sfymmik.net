<?php
// rpc.php
// Outputs ONLY the Spotify progress bar block (no duplicates of track/artist text).
// Uses server-side call -> no CORS/CSP pain.

function h($s) { return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8'); }

$base = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://{$_SERVER['HTTP_HOST']}";
$dir  = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$proxyUrl = $base . $dir . "/rpc-data.php";

$json = @file_get_contents($proxyUrl);
$data = null;
if ($json) {
  $parsed = json_decode($json, true);
  if (isset($parsed['data'])) $data = $parsed['data'];
}

$spotify = $data['spotify'] ?? null;
$trackId = $spotify['track_id'] ?? null;

$startMs = $spotify['timestamps']['start'] ?? null;
$endMs   = $spotify['timestamps']['end'] ?? null;

$nowMs = (int) round(microtime(true) * 1000);
$durMs = ($startMs && $endMs) ? max(0, (int)$endMs - (int)$startMs) : 0;
$curMs = ($startMs && $endMs) ? max(0, min($durMs, $nowMs - (int)$startMs)) : 0;
$pct   = ($durMs > 0) ? max(0, min(100, ($curMs / $durMs) * 100)) : 0;

function fmtTimeMs($ms) {
  $ms = max(0, (int)$ms);
  $total = (int) floor($ms / 1000);
  $m = (int) floor($total / 60);
  $s = $total % 60;
  return $m . ":" . str_pad((string)$s, 2, "0", STR_PAD_LEFT);
}

$curStr = fmtTimeMs($curMs);
$durStr = fmtTimeMs($durMs);

// If not listening -> keep hidden
$hidden = !$trackId || !$startMs || !$endMs;
?>

<div class="sp-bar-wrap" id="spBarWrap"
     <?php if ($hidden) echo "hidden"; ?>
     data-track="<?php echo h($trackId); ?>"
     data-start="<?php echo h($startMs); ?>"
     data-end="<?php echo h($endMs); ?>">
  <div class="sp-times">
    <div id="spCur"><?php echo h($curStr); ?></div>
    <div id="spDur"><?php echo h($durStr); ?></div>
  </div>
  <div class="sp-bar">
    <div class="sp-bar-fill" id="spFill" style="width: <?php echo h(number_format($pct, 3, '.', '')); ?>%;"></div>
  </div>
</div>

<script src="js/rpc-progress.js?v=3" defer></script>