'use client';

import { useActionState, useRef, useState, useTransition } from 'react';

import {
  previewPagoDirectoAction,
  previewPagoPoolAction,
  type PreviewPagoState,
} from '../envios/actions';
import {
  paySendingDirectAction,
  paySendingPoolAction,
  paySendingUsdtAction,
  type PayState,
} from '../actions';
import { fmtEur, fmtUsdt, fmtVes } from '@/lib/format';
import { parseDecimal } from '@/lib/parse';

/**
 * The two ways to settle a pending sending.
 *
 *  - "Marcar pagado (pool)" is one click: the bolivares come out of the account,
 *    and how much to draw was already fixed when the sending was logged.
 *  - "Marcar pagado (directo)" opens one small field, because only Jose knows
 *    how much USDT he sold straight into the beneficiary's account.
 *
 * An ENVIO PROPIO gets one thing more: a preview of what paying would cost,
 * first. A client sending already shows its EUR amount and tasa on the row, so
 * the cost is roughly known before the click; a propio shows neither, because
 * neither exists, and until now nothing said what it would cost until it had
 * already been paid. So on those rows the pool button reveals the figures and
 * asks again, in the same reveal-then-confirm shape "Pagar directo" already
 * uses. Nothing about the client path changes.
 *
 * An ENVIO USDT gets a third shape instead, simpler than either: one form, one
 * "Pagar con USDT" button, no pool button and no "Pagar directo" box. There is
 * nothing to type and nothing to preview — the amount was fixed when the
 * sending was logged (usdt_to_deliver, see migration 020) — so this is a
 * single click, exactly like the pool button on a client sending.
 */
export default function PaySendingActions({
  sendingId,
  isPersonal = false,
  isUsdt = false,
}: {
  sendingId: number;
  isPersonal?: boolean;
  isUsdt?: boolean;
}) {
  const [poolState, poolAction, poolPending] = useActionState<PayState, FormData>(
    paySendingPoolAction,
    {},
  );
  const [directState, directAction, directPending] = useActionState<PayState, FormData>(
    paySendingDirectAction,
    {},
  );
  const [usdtState, usdtAction, usdtPending] = useActionState<PayState, FormData>(
    paySendingUsdtAction,
    {},
  );
  const [showDirect, setShowDirect] = useState(false);

  if (isUsdt) {
    return (
      <div className="pay-actions">
        <form action={usdtAction}>
          <input type="hidden" name="id" value={sendingId} />
          <button className="small action-primary" type="submit" disabled={usdtPending}>
            {usdtPending ? 'Pagando…' : 'Pagar con USDT'}
          </button>
        </form>
        {usdtState.error ? <p className="pay-error">{usdtState.error}</p> : null}
      </div>
    );
  }

  // One preview box per path. Each holds the numbers, or the reason there are
  // none. Server Actions called from onClick, so useTransition supplies the
  // pending flag useActionState would have given a form.
  const [poolPreview, setPoolPreview] = useState<PreviewPagoState | null>(null);
  const [directPreview, setDirectPreview] = useState<PreviewPagoState | null>(null);
  const [poolPreviewing, startPoolPreview] = useTransition();
  const [directPreviewing, startDirectPreview] = useTransition();

  // The direct amount stays uncontrolled, exactly as before: the preview reads
  // whatever is typed at the moment it is asked for, and the form submits it.
  const usdtRef = useRef<HTMLInputElement>(null);

  const runPoolPreview = () => {
    startPoolPreview(async () => setPoolPreview(await previewPagoPoolAction(sendingId)));
  };

  const runDirectPreview = () => {
    const usdtSold = parseDecimal(usdtRef.current?.value ?? '');
    if (usdtSold === null || !(usdtSold > 0)) {
      setDirectPreview({ error: 'Escribe los USDT vendidos (mayor que cero).' });
      return;
    }
    startDirectPreview(async () =>
      setDirectPreview(await previewPagoDirectoAction(sendingId, usdtSold)),
    );
  };

  const poolForm = (
    <form action={poolAction}>
      <input type="hidden" name="id" value={sendingId} />
      <button className="small action-primary" type="submit" disabled={poolPending}>
        {poolPending ? 'Pagando…' : isPersonal ? 'Sí, marcar pagado' : 'Pagar desde pool'}
      </button>
    </form>
  );

  return (
    <div className="pay-actions">
      {!isPersonal ? (
        poolForm
      ) : poolPreview ? (
        <div>
          <PreviewPanel state={poolPreview} />
          <div className="pay-preview-buttons">
            {poolPreview.result ? poolForm : null}
            <button className="small quiet" type="button" onClick={() => setPoolPreview(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="small action-primary"
          type="button"
          disabled={poolPreviewing}
          onClick={runPoolPreview}
        >
          {poolPreviewing ? 'Calculando…' : 'Pagar desde pool'}
        </button>
      )}

      {showDirect ? (
        <form action={directAction} className="pay-direct">
          <input type="hidden" name="id" value={sendingId} />
          <input
            ref={usdtRef}
            name="usdt_sold"
            type="text"
            inputMode="decimal"
            placeholder="USDT vendidos"
            autoFocus
          />
          {isPersonal ? (
            <button
              className="small secondary"
              type="button"
              disabled={directPreviewing}
              onClick={runDirectPreview}
            >
              {directPreviewing ? 'Calculando…' : 'Ver costo'}
            </button>
          ) : null}
          <button className="small action-primary" type="submit" disabled={directPending}>
            {directPending ? 'Pagando…' : 'Confirmar directo'}
          </button>
          <button
            className="small quiet"
            type="button"
            onClick={() => {
              setShowDirect(false);
              setDirectPreview(null);
            }}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button className="small secondary" type="button" onClick={() => setShowDirect(true)}>
          Pagar directo
        </button>
      )}

      {/*
        Outside the form above, so it survives a re-render of it and reads as a
        note about the row rather than a field of the form. "Confirmar directo"
        stays the real button either way: the preview informs the amount Jose
        types, it does not gate it.
      */}
      {showDirect && directPreview ? <PreviewPanel state={directPreview} /> : null}

      {poolState.error ? <p className="pay-error">{poolState.error}</p> : null}
      {directState.error ? <p className="pay-error">{directState.error}</p> : null}
    </div>
  );
}

/**
 * What the payment would cost, and the fact that it has not happened.
 *
 * The "aún no está pagado" line is first and in bold on purpose: everything
 * under it is a real figure off the real pools, which is exactly what makes it
 * easy to misread as a receipt.
 *
 * No ganancia line, ever. These rows have no agreed EUR amount, so there is no
 * margin — see PayPreview, which does not carry one.
 */
function PreviewPanel({ state }: { state: PreviewPagoState }) {
  if (state.error) return <p className="pay-error">{state.error}</p>;
  if (!state.result) return null;

  const preview = state.result;
  const shortfall = preview.vesShortfall > 0 || preview.usdtShortfall > 0;

  return (
    <div className="pay-preview">
      <strong>Vista previa — este envío AÚN NO está marcado como pagado.</strong>
      <div>
        Te costaría <strong>{fmtEur(preview.costEur)}</strong> · {fmtUsdt(preview.usdtUsed)}
        {preview.feeApplied ? ' (incluye el 0,3%)' : null}
      </div>
      {shortfall ? (
        <div>
          No alcanza:{' '}
          {preview.vesShortfall > 0
            ? `faltan ${fmtVes(preview.vesShortfall)} en el pool`
            : `faltan ${fmtUsdt(preview.usdtShortfall)} en cripto`}
          .
        </div>
      ) : null}
    </div>
  );
}
