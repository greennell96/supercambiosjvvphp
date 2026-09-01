'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text } from '@/lib/parse';
import { confirmarRetiroDia, createRetiroEntrega, voidRetiroEntrega } from '@/lib/queries';

export interface ConfirmarRetiroState {
  error?: string;
  /**
   * Timestamp of the last successful confirmation, not a boolean: the inline
   * form watches this to close itself, and confirming the same día twice in a
   * row — which is the whole point of the "volver a confirmar" control — has to
   * look different to it.
   */
  savedAt?: number;
}

/**
 * Confirm what actually came out of the cajero on one día.
 *
 * The día is validated as a shape and then handed over as a key, never parsed
 * into a Date here: it is a Europe/Madrid calendar day, lib/day-buckets.ts is
 * what produced it, and turning it into an instant on the way past is how a
 * confirmation would end up filed against the day before.
 *
 * Zero is accepted and only negatives are refused. A día on which nothing was
 * withdrawn is a real answer, and being able to say "I checked, there was
 * nothing" is worth more than the field being non-empty.
 *
 * The system total is not read from the form at all — lib/queries.ts recomputes
 * it inside the transaction, so what is stored is what the códigos said at the
 * moment of confirming rather than what the page happened to be showing.
 */
export async function confirmarRetiroAction(
  _prev: ConfirmarRetiroState,
  formData: FormData,
): Promise<ConfirmarRetiroState> {
  const day = text(formData.get('day'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: 'Día no válido.' };

  const countedEur = parseDecimal(formData.get('counted_eur'));
  if (countedEur === null || countedEur < 0) {
    return { error: 'Escribe cuánto retiraste (cero o más).' };
  }

  try {
    await confirmarRetiroDia(day, countedEur);
    revalidatePath('/stats');
    // The counted amount IS a caja entry, so the balance and the journal move
    // with it. Nothing else in the app reads a confirmation.
    revalidatePath('/caja');
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo confirmar el retiro.' };
  }
}

export interface EntregarDineroState {
  error?: string;
  /** Same timestamp-not-boolean as above: the inline form watches it to close. */
  savedAt?: number;
}

/**
 * A runner handed cash over.
 *
 * The mirror image of confirmarRetiroAction beside it, with one deliberate
 * difference in what it accepts. That one takes zero, because "I checked and
 * nothing came out" is a real answer about a día. This one refuses it: an
 * entrega of nothing is not an event, it is a row that would sit in the libro de
 * caja saying zero euros arrived.
 *
 * Nothing is capped at the saldo either. A partial delivery is the normal case,
 * and one bigger than what he owed is an advance that shows as a negative saldo
 * — see buildAgenteSaldos for why that is reported rather than clamped.
 */
export async function entregarDineroAction(
  _prev: EntregarDineroState,
  formData: FormData,
): Promise<EntregarDineroState> {
  const agenteId = parseId(formData.get('agente_id'));
  if (!agenteId) return { error: 'No sé de quién es esta entrega.' };

  const amountEur = parseDecimal(formData.get('amount_eur'));
  if (amountEur === null || !(amountEur > 0)) {
    return { error: 'Escribe cuánto entregó (mayor que cero).' };
  }

  const expectedSaldoEur = parseDecimal(formData.get('expected_saldo_eur'));
  if (expectedSaldoEur === null) return { error: 'El saldo esperado no es válido.' };

  const operationKey = text(formData.get('operation_key'));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationKey)) {
    return { error: 'La entrega no tiene un identificador válido. Vuelve a abrir el formulario.' };
  }

  try {
    await createRetiroEntrega(agenteId, amountEur, expectedSaldoEur, operationKey);
    revalidatePath('/stats');
    // The entrega IS a caja entry: this is the only way a runner's cash ever
    // reaches the balance, since his códigos were excluded from the retiro.
    revalidatePath('/caja');
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la entrega.' };
  }
}

/** Void a mistyped delivery while preserving its audit row. */
export async function anularEntregaAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const entregaId = parseId(formData.get('id'));
  if (!entregaId) return { error: 'Entrega no válida.' };

  try {
    await voidRetiroEntrega(entregaId);
    revalidatePath('/stats');
    revalidatePath('/caja');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo anular la entrega.' };
  }
}
