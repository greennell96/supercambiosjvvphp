'use client';

import { useActionState, useState } from 'react';

import { updateRatesAction, type RatesState } from './actions';
import { fmtDateTime, fmtEur, fmtPercent, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { parseDecimal } from '@/lib/parse';
import { computeRatePreview, type RatePreview } from '@/lib/rate-preview';

/**
 * The suggested tasa, and a calculator for choosing it.
 *
 * SAVING is unchanged and deliberately so: the tasa box posts to
 * updateRatesAction, which stores it, and that stored value does nothing on its
 * own except prefill the tasa on "Nuevo envío" — where it stays editable, and
 * where logging a sending overwrites it with whatever was actually typed.
 *
 * What is new is everything BELOW the button. José used to pick the day's tasa
 * in his head against a Binance price on another screen. Now he types that price
 * here, and the panel prices his whole USDT pool at it: what selling the lot
 * would raise, how much of that he could send out at the tasa in the box, what
 * the USDT cost him, and so what he would keep.
 *
 * It recomputes as he types — the point is to retype the tasa a few times and
 * watch the margin move — so the arithmetic is client-side and hits nothing.
 * The two numbers it needs from the database, the pool's size and the pool's
 * cost, arrive once as props from the server component.
 *
 * The Binance price is NOT stored anywhere and is not meant to be. This app has
 * no price feed; the number is only true for the minute he read it off the
 * screen, so it is typed fresh each time and gone on reload. Saving it would
 * mean showing a stale price as though it were current.
 */
export default function RatesForm({
  tasa,
  updatedAt,
  poolUsdt,
  poolCostEurPerUsdt,
}: {
  tasa: number;
  updatedAt: Date;
  /** Pool size, from getDashboardTotals. Negative means USDT spent but unbought. */
  poolUsdt: number;
  /** Weighted cost of the lots still holding something. Null = nothing in the pool. */
  poolCostEurPerUsdt: number | null;
}) {
  const [state, formAction, pending] = useActionState<RatesState, FormData>(updateRatesAction, {});

  // The tasa box is controlled now, because the calculator has to see it change.
  // It is still the field that gets submitted, and it still starts at the saved
  // value, so nothing about saving is different.
  const [tasaText, setTasaText] = useState(tasa ? String(tasa) : '');
  const [binanceText, setBinanceText] = useState('');

  const binanceVesPerUsdt = parseDecimal(binanceText);
  const preview = computeRatePreview({
    poolUsdt,
    poolCostEurPerUsdt,
    binanceVesPerUsdt,
    candidateTasaVesPerEur: parseDecimal(tasaText),
  });

  return (
    <>
      <form action={formAction} aria-busy={pending}>
        {state.error ? <p className="notice error">{state.error}</p> : null}
        {state.ok ? <p className="notice ok">Tasa sugerida actualizada.</p> : null}
        <div className="form-row">
          <div>
            <label htmlFor="tasa_eur_ves">Tasa sugerida EUR → Bs</label>
            <input
              id="tasa_eur_ves"
              name="tasa_eur_ves"
              type="text"
              inputMode="decimal"
              value={tasaText}
              onChange={(e) => setTasaText(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="precio_binance">Precio Binance actual (Bs/USDT)</label>
            {/*
              No `name`, on purpose. Without one the browser leaves it out of the
              FormData entirely, so "Guardar sugerencia" posts exactly the one
              field it always posted and this price cannot reach the server even
              by accident.
            */}
            <input
              id="precio_binance"
              type="text"
              inputMode="decimal"
              value={binanceText}
              onChange={(e) => setBinanceText(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar sugerencia'}
            </button>
          </div>
        </div>
        <p className="muted">Actualizada {fmtDateTime(updatedAt)}</p>
      </form>

      <PoolMargin
        preview={preview}
        poolUsdt={poolUsdt}
        poolCostEurPerUsdt={poolCostEurPerUsdt}
        binanceVesPerUsdt={binanceVesPerUsdt}
      />
    </>
  );
}

/**
 * What the tasa in the box would earn on the pool as it stands.
 *
 * Five rows and no chart: the middle three are what make the last two legible.
 * Reading it top to bottom is the calculation itself — sell this much, fund this
 * many envíos, having paid this much, keep the difference.
 */
function PoolMargin({
  preview,
  poolUsdt,
  poolCostEurPerUsdt,
  binanceVesPerUsdt,
}: {
  preview: RatePreview | null;
  poolUsdt: number;
  poolCostEurPerUsdt: number | null;
  binanceVesPerUsdt: number | null;
}) {
  // Both prices are required, so until both are typed there is nothing honest to
  // show. Saying so beats blanks, which read as a broken panel.
  if (!preview || binanceVesPerUsdt === null) {
    return (
      <p className="muted rate-preview-hint">
        Escribe el precio de Binance y una tasa para ver qué te dejaría todo el pool.
      </p>
    );
  }

  const profitClass =
    preview.profitEur === null
      ? undefined
      : preview.profitEur < 0
        ? 'negative-value'
        : 'profit-value';

  return (
    <div className="rate-preview">
      <p className="rate-preview-meta">
        Vendiendo {fmtUsdt(poolUsdt)} a {fmtRate(binanceVesPerUsdt)} Bs/USDT
        {poolCostEurPerUsdt === null ? null : <> · coste medio {fmtEur(poolCostEurPerUsdt)}/USDT</>}
      </p>

      <dl>
        <div>
          <dt>Bolívares que sacas</dt>
          <dd>{fmtVes(preview.vesObtainable)}</dd>
        </div>
        <div>
          <dt>Envíos que cubren</dt>
          <dd>{fmtEur(preview.eurSendable)}</dd>
        </div>
        <div>
          <dt>Te costaron</dt>
          <dd>{preview.costEur === null ? '—' : fmtEur(preview.costEur)}</dd>
        </div>
        <div className="rate-preview-total">
          <dt>Ganancia</dt>
          <dd className={profitClass}>
            {preview.profitEur === null ? '—' : fmtEur(preview.profitEur)}
          </dd>
        </div>
        <div className="rate-preview-total">
          <dt>Margen</dt>
          <dd className={profitClass}>{fmtPercent(preview.marginPct)}</dd>
        </div>
      </dl>

      {preview.costEur === null ? (
        <p className="muted rate-preview-note">
          Sin compras activas en el pool: no hay coste con el que comparar, así que no hay ganancia
          ni margen que calcular.
        </p>
      ) : null}

      {poolUsdt < 0 ? (
        <p className="muted rate-preview-note">
          Saldo de cripto negativo: son USDT ya gastados que aún no has comprado, por eso las cifras
          salen en negativo.
        </p>
      ) : null}
    </div>
  );
}
