// The two live rates for the landing page. Edit these three values and
// push — no server, no database, no admin panel required.
//
//   eurToVes  = Bs you get per 1 EUR (compra)
//   vesToEur  = Bs per 1 EUR on the sell side (venta)
//   updated   = "DD/MM/YYYY", shown as the "Actualizado:" date
//
// Leave a value as `null` to hide the rates panel entirely (e.g. while
// you haven't set today's numbers yet). etapa controls the progressive
// logo-fragment teaser: 1 = green chevron only, 2 = + orange chevron,
// 3 = + tilde (completes the mark).
window.SITE_CONFIG = {
  etapa: 2,
  eurToVes: 1000,
  vesToEur: 1140,
  updated: "28/08/2026"
};
