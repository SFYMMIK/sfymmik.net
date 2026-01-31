document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";
  const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

  // ---- Elementy
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

  const copySpotifyBtn = document.getElementById("copySpotifyBtn");
  const copySpotifyStatus = document.getElementById("copySpotifyStatus");

  // ---- sprawdzenie poprawności (pasek usunięty)
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spCover, spTrack, spArtist,
    copySpotifyBtn, copySpotifyStatus
  };
  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[Lanyard widget] Brakujący element dla id="${k}". Sprawdź ID w HTML.`);
      return;
    }
  }

  // ---- status
  const statusColor = {
    online: "#3ba55d",
    idle: "#faa61a",
    dnd: "#ed4245",
    offline: "#747f8d"
  };

  // ---- kopiowanie linku Spotify
  let currentSpotifyUrl = null;

  function spotifyTrackUrl(trackId) {
    return trackId ? `https://open.spotify.com/track/${trackId}` : null;
  }

  async function copyText(text) {
    // Działa na HTTPS/localhost w większości przeglądarek
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function setCopyUi({ enabled, status }) {
    copySpotifyBtn.disabled = !enabled;
    copySpotifyStatus.textContent = status || "";
  }

  copySpotifyBtn.addEventListener("click", async () => {
    if (!currentSpotifyUrl) return;
    try {
      await copyText(currentSpotifyUrl);
      setCopyUi({ enabled: true, status: "Skopiowano ✅" });
      setTimeout(() => setCopyUi({ enabled: true, status: "" }), 1200);
    } catch (e) {
      console.error("[Lanyard widget] kopiowanie nie powiodło się:", e);
      setCopyUi({ enabled: true, status: "Błąd kopiowania ❌" });
    }
  });

  function statusLabel(s) {
    return s === "online" ? "Online"
      : s === "idle" ? "Zaraz Wracam"
      : s === "dnd" ? "Nie przeszkadzać"
      : "Offline";
  }

  // ---- Awatar (Discord)
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
  // Główna aktualizacja (REST)
  // =========================
  async function update() {
    try {
      const res = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const data = json.data;
      if (!data) throw new Error("0 danych");

      const user = data.discord_user;
      nameEl.textContent = user?.global_name || user?.username || "—";
      avatar.src = discordAvatarUrl(user);

      // Status
      const st = data.discord_status || "offline";
      dot.style.background = statusColor[st] || statusColor.offline;
      statusText.textContent = statusLabel(st);

      // Spotify: tekst + okładka (bez paska)
      if (data.spotify?.track_id) {
        spTrack.textContent = data.spotify.song || "—";
        spArtist.textContent = data.spotify.artist || "—";

        currentSpotifyUrl = spotifyTrackUrl(data.spotify.track_id);
        setCopyUi({ enabled: !!currentSpotifyUrl, status: "" });

        if (data.spotify.album_art_url) {
          spCover.src = data.spotify.album_art_url;
          spCover.hidden = false;
        } else {
          spCover.hidden = true;
        }
      } else {
        spTrack.textContent = "Nie słucham żadnej muzyki w tej chwili";
        spArtist.textContent = "—";
        spCover.hidden = true;

        currentSpotifyUrl = null;
        setCopyUi({ enabled: false, status: "Nie słucham" });
      }

      // Gra + Szczegóły + Ikona
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
        gameEl.textContent = "Nie gram w żadną grę w tej chwili";
        detailsEl.textContent = "—";
        gameIcon.hidden = true;
      }
    } catch (e) {
      console.error("[Lanyard widget] aktualizacja nie powiodła się:", e);
      statusText.textContent = "Error";
      dot.style.background = statusColor.offline;
      detailsEl.textContent = "Nie można załadować Aktywności";

      spTrack.textContent = "Nie słucham żadnej muzyki w tej chwili";
      spArtist.textContent = "—";
      spCover.hidden = true;

      currentSpotifyUrl = null;
      setCopyUi({ enabled: false, status: "Error" });
    }
  }

  update();
  setInterval(update, 3000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("focus", () => update());
});