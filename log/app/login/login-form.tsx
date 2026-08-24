'use client';

import { useActionState } from 'react';

import { loginAction, type LoginState } from './actions';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction}>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoFocus autoComplete="current-password" />
      </div>
      <button className="primary" type="submit" disabled={pending}>
        Entrar
      </button>
    </form>
  );
}
