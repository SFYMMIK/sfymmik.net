document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";

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

  // ---- Spotify progress bar (REAL timestamps)
  let spTimer = null;
  let spStart = 0;
  let spEnd = 0;

  function fmtTime(ms) {
    ms = Math.max(0, ms | 0);
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function startSpotifyBar(startMs, endMs) {
    spStart = startMs;
    spEnd = endMs;

    if (spTimer) clearInterval(spTimer);

    const tick = () => {
      const now = Date.now();
      const dur = spEnd - spStart;
      if (dur <= 0) return;

      const cur = now - spStart;
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

      spFill.style.width = pct + "%";
      spCur.textContent = fmtTime(cur);
      spDur.textContent = fmtTime(dur);
    };

    tick();
    spTimer = setInterval(tick, 250);
  }

  function stopSpotifyBar() {
    if (spTimer) clearInterval(spTimer);
    spTimer = null;
    spStart = 0;
    spEnd = 0;
    spFill.style.width = "0%";
    spCur.textContent = "0:00";
    spDur.textContent = "0:00";
  }

  // ---- Render a Lanyard "data" payload (from WS INIT_STATE / PRESENCE_UPDATE)
  function render(data) {
    // profile
    const user = data.discord_user;
    nameEl.textContent = user?.global_name || user?.username || "—";
    avatar.src = discordAvatarUrl(user);

    // status
    const st = data.discord_status || "offline";
    dot.style.background = statusColor[st] || statusColor.offline;
    statusText.textContent = statusLabel(st);

    // spotify
    if (data.spotify?.track_id) {
      spTrack.textContent = data.spotify.song || "—";
      spArtist.textContent = data.spotify.artist || "—";

      if (data.spotify.album_art_url) {
        spCover.src = data.spotify.album_art_url;
        spCover.hidden = false;
      } else spCover.hidden = true;

      const startMs = data.spotify.timestamps?.start;
      const endMs = data.spotify.timestamps?.end;

      if (startMs && endMs) {
        spBarWrap.hidden = false;
        startSpotifyBar(startMs, endMs);
      } else {
        spBarWrap.hidden = true;
        stopSpotifyBar();
      }
    } else {
      spTrack.textContent = "Not listening to anything right now";
      spArtist.textContent = "—";
      spCover.hidden = true;
      spBarWrap.hidden = true;
      stopSpotifyBar();
    }

    // game
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
  }

  // ---- Lanyard WebSocket
  let ws = null;
  let hb = null;

  function connect() {
    if (ws) ws.close();

    ws = new WebSocket("wss://api.lanyard.rest/socket");

    ws.addEventListener("open", () => {
      // connected, waiting for HELLO
    });

    ws.addEventListener("message", (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      // op codes: 1=HELLO (gives heartbeat_interval), 0=EVENT, 2=INIT_STATE/PRESENCE_UPDATE
      if (msg.op === 1) {
        const interval = msg.d?.heartbeat_interval ?? 30000;

        // subscribe
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: USER_ID } }));

        if (hb) clearInterval(hb);
        hb = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 3, d: {} }));
          }
        }, interval);
        return;
      }

      if (msg.op === 0) {
        // events: INIT_STATE or PRESENCE_UPDATE
        const t = msg.t;
        const d = msg.d;

        if (t === "INIT_STATE") {
          const state = d?.[USER_ID];
          if (state) render(state);
        } else if (t === "PRESENCE_UPDATE") {
          if (d) render(d);
        }
      }
    });

    ws.addEventListener("close", () => {
      if (hb) clearInterval(hb);
      hb = null;
      // auto-reconnect
      setTimeout(connect, 1500);
    });

    ws.addEventListener("error", () => {
      // let close handler reconnect
    });
  }

  connect();
});