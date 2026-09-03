/**
 * "If I send this many USDT for this many EUR, what do I make?"
 *
 * An Envio USDT has no separate creation/payment split the way a client
 * sending does — see migration 019 — because the USDT leave Binance the
 * instant Jose logs it. That means the ONLY chance to show him a preview
 * before he commits is right here, while he is still typing the two numbers.
 * It is the same reason lib/rate-preview.ts exists for the tasa box: a
 * calculator over the pool as it stands, computed client-side, nothing
 * stored, nothing drawn, no lot touched.
 *
 * The cost goes through costUsdtDraw — the exact function createUsdtSending
 * calls when the sending is actually written — so the preview and the real
 * booking can never disagree about what the same pool would have cost at the
 * same moment. Only the FIFO draw over crypto_purchases is simulated; nothing
 * about a database, a sending row or React lives in this file.
 */

import type { Lot } from './fifo';
import { costUsdtDraw } from './pricing';

export interface UsdtPreviewInput {
  /** EUR the client handed over. Typed; null while the box is blank. */
  amountEur: number | null;
  /** USDT Jose is about to send. Typed; null while the box is blank. */
  usdtDelivered: number | null;
  /** The crypto pool as it stands right now, from listActiveUsdtLots. */
  usdtLots: Lot[];
}

export interface UsdtPreview {
  /** What the delivered USDT would actually cost, from the real FIFO draw. */
  costEur: number;
  /** amountEur - costEur. Never null here: both typed numbers are required. */
  profitEur: number;
  /** profitEur / amountEur * 100 — against REVENUE, exactly as rate-preview.ts
   *  computes it and for the same reason: "de lo que cobro, cuanto me queda"
   *  is a different question from margin over cost, and this is the one Jose
   *  is used to reading. Null only when amountEur is exactly zero, where the
   *  division would be 0/0 rather than a real margin. */
  marginPct: number | null;
  /** USDT the pool could not cover. Booked as a backorder on the newest
   *  purchase when the real sending is written — normal here, not an error. */
  shortfallUsdt: number;
}

/**
 * Work out the preview, or return null when there is nothing honest to show.
 *
 * Null is the answer whenever either typed number is missing or not
 * positive — the same discipline computeRatePreview uses and for the same
 * reason: a half-typed "19" on the way to "195" must not flash a number Jose
 * might read as real. `!(x > 0)` and not `x <= 0`, so NaN is refused the same
 * way as zero and negative.
 *
 * costUsdtDraw (through drawFifo) throws when the pool holds no lots at all —
 * a first-run state, not a half-typed input. That is not a case this preview
 * can show a number for either, so it is caught here and folded into the same
 * null rather than left to crash the render on every keystroke.
 */
export function computeUsdtPreview(input: UsdtPreviewInput): UsdtPreview | null {
  const { amountEur, usdtDelivered, usdtLots } = input;

  if (amountEur === null || !(amountEur > 0)) return null;
  if (usdtDelivered === null || !(usdtDelivered > 0)) return null;

  let draw: ReturnType<typeof costUsdtDraw>;
  try {
    // drawFifo (called through costUsdtDraw) sorts a COPY of the array it is
    // given — `[...lots].sort(...)` in lib/fifo.ts — and only ever writes into
    // a Map it returns as lotUpdates; it never assigns back into a Lot object
    // or reorders the caller's own array. Verified by reading drawFifo, so
    // calling this again and again against the very same `usdtLots` prop as
    // Jose retypes the two boxes is safe with no defensive copy here.
    draw = costUsdtDraw(usdtDelivered, usdtLots);
  } catch {
    return null;
  }

  const profitEur = amountEur - draw.costEur;

  return {
    costEur: draw.costEur,
    profitEur,
    // Unreachable given the guard above (amountEur > 0 always holds here),
    // kept anyway so this branch reads the same as computeRatePreview's and
    // stays correct if that guard is ever loosened.
    marginPct: amountEur === 0 ? null : (profitEur / amountEur) * 100,
    shortfallUsdt: draw.usdtShortfall,
  };
}
