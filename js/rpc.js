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

  // Spotify BAR (width-only)
  const spBarWrap = document.getElementById("spBarWrap");
  const spFill = document.getElementById("spFill");

  // ---- Sanity check
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spCover, spTrack, spArtist,
    spBarWrap, spFill
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

  // =========================
  // Spotify BAR logic (width only)
  // =========================
  let barInterval = null;
  let spStart = 0;
  let spEnd = 0;
  let lastTrackId = null;

  function stopBar(reset = true) {
    if (barInterval) clearInterval(barInterval);
    barInterval = null;
    spStart = 0;
    spEnd = 0;
    if (reset) spFill.style.width = "0%";
  }

  function updateBarOnce() {
    const dur = spEnd - spStart;
    if (dur <= 0) {
      spFill.style.width = "0%";
      return;
    }
    const now = Date.now();
    const pct = Math.min(100, Math.max(0, ((now - spStart) / dur) * 100));
    spFill.style.width = pct + "%";
  }

  function startBar(startMs, endMs, forceReset) {
    spStart = startMs;
    spEnd = endMs;

    if (forceReset) spFill.style.width = "0%";

    if (barInterval) clearInterval(barInterval);
    updateBarOnce();
    // smoother than 1000ms, still light
    barInterval = setInterval(updateBarOnce, 500);
  }

  // =========================
  // Main update (REST)
  // =========================
  async function update() {
    try {
      const res = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

      // Spotify (text + cover + BAR width-only)
      if (data.spotify?.track_id) {
        const trackId = data.spotify.track_id;

        spTrack.textContent = data.spotify.song || "—";
        spArtist.textContent = data.spotify.artist || "—";

        if (data.spotify.album_art_url) {
          spCover.src = data.spotify.album_art_url;
          spCover.hidden = false;
        } else {
          spCover.hidden = true;
        }

        const startMs = data.spotify.timestamps?.start;
        const endMs = data.spotify.timestamps?.end;

        // show bar always if spotify present
        spBarWrap.hidden = false;

        const changed = (trackId !== lastTrackId);
        lastTrackId = trackId;

        if (startMs && endMs) {
          startBar(startMs, endMs, changed);
        } else {
          // no timestamps => just show empty bar
          stopBar(true);
          spFill.style.width = "0%";
        }
      } else {
        lastTrackId = null;

        spTrack.textContent = "Not listening to anything right now";
        spArtist.textContent = "—";
        spCover.hidden = true;

        spBarWrap.hidden = true;
        stopBar(true);
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

      // don’t keep a stuck bar
      spBarWrap.hidden = true;
      stopBar(true);
    }
  }

  update();
  setInterval(update, 3000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("focus", () => update());
});