'use server';

import { revalidatePath } from 'next/cache';

import { parseBanks } from '@/lib/banks';
import { parseId, text, textOrNull } from '@/lib/parse';
import { createClient, findClientsByNormalizedPhone, updateClient } from '@/lib/queries';

export interface ClienteState {
  error?: string;
  ok?: { name: string; created: boolean };
  /**
   * A client already on file whose phone normalizes to the same one just
   * typed. Carries only what the warning needs to say who it is; the form's
   * "Guardar de todos modos" button resubmits the same fields plus
   * confirm_duplicate to write anyway.
   */
  duplicate?: { name: string };
}

export async function guardarClienteAction(
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const id = parseId(formData.get('id')); // absent when adding
  const name = text(formData.get('name'));
  const phone = textOrNull(formData.get('phone'));
  // Checkboxes over bankOptions() plus whatever was typed into "Otro",
  // appended — same idea as parseBanks splitting a free-text field, just
  // with most of the list already picked from checkboxes instead of typed.
  const checkedBanks = formData.getAll('banks').map((value) => String(value));
  const otroBanks = parseBanks(text(formData.get('banks_otro')));
  const banks = [...new Set([...checkedBanks, ...otroBanks])];
  const dniNie = textOrNull(formData.get('dni_nie'));
  const confirmDuplicate = text(formData.get('confirm_duplicate')) === '1';

  if (!name) return { error: 'El nombre es obligatorio.' };

  try {
    // A client with no usable phone gets no check: there is nothing to
    // compare (see lib/phone.ts, the fewer-than-6-digits floor).
    //
    // This is deliberately a warning with an override, not a database
    // constraint. A read-only survey of the 664 imported rows on 2026-09-04
    // found 3 phone collisions, and at least 2 of them are legitimate —
    // different people sharing one household number. A hard unique index
    // would reject those outright; this stops the accidental re-registration
    // while still letting "Guardar de todos modos" through for the real
    // case. Do not turn this into a constraint.
    if (phone && !confirmDuplicate) {
      const matches = await findClientsByNormalizedPhone(phone, id ?? undefined);
      if (matches.length > 0) {
        return { duplicate: { name: matches[0].name } };
      }
    }

    if (id) {
      await updateClient(id, { name, phone, banks, dni_nie: dniNie });
    } else {
      await createClient({ name, phone, banks, dni_nie: dniNie });
    }
    revalidatePath('/clientes');
    revalidatePath('/envios');
    revalidatePath('/codigos');
    revalidatePath('/stats');
    return { ok: { name, created: !id } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el cliente.' };
  }
}
