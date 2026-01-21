document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";
  const REST_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;
  const WS_URL = "wss://api.lanyard.rest/socket";

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

  // Show diagnostic info in UI
  function setDiag(text) {
    statusText.textContent = text;
  }

  // ---- Status
  const statusColor = { online: "#3ba55d", idle: "#faa61a", dnd: "#ed4245", offline: "#747f8d" };
  function statusLabel(s) {
    return s === "online" ? "Online" : s === "idle" ? "Idle" : s === "dnd" ? "Do Not Disturb" : "Offline";
  }

  // ---- Discord Avatar
  function discordAvatarUrl(user) {
    if (user?.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
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
    if (!key || key.startsWith("mp:")) return null;
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${key}.png`;
  }

  // ---- Spotify progress bar
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

  // ---- Render
  function render(data, sourceLabel) {
    const user = data.discord_user;
    nameEl.textContent = user?.global_name || user?.username || "—";
    avatar.src = discordAvatarUrl(user);

    const st = data.discord_status || "offline";
    dot.style.background = statusColor[st] || statusColor.offline;
    statusText.textContent = `${statusLabel(st)}${sourceLabel ? ` • ${sourceLabel}` : ""}`;

    if (data.spotify?.track_id) {
      spTrack.textContent = data.spotify.song || "—";
      spArtist.textContent = data.spotify.artist || "—";
      if (data.spotify.album_art_url) { spCover.src = data.spotify.album_art_url; spCover.hidden = false; }
      else spCover.hidden = true;

      const startMs = data.spotify.timestamps?.start;
      const endMs = data.spotify.timestamps?.end;
      if (startMs && endMs) { spBarWrap.hidden = false; startSpotifyBar(startMs, endMs); }
      else { spBarWrap.hidden = true; stopSpotifyBar(); }
    } else {
      spTrack.textContent = "Not listening to anything right now";
      spArtist.textContent = "—";
      spCover.hidden = true;
      spBarWrap.hidden = true;
      stopSpotifyBar();
    }

    const game = pickGame(data.activities || []);
    if (game) {
      gameEl.textContent = game.name || "—";
      detailsEl.textContent = [game.details, game.state].filter(Boolean).join(" • ") || "—";
      const iconUrl = activityAssetUrl(game, "large") || activityAssetUrl(game, "small");
      if (iconUrl) { gameIcon.src = iconUrl; gameIcon.hidden = false; }
      else gameIcon.hidden = true;
    } else {
      gameEl.textContent = "Not playing any game right now";
      detailsEl.textContent = "—";
      gameIcon.hidden = true;
    }
  }

  // =========================
  // REST
  // =========================
  let restTimer = null;
  async function restOnce() {
    const res = await fetch(`${REST_URL}?_=${Date.now()}`, {
      cache: "no-store",
      // sometimes hosting/proxies behave better with this:
      mode: "cors",
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`REST HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.data) throw new Error("REST: no data");
    render(json.data, "REST");
  }

  function startREST() {
    if (restTimer) return;
    setDiag("Connecting… (REST)");
    restOnce().catch(err => {
      console.error("[Lanyard widget] REST failed:", err);
      setDiag("REST blocked");
    });
    restTimer = setInterval(() => {
      restOnce().catch(err => console.error("[Lanyard widget] REST tick failed:", err));
    }, 3000);
  }

  function stopREST() {
    if (!restTimer) return;
    clearInterval(restTimer);
    restTimer = null;
  }

  // =========================
  // WebSocket
  // =========================
  let ws = null;
  let hb = null;

  function connectWS() {
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error("[Lanyard widget] WS create failed:", e);
      ws = null;
      return false;
    }

    setDiag("Connecting… (WS)");

    ws.addEventListener("message", (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      if (msg.op === 1) {
        const interval = msg.d?.heartbeat_interval ?? 30000;
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
        if (msg.t === "INIT_STATE") {
          const state = msg.d?.[USER_ID];
          if (state) render(state, "WS");
        } else if (msg.t === "PRESENCE_UPDATE") {
          if (msg.d) render(msg.d, "WS");
        }
      }
    });

    ws.addEventListener("open", () => {
      stopREST(); // WS works => stop REST
      setDiag("Connected (WS)");
    });

    ws.addEventListener("close", (ev) => {
      console.warn("[Lanyard widget] WS closed:", ev.code, ev.reason);
      if (hb) { clearInterval(hb); hb = null; }
      ws = null;
      // keep alive via REST
      startREST();
      setTimeout(connectWS, 2000);
    });

    ws.addEventListener("error", (e) => {
      console.error("[Lanyard widget] WS error:", e);
      // fallback to REST
      startREST();
    });

    return true;
  }

  // =========================
  // Start: REST immediately, then try WS
  // =========================
  startREST();

  // Try WS after a short delay (so even if WS blocked, REST already works)
  setTimeout(() => {
    connectWS();
  }, 400);

  // If user returns to tab and REST is active, refresh now
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && restTimer) {
      restOnce().catch(() => {});
    }
  });
  window.addEventListener("focus", () => {
    if (restTimer) restOnce().catch(() => {});
  });
});