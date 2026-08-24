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

/** A lot in the VES pool. price = VES per USDT. */
export interface VesSale {
  id: number;
  sold_at: Date;
  usdt_sold: number;
  ves_received: number;
  price_ves_per_usdt: number;
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
 *   CODIGO — a cash-collection code, which can be linked to the codigos row it
 *            was issued as (see Codigo.sending_id).
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
  client_id: number;
  client_name: string;
  created_at: Date;
  amount_eur: number;
  payout_method: string;
  status: SendingStatus;
  paid_at: Date | null;
  rate_tasa: number;
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
  profit_eur: number | null;
}

export type CodigoStatus = 'pendiente' | 'retirado';

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
   * The sending this codigo paid for, when Jose linked one. A linked codigo is
   * the client's proof of payment for that sending, which is why deleting the
   * codigo puts the sending back to unpaid-by-client.
   *
   * The two joined fields are only there to name the sending on screen.
   */
  sending_id: number | null;
  sending_client_name: string | null;
  sending_amount_eur: number | null;
}
