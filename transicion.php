<?php
// Transition landing for the JVV brand hold (JVV-34 / JVV-41).
//
// Deliberately returns HTTP 200 and stays indexable: this page must be FOUND and
// remembered during the 1-2 month gap. Do not reuse mantenimiento.php here — that
// page sends 503 + noindex, which is right for a short outage and wrong for a brand
// hold (a prolonged 503 gets pages dropped from the index).
//
// No DB, no root.php: this page must render even if MySQL is down.
//
// ── PROGRESSIVE LOGO REVEAL ───────────────────────────────────────────────────
// The new marks are secret until relaunch day. This page NEVER contains the full
// logo: only the fragments for the current stage are emitted, so there is nothing
// to un-blur in devtools. Advance the drip by bumping $ETAPA and pushing.
//
//   1 = green chevron only
//   2 = + orange chevron
//   3 = + ñ tilde (completes the secondary mark, JvvChevrons)
//
// The identity mark (JvvMonogram) is NOT teased here at any stage — it stays fully
// unseen until relaunch. Geometry source: repo:supercambiosjvv
// src/components/brand/marks.tsx (JVV-12). Keep the two in sync by hand.
$ETAPA = 1;

// ── RECOVERY GATE ────────────────────────────────────────────────────────────
// false = pre-recovery: the WhatsApp number is not yet back under José's control,
//         so the page must NOT claim it as the official channel. Instagram is the
//         reachable channel and the anti-impersonation line stays generic — it
//         never characterises anyone else's number (JVV-34 disclosure ceiling).
// true  = the number is recovered: assert it, publish the communiqué.
//
// Flip to true in the Wednesday publish window, once control is actually stable.
$RECUPERADO = true;

// ── LAUNCH-DAY REVEAL ───────────────────────────────────────────────────────
// false = keep serving the current transition page, byte-for-byte in spirit.
// true  = replace it with the completed Cambios JVV identity and play the reveal
//         once per browser session. This is the only production launch switch.
$LANZAMIENTO = false;

// Local preview is deliberately impossible from a public request: both the explicit
// environment flag and a loopback client are required. Never add a query-string-only
// bypass here; that would publish the launch identity before the switch is flipped.
$REMOTE_ADDR = $_SERVER['REMOTE_ADDR'] ?? '';
$PREVIEW_LOCAL = getenv('JVV_REVEAL_PREVIEW') === '1'
  && in_array($REMOTE_ADDR, ['127.0.0.1', '::1'], true);
$MOSTRAR_LANZAMIENTO = $LANZAMIENTO || $PREVIEW_LOCAL;

$WA = '34624442673';
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $MOSTRAR_LANZAMIENTO ? 'Cambios JVV — Acortamos el nombre. No la historia.' : 'Super Cambios JVV — Nueva etapa en preparación' ?></title>
<?php
// The metadata is gated too: search results and link previews must never claim the
// number before it is recovered. Keep this in sync with $RECUPERADO — the head is
// as public as the body (Codex review R1, 2026-07-27).
$META = $MOSTRAR_LANZAMIENTO
  ? 'Super Cambios JVV ahora es Cambios JVV. Acortamos el nombre, no la historia: el mismo número y el mismo JVV desde 2017.'
  : ($RECUPERADO
    ? 'Super Cambios JVV está preparando una nueva etapa. Nuestros canales oficiales son el 624 44 26 73, @supercambiosjvv y supercambiosjvv.com.'
    : 'Super Cambios JVV está preparando una nueva etapa. Nuestros canales oficiales son @supercambiosjvv y supercambiosjvv.com.');
?>
<meta name="description" content="<?= htmlspecialchars($META, ENT_QUOTES, 'UTF-8') ?>">
<link rel="canonical" href="https://supercambiosjvv.com/">
<link rel="icon" href="images/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="<?= $MOSTRAR_LANZAMIENTO ? 'Cambios JVV' : 'Super Cambios JVV' ?>">
<meta property="og:title" content="<?= $MOSTRAR_LANZAMIENTO ? 'Cambios JVV — Acortamos el nombre. No la historia.' : 'Super Cambios JVV — Nueva etapa en preparación' ?>">
<meta property="og:description" content="<?= htmlspecialchars($META, ENT_QUOTES, 'UTF-8') ?>">
<meta property="og:url" content="https://supercambiosjvv.com/">
<?php if (!$MOSTRAR_LANZAMIENTO): ?>
<meta property="og:image" content="https://supercambiosjvv.com/images/logo-default-280x113.png">
<?php endif; ?>
<meta name="twitter:card" content="summary">
<?php if ($MOSTRAR_LANZAMIENTO): ?>
<link rel="preload" href="fonts/Poppins-800-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/Poppins-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<script>
  /* ──────────────────────────────────────────────────────────────────────────
   * CAMBIOS JVV REVEAL STORYBOARD
   *
   *      0ms   SUPER CAMBIOS JVV is stable; CAMBIOS JVV is already anchored
   *    280ms   green/orange chevrons begin crossing the wordmark
   *    650ms   tracking in SUPER opens in fixed-position letter sections
   *    820ms   SUPER begins its controlled lift and sectional fade
   *   1220ms   full JVV monogram resolves beside the anchored wordmark
   *   1500ms   launch framing enters; completed identity owns the frame
   *   1900ms   sequence complete
   * ──────────────────────────────────────────────────────────────────────── */
  (function () {
    var TIMING = Object.freeze({
      chevronsStart: 280,
      chevronsDuration: 650,
      superStart: 650,
      trackingDuration: 220,
      superExitStart: 820,
      superDuration: 520,
      letterStagger: 28,
      monogramStart: 1220,
      monogramDuration: 420,
      copyStart: 1500,
      copyDuration: 360,
      reducedExit: 100,
      reducedEnter: 100
    });
    var root = document.documentElement;
    var key = 'jvv-brand-reveal-v1';
    var preview = <?= $PREVIEW_LOCAL ? 'true' : 'false' ?>;
    var params = new URLSearchParams(window.location.search);
    var previewFrame = preview ? Number.parseInt(params.get('frame'), 10) : NaN;
    var state = 'done';

    Object.keys(TIMING).forEach(function (name) {
      root.style.setProperty('--timing-' + name.replace(/[A-Z]/g, function (letter) {
        return '-' + letter.toLowerCase();
      }), TIMING[name] + 'ms');
    });

    if (Number.isFinite(previewFrame) && previewFrame >= 0) {
      // Local screenshot harness: seek CSS animations without exposing a public bypass.
      state = 'play';
      root.dataset.jvvPreviewFrame = 'true';
      root.style.setProperty('--preview-shift', '-' + previewFrame + 'ms');
    } else try {
      if (preview && params.has('replay')) {
        window.sessionStorage.removeItem(key);
      }
      if (window.sessionStorage.getItem(key) !== 'done') {
        state = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'play';
        // Mark it seen at the start so an interrupted reload cannot trap someone in a loop.
        window.sessionStorage.setItem(key, 'done');
      }
    } catch (error) {
      // Storage can be unavailable in hardened privacy modes. The stable identity wins.
      state = 'done';
    }
    root.dataset.jvvReveal = state;
  })();
