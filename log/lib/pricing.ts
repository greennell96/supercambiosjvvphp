/**
 * Money rules for a sending.
 *
 * A sending goes through TWO moments, and the split matters:
 *
 *  1. CREATION — the client says "send 50 EUR". Jose types the tasa he agreed
 *     for this particular transfer. All that can be known now is how many
 *     bolivares the beneficiary must receive. Nothing about cost is known yet,
 *     because the VES that will fund it has not been sold yet.
 *
 *         amountVesToPay = amountEur * rateTasa
 *
 *  2. PAYMENT — later, in a batch, Jose actually pays. Only now is the cost
 *     known. There are two ways it can happen:
 *
 *     (a) FROM THE POOL — he pays out of the bolivares already sitting in his
 *         Venezuelan account. Those bolivares came from selling USDT on Binance
 *         (the ves_sales pool), so:
 *
 *             vesToDraw = amountVesToPay, times 1.003 if the fee applies
 *             draw vesToDraw out of ves_sales (FIFO)
 *             usdtUsed  = sum(vesDrawn / thatLotsPrice)   [price = VES per USDT]
 *             draw usdtUsed out of crypto_purchases (FIFO)
 *             costEur   = sum(usdtDrawn * thatLotsPrice)  [price = EUR per USDT]
 *             profitEur = amountEur - costEur
 *
 *         The 0,3% is Jose's own interbank cost for moving pooled bolivares to
 *         a different destination bank. The beneficiary still receives exactly
 *         amountVesToPay; Jose just has to draw slightly more from his own
 *         balance to net it.
 *
 *     (b) DIRECTLY — on bigger transfers he sells USDT on Binance straight into
 *         the beneficiary's account. The bolivares never touch his pool, so
 *         there is no VES draw and no interbank fee. He supplies the one number
 *         he knows, usdtSold, and that IS usdtUsed. The USDT side is costed
 *         exactly the same way.
 *
 * Everything here is pure. lib/queries.ts reads the lots, calls these, and
 * writes back what comes out.
 */

import {
  drawFifo,
  sumAmountDividedByPrice,
  sumAmountTimesPrice,
  type Allocation,
  type Lot,
  type LotUpdate,
} from './fifo';
import { normalizeText } from './text';

/** Moving pooled bolivares to a different bank costs 0,3%. Staying put does not. */
export const FEE_MULTIPLIER = 1.003;

/**
 * The three payout methods, chosen when the sending is logged.
 *
 * This is about how JOSE funds the payout, not about which bank the client
 * prefers — he has exactly one Venezuelan account (Provincial/BBVA):
 *
 *   Provincial — pays from his own account. The bolivares never leave the bank
 *                they are already in, so there is no interbank cost.
 *   Otro       — pays into a different bank, an interbank hop out of his pool.
 *                This is the only case that carries the 0,3%.
 *   Directa    — he expects to sell straight into the beneficiary's account, so
 *                his pool is not involved at all.
 *
 * It is informational plus the input to the fee rule below. It does NOT decide
 * how the sending is actually settled later: either "Marcar pagado" button stays
 * available whatever was picked here, because plans change between logging a
 * sending and paying it.
 */
export const SENDING_PAYOUT_METHODS = ['Provincial', 'Otro', 'Directa'] as const;

export type SendingPayoutMethod = (typeof SENDING_PAYOUT_METHODS)[number];

/**
 * The options to offer when EDITING a sending that already exists.
 *
 * Sendings logged before this list existed hold something else — a bank name, or
 * "Pago Movil". If the dropdown only ever offered the three, such a row would
 * silently fall back to the first option and the next save would rewrite the
 * method. For "Pago Movil" that would flip a fee-free payout into a 0,3% one, so
 * the stored value is kept as an extra first option and can simply be left
 * alone.
 *
 * Matching is EXACT on purpose. Matching loosely would fold a stored "otro" into
 * the canonical "Otro" — same meaning, but it would also let a stored value that
 * merely looks close get replaced by a different one on save. Creation does not
 * use this: a new sending always picks from the three.
 */
export function payoutMethodOptions(current: string | null | undefined): string[] {
  const stored = (current ?? '').trim();
  if (!stored) return [...SENDING_PAYOUT_METHODS];
  return (SENDING_PAYOUT_METHODS as readonly string[]).includes(stored)
    ? [...SENDING_PAYOUT_METHODS]
    : [stored, ...SENDING_PAYOUT_METHODS];
}

const EMPTY_USDT_POOL =
  'No hay compras de cripto registradas. Registra una compra antes de pagar este envio.';
const EMPTY_VES_POOL =
  'No hay ventas de USDT registradas. Registra una venta en Ventas antes de pagar desde el pool.';

/**
 * The 0,3% applies only to "Otro", and only when the sending is actually paid
 * out of the pool. Matching ignores case and accents but is otherwise exact, so
 * a stray value like "Otro banco" does not trigger it.
 *
 * A direct sale never reaches this rule: computeDirectPayment hardcodes no fee,
 * because nothing moved between banks.
 */
export function isFeeApplied(payoutMethod: string): boolean {
  return normalizeText(payoutMethod) === 'otro';
}

