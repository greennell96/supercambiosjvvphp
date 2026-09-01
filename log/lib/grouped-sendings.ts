/** Pure creation rules for one client obligation paid out in one or more parts. */

import {
  SENDING_PAYOUT_METHODS,
  computeNewSending,
  type SendingPayoutMethod,
} from './pricing';

export interface AdditionalSendingPart {
  amountEur: number;
  payoutMethod: SendingPayoutMethod;
}

export interface CreatedSendingPart extends AdditionalSendingPart {
  amountVesToPay: number;
}

/** Matches sendings.amount_eur numeric(20, 8). Inputs are positive EUR. */
const AMOUNT_SCALE = 100_000_000;

function amountUnits(value: number): bigint {
  const scaled = Math.round(value * AMOUNT_SCALE);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error('El monto del envío es demasiado grande o preciso.');
  }
  return BigInt(scaled);
}

function unitsAmount(value: bigint): number {
  return Number(value) / AMOUNT_SCALE;
}

function validMethod(value: string): value is SendingPayoutMethod {
  return (SENDING_PAYOUT_METHODS as readonly string[]).includes(value);
}

/**
 * Turn the total agreed EUR into the rows that will actually be paid.
 *
 * The main form keeps the original payout method. Every "Dividir" row peels a
 * known EUR amount into its own method, and the first row receives the exact
 * remainder. The strict-less-than rule prevents a zero-EUR first row.
 */
export function computeCreatedSendingParts(input: {
  totalAmountEur: number;
  rateTasa: number;
  primaryPayoutMethod: SendingPayoutMethod;
  additionalParts: readonly AdditionalSendingPart[];
}): CreatedSendingPart[] {
  if (!(input.totalAmountEur > 0)) {
    throw new Error('El monto total del envío debe ser mayor que cero.');
  }
  if (!(input.rateTasa > 0)) {
    throw new Error('La tasa EUR/VES debe ser mayor que cero.');
  }
  if (!validMethod(input.primaryPayoutMethod)) {
    throw new Error('Elige un método de pago válido para la primera parte.');
  }

  const totalUnits = amountUnits(input.totalAmountEur);
  if (totalUnits <= 0n) {
    throw new Error('El monto total del envío debe ser mayor que cero.');
  }

  let additionalUnits = 0n;
  for (const part of input.additionalParts) {
    const partUnits = amountUnits(part.amountEur);
    if (!(part.amountEur > 0) || partUnits <= 0n) {
      throw new Error('Cada parte separada debe tener un monto mayor que cero.');
    }
    if (!validMethod(part.payoutMethod)) {
      throw new Error('Elige un método de pago válido para cada parte.');
    }
    additionalUnits += partUnits;
  }

  if (input.additionalParts.length > 0 && additionalUnits >= totalUnits) {
    throw new Error('Las partes separadas deben sumar menos que el monto total del envío.');
  }

  const primaryAmount = unitsAmount(totalUnits - additionalUnits);
  const rawParts: AdditionalSendingPart[] = [
    { amountEur: primaryAmount, payoutMethod: input.primaryPayoutMethod },
    ...input.additionalParts,
  ];

  return rawParts.map((part) => ({
    ...part,
    amountVesToPay: computeNewSending({
      amountEur: part.amountEur,
      rateTasa: input.rateTasa,
    }).amountVesToPay,
  }));
}
