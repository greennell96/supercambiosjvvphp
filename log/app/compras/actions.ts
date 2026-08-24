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
    });
    revalidatePath('/');
    revalidatePath('/compras');
    return {
      ok: {
        eurPaid,
        usdtReceived,
        priceEurPerUsdt: created.priceEurPerUsdt,
        usedToPayBackorders: created.usedToPayBackorders,
        remainingForNewLot: created.remainingForNewLot,
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
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la compra.' };
  }
}
