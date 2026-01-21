document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";
  const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

  // ---- Elements
  const dot = document.getElementById("rpcDot");
  const statusText = document.getElementById("rpcStatusText");

  const avatar = document.getElementById("rpcAvatar");
  const nameEl = document.getElementById("rpcName");

  const gameIcon = document.getElementById("gameIcon");
  const gameEl = document.getElementById("rpcGame");
  const detailsEl = document.getElementById("rpcDetails");

  const spCover = document.getElementById("spCover");
  const spTrack = document.getElementById("spTrack");
  const spArtist = document.getElementById("spArtist");

  // Spotify bar elements (must exist in HTML for the bar to work)
  const spBarWrap = document.getElementById("spBarWrap");
  const spFill = document.getElementById("spFill");
  const spCur = document.getElementById("spCur");
  const spDur = document.getElementById("spDur");

  // ---- Sanity check (helps when IDs don’t match)
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spCover, spTrack, spArtist,
    spBarWrap, spFill, spCur, spDur
  };
  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[Lanyard widget] Missing element for id="${k}". Check your HTML IDs.`);
      return;
    }
  }

  // ---- Status
  const statusColor = {
    online: "#3ba55d",
    idle: "#faa61a",
    dnd: "#ed4245",
    offline: "#747f8d"
  };

  function statusLabel(s) {
    return s === "online" ? "Online"
      : s === "idle" ? "Idle"
      : s === "dnd" ? "Do Not Disturb"
      : "Offline";
  }

  // ---- Discord Avatar
  function discordAvatarUrl(user) {
    if (user?.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }
    const disc = Number(user?.discriminator || 0);
    const idx = Number.isFinite(disc) ? (disc % 5) : 0;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  function pickGame(activities = []) {
    return activities.find(a => a.type === 0 && (a.name || "").toLowerCase() !== "spotify")
      || activities.find(a => a.type === 0)
      || null;
  }

  function activityAssetUrl(activity, which = "large") {
    if (!activity?.application_id || !activity?.assets) return null;

    const key = which === "small" ? activity.assets.small_image : activity.assets.large_image;
    if (!key) return null;

    if (key.startsWith("mp:")) return null;

    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${key}.png`;
  }

  // ---- Spotify progress bar
  let spTimer = null;
  let spStart = 0;
  let spEnd = 0;

  // Track-change detection so the bar resets to 0:00 immediately
  let lastTrackId = null;

  // Keep 0:00 briefly after track change so it doesn't jump to 0:50 on some devices
  let spZeroUntil = 0;

  // Server/client time offset (helps if someone’s phone clock is off)
  let timeOffsetMs = 0; // serverNow ~= Date.now() + timeOffsetMs
  function nowMs() { return Date.now() + timeOffsetMs; }

  function fmtTime(ms) {
    ms = Math.max(0, ms | 0);
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function startSpotifyBar(startMs, endMs, forceResetToZero = false) {
    const now = nowMs();

    // If track changed but timestamps already look "old", clamp to now to avoid jumps (0:50 etc.)
    if (forceResetToZero && (now - startMs) > 5000) {
      const dur = endMs - startMs;
      startMs = now;
      endMs = now + dur;
    }

    spStart = startMs;
    spEnd = endMs;

    if (spTimer) clearInterval(spTimer);

    const dur = spEnd - spStart;
    spDur.textContent = fmtTime(dur);

    // Force visual reset + grace period (so 0:00 is actually visible)
    if (forceResetToZero) {
      spZeroUntil = now + 1200; // 1.2s grace period
      spFill.style.width = "0%";
      spCur.textContent = "0:00";
    }

    const tick = () => {
      const now2 = nowMs();
      const dur2 = spEnd - spStart;
      if (dur2 <= 0) return;

      // During grace period keep 0:00 instead of jumping
      const cur = (now2 < spZeroUntil) ? 0 : (now2 - spStart);

      const pct = Math.min(100, Math.max(0, (cur / dur2) * 100));
      spFill.style.width = pct + "%";
      spCur.textContent = fmtTime(cur);
      spDur.textContent = fmtTime(dur2);
    };

    tick();
    spTimer = setInterval(tick, 250);
  }

  function stopSpotifyBar() {
    if (spTimer) clearInterval(spTimer);
    spTimer = null;
    spStart = 0;
    spEnd = 0;
    spZeroUntil = 0;
    spFill.style.width = "0%";
    spCur.textContent = "0:00";
    spDur.textContent = "0:00";
  }

  // Main update
  async function update() {
    try {
      // Cache-bust helps some setups/CDNs/browsers avoid returning stale presence
      const res = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Use server time to reduce phone clock drift
      const dateHdr = res.headers.get("Date");
      if (dateHdr) {
        const serverNow = Date.parse(dateHdr);
        if (Number.isFinite(serverNow)) {
          timeOffsetMs = serverNow - Date.now();
        }
      }

      const json = await res.json();
      const data = json.data;
      if (!data) throw new Error("No data");

      const user = data.discord_user;
      nameEl.textContent = user?.global_name || user?.username || "—";
      avatar.src = discordAvatarUrl(user);

      // Status
      const st = data.discord_status || "offline";
      dot.style.background = statusColor[st] || statusColor.offline;
      statusText.textContent = statusLabel(st);

      // Spotify + Album art + Progress
      if (data.spotify?.track_id) {
        spTrack.textContent = data.spotify.song || "—";
        spArtist.textContent = data.spotify.artist || "—";

        if (data.spotify.album_art_url) {
          spCover.src = data.spotify.album_art_url;
          spCover.hidden = false;
        } else {
          spCover.hidden = true;
        }

        const trackId = data.spotify.track_id;
        const startMs = data.spotify.timestamps?.start;
        const endMs = data.spotify.timestamps?.end;

        // If track changed -> reset bar/timer to 0:00 and clamp if needed
        const trackChanged = (trackId !== lastTrackId);
        lastTrackId = trackId;

        if (startMs && endMs) {
          spBarWrap.hidden = false;
          startSpotifyBar(startMs, endMs, trackChanged);
        } else {
          spBarWrap.hidden = true;
          stopSpotifyBar();
        }
      } else {
        lastTrackId = null;
        spZeroUntil = 0;

        spTrack.textContent = "Not listening to anything right now";
        spArtist.textContent = "—";
        spCover.hidden = true;

        spBarWrap.hidden = true;
        stopSpotifyBar();
      }

      // Game + Details + Icon
      const game = pickGame(data.activities || []);
      if (game) {
        gameEl.textContent = game.name || "—";
        detailsEl.textContent = [game.details, game.state].filter(Boolean).join(" • ") || "—";

        const iconUrl = activityAssetUrl(game, "large") || activityAssetUrl(game, "small");
        if (iconUrl) {
          gameIcon.src = iconUrl;
          gameIcon.hidden = false;
        } else {
          gameIcon.hidden = true;
        }
      } else {
        gameEl.textContent = "Not playing any game right now";
        detailsEl.textContent = "—";
        gameIcon.hidden = true;
      }
    } catch (e) {
      console.error("[Lanyard widget] update failed:", e);
      statusText.textContent = "Error";
      dot.style.background = statusColor.offline;
      detailsEl.textContent = "Couldn’t load presence";

      spBarWrap.hidden = true;
      stopSpotifyBar();
    }
  }

  // Refresh instantly when the page becomes visible/focused (mobile browsers throttle timers)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("focus", () => update());

  update();
  setInterval(update, 3000);
});