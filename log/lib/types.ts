/** Row shapes as the app uses them: numerics already converted to JS numbers. */

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  banks: string[];
  dni_nie: string | null;
  registered_at: Date | null;
}

/** A lot in the USDT pool. price = EUR per USDT, derived from the raw pair. */
export interface CryptoPurchase {
  id: number;
  purchased_at: Date;
  eur_paid: number;
  usdt_received: number;
  price_eur_per_usdt: number;
  provider: string | null;
  remaining_usdt: number;
}

export type VesSaleSource = 'binance' | 'ves_to_eur';

/**
 * A lot in the VES pool. Binance rows came from USDT; VES -> EUR rows carry
 * their agreed EUR cost directly and never touch the USDT pool.
 */
export interface VesSale {
  id: number;
  sold_at: Date;
  source_type: VesSaleSource;
  usdt_sold: number | null;
  ves_received: number;
  price_ves_per_usdt: number | null;
  eur_amount: number | null;
  note: string;
  eur_settled_at: Date | null;
  remaining_ves: number;
}

/** Only a suggested default for the tasa input. Never authoritative. */
export interface CurrentRates {
  tasa_eur_ves: number;
  updated_at: Date;
}

export type SendingStatus = 'pending' | 'paid';

/** How a paid sending was funded. */
export type PaidVia = 'pool' | 'direct';

/**
 * How the client handed Jose the money here in Spain. Jose's own six options,
 * in the order he lists them.
 *
 * This is the OTHER side of a sending from `status`, which is only ever about
 * Jose paying the beneficiary in Venezuela, and the two are independent. Nothing
 * here feeds the money math — it is status tracking, like client_payment_note.
 *
 *   CODIGO — a cash-collection code, which can be linked to the payment group
 *            it proves (see Codigo.sending_group_id).
 *   OTRO   — the free-input one: whatever Jose types goes into
 *            client_payment_note, which already exists for exactly that.
 */
export const CLIENT_PAYMENT_METHODS = [
  'CODIGO',
  'EFECTIVO',
  'CARREFOUR',
  'BIZUM',
  'A_CLIENTE',
  'OTRO',
] as const;

export type ClientPaymentMethod = (typeof CLIENT_PAYMENT_METHODS)[number];

/**
 * What each one is called on screen. Kept beside the values, and typed as a
 * total Record, so a seventh method cannot be added without its label.
 */
export const CLIENT_PAYMENT_METHOD_LABELS: Record<ClientPaymentMethod, string> = {
  CODIGO: 'Código',
  EFECTIVO: 'Efectivo',
  CARREFOUR: 'Carrefour',
  BIZUM: 'Bizum',
  A_CLIENTE: 'A cliente',
  OTRO: 'Otro',
};

/** Guard for the one value that arrives as raw form text. */
export function isClientPaymentMethod(value: string): value is ClientPaymentMethod {
  return (CLIENT_PAYMENT_METHODS as readonly string[]).includes(value);
}

export interface Sending {
  id: number;
  /** Shared client-payment identity. Split payout rows carry the same UUID. */
  payment_group_id: string;
  client_id: number;
  client_name: string;
  created_at: Date;

  /**
   * An "envío propio": money Jose sent to his own family, not for a client.
   *
   * Same lifecycle and the same pool draw as any other sending — it is real
   * money leaving the real pools — but there is no client side to it, so
   * amount_eur, rate_tasa and profit_eur are null and stay null. See
   * migration 014.
   */
  is_personal: boolean;

  /** Who the money went to ("a mi hermana"). Only ever set on a propio. */
  personal_note: string | null;

  /**
   * What the client handed over. Null on an envío propio: no client agreed an
   * amount, so there is no revenue — not zero revenue.
   */
  amount_eur: number | null;
  payout_method: string;
  status: SendingStatus;
  paid_at: Date | null;
  /** The tasa agreed for this transfer. Null on an envío propio: none was. */
  rate_tasa: number | null;
  amount_ves_to_pay: number;

  /**
   * How the client handed the money over in Spain (codigo de cajero, efectivo,
   * transferencia...). Free text, never used in any calculation, and editable
   * even after the sending is paid.
   */
  client_payment_note: string | null;

  /**
   * When the CLIENT paid Jose, and with which of the six methods. Null on both
   * while the client still owes.
   *
   * Independent of `status` and `paid_at`, which are about Jose paying the
   * beneficiary: neither side waits for the other.
   */
  client_paid_at: Date | null;
  client_payment_method: ClientPaymentMethod | null;

  // Null until the sending is paid.
  paid_via: PaidVia | null;
  fee_applied: boolean | null;
  usdt_used: number | null;
  cost_eur: number | null;
  /** Also null forever on an envío propio, whatever its status. */
  profit_eur: number | null;
}

