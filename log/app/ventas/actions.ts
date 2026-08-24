'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text } from '@/lib/parse';
import {
  createVesSale,
  createVesToEur,
  deleteVenta,
  markVesToEurSettled,
} from '@/lib/queries';

type NuevaVentaOk =
  | {
      sourceType: 'binance';
      vesReceived: number;
      price: number;
      usedToPayBackorders: number;
      remainingForNewLot: number;
    }
  | {
      sourceType: 'ves_to_eur';
      vesReceived: number;
      eurAmount: number;
      price: number;
      eurPaid: boolean;
      usedToPayBackorders: number;
      remainingForNewLot: number;
    };

export interface NuevaVentaState {
  error?: string;
  ok?: NuevaVentaOk;
}

export async function crearVentaAction(
  _prev: NuevaVentaState,
  formData: FormData,
): Promise<NuevaVentaState> {
  const sourceType = text(formData.get('source_type'));
  const vesReceived = parseDecimal(formData.get('ves_received'));
  const soldAtRaw = text(formData.get('sold_at'));

  if (sourceType !== 'binance' && sourceType !== 'ves_to_eur') {
    return { error: 'Elige el tipo de entrada.' };
  }
  if (vesReceived === null || !(vesReceived > 0)) {
    return { error: 'Escribe los bolívares recibidos (mayor que cero).' };
  }

  const soldAt = soldAtRaw ? new Date(soldAtRaw) : new Date();
  if (Number.isNaN(soldAt.getTime())) {
    return { error: 'La fecha de la venta no es válida.' };
  }

  try {
    if (sourceType === 'ves_to_eur') {
      const eurAmount = parseDecimal(formData.get('eur_amount'));
      const eurStatus = text(formData.get('eur_status'));
      if (eurAmount === null || !(eurAmount > 0)) {
        return { error: 'Escribe los EUR acordados (mayor que cero).' };
      }
      if (eurStatus !== 'pending' && eurStatus !== 'paid') {
        return { error: 'Indica si los EUR están pendientes o pagados.' };
      }

      const created = await createVesToEur({
        eur_amount: eurAmount,
        ves_received: vesReceived,
        note: text(formData.get('note')),
        eur_paid: eurStatus === 'paid',
        sold_at: soldAt,
      });
      revalidatePath('/');
      revalidatePath('/ventas');
      return {
        ok: {
          sourceType,
          vesReceived,
          eurAmount,
          price: created.priceVesPerEur,
          eurPaid: eurStatus === 'paid',
          usedToPayBackorders: created.usedToPayBackorders,
          remainingForNewLot: created.remainingForNewLot,
        },
      };
    }

    const usdtSold = parseDecimal(formData.get('usdt_sold'));
    if (usdtSold === null || !(usdtSold > 0)) {
      return { error: 'Escribe los USDT vendidos (mayor que cero).' };
    }
    const created = await createVesSale({
      usdt_sold: usdtSold,
      ves_received: vesReceived,
      sold_at: soldAt,
    });
    revalidatePath('/');
    revalidatePath('/ventas');
    return {
      ok: {
        sourceType,
        vesReceived,
        price: vesReceived / usdtSold,
        usedToPayBackorders: created.usedToPayBackorders,
        remainingForNewLot: created.remainingForNewLot,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar la venta.' };
  }
}

export async function marcarEurPagadoAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const saleId = parseId(formData.get('id'));
  if (!saleId) return { error: 'Entrada no válida.' };

  try {
    await markVesToEurSettled(saleId);
    revalidatePath('/ventas');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo marcar como pagado.' };
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
