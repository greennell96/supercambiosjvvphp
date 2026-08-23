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
  amount: number;
  bank: string;
  status: CodigoStatus;
  created_at: Date;
  retired_at: Date | null;
}