export type CodigoStatus = 'pendiente' | 'retirado';

/**
 * Somebody who can retire a codigo on Jose's behalf and hold the cash until he
 * hands it over. A row rather than free text, so a name is an identity a saldo
 * can be attached to; see migration 016.
 */
export interface RetiroAgente {
  id: number;
  name: string;
}

/** One recorded hand-off from a runner to Jose. */
export interface RetiroEntrega {
  id: number;
  agente_id: number;
  agente_name: string;
  amount_eur: number;
  delivered_at: Date;
  /** A void keeps the audit record but removes the money from saldo and caja. */
  voided_at: Date | null;
}

/**
 * Who retired a codigo, when it was not Jose himself.
 *
 *   null          — Jose. Cash straight into the pocket, counted into la caja
 *                   through the confirmacion de retiros like it always was.
 *   runner        — a retiro_agentes row is holding it. Out of la caja until an
 *                   entrega says it arrived.
 *   crypto_seller — it paid a USDT provider at the cajero. Never in the pocket,
 *                   so out of la caja for good; informational only.
 */
export type RetiradoPorKind = 'runner' | 'crypto_seller';

export interface Codigo {
  id: number;
  client_id: number;
  client_name: string;
  client_dni_nie: string | null;
  client_phone: string | null;
  /** The code itself. '' on rows logged before the column existed. */
  code: string;
  amount: number;
  bank: string;
  status: CodigoStatus;
  created_at: Date;
  retired_at: Date | null;

  /**
   * Who took the money out, when it was not Jose. Null on every codigo he
   * retired himself, which is the normal case and the one that feeds la caja.
   *
   * retirado_por_agente_nombre is a read-only joined copy, exactly like the
   * sending_* fields below: it exists so /codigos can name the runner in the
   * row instead of only holding his id, and nothing is ever written through it.
   */
  retirado_por_kind: RetiradoPorKind | null;
  retirado_por_agente_id: number | null;
  retirado_por_agente_nombre: string | null;

  /**
   * The representative sending and shared payment group this codigo paid for.
   * Deleting the codigo puts every surviving sibling back to unpaid-by-client.
   *
   * The joined fields are read-only copies, only ever there to show that sending
   * inside /codigos instead of sending Jose over to /envios to find it. Nothing
   * is calculated from them.
   */
  sending_id: number | null;
  sending_group_id: string | null;
  sending_client_name: string | null;
  sending_amount_eur: number | null;
  sending_rate_tasa: number | null;
  sending_amount_ves_to_pay: number | null;
  sending_payout_method: string | null;
  sending_status: SendingStatus | null;
}

/** One realized earnings bucket, grouped by paid_at in Europe/Madrid. */
export interface StatsPeriod {
  period: string;
  paid_count: number;
  revenue_eur: number;
  cost_eur: number;
  profit_eur: number;
  ves_paid: number;
  usdt_used: number;
  pool_count: number;
  direct_count: number;
}

export interface StatsFunding {
  paid_via: PaidVia;
  paid_count: number;
  revenue_eur: number;
  cost_eur: number;
  profit_eur: number;
}

export interface StatsClient {
  client_id: number;
  client_name: string;
  paid_count: number;
  revenue_eur: number;
  profit_eur: number;
}

export interface StatsCodeBank {
  bank: string;
  pending_count: number;
  amount_eur: number;
}

export interface StatsSnapshot {
  current: {
    crypto_balance_usdt: number;
    ves_pool_balance: number;
    pending_payout_ves: number;
    pending_payout_count: number;
    uncollected_eur: number;
    uncollected_count: number;
    pending_codes_eur: number;
    pending_codes_count: number;
    unsettled_ves_eur: number;
    unsettled_ves_eur_count: number;
  };
  earnings: {
    revenue_eur: number;
    cost_eur: number;
    profit_eur: number;
    paid_count: number;
    today_profit_eur: number;
    month_profit_eur: number;
    negative_profit_count: number;
  };
  inventory: {
    purchase_eur: number;
    purchased_usdt: number;
    weighted_purchase_price: number | null;
    binance_ves: number;
    binance_usdt: number;
    binance_eur_cost: number;
    direct_ves: number;
    direct_eur_cost: number;
    active_usdt_lots: number;
    active_ves_lots: number;
    backordered_usdt_lots: number;
    backordered_ves_lots: number;
  };
  monthly: StatsPeriod[];
  daily: StatsPeriod[];
  funding: StatsFunding[];
  top_clients: StatsClient[];
  pending_codes_by_bank: StatsCodeBank[];
  zero_cost_paid_sendings: number;
}
