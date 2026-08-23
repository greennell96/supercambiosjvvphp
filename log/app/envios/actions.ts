'use server';

import { revalidatePath } from 'next/cache';

import { parseDecimal, parseId, text } from '@/lib/parse';
import { createSending, type CreateSendingResult } from '@/lib/queries';

export interface NuevoEnvioState {
  error?: string;
  result?: CreateSendingResult;
}

export async function crearEnvioAction(
  _prev: NuevoEnvioState,
  formData: FormData,
): Promise<NuevoEnvioState> {
  const clientId = parseId(formData.get('client_id'));
  const amountEur = parseDecimal(formData.get('amount_eur'));
  const rateTasa = parseDecimal(formData.get('rate_tasa'));
  const payoutMethod = text(formData.get('payout_method'));

  if (!clientId) return { error: 'Elige un cliente de la lista.' };
  if (amountEur === null || !(amountEur > 0)) {
    return { error: 'Escribe un monto en EUR mayor que cero.' };
  }
  if (rateTasa === null || !(rateTasa > 0)) {
    return { error: 'Escribe la tasa EUR/VES de este envío (mayor que cero).' };
  }
  if (!payoutMethod) return { error: 'Elige un método de pago.' };

  try {
    const result = await createSending({
      client_id: clientId,
      amount_eur: amountEur,
      rate_tasa: rateTasa,
      payout_method: payoutMethod,
    });
    revalidatePath('/');
    revalidatePath('/envios');
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el envío.' };
  }
}