</script>
<style>
  /* Launch CSS is emitted only when the server-side gate is open, so none of the
     unreleased identity geometry or presentation reaches today's public document. */
  @font-face{
    font-family:"Poppins";font-style:normal;font-weight:700;font-display:swap;
    src:url("fonts/Poppins-700-latin.woff2") format("woff2");
  }
  @font-face{
    font-family:"Poppins";font-style:normal;font-weight:800;font-display:swap;
    src:url("fonts/Poppins-800-latin.woff2") format("woff2");
  }
  body.launch-mode{
    min-height:100svh;padding:0;overflow-x:hidden;background:var(--paper);
  }
  .launch-reveal{
    position:relative;isolation:isolate;display:grid;min-height:100svh;place-items:center;
    overflow:hidden;padding:clamp(28px,6vw,72px) clamp(18px,5vw,64px);text-align:center;
    background:
      radial-gradient(circle at 12% 14%,rgba(244,164,53,.16),transparent 31%),
      radial-gradient(circle at 88% 82%,rgba(27,67,50,.14),transparent 35%),
      var(--paper);
  }
  .launch-reveal::before,.launch-reveal::after{
    content:"";position:absolute;z-index:-1;border-radius:50%;filter:blur(1px);pointer-events:none;
  }
  .launch-reveal::before{
    width:clamp(210px,34vw,480px);aspect-ratio:1;top:-18%;right:-8%;
    border:1px solid rgba(27,67,50,.12);
  }
  .launch-reveal::after{
    width:clamp(170px,27vw,360px);aspect-ratio:1;bottom:-16%;left:-7%;
    border:1px solid rgba(244,164,53,.22);
  }
  .reveal-inner{width:min(1180px,100%);margin:auto}
  .reveal-kicker{
    margin:0 0 clamp(30px,7vh,74px);font-size:clamp(.72rem,1.3vw,.88rem);
    font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--green-mid);
  }
  .brand-stage{position:relative;width:100%;padding:clamp(30px,5vw,58px) 0}
  .brand-wordmark{
    position:relative;z-index:1;display:grid;grid-template-columns:5.5ch max-content 5.5ch;
    align-items:center;justify-content:center;gap:clamp(5px,1.2vw,14px);
    font-family:"Poppins","Arial Narrow",Arial,sans-serif;
    font-size:clamp(1.52rem,5.4vw,4.3rem);font-weight:800;line-height:.96;
    letter-spacing:-.052em;color:var(--green);white-space:nowrap;
  }
  .super-word{display:flex;justify-content:flex-end;color:var(--ink)}
  .super-letter{display:inline-block;will-change:transform}
  .super-glyph{display:block;will-change:transform,opacity}
  .super-letter:nth-child(1){--spread:-.18em;--exit-delay:var(--timing-super-exit-start)}
  .super-letter:nth-child(2){--spread:-.09em;--exit-delay:calc(var(--timing-super-exit-start) + var(--timing-letter-stagger))}
  .super-letter:nth-child(3){--spread:0em;--exit-delay:calc(var(--timing-super-exit-start) + var(--timing-letter-stagger) + var(--timing-letter-stagger))}
  .super-letter:nth-child(4){--spread:.09em;--exit-delay:calc(var(--timing-super-exit-start) + var(--timing-letter-stagger) + var(--timing-letter-stagger) + var(--timing-letter-stagger))}
  .super-letter:nth-child(5){--spread:.18em;--exit-delay:calc(var(--timing-super-exit-start) + var(--timing-letter-stagger) + var(--timing-letter-stagger) + var(--timing-letter-stagger) + var(--timing-letter-stagger))}
  .core-word{justify-self:center}
  .monogram-slot{display:grid;width:1.08em;height:1.08em;place-items:center;justify-self:start}
  .monogram{display:block;width:100%;height:100%;will-change:transform,opacity}
  .chevron-sweep{
    position:absolute;z-index:2;top:50%;left:50%;width:clamp(76px,11vw,138px);height:auto;
    opacity:0;pointer-events:none;will-change:transform,opacity;
    filter:drop-shadow(0 8px 14px rgba(27,67,50,.10));
  }
  .reveal-copy{max-width:760px;margin:clamp(34px,7vh,76px) auto 0;color:var(--green)}
  .reveal-copy h1{
    margin:0;font-family:"Poppins","Arial Narrow",Arial,sans-serif;
    font-size:clamp(1.8rem,4.2vw,3.65rem);font-weight:700;line-height:1.08;
    letter-spacing:-.045em;color:var(--green);text-wrap:balance;
  }
  .reveal-copy p{
    max-width:650px;margin:clamp(20px,3vw,30px) auto 0;font-size:clamp(.98rem,1.7vw,1.16rem);
    line-height:1.65;color:var(--ink-soft);text-wrap:balance;
  }
  .reveal-rule{
    display:block;width:48px;height:3px;margin:clamp(24px,4vw,38px) auto 0;
    border-radius:999px;background:var(--accent);
  }
  .sr-only{
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
    clip:rect(0,0,0,0);white-space:nowrap;border:0;
  }

  html:not([data-jvv-reveal="play"]):not([data-jvv-reveal="reduce"]) .super-word{opacity:0}
  html:not([data-jvv-reveal="play"]):not([data-jvv-reveal="reduce"]) .chevron-sweep{display:none}

  html[data-jvv-reveal="play"] .super-letter{
    animation:superTracking var(--timing-tracking-duration) cubic-bezier(.4,0,.2,1)
      calc(var(--timing-super-start) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-reveal="play"] .super-glyph{
    animation:superGlyphExit var(--timing-super-duration) cubic-bezier(.4,0,1,1)
      calc(var(--exit-delay) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-reveal="play"] .chevron-sweep{
    animation:chevronsCross var(--timing-chevrons-duration) cubic-bezier(.4,0,.2,1)
      calc(var(--timing-chevrons-start) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-reveal="play"] .monogram{
    animation:monogramResolve var(--timing-monogram-duration) cubic-bezier(.16,1,.3,1)
      calc(var(--timing-monogram-start) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-reveal="play"] .reveal-copy{
    animation:copyResolve var(--timing-copy-duration) cubic-bezier(0,0,.2,1)
      calc(var(--timing-copy-start) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-reveal="play"] .reveal-kicker{
    animation:kickerResolve var(--timing-copy-duration) cubic-bezier(0,0,.2,1)
      calc(var(--timing-copy-start) + var(--preview-shift,0ms)) both;
  }
  html[data-jvv-preview-frame="true"] .super-letter,
  html[data-jvv-preview-frame="true"] .super-glyph,
  html[data-jvv-preview-frame="true"] .chevron-sweep,
  html[data-jvv-preview-frame="true"] .monogram,
  html[data-jvv-preview-frame="true"] .reveal-copy,
  html[data-jvv-preview-frame="true"] .reveal-kicker{animation-play-state:paused!important}

  @keyframes chevronsCross{
    0%{opacity:0;transform:translate3d(calc(-50% - 58vw),-50%,0)}
    14%{opacity:1}
    84%{opacity:1}
    100%{opacity:0;transform:translate3d(calc(-50% + 58vw),-50%,0)}
  }
  @keyframes superTracking{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--spread),0,0)}}
  @keyframes superGlyphExit{from{opacity:1;transform:translate3d(0,0,0)}to{opacity:0;transform:translate3d(0,-.34em,0)}}
  @keyframes monogramResolve{
    from{opacity:0;transform:translate3d(-.16em,0,0) scale(.965)}
    to{opacity:1;transform:translate3d(0,0,0) scale(1)}
  }
  @keyframes copyResolve{
    from{opacity:0;transform:translate3d(0,10px,0)}
    to{opacity:1;transform:translate3d(0,0,0)}
  }
  @keyframes kickerResolve{from{opacity:0}to{opacity:1}}

  html[data-jvv-reveal="reduce"] .super-word{
    animation:reducedExit var(--timing-reduced-exit) ease-in 60ms both;
  }
  html[data-jvv-reveal="reduce"] .chevron-sweep{display:none}
  html[data-jvv-reveal="reduce"] .monogram,
  html[data-jvv-reveal="reduce"] .reveal-copy,
  html[data-jvv-reveal="reduce"] .reveal-kicker{
    animation:reducedEnter var(--timing-reduced-enter) ease-out
      calc(60ms + var(--timing-reduced-exit)) both;
  }
  @keyframes reducedExit{from{opacity:1}to{opacity:0}}
  @keyframes reducedEnter{from{opacity:0}to{opacity:1}}

  @media (max-width:520px){
    .launch-reveal{padding-inline:14px}
    .brand-wordmark{grid-template-columns:5.35ch max-content 5.35ch;gap:4px}
    .brand-stage{padding-block:22px}
    .reveal-kicker{margin-bottom:24px}
    .reveal-copy{margin-top:34px}
  }
</style>
<?php endif; ?>
<style>
  :root{
    --paper:#F5EDD9;
    --page:#E4DBC2;
    --ink:#1A1A1A;
    --ink-soft:#4f4d40;
    --green:#1b4332;
    --green-mid:#2D6A4F;
    --accent:#f4a435;
    --rule:rgba(27,67,50,.20);
  }
  /* The cream sheet stays light in any viewer theme so the dark wordmark always reads;
     only the surrounding page darkens. */
  @media (prefers-color-scheme: dark){ :root{ --page:#0f241c; } }
  :root[data-theme="light"]{ --page:#E4DBC2; }
  :root[data-theme="dark"]{ --page:#0f241c; }

  *{box-sizing:border-box}
  body{
    margin:0;
    padding:clamp(16px,4vw,48px) clamp(14px,4vw,32px);
    background:var(--page);
    color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    line-height:1.62;
    -webkit-font-smoothing:antialiased;
  }
  .sheet{
    max-width:660px;margin:0 auto;background:var(--paper);
    border-radius:18px;padding:clamp(26px,6vw,56px);
    box-shadow:0 18px 50px rgba(20,53,42,.14);
  }

  /* ── letterhead ── */
  .head{text-align:center}
  .head img{height:52px;width:auto;max-width:100%}
  .head hr{border:0;border-top:1.5px solid var(--rule);margin:22px 0 18px}
  .eyebrow{
    font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;
    color:var(--green-mid);font-weight:700;
  }

  /* ── teaser ── */
  .teaser{
    margin:30px 0 6px;padding:26px 20px 22px;text-align:center;
    background:rgba(27,67,50,.045);border:1px solid var(--rule);border-radius:14px;
  }
  .teaser svg{width:clamp(74px,17vw,104px);height:auto;display:block;margin:0 auto}
  .teaser .frag{opacity:0;animation:frag .9s ease-out forwards}
  .teaser .frag:nth-child(2){animation-delay:.5s}
  .teaser .frag:nth-child(3){animation-delay:1s}
  @keyframes frag{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
  .teaser p{
    margin:18px 0 0;font-size:.83rem;letter-spacing:.11em;text-transform:uppercase;
    color:var(--green-mid);font-weight:700;
  }
  .teaser .dots{margin-top:12px;display:flex;gap:7px;justify-content:center}
  .teaser .dots i{
    width:7px;height:7px;border-radius:50%;background:var(--rule);display:block;
  }
  .teaser .dots i.on{background:var(--accent)}

  /* ── work illustration: a bridge assembling itself ──
     Deliberately non-representational — no human figures, so it cannot be read as
     depicting any person. The bridge is the honest motif: it is what JVV does, and
     it echoes the new company name (Many Bridges). */
  .work{margin:34px 0 8px;text-align:center}
  .work svg{width:100%;max-width:420px;height:auto}
  /* Per-segment delay comes from an inline --d custom property, NOT nth-of-type:
     the pillars are <rect> siblings too, so nth-of-type would count them and every
     segment would animate at once — which reads as blinking, not building. */
  .work .seg{
    transform-box:fill-box;transform-origin:center;
    opacity:0;
    animation:build 7s cubic-bezier(.22,.68,.31,1) infinite backwards;
    animation-delay:var(--d,0s);
  }
  @keyframes build{
    0%       {opacity:0;transform:translateY(-17px)}
    9%       {opacity:1;transform:translateY(0)}
    76%      {opacity:1;transform:translateY(0)}
    88%,100% {opacity:0;transform:translateY(-17px)}
  }
  /* Centre accent lights up only once the span is actually closed. */
  .work .spark{transform-box:fill-box;opacity:0;animation:spark 7s ease-in-out infinite}
  @keyframes spark{
    0%,26%   {opacity:0}
    34%,74%  {opacity:1}
    84%,100% {opacity:0}
  }
  /* A light crossing the finished deck — the payoff of the loop: the bridge connects. */
  .work .cruce{transform-box:fill-box;opacity:0;animation:cruce 7s ease-in-out infinite}
  @keyframes cruce{
    0%,32%  {opacity:0;transform:translateX(0)}
    38%     {opacity:1;transform:translateX(8px)}
    72%     {opacity:1;transform:translateX(292px)}
    80%     {opacity:0;transform:translateX(300px)}
    100%    {opacity:0;transform:translateX(0)}
  }
  .work figcaption{
    margin-top:10px;font-size:.9rem;color:var(--ink-soft);font-style:italic;
  }

  h1{
    font-size:clamp(1.34rem,4.4vw,1.72rem);line-height:1.28;
    margin:26px 0 14px;color:var(--green);text-align:center;
  }
  p{margin:0 0 15px}
  .lead{font-size:1.06rem}
  strong{color:var(--green)}

  .numbox{
    margin:26px 0;padding:20px 18px;text-align:center;
    background:var(--green);color:#fff;border-radius:14px;
  }
  .numbox .lbl{
    display:block;font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;
    opacity:.86;margin-bottom:5px;
  }
  .numbox .num{
    display:block;font-size:clamp(1.3rem,5.4vw,1.62rem);font-weight:800;letter-spacing:.02em;
  }
  .numbox .sub{display:block;margin-top:7px;font-size:.9rem;opacity:.9}

  .channels{
    margin:26px 0;padding:18px;border:1px solid var(--rule);border-radius:14px;
    background:rgba(244,164,53,.07);
  }
  .channels .title{
    display:block;font-size:.74rem;letter-spacing:.13em;text-transform:uppercase;
    color:var(--green-mid);font-weight:800;margin-bottom:10px;
  }
  .channels a,.channels span.item{display:block;color:var(--ink);text-decoration:none;padding:3px 0}
  .channels a{text-decoration:underline;text-decoration-color:var(--rule)}
  .verify{margin-top:12px;font-size:.9rem;color:var(--ink-soft)}

  .cta{
    display:inline-flex;align-items:center;gap:9px;margin:6px auto 0;
    background:var(--green);color:#fff;text-decoration:none;
    padding:13px 22px;border-radius:999px;font-weight:700;
  }
  .cta-wrap{text-align:center}

  /* ── official communiqué (layer two) ── */
  details{margin:32px 0 0;border-top:1.5px solid var(--rule);padding-top:22px}
  summary{
    cursor:pointer;font-weight:800;color:var(--green);
    font-size:.78rem;letter-spacing:.13em;text-transform:uppercase;
  }
  details .body{margin-top:16px}
  details p{color:var(--ink-soft)}
  .sign{margin-top:22px}
  .sign .grat{font-style:italic;color:var(--ink-soft)}
  .sign .name{font-weight:800;color:var(--green)}

  footer{
    margin-top:30px;padding-top:18px;border-top:1.5px solid var(--rule);
    text-align:center;font-size:.86rem;color:var(--ink-soft);
  }
  footer .tag{
    margin-top:8px;font-size:.76rem;letter-spacing:.13em;text-transform:uppercase;color:var(--green-mid);
  }

  /* Reduced motion: drop all translation, but keep an opacity-only staggered loop so
     the page still reads as "in progress". Fading is not vestibular motion; sliding
     is. Overriding animation-name only keeps the 7s duration and the --d delays. */
  @media (prefers-reduced-motion:reduce){
    .work .seg{animation-name:buildFade!important;transform:none!important}
    .work .spark{animation:none!important;opacity:1!important}
    .work .cruce{animation:none!important;opacity:0!important}
    .teaser .frag{animation:none!important;opacity:1!important;transform:none!important}
  }
  @keyframes buildFade{
    0%       {opacity:0}
    9%       {opacity:1}
    76%      {opacity:1}
    88%,100% {opacity:0}
  }
</style>
</head>
<body<?= $MOSTRAR_LANZAMIENTO ? ' class="launch-mode"' : '' ?>>
<?php if ($MOSTRAR_LANZAMIENTO): ?>
<main class="launch-reveal">
  <section class="reveal-inner" aria-labelledby="reveal-heading">
    <p class="reveal-kicker">Nueva etapa · Mismo JVV</p>

    <div class="brand-stage">
      <div class="brand-wordmark" aria-hidden="true">
        <span class="super-word">
          <span class="super-letter"><span class="super-glyph">S</span></span><span class="super-letter"><span class="super-glyph">U</span></span><span class="super-letter"><span class="super-glyph">P</span></span><span class="super-letter"><span class="super-glyph">E</span></span><span class="super-letter"><span class="super-glyph">R</span></span>
        </span>
        <span class="core-word">CAMBIOS JVV</span>
        <span class="monogram-slot">
          <svg class="monogram" viewBox="372 369 1306 1310" role="img" aria-label="Monograma JVV">
            <path d="M 655.676 373.444 C 670.544 372.66 691.855 373.325 707.153 373.321 L 809.671 373.346 L 1118.49 373.439 L 1309.32 373.345 C 1348.31 373.302 1397.27 371.197 1434.86 377.3 C 1482.92 385.101 1534.52 410.024 1571.46 441.499 C 1630.52 491.819 1668.04 563.27 1673.25 640.91 C 1674.76 663.369 1674.08 689.053 1674.07 711.937 L 1674.04 825.536 L 1674.09 1172.14 L 1674.17 1326.61 C 1674.23 1360.23 1675.89 1404.66 1670.05 1436.77 C 1660.37 1489.11 1636.82 1537.88 1601.85 1578.01 C 1546.83 1640.23 1477.26 1670.91 1394.98 1675.74 C 1337.76 1677.05 1276.4 1676.14 1218.92 1676.13 L 894.269 1675.98 L 729.846 1675.99 C 691.046 1676 644.721 1677.99 607.392 1670.78 C 556.56 1660.65 509.35 1637.14 470.634 1602.68 C 413.229 1551.23 378.82 1478.93 375.09 1401.93 C 372.963 1356.62 374.863 1298.68 374.653 1252.14 L 374.651 902.173 L 374.332 731.381 C 374.347 691.843 372.896 640.317 380.454 602.372 C 390.94 552.117 414.748 505.607 449.385 467.715 C 504.031 408.555 575.435 376.57 655.676 373.444 z" fill="#1b4332"/>
            <g transform="translate(1026 1013) scale(1.14) translate(-1026 -1013)">
              <path d="M 1326.16 706.615 C 1366.87 736.395 1407.11 766.81 1446.87 797.849 C 1412.02 950.576 1374.6 1102.7 1334.63 1254.17 C 1300.92 1262.52 1264.27 1270.51 1230.25 1277.66 C 1216.73 1230.28 1198.54 1180.74 1182.87 1133.76 C 1169.63 1094.05 1156.25 1055.19 1142.13 1015.77 L 1085.91 862.605 C 1070.84 821.908 1055.52 782.122 1041.1 741.117 L 1174.05 711.241 C 1194.17 768.646 1213.8 826.225 1232.92 883.972 C 1244.87 920.329 1256.78 960.712 1270.13 996.407 C 1278.21 950.204 1288.54 901.268 1297.67 855.075 L 1326.16 706.615 z" fill="#ffffff"/>
              <path d="M 894.017 775.244 L 896.287 775.78 C 901.505 789.51 906.338 803.989 910.868 818 C 936.526 897.348 965.296 977.375 987.566 1057.75 C 1006.87 982.162 1025.57 906.42 1043.66 830.531 C 1048.91 845.92 1056.35 864.067 1062.1 879.76 C 1084.5 939.65 1106.47 999.696 1128.03 1059.89 C 1125.72 1076.11 1119.42 1099.86 1115.37 1116.42 L 1092.73 1208.76 C 1084.17 1244.42 1075.17 1279.97 1065.74 1315.4 C 1032.32 1324.08 995.756 1331.11 961.842 1338.96 C 955.968 1325.44 949.346 1304.85 944.078 1290.34 L 904.602 1181.47 L 764.722 805.209 C 807.407 794.845 851.152 785.144 894.017 775.244 z" fill="#ffffff"/>
              <path d="M 732.913 812.241 L 735.212 812.308 C 738.02 815.873 744.675 835.882 746.806 841.701 L 774.456 917.184 L 847.33 1113.09 C 867.745 1168.83 890.049 1202 876.693 1264.27 C 856.75 1357.26 769.665 1405.08 679.134 1386.15 C 639.767 1377.92 608.565 1349.72 587.786 1316.65 C 569.32 1283.36 567.295 1262.3 562.991 1225.51 C 599.402 1214.87 648.69 1206.18 687.422 1196.6 C 689.583 1213.78 691.254 1248.59 708.68 1256.87 C 714.156 1259.44 720.445 1259.65 726.084 1257.47 C 741.395 1251.58 746.719 1228.8 743.203 1214.69 C 734.258 1178.81 720.17 1142.76 707.593 1108.02 C 674.876 1018.84 641.046 930.07 606.113 841.731 C 619.239 838.121 636.134 834.924 649.693 831.797 L 732.913 812.241 z" fill="#ffffff"/>
              <path d="M 1488.88 639.293 C 1491.04 643.937 1458.31 750.102 1454.07 765.303 C 1436.04 753.986 1404.05 728.712 1386.09 715.421 C 1369.48 703.349 1350.22 689.032 1334.35 676.199 C 1383.58 662.428 1438.41 652.452 1488.88 639.293 z" fill="#f4a435"/>
            </g>
          </svg>
        </span>
      </div>

      <svg class="chevron-sweep" viewBox="255 305 1540 1300" aria-hidden="true">
        <path d="M 966.055 453.034 C 1106.73 453.656 1248.12 451.708 1388.71 453.567 C 1437.12 524.808 1486.1 595.661 1535.65 666.118 L 1665.41 855.364 L 1749.97 977.901 C 1761.79 995.164 1774.2 1011.73 1785.36 1029.44 C 1772.51 1049.21 1759.33 1066.77 1745.78 1085.98 L 1680.56 1178.38 L 1513.44 1414.6 L 1422.12 1543.69 C 1415.29 1553.39 1392.94 1588.29 1385.89 1595 L 965.678 1595.23 C 973.259 1582.91 986.818 1565.16 995.674 1552.49 L 1074.22 1441.98 L 1273.43 1162.04 C 1305.24 1117.34 1337.41 1074.12 1368.3 1028.5 C 1349.18 1003.76 1324.4 965.687 1306.07 939.245 L 1199.69 786.63 C 1122.46 675.257 1042.57 564.842 966.055 453.034 z" fill="#f4a435"/>
        <path d="M 793.061 453.596 C 798.685 459.093 820.303 492.332 826.128 500.804 C 851.654 537.357 876.91 574.098 901.894 611.023 L 1091.14 884.797 C 1124.03 932.243 1157.04 983.589 1191.06 1029.62 L 982.327 1323.82 C 918.3 1413.17 852.44 1503.97 789.834 1594.26 L 474.5 1594.15 L 375.08 1594.23 C 384.965 1577.37 408.706 1545.45 420.923 1528.4 L 492.923 1426.53 L 773.327 1030.09 C 759.812 1013.38 741.07 984.388 728.376 965.988 L 657.94 865.153 L 542.667 700.349 C 518.837 666.946 495.285 633.345 472.014 599.55 C 513.197 598.747 554.742 599.472 595.974 599.071 C 687.704 598.179 763.966 540.331 793.061 453.596 z" fill="#1b4332"/>
      </svg>
    </div>

    <div class="reveal-copy">
      <h1 id="reveal-heading"><span class="sr-only">Super Cambios JVV ahora es Cambios JVV. </span>Acortamos el nombre.<br>No la historia.</h1>
      <span class="reveal-rule" aria-hidden="true"></span>
      <p>El mismo número, el mismo JVV desde 2017 y una forma completamente nueva de enviar.</p>
    </div>
  </section>
</main>
<?php else: ?>
<main class="sheet">

  <div class="head">
    <img src="images/logo-default-280x113.png" alt="Super Cambios JVV">
    <hr>
    <div class="eyebrow">Nueva etapa en preparación</div>
  </div>

  <h1>Estamos construyendo la mejor etapa de JVV</h1>

<?php if ($RECUPERADO): ?>
  <p class="lead">Hola, familia JVV. Este número, <strong>624 44 26 73</strong>, sigue siendo el
  número oficial de Super Cambios JVV y continúa bajo mi dirección.</p>

  <p>Como muchos ya intuían por los movimientos de estas últimas semanas, JVV está entrando en una
  nueva etapa: nueva estructura, nuevas herramientas y una experiencia mucho mejor que la que ya
  conocen. Mientras completo ese proceso, <strong>las operaciones están temporalmente en
  pausa</strong>. Prefiero decírselo con claridad y no darles una fecha hasta que todo esté
  realmente listo.</p>
<?php else: ?>
  <p class="lead">Hola, familia JVV. Super Cambios JVV está atravesando una reorganización interna
  y una renovación completa.</p>

  <p>Como muchos ya intuían por los movimientos de estas últimas semanas, JVV está entrando en una
  nueva etapa: nueva estructura, nuevas herramientas y una experiencia mucho mejor que la que ya
  conocen. Mientras completo ese proceso, <strong>las operaciones están temporalmente en pausa</strong>
  y la atención por WhatsApp está suspendida. Prefiero decírselo con claridad y no darles una fecha
  hasta que todo esté realmente listo.</p>
<?php endif; ?>

  <figure class="work">
    <svg viewBox="0 0 420 172" role="img" aria-label="Un puente en construcción, armándose pieza por pieza">
      <!-- shores -->
      <path d="M0 132 H88 V172 H0 Z" fill="#1b4332" opacity=".13"/>
      <path d="M332 132 H420 V172 H332 Z" fill="#1b4332" opacity=".13"/>
      <path d="M0 130 H88" stroke="#1b4332" stroke-width="3" opacity=".45"/>
      <path d="M332 130 H420" stroke="#1b4332" stroke-width="3" opacity=".45"/>
      <!-- pillars -->
      <rect x="150" y="96" width="11" height="40" rx="3" fill="#1b4332" opacity=".55"/>
      <rect x="259" y="96" width="11" height="40" rx="3" fill="#1b4332" opacity=".55"/>
      <!-- deck segments, assembling left to right; --d staggers each arrival -->
      <rect class="seg" style="--d:0s"   x="74"  y="84" width="58" height="12" rx="4" fill="#1b4332"/>
      <rect class="seg" style="--d:.3s"  x="136" y="84" width="58" height="12" rx="4" fill="#1b4332"/>
      <rect class="seg" style="--d:.6s"  x="198" y="84" width="58" height="12" rx="4" fill="#f4a435"/>
      <rect class="seg" style="--d:.9s"  x="260" y="84" width="58" height="12" rx="4" fill="#1b4332"/>
      <rect class="seg" style="--d:1.2s" x="322" y="84" width="58" height="12" rx="4" fill="#1b4332"/>
      <!-- accent marks that appear once the span is closed -->
      <circle class="spark" cx="227" cy="66" r="4.5" fill="#f4a435"/>
      <path class="spark" d="M212 72 H242" stroke="#f4a435" stroke-width="2.5" opacity=".5"/>
      <!-- light travelling across the finished span -->
      <circle class="cruce" cx="80" cy="90" r="4" fill="#F5EDD9"/>
    </svg>
    <figcaption>Construyendo, pieza por pieza.</figcaption>
  </figure>

  <div class="teaser">
    <svg viewBox="255 305 1540 1300" role="img" aria-label="Fragmento del nuevo símbolo de JVV">
      <path class="frag" d="M 793.061 453.596 C 798.685 459.093 820.303 492.332 826.128 500.804 C 851.654 537.357 876.91 574.098 901.894 611.023 L 1091.14 884.797 C 1124.03 932.243 1157.04 983.589 1191.06 1029.62 L 982.327 1323.82 C 918.3 1413.17 852.44 1503.97 789.834 1594.26 L 474.5 1594.15 L 375.08 1594.23 C 384.965 1577.37 408.706 1545.45 420.923 1528.4 L 492.923 1426.53 L 773.327 1030.09 C 759.812 1013.38 741.07 984.388 728.376 965.988 L 657.94 865.153 L 542.667 700.349 C 518.837 666.946 495.285 633.345 472.014 599.55 C 513.197 598.747 554.742 599.472 595.974 599.071 C 687.704 598.179 763.966 540.331 793.061 453.596 z" fill="#1b4332"/>
<?php if ($ETAPA >= 2): ?>
      <path class="frag" d="M 966.055 453.034 C 1106.73 453.656 1248.12 451.708 1388.71 453.567 C 1437.12 524.808 1486.1 595.661 1535.65 666.118 L 1665.41 855.364 L 1749.97 977.901 C 1761.79 995.164 1774.2 1011.73 1785.36 1029.44 C 1772.51 1049.21 1759.33 1066.77 1745.78 1085.98 L 1680.56 1178.38 L 1513.44 1414.6 L 1422.12 1543.69 C 1415.29 1553.39 1392.94 1588.29 1385.89 1595 L 965.678 1595.23 C 973.259 1582.91 986.818 1565.16 995.674 1552.49 L 1074.22 1441.98 L 1273.43 1162.04 C 1305.24 1117.34 1337.41 1074.12 1368.3 1028.5 C 1349.18 1003.76 1324.4 965.687 1306.07 939.245 L 1199.69 786.63 C 1122.46 675.257 1042.57 564.842 966.055 453.034 z" fill="#f4a435"/>
<?php endif; ?>
<?php if ($ETAPA >= 3): ?>
      <path class="frag" d="M 695.955 320.984 L 699.527 321.841 C 698.862 326.909 698.733 334.485 698.623 339.59 C 696.208 405.149 666.659 455.026 604.389 480.41 C 532.916 509.546 393.009 449.316 368.213 553.863 C 355.611 606.998 397.5 649.938 424.37 690.632 C 406.725 717.404 384.995 746.796 368.77 773.562 C 352.177 748.634 334.534 724.311 317.12 699.952 C 307.094 685.926 296.167 671.945 287.741 656.886 C 265.986 618.005 262.296 567.142 274.583 524.674 C 284.889 489.054 305.075 457.09 334.062 433.779 C 441.487 347.391 553.607 426.825 646.143 375.303 C 666.085 364.199 689.576 343.748 695.955 320.984 z" fill="#1a1a1a"/>
<?php endif; ?>
    </svg>
    <p>Algo nuevo se está armando</p>
    <div class="dots" aria-hidden="true">
      <?php for ($i = 1; $i <= 3; $i++): ?><i class="<?= $i <= $ETAPA ? 'on' : '' ?>"></i><?php endfor; ?>
    </div>
  </div>

<?php if ($RECUPERADO): ?>
  <div class="numbox">
    <span class="lbl">El número de siempre</span>
    <span class="num">+34 624 44 26 73</span>
    <span class="sub">Guárdalo. Sigue siendo JVV, sigue siendo mío.</span>
  </div>

  <div class="channels">
    <span class="title">Nuestros únicos canales oficiales</span>
    <a href="https://wa.me/<?= $WA ?>">WhatsApp +34 624 44 26 73</a>
    <a href="https://www.instagram.com/supercambiosjvv" target="_blank" rel="noopener">Instagram @supercambiosjvv</a>
    <span class="item">supercambiosjvv.com</span>
    <p class="verify">Si alguien te contacta desde otro número, verifica siempre conmigo por aquí
    antes de enviar cualquier cantidad.</p>
  </div>

  <div class="cta-wrap">
    <a class="cta" href="https://wa.me/<?= $WA ?>">Escríbeme por WhatsApp</a>
  </div>
<?php else: ?>
  <div class="channels">
    <span class="title">Nuestro canal oficial por ahora</span>
    <a href="https://www.instagram.com/supercambiosjvv" target="_blank" rel="noopener">Instagram @supercambiosjvv</a>
    <span class="item">supercambiosjvv.com</span>
    <p class="verify">Si alguien te contacta en nombre de Super Cambios JVV, verifica siempre por
    nuestro Instagram antes de enviar cualquier cantidad.</p>
  </div>

  <div class="cta-wrap">
    <a class="cta" href="https://www.instagram.com/supercambiosjvv" target="_blank" rel="noopener">Síguenos en Instagram</a>
  </div>
<?php endif; ?>

<?php if ($RECUPERADO): // the communiqué is the Wednesday announcement — not published before recovery ?>
  <details>
    <summary>Leer el comunicado oficial completo</summary>
    <div class="body">
      <p>Familia JVV, les escribo directo y de corazón.</p>

      <p>Como muchos ya intuían por los movimientos de estas últimas semanas, Super Cambios JVV está
      atravesando un cambio importante: lo que por años fue un proyecto de dos socios, de ahora en
      adelante continúa bajo una sola dirección — la mía.</p>

      <p>JVV nació en 2017 y desde el primer día su nombre significó algo muy personal para quienes
      lo levantamos. Con el tiempo, cada uno tomó caminos distintos y hoy estamos en etapas
      diferentes de la vida. A mi antigua socia le deseo, con total sinceridad, muchísimo éxito en
      todo lo que emprenda.</p>

      <p>Aquí cada quien siempre ha sido libre de elegir con quién mover su dinero — y eso no
      cambia. Lo único que quiero decirles es que yo voy a seguir aquí, como siempre, para quien
      quiera seguir contando conmigo.</p>

      <p><strong>Y les tengo una noticia:</strong> esto no es un adiós, es el comienzo de la mejor
      etapa de JVV. Nos estamos renovando por completo — nueva imagen, nuevas herramientas y varias
      novedades que van a mejorar muchísimo la experiencia que ya conocían. Ese proceso toma un poco
      de tiempo, así que durante un tiempo quizás no me vean tan activo como siempre. Es parte de
      construir algo mejor.</p>

      <p>El número de siempre, 624 44 26 73, sigue siendo mío y sigue siendo JVV. Nuestros únicos
      canales oficiales son este número, nuestro Instagram @supercambiosjvv y supercambiosjvv.com.
      Guárdenlo y síganme por aquí, porque de a poco van a empezar a ver lo que se viene. Vamos a
      volver más fuertes y más completos que nunca, y les aseguro que va a valer totalmente la
      espera.</p>

      <p>Gracias de corazón a cada persona que ha confiado en nosotros todos estos años. A los que
      sigan este camino conmigo: nos vemos muy pronto.</p>

      <div class="sign">
        <div class="grat">Con gratitud,</div>
        <div class="name">José — Super Cambios JVV</div>
      </div>
    </div>
  </details>
<?php endif; ?>

  <footer>
    Gracias por la confianza de todos estos años.
    <div class="tag">rápido. seguro. simple.</div>
  </footer>

</main>
<?php endif; ?>
</body>
</html>
