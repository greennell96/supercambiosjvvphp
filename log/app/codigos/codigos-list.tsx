'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { eliminarCodigoAction } from './actions';
import { markCodigoRetiradoAction } from '../actions';
import DeleteRowForm from '../components/delete-row-form';
import EditCodigoForm from '../components/edit-codigo-form';
import LedgerList from '../components/ledger-list';
import { bankColorClass, compareBankNames, requiresDniReminder } from '@/lib/banks';
import { formatCodigosForExport } from '@/lib/export-codigos';
import { fmtDateTimeShort, fmtEur, fmtRate, fmtVes } from '@/lib/format';
import type { Codigo } from '@/lib/types';

/** Matches the number of <th> below: the linked-sending panel spans the card. */
const COLUMNS = 8;

/**
 * How long the row stays on screen after "Marcar retirado" is clicked, before
 * the action is sent and the server re-render takes the row away. Long enough
 * to see which row went, short enough not to feel like waiting.
 */
const MARCADO_MS = 460;

/** How long "Exportar" stays "Copiado ✓" before it goes back to offering itself. */
const COPIADO_MS = 1400;

const HEAD_CELLS = (
  <>
    {/*
      The name is already the biggest thing in the row and the only bold one;
      "Cliente" over the top of it was a caption for something that needs no
      caption. Kept for screen readers, which have no bold to read.
    */}
    <th>
      <span className="sr-only">Cliente</span>
    </th>
    <th>Datos</th>
    <th>Banco</th>
    <th>Fecha</th>
    <th>Estado</th>
    <th>Envío</th>
    <th className="actions-heading">Retiro</th>
    <th className="actions-heading">Acciones</th>
  </>
);

const HEAD = <tr>{HEAD_CELLS}</tr>;

/**
 * The same head with the tick box in front of it. Only the pendientes table
 * gets one: a retirado código is a record, and there is nothing left to take to
 * a cajero. Built off HEAD_CELLS so the two can never drift apart.
 */
const PENDING_HEAD = (
  <tr>
    <th>
      <span className="sr-only">Seleccionar</span>
    </th>
    {HEAD_CELLS}
  </tr>
);

/**
 * Every código, with the ones still waiting on a retiro pinned above the log.
 *
 * The day compression underneath is right for a record of what happened: today
 * in full, one older day folded up, the rest behind a search. A pendiente
 * código is not a record, it is an open task — and the day it was issued says
 * nothing about whether Jose still has to do something about it. Left in the
 * buckets, a código from three days ago disappears into the archive while the
 * money is still sitting in the bank, so pendientes come out of the buckets
 * entirely and are shown in full.
 *
 * What they are NOT sorted by any more is age. Age is how you read a record;
 * these are a route. A withdrawal run is done one bank at a time — you stand at
 * one cajero and empty every code that works there — so the list is grouped by
 * bank, alphabetically, and only inside a bank does the oldest come first. That
 * is the order the Excel sheet was worked in, and the reason the pendientes are
 * ordered differently from listPendingCodigos on the dashboard, which is a
 * "what is still open" summary rather than a route.
 *
 * The split is what stops a código appearing twice: LedgerList only ever sees
 * the retirados.
 */
