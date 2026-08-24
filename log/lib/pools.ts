/**
 * Lot prices for the two FIFO pools.
 *
 * Jose never types a price. At the moment of a trade he knows the two raw
 * amounts that changed hands, and the price is whatever those two imply:
 *
 *   crypto purchase  paid  X EUR  -> got Y USDT   => X / Y  EUR per USDT
 *   binance sale     sold X USDT  -> got Y VES    => Y / X  VES per USDT
 *
 * Both raw numbers and the derived price are stored on the lot, so a lot can
 * always be audited back to the trade it came from.
 *
 * Pure module: the derivation lives here rather than in lib/queries.ts so that
 * no money rule is decided at the database layer, and so it can be tested
 * directly.
 */

/** EUR per USDT for a crypto purchase. */
export function purchasePriceEurPerUsdt(eurPaid: number, usdtReceived: number): number {
  if (!(eurPaid > 0)) {
    throw new Error('Los EUR pagados deben ser mayores que cero.');
  }
  if (!(usdtReceived > 0)) {
    throw new Error('Los USDT recibidos deben ser mayores que cero.');
  }
  return eurPaid / usdtReceived;
}

/** VES per USDT for a Binance sale. */
export function salePriceVesPerUsdt(usdtSold: number, vesReceived: number): number {
  if (!(usdtSold > 0)) {
    throw new Error('Los USDT vendidos deben ser mayores que cero.');
  }
  if (!(vesReceived > 0)) {
    throw new Error('Los bolivares recibidos deben ser mayores que cero.');
  }
  return vesReceived / usdtSold;
}
