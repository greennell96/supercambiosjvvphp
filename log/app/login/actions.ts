'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { text } from '@/lib/parse';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  getSessionSecret,
  isCorrectPassword,
} from '@/lib/session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = text(formData.get('password'));
  if (!password) return { error: 'Escribe la contraseña.' };

  let ok = false;
  try {
    ok = isCorrectPassword(password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error de configuración.' };
  }
  if (!ok) return { error: 'Contraseña incorrecta.' };

  const token = await createSessionToken(getSessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  redirect('/');
}
