document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("spBarWrap");
  const fill = document.getElementById("spFill");
  const curEl = document.getElementById("spCur");
  const durEl = document.getElementById("spDur");

  const spCover = document.getElementById("spCover");
  const spTrack = document.getElementById("spTrack");
  const spArtist = document.getElementById("spArtist");

  if (!wrap || !fill || !curEl || !durEl) return;

  let trackId = wrap.dataset.track || "";
  let startMs = Number(wrap.dataset.start || 0);
  let endMs = Number(wrap.dataset.end || 0);

  let raf = null;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function fmt(ms) {
    ms = Math.max(0, ms | 0);
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function renderTick() {
    const now = Date.now();
    const dur = endMs - startMs;

    if (dur > 0) {
      const cur = clamp(now - startMs, 0, dur);
      fill.style.width = `${clamp((cur / dur) * 100, 0, 100)}%`;
      curEl.textContent = fmt(cur);
      durEl.textContent = fmt(dur);
    }

    raf = requestAnimationFrame(renderTick);
  }

  function startAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(renderTick);
  }

  function stopAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    fill.style.width = "0%";
    curEl.textContent = "0:00";
    durEl.textContent = "0:00";
  }

  async function resync() {
    try {
      const res = await fetch(`rpc-data.php?_=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      const sp = json?.data?.spotify;

      if (sp?.track_id && sp?.timestamps?.start && sp?.timestamps?.end) {
        const newTrackId = sp.track_id;

        // Update texts/cover if you want (keeps your layout)
        if (spTrack) spTrack.textContent = sp.song || "—";
        if (spArtist) spArtist.textContent = sp.artist || "—";
        if (spCover) {
          if (sp.album_art_url) {
            spCover.src = sp.album_art_url;
            spCover.hidden = false;
          } else {
            spCover.hidden = true;
          }
        }

        // Update timestamps
        startMs = Number(sp.timestamps.start);
        endMs = Number(sp.timestamps.end);

        // If track changed -> allow jump to correct "real" position (do NOT force 0:00)
        trackId = newTrackId;

        wrap.hidden = false;
        startAnim();
      } else {
        wrap.hidden = true;
        stopAnim();
      }
    } catch (e) {
      // Keep last known animation; don’t kill it on temporary errors
      // console.log("resync failed", e);
    }
  }

  // Start with server-rendered state
  if (startMs && endMs) startAnim();
  else { wrap.hidden = true; stopAnim(); }

  // Re-sync periodically
  setInterval(resync, 3000);

  // Mobile/tab throttling fix
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resync();
  });
  window.addEventListener("focus", () => resync());
});