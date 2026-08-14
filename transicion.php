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
$ETAPA = 2;

// ── RECOVERY GATE ────────────────────────────────────────────────────────────
// false = pre-recovery: the WhatsApp number is not yet back under José's control,
//         so the page must NOT claim it as the official channel. Instagram is the
//         reachable channel and the anti-impersonation line stays generic — it
//         never characterises anyone else's number (JVV-34 disclosure ceiling).
// true  = the number is recovered: assert it, publish the communiqué.
//
// Flip to true in the Wednesday publish window, once control is actually stable.
$RECUPERADO = true;

$WA = '34624442673';
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Super Cambios JVV — Nueva etapa en preparación</title>
<?php
// The metadata is gated too: search results and link previews must never claim the
// number before it is recovered. Keep this in sync with $RECUPERADO — the head is
// as public as the body (Codex review R1, 2026-07-27).
$META = $RECUPERADO
  ? 'Super Cambios JVV está preparando una nueva etapa. Nuestros canales oficiales son el 624 44 26 73, @supercambiosjvv y supercambiosjvv.com.'
  : 'Super Cambios JVV está preparando una nueva etapa. Nuestros canales oficiales son @supercambiosjvv y supercambiosjvv.com.';
?>
<meta name="description" content="<?= htmlspecialchars($META, ENT_QUOTES, 'UTF-8') ?>">
<link rel="canonical" href="https://supercambiosjvv.com/">
<link rel="icon" href="images/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Super Cambios JVV">
<meta property="og:title" content="Super Cambios JVV — Nueva etapa en preparación">
<meta property="og:description" content="<?= htmlspecialchars($META, ENT_QUOTES, 'UTF-8') ?>">
<meta property="og:url" content="https://supercambiosjvv.com/">
<meta property="og:image" content="https://supercambiosjvv.com/images/logo-default-280x113.png">
<meta name="twitter:card" content="summary">
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
    --wordmark-cycle:8s;
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
  .wordmark{
    display:flex;justify-content:center;overflow:visible;
    color:var(--ink-soft);font-family:Impact,Haettenschweiler,"Arial Narrow Bold","Arial Narrow",sans-serif;
    font-size:clamp(1.8rem,9.4vw,3.2rem);font-weight:900;letter-spacing:.01em;
    line-height:1;text-transform:uppercase;white-space:nowrap;
  }
  .wordmark-type{
    display:inline-flex;align-items:baseline;gap:.2em;
    transform:scaleX(.82);transform-origin:center;
  }
  .wordmark-super{display:inline-flex}
  .wordmark-super-letter{display:inline-block;will-change:opacity,transform}
  .wordmark-core{display:inline-flex;align-items:baseline;gap:.2em}
  .wordmark-jvv{
    display:inline-block;color:var(--ink);transform:skewX(-9deg);transform-origin:center;
  }

  /*
     WORDMARK LOOP — 8 seconds, continuous
       0.0–2.0  full name rests
       2.0–2.7  SUPER opens, lifts and fades
       2.7–4.7  CAMBIOS JVV remains fixed
       4.7–5.1  SUPER returns cleanly
       5.1–8.0  full name rests before repeating

     Each letter moves with transform only. SUPER keeps its layout width while hidden,
     so CAMBIOS JVV never shifts during the cycle.
  */
  .wordmark-super-letter{
    animation:wordmarkSuperLoop var(--wordmark-cycle) infinite;
  }
  @keyframes wordmarkSuperLoop{
    0%{opacity:1;transform:translate3d(0,0,0)}
    25%{
      opacity:1;transform:translate3d(0,0,0);
      animation-timing-function:cubic-bezier(.4,0,.2,1);
    }
    28.75%{
      opacity:1;transform:translate3d(var(--spread),0,0);
      animation-timing-function:cubic-bezier(.4,0,1,1);
    }
    33.75%{opacity:0;transform:translate3d(var(--spread),-.24em,0)}
    58.75%{
      opacity:0;transform:translate3d(var(--spread),-.24em,0);
      animation-timing-function:cubic-bezier(0,0,.2,1);
    }
    63.75%,100%{opacity:1;transform:translate3d(0,0,0)}
  }
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

  /* Reduced motion: keep the current name and the completed bridge fully static. */
  @media (prefers-reduced-motion:reduce){
    .wordmark-super-letter{animation:none!important;opacity:1!important;transform:none!important}
    .work .seg{animation:none!important;opacity:1!important;transform:none!important}
    .work .spark{animation:none!important;opacity:1!important}
    .work .cruce{animation:none!important;opacity:0!important}
    .teaser .frag{animation:none!important;opacity:1!important;transform:none!important}
  }
</style>
</head>
<body>
<main class="sheet">

  <div class="head">
    <div class="wordmark" role="img" aria-label="Super Cambios JVV">
      <span class="wordmark-type" aria-hidden="true">
        <span class="wordmark-super">
          <span class="wordmark-super-letter" style="--spread:-.14em">S</span>
          <span class="wordmark-super-letter" style="--spread:-.07em">U</span>
          <span class="wordmark-super-letter" style="--spread:0em">P</span>
          <span class="wordmark-super-letter" style="--spread:.07em">E</span>
          <span class="wordmark-super-letter" style="--spread:.14em">R</span>
        </span>
        <span class="wordmark-core"><span>CAMBIOS</span><span class="wordmark-jvv">JVV</span></span>
      </span>
    </div>
    <hr>
    <div class="eyebrow">Nueva etapa en preparación</div>
  </div>

  <h1>Estamos construyendo la mejor etapa de JVV</h1>

<?php if ($RECUPERADO): ?>
  <p class="lead">Hola, familia JVV. Este número, <strong>624 44 26 73</strong>, sigue siendo el
  número oficial de Super Cambios JVV y continúa bajo mi dirección.</p>

  <p>Como muchos ya intuían por los movimientos de estas últimas semanas, JVV está entrando en una
  nueva etapa: nueva estructura, nuevas herramientas y una experiencia mucho mejor que la que ya
  conocen. Mientras completo ese proceso, <strong>la atención pública y automática está en
  pausa</strong>. Si ya me conoces y necesitas algo puntual, escríbeme igual — sigo atendiendo caso
  por caso mientras preparo todo. Prefiero decírselo con claridad y no darles una fecha hasta que
  todo esté realmente listo.</p>
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
</body>
</html>