/** Bolivares the beneficiary has to receive. */
export function computeAmountVesToPay(amountEur: number, rateTasa: number): number {
  return amountEur * rateTasa;
}

/** Bolivares Jose has to take out of his own pool to net that amount. */
export function computeVesToDraw(amountVesToPay: number, feeApplied: boolean): number {
  return feeApplied ? amountVesToPay * FEE_MULTIPLIER : amountVesToPay;
}

/* ------------------------------------------------------------------ moment 1 */

export interface NewSendingInput {
  amountEur: number;
  /** The tasa Jose typed for THIS sending. Not read from current_rates. */
  rateTasa: number;
}

export interface NewSending {
  amountVesToPay: number;
}

/** Everything knowable when the sending is first logged. */
export function computeNewSending(input: NewSendingInput): NewSending {
  const { amountEur, rateTasa } = input;

  if (!(amountEur > 0)) {
    throw new Error('El monto en EUR debe ser mayor que cero.');
  }
  if (!(rateTasa > 0)) {
    throw new Error('La tasa EUR/VES debe ser mayor que cero.');
  }

  return { amountVesToPay: computeAmountVesToPay(amountEur, rateTasa) };
}

/* ------------------------------------------------------------------ moment 2 */

/** What paying a sending produces, whichever of the two ways was used. */
export interface PaymentResult {
  feeApplied: boolean;

  /** Bolivares taken out of ves_sales. Zero on a direct sale. */
  vesDrawn: number;
  vesAllocations: Allocation[];
  vesLotUpdates: LotUpdate[];
  /** VES the pool could not cover; booked as a backorder on the newest sale. */
  vesShortfall: number;

  usdtUsed: number;
  usdtAllocations: Allocation[];
  usdtLotUpdates: LotUpdate[];
  /** USDT the pool could not cover; booked as a backorder on the newest purchase. */
  usdtShortfall: number;

  costEur: number;
  profitEur: number;
}

/** Second half of both payment paths: cost the USDT and work out the profit. */
function costUsdtSide(
  amountEur: number,
  usdtUsed: number,
  usdtLots: Lot[],
): Pick<
  PaymentResult,
  'usdtUsed' | 'usdtAllocations' | 'usdtLotUpdates' | 'usdtShortfall' | 'costEur' | 'profitEur'
> {
  const draw = drawFifo(usdtLots, usdtUsed, { emptyPoolMessage: EMPTY_USDT_POOL });
  const costEur = sumAmountTimesPrice(draw.allocations);

  return {
    usdtUsed,
    usdtAllocations: draw.allocations,
    usdtLotUpdates: draw.lotUpdates,
    usdtShortfall: draw.shortfall,
    costEur,
    profitEur: amountEur - costEur,
  };
}

export interface PoolPaymentInput {
  amountEur: number;
  /** Snapshot already stored on the sending at creation time. */
  amountVesToPay: number;
  payoutMethod: string;
  /** The ves_sales pool. price = VES per USDT. */
  vesLots: Lot[];
  /** The crypto_purchases pool. price = EUR per USDT. */
  usdtLots: Lot[];
}

/** (a) Pay out of the bolivares already in Jose's Venezuelan account. */
export function computePoolPayment(input: PoolPaymentInput): PaymentResult {
  const { amountEur, amountVesToPay, payoutMethod, vesLots, usdtLots } = input;

  if (!(amountVesToPay > 0)) {
    throw new Error('El envio no tiene bolivares que pagar.');
  }

  const feeApplied = isFeeApplied(payoutMethod);
  const vesToDraw = computeVesToDraw(amountVesToPay, feeApplied);

  const vesDraw = drawFifo(vesLots, vesToDraw, { emptyPoolMessage: EMPTY_VES_POOL });
  // Each VES lot knows what it cost in USDT, so dividing gives the USDT this
  // payout really consumed.
  const usdtUsed = sumAmountDividedByPrice(vesDraw.allocations);

  return {
    feeApplied,
    vesDrawn: vesToDraw,
    vesAllocations: vesDraw.allocations,
    vesLotUpdates: vesDraw.lotUpdates,
    vesShortfall: vesDraw.shortfall,
    ...costUsdtSide(amountEur, usdtUsed, usdtLots),
  };
}

export interface DirectPaymentInput {
  amountEur: number;
  /** The USDT Jose sold straight into the beneficiary's account. */
  usdtSold: number;
  usdtLots: Lot[];
}

/**
 * (b) Sell straight into the beneficiary's account.
 * No VES pool draw and no interbank fee — Jose is giving the real USDT figure.
 */
export function computeDirectPayment(input: DirectPaymentInput): PaymentResult {
  const { amountEur, usdtSold, usdtLots } = input;

  if (!(usdtSold > 0)) {
    throw new Error('Los USDT vendidos deben ser mayores que cero.');
  }

  return {
    feeApplied: false, // nothing moved between banks, so no interbank cost
    vesDrawn: 0,
    vesAllocations: [],
    vesLotUpdates: [],
    vesShortfall: 0,
    ...costUsdtSide(amountEur, usdtSold, usdtLots),
  };
}
