'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text } from '@/lib/parse';
import { createVesSale, deleteVenta } from '@/lib/queries';

export interface NuevaVentaState {
  error?: string;
  ok?: {
    vesReceived: number;
    pricePerUsdt: number;
    usedToPayBackorders: number;
    remainingForNewLot: number;
  };
}

export async function crearVentaAction(
  _prev: NuevaVentaState,
  formData: FormData,
): Promise<NuevaVentaState> {
  const usdtSold = parseDecimal(formData.get('usdt_sold'));
  const vesReceived = parseDecimal(formData.get('ves_received'));
  const soldAtRaw = text(formData.get('sold_at'));

  if (usdtSold === null || !(usdtSold > 0)) {
    return { error: 'Escribe los USDT vendidos (mayor que cero).' };
  }
  if (vesReceived === null || !(vesReceived > 0)) {
    return { error: 'Escribe los bolívares recibidos (mayor que cero).' };
  }

  const soldAt = soldAtRaw ? new Date(soldAtRaw) : new Date();
  if (Number.isNaN(soldAt.getTime())) {
    return { error: 'La fecha de la venta no es válida.' };
  }

  try {
    const created = await createVesSale({
      usdt_sold: usdtSold,
      ves_received: vesReceived,
      sold_at: soldAt,
    });
    revalidatePath('/');
    revalidatePath('/ventas');
    return {
      ok: {
        vesReceived,
        pricePerUsdt: vesReceived / usdtSold,
        usedToPayBackorders: created.usedToPayBackorders,
        remainingForNewLot: created.remainingForNewLot,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar la venta.' };
  }
}

/**
 * Delete a sale typed in by mistake.
 *
 * Only while no sending has been paid out of it: lib/queries.ts decides that and
 * answers with the reason, which is shown next to the row. When it goes through,
 * the USDT it gave up go back into the compras pool, so that list is revalidated
 * too.
 */
export async function eliminarVentaAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const saleId = parseId(formData.get('id'));
  if (!saleId) return { error: 'Venta no válida.' };

  try {
    await deleteVenta(saleId);
    revalidatePath('/');
    revalidatePath('/ventas');
    revalidatePath('/compras');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la venta.' };
  }
}
