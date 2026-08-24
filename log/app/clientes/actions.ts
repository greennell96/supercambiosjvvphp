'use server';

import { revalidatePath } from 'next/cache';

import { parseBanks } from '@/lib/banks';
import { parseId, text, textOrNull } from '@/lib/parse';
import { createClient, updateClient } from '@/lib/queries';

export interface ClienteState {
  error?: string;
  ok?: { name: string; created: boolean };
}

export async function guardarClienteAction(
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const id = parseId(formData.get('id')); // absent when adding
  const name = text(formData.get('name'));
  const phone = textOrNull(formData.get('phone'));
  const banks = parseBanks(text(formData.get('banks')));
  const dniNie = textOrNull(formData.get('dni_nie'));

  if (!name) return { error: 'El nombre es obligatorio.' };

  try {
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