export default function CodigosList({ codigos }: { codigos: Codigo[] }) {
  const pending = codigos
    .filter((c) => c.status === 'pendiente')
    .sort(
      (a, b) =>
        compareBankNames(a.bank, b.bank) ||
        a.created_at.getTime() - b.created_at.getTime() ||
        a.id - b.id,
    );
  const resolved = codigos.filter((c) => c.status !== 'pendiente');

  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());
  const [copyLabel, setCopyLabel] = useState<string | null>(null);

  /*
    Read against the pendientes rather than trusted on its own: mark a ticked
    código retirado and its row leaves, so the id in `ticked` would go on
    counting towards "Exportar (N)" for a row nobody can see any more.
  */
  const selected = pending.filter((c) => ticked.has(c.id));

  function toggle(id: number): void {
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /*
    One block of text on the clipboard and a word on the button — the withdrawal
    run happens on the phone, in WhatsApp, and the less this page does about it
    the better. A refusal (http, no permission) has to say so: a button that
    does nothing at all reads as a misclick.
  */
  async function exportar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatCodigosForExport(selected));
      setCopyLabel('Copiado ✓');
    } catch {
      setCopyLabel('No se pudo copiar');
    }
    window.setTimeout(() => setCopyLabel(null), COPIADO_MS);
  }

  return (
    <>
      {pending.length > 0 ? (
        <div className="ledger">
          <section className="ledger-day">
            <div className="form-actions">
              <h3 className="ledger-day-heading">
                Pendientes de retiro <span className="ledger-day-count">{pending.length}</span>
              </h3>
              <button
                className="small secondary"
                type="button"
                disabled={selected.length === 0}
                onClick={() => void exportar()}
              >
                {copyLabel ?? `Exportar (${selected.length})`}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>{PENDING_HEAD}</thead>
                <tbody>
                  {pending.map((c) => (
                    <CodigoRow
                      key={c.id}
                      codigo={c}
                      selectable={{ checked: ticked.has(c.id), onChange: () => toggle(c.id) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <LedgerList
        items={resolved}
        getId={(c) => c.id}
        getDate={(c) => c.created_at}
        getSearchText={(c) => `${c.client_name} ${c.code} ${c.bank} ${c.sending_client_name ?? ''}`}
        getTerse={(c) => ({
          time: fmtDateTimeShort(c.created_at),
          title: c.client_name,
          value: fmtEur(c.amount),
          meta: c.bank,
          badge: <span className={`badge ${c.status}`}>{c.status}</span>,
        })}
        rowClass={(c) => `row-${c.status}`}
        head={HEAD}
        renderFull={(c) => <CodigoRow codigo={c} />}
        searchLabel="Cliente o código"
      />
    </>
  );
}

/**
 * One codigo, and the sending it paid for folded up underneath it.
 *
 * The link used to spell the sending's client out in full, right next to the
 * codigo's own client, which is the same name nearly every time. What is worth
 * seeing is the sending itself — its monto, its tasa, what it owes in bolivares
 * — so the cell is now a button that opens exactly that, without leaving the
 * page. The name is only repeated in the one case it is not a repetition: a
 * codigo linked from /envios to a sending logged under a relative's name.
 *
 * `selectable` is what the pendientes table passes and the retirados table does
 * not; it is the only thing that makes this row nine columns wide instead of
 * eight.
 */
function CodigoRow({
  codigo: c,
  selectable,
}: {
  codigo: Codigo;
  selectable?: { checked: boolean; onChange: () => void };
}) {
  const [showSending, setShowSending] = useState(false);
  const [marcado, setMarcado] = useState(false);
  const [, startAction] = useTransition();
  const linked = c.sending_id !== null;
  const otherName = c.sending_client_name !== null && c.sending_client_name !== c.client_name;

  /**
   * "Marcar retirado" used to be a bare server action: revalidatePath re-rendered
   * the page and the row was simply not in it any more. On a list of eight
   * pendientes that is indistinguishable from a misclick — something vanished,
   * and nothing said which one or whether it was the one you meant.
   *
   * So the click is caught here, the row turns green and slides out on its own
   * (the single animation this app allows itself), and only then is the action
   * sent. The delay is the confirmation; it costs less than a second and it is
   * the whole point.
   *
   * The <form action> underneath is left intact as the no-JS path, and
   * markCodigoRetirado is guarded by `status = 'pendiente'` in SQL, so even a
   * double submit marks the código once.
   */
  function handleMarcarRetirado(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (marcado) return;
    setMarcado(true);

    const data = new FormData();
    data.set('id', String(c.id));

    window.setTimeout(() => {
      startAction(async () => {
        try {
          await markCodigoRetiradoAction(data);
        } catch {
          // Put the row back rather than leave an invisible one behind.
          setMarcado(false);
        }
      });
    }, MARCADO_MS);
  }

  const rowClass = [`row-${c.status}`, bankColorClass(c.bank), marcado ? 'codigo-marcado' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <tr className={rowClass}>
        {selectable ? (
          <td data-label="Seleccionar">
            <input
              type="checkbox"
              checked={selectable.checked}
              onChange={selectable.onChange}
              aria-label={`Seleccionar ${c.client_name}`}
            />
          </td>
        ) : null}
        <td data-lead>{c.client_name}</td>
        <td data-label="Datos" data-wide>
          {/*
            Caixa withdrawals ask phone -> código -> DNI, in that order; every other
            bank asks código -> phone -> amount and never needs the DNI on screen.

            A dash here is not an empty field but a missing one: it is the thing
            Jose still has to ask the client for before the money can be taken out.
          */}
          {requiresDniReminder(c.bank) ? (
            <>
              Tel {c.client_phone ?? '—'} · Cód {c.code || '—'} · DNI {c.client_dni_nie ?? '—'}
              <span className="muted"> · {fmtEur(c.amount)}</span>
            </>
          ) : (
            <>
              Cód {c.code || '—'} · Tel {c.client_phone ?? '—'} · {fmtEur(c.amount)}
            </>
          )}
        </td>
        <td data-label="Banco">{c.bank}</td>
        <td data-label="Fecha">{fmtDateTimeShort(c.created_at)}</td>
        <td data-label="Estado">
          {/*
            A pendiente código is not a state to read, it is a job still on the
            list, and on this page there are only two states. A red square is
            counted down the column in one look; the word had to be read. The
            retirado badge stays a badge — that one is a record, and it is the
            same badge the ledger shows.
          */}
          {c.status === 'pendiente' ? (
            <span className="codigo-pendiente-mark" role="img" aria-label="pendiente" />
          ) : (
            <span className={`badge ${c.status}`}>{c.status}</span>
          )}
        </td>
        <td data-label="Envío">
          {linked ? (
            <button
              className="small secondary sending-link"
              type="button"
              aria-expanded={showSending}
              onClick={() => setShowSending((open) => !open)}
            >
              <span aria-hidden="true">↗</span>
              <span className="sr-only">Ver el envío vinculado</span>
            </button>
          ) : (
            <span className="badge sin-cobrar">sin vincular</span>
          )}
        </td>
        <td className="num" data-label="Retiro" data-wide data-actions>
          {c.status === 'pendiente' ? (
            <form action={markCodigoRetiradoAction} onSubmit={handleMarcarRetirado}>
              <input type="hidden" name="id" value={c.id} />
              <button className="small action-success" type="submit" disabled={marcado}>
                Marcar retirado
              </button>
            </form>
          ) : (
            <span className="muted">{fmtDateTimeShort(c.retired_at)}</span>
          )}
        </td>
        <td data-label="Acciones" data-wide data-actions>
          {/*
            Same cell and same order as a sending row: edit above delete. This
            row is rendered both pinned above the log and inside the compressed
            one, so putting the form here is what gives a retirado código an
            "Editar" too — which is the point, since a código never freezes.
          */}
          <div className="row-actions">
            <EditCodigoForm
              codigo={{ id: c.id, code: c.code, amount: c.amount, bank: c.bank }}
            />
            <DeleteRowForm id={c.id} action={eliminarCodigoAction} />
          </div>
        </td>
      </tr>

      {/* The panel hangs off the código, so it leaves with it rather than outliving it. */}
      {linked && showSending ? (
        <tr className={marcado ? 'linked-sending codigo-marcado' : 'linked-sending'}>
          <td data-label="Envío vinculado" data-wide colSpan={selectable ? COLUMNS + 1 : COLUMNS}>
            <dl className="linked-sending-fields">
              {otherName ? (
                <div>
                  <dt>Cliente del envío</dt>
                  <dd>{c.sending_client_name}</dd>
                </div>
              ) : null}
              <div>
                <dt>Monto</dt>
                <dd>{c.sending_amount_eur === null ? '—' : fmtEur(c.sending_amount_eur)}</dd>
              </div>
              <div>
                <dt>Tasa</dt>
                <dd>{c.sending_rate_tasa === null ? '—' : fmtRate(c.sending_rate_tasa)}</dd>
              </div>
              <div>
                <dt>Bs a pagar</dt>
                <dd>
                  {c.sending_amount_ves_to_pay === null ? (
                    '—'
                  ) : (
                    <span className="payout-amount">{fmtVes(c.sending_amount_ves_to_pay)}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Método</dt>
                <dd>{c.sending_payout_method ?? '—'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {c.sending_status === null ? (
                    '—'
                  ) : (
                    <span className={`badge ${c.sending_status}`}>
                      {c.sending_status === 'paid' ? 'pagado' : 'pendiente'}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
