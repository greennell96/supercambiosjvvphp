'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text, textOrNull } from '@/lib/parse';
import { createPurchase, deleteCompra } from '@/lib/queries';

export interface NuevaCompraState {
  error?: string;
  ok?: {
    eurPaid: number;
    usdtReceived: number;
    priceEurPerUsdt: number;
    usedToPayBackorders: number;
    remainingForNewLot: number;
    /** Echoed back so the receipt says the euros left the caja, not just a bank. */
    paidFromCash: boolean;
  };
}

export async function crearCompraAction(
  _prev: NuevaCompraState,
  formData: FormData,
): Promise<NuevaCompraState> {
  const eurPaid = parseDecimal(formData.get('eur_paid'));
  const usdtReceived = parseDecimal(formData.get('usdt_received'));
  const provider = textOrNull(formData.get('provider'));
  const purchasedAtRaw = text(formData.get('purchased_at'));
  // An unchecked checkbox is simply absent from the FormData, which is exactly
  // "no, this did not come out of the pocket".
  const paidFromCash = text(formData.get('paid_from_cash')) === '1';

  if (eurPaid === null || !(eurPaid > 0)) {
    return { error: 'Escribe los EUR pagados (mayor que cero).' };
  }
  if (usdtReceived === null || !(usdtReceived > 0)) {
    return { error: 'Escribe los USDT recibidos (mayor que cero).' };
  }

  const purchasedAt = purchasedAtRaw ? new Date(purchasedAtRaw) : new Date();
  if (Number.isNaN(purchasedAt.getTime())) {
    return { error: 'La fecha de la compra no es válida.' };
  }

  try {
    // The price is derived server-side from these two numbers; it is never
    // taken from the form.
    const created = await createPurchase({
      eur_paid: eurPaid,
      usdt_received: usdtReceived,
      provider,
      purchased_at: purchasedAt,
      paid_from_cash: paidFromCash,
    });
    revalidatePath('/');
    revalidatePath('/compras');
    revalidatePath('/stats');
    // Revalidated whether or not this one came out of the caja: the flag is read
    // live by the journal, and getting that wrong in one branch would leave a
    // stale balance on screen exactly when it matters.
    revalidatePath('/caja');
    return {
      ok: {
        eurPaid,
        usdtReceived,
        priceEurPerUsdt: created.priceEurPerUsdt,
        usedToPayBackorders: created.usedToPayBackorders,
        remainingForNewLot: created.remainingForNewLot,
        paidFromCash,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar la compra.' };
  }
}

/**
 * Delete a purchase typed in by mistake.
 *
 * Only while nothing has drawn from it: lib/queries.ts decides that and answers
 * with the reason, which is shown next to the row.
 *
 * Nothing here undoes a caja outflow, and nothing should: the journal reads
 * paid_from_cash live off this row, so deleting the row takes its line with it.
 */
export async function eliminarCompraAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const purchaseId = parseId(formData.get('id'));
  if (!purchaseId) return { error: 'Compra no válida.' };

  try {
    await deleteCompra(purchaseId);
    revalidatePath('/');
    revalidatePath('/compras');
    revalidatePath('/stats');
    revalidatePath('/caja');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la compra.' };
  }
}
