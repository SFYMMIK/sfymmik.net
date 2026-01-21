<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="author" content="Szymon Grajner (SfymmiK)">
  <meta property="og:description" content="SfymmiK – 15 y/o programmer from Poland, into Unix-like OS, low-level experiments, and web dev.">
  <meta name="keywords" content="sfymmik,SfymmiK,SFYMMIK,Sfymmik">
  <meta property="og:url" content="https://sfymmik.net">
  <meta property="og:site_name" content="SfymmiK's Webpage'">
  <meta name="referrer" content="no-referrer">
  <meta name="og:title" content="SfymmiK's Webpage">
  <meta name="title" content="SfymmiK's Webpage">
  <meta property="og:image" content="https://sfymmik.net/pfp.jpg">
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="icon" type="image/x-icon" href="pfp.jpg">
  <title>SfymmiK's Webpage</title>

  <meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data:;
    connect-src 'self';
  ">

  <script>
  window.addEventListener("load", () => {
    document.body.classList.add("loaded");
  });

  (function () {
    const lang = (navigator.language || "").toLowerCase();
    const langs = (navigator.languages || []).map(l => (l || "").toLowerCase());
    const isPL = lang.startsWith("pl") || langs.some(l => l.startsWith("pl"));

    if (isPL) {
      // if your browser language is set to PL and you are here -> redirect to PL
      location.replace("index-pl.php");
    }
  })();
  </script>

  <script src="js/rpc.js" defer></script>
</head>

<!-- i know you have come here for the code,
     and well sure take it but, take it according
     to my license's permissions, this whole website is made from scratch
     by me and if you want to maybe help me polish it more
     feel free to message me on Discord (sfymmik) :)
                                                  -->

<body id="page">
  <main class="content">
    <header class="up wrap">
      <div class="avatar-wrap">
        <img class="avatar" src="pfp.jpg" max-width="256" max-height="256" loading="lazy" />
      </div>

      <h1 style="color: #7928ca;">SfymmiK</h1>

      <nav class="linki">
        <a class="upper-buttons" href="https://github.com/SFYMMIK">GitHub (Mirror)</a>
        <a class="upper-buttons" href="https://codeberg.org/SfymmiK">Codeberg</a>
        <a class="upper-buttons" href="https://www.youtube.com/@SFYMMIK">YouTube</a>
        <a class="upper-buttons" onclick="alert('sfymmik')">Discord(user)</a>
        <a class="upper-buttons" href="https://steamcommunity.com/id/JustSfymmiK/">Steam</a>
        <a class="upper-buttons" href="https://namemc.com/profile/a7ef9121-81ed-4291-b4d6-cfc1105bcb5a">Minecraft (namemc)</a>
        <a class="upper-buttons" href="https://stats.fm/sfymmik">Spotify (stats.fm)</a>
      </nav>
    </header>

    <hr id="line" />

    <h1>Basic Info:</h1>
    <h2>Pronouns: He/Him</h2>
    <h2><a href="https://en.wikipedia.org/wiki/Asexuality">Asexual</a></h2>

    <div class="rpc-card" id="rpc">
      <div class="rpc-top">
        <div class="rpc-profile">
          <img class="rpc-avatar" id="rpcAvatar" alt="Avatar">
          <div class="rpc-who">
            <div class="rpc-title">(Discord) Activity</div> <!-- nice discord activity -->
            <div class="rpc-name" id="rpcName">—</div>
          </div>
        </div>

        <div class="rpc-pill">
          <span class="rpc-dot" id="rpcDot"></span>
          <span class="rpc-status-text" id="rpcStatusText">Connecting…</span>
        </div>
      </div>

      <div class="rpc-block">
        <div class="rpc-label">Playing</div>
        <div class="rpc-line">
          <img class="rpc-icon" id="gameIcon" alt="" hidden>
          <div>
            <div class="rpc-value" id="rpcGame">—</div>
            <div class="rpc-sub" id="rpcDetails">—</div>
          </div>
        </div>
      </div>

      <div class="rpc-sep"></div>

      <div class="rpc-block spotify">
        <div class="rpc-label">(Spotify) Listening to</div>
        <div class="rpc-line">
          <img class="rpc-cover" id="spCover" alt="" hidden>
          <div>
            <div class="rpc-value" id="spTrack">—</div>
            <div class="rpc-sub" id="spArtist">—</div>

            <!-- Spotify BAR is server-side now (no duplicate HTML block here) -->
            <?php @include __DIR__ . '/rpc.php'; ?>
          </div>
        </div>
      </div>
    </div>

    <hr id="line" />

    <h2>I'm a 15 year old programmer, and of course I'am also a Unix-Like Operating Systems enjoyer • building &amp breaking things</h2>
    <h2>I mainly work on web development and low-level experiments, often sharing my projects for others to explore</h2>
    <h2>I use Arch/MX Linux (couldn't imagine working anywhere else)</h2>

    <h2>And I also play some games except just code, like:</h2>
    <ul>
      <li><a href="https://store.steampowered.com/app/730/CounterStrike_2/">Counter-Strike 2</a></li>
      <li><a href="https://www.minecraft.net/">Minecraft</a></li>
      <li><a href="https://store.steampowered.com/app/3164500/Schedule_I/">Schedule 1</a></li>
      <li><a href="https://osu.ppy.sh/">Osu (Lazer)</a></li>
    </ul>

    <h2>Some of my current work includes:</h2>
    <ul>
      <li><a href="https://github.com/SFYMMIK/sfymmik.net">sfymmik.net</a></li>
      <li><a href="https://github.com/SFYMMIK/web.sfymmik">web.sfymmik</a></li>
      <li><a href="https://github.com/SFYMMIK/Dotfiles">Dotfiles</a></li>
      <li><a href="https://github.com/SFYMMIK/sp3_code">sp3_code</a></li>
    </ul>

    <br/>

    <div id="fieldset-ppl-pos">
      <fieldset id="fieldset-ppl" style="max-width: 400px;">
        <legend style="font-size: 30px;">Friends / people i know</legend>
        <a class="badges" href="https://maydo.uk">
          <img src="maydo.png" alt="Maydo.uk" width="88" height="31">
        </a>
      </fieldset>
    </div>
  </main>

  <footer>
    <hr id="line-footer" />
    <div class="badges">
      <a href="https://www.linux.org/pages/download/"><img src="madeon_linux.gif" alt="Linux" width="88" height="31"></a>
      <a href="https://archlinux.org"><img src="arch-badge.png" alt="Arch Linux" width="88" height="31"></a>
      <a href="https://gentoo.org"><img src="gentoo-badge.png" alt="Gentoo" width="88" height="31"></a>
      <a href="https://freebsd.org"><img src="freebsd-badge.png" alt="FreeBSD" width="88" height="31"></a>
    </div>
    <br/>

    <a href="https://ko-fi.com/sfymmik/tip"><img id="kofi" src="kofi.jpg" /></a>

    <br/>
    <br/>

    <img src="linux.png" alt="Linux" />
    <img src="thinkpad.png" alt="IBM ThinkPad" />

    <br/>

    <p class="footer-text">
      Made By Szymon Grajner (SfymmiK)
      <a href="https://codeberg.org/SfymmiK/sfymmik.net">
        <img id="github-svg" src="github-svg.svg">
      </a>
    </p>

    <br/>

    <p class="footer-text">
      Licensed under the
      <a href="https://codeberg.org/SfymmiK/sfymmik.net/raw/branch/main/LICENSE">MIT License</a>
    </p>

    <br/>
  </footer>
</body>
</html>