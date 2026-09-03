'use client';

import { eliminarVentaAction } from './actions';
import SettleEurForm from './settle-eur-form';
import DeleteRowForm from '../components/delete-row-form';
import LedgerList from '../components/ledger-list';
import { isBackordered, isDepleted } from '@/lib/fifo';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import type { VesSale } from '@/lib/types';

/*
  Column order is the card order: the bolivares that arrived first, because that
  is what a movement IS, then Jose's own note for it, then where they came from
  and at what price, and only then what is left of them.

  Two cells disappear when they say nothing. "Cliente / comentario" is free text
  and usually empty; "Pago EUR" is the personal reminder on a VES -> EUR swap and
  does not exist at all for a Binance row, which the origin already says.
*/
const HEAD = (
  <tr>
    <th className="num">Bs recibidos</th>
    <th>Cliente / comentario</th>
    <th>Fecha</th>
    <th>Origen</th>
    <th className="num">Entregado</th>
    <th className="num">Tasa</th>
    <th className="num">Disponible</th>
    <th>Pago EUR</th>
    <th className="actions-heading">Acciones</th>
  </tr>
);

export default function VentasList({ sales }: { sales: VesSale[] }) {
  const renderFull = (s: VesSale) => {
    const depleted = isDepleted(s.remaining_ves);
    const backorder = isBackordered(s.remaining_ves);
    const directEur = s.source_type === 'ves_to_eur';

    return (
      <tr className={depleted && !backorder ? 'depleted' : undefined}>
        <td className="num" data-label="Bs recibidos" data-lead data-money>
          {fmtVes(s.ves_received)}
        </td>
        <td data-label="Cliente / comentario" data-wide data-empty={s.note ? undefined : true}>
          {s.note || '—'}
        </td>
        <td data-label="Fecha">{fmtDateTime(s.sold_at)}</td>
        <td data-label="Origen">{directEur ? 'VES → EUR' : 'Binance'}</td>
        <td className="num" data-label="Entregado">
          {directEur ? fmtEur(s.eur_amount ?? 0) : fmtUsdt(s.usdt_sold ?? 0)}
        </td>
        <td className="num" data-label="Tasa">
          {directEur
            ? `${fmtRate(s.ves_received / (s.eur_amount ?? 1))} Bs/EUR`
            : `${fmtRate(s.price_ves_per_usdt ?? 0)} Bs/USDT`}
        </td>
        <td
          className={backorder ? 'num backorder' : 'num'}
          data-label="Disponible"
          data-wide
          data-sep
        >
          <div className="inventory-cell">
            <span>{fmtVes(s.remaining_ves)}</span>
            {backorder ? (
              <span className="badge negative">en negativo</span>
            ) : depleted ? (
              <span className="badge">agotada</span>
            ) : (
              <span className="badge paid">activa</span>
            )}
          </div>
        </td>
        <td data-label="Pago EUR" data-wide data-empty={directEur ? undefined : true}>
          {directEur ? (
            <div className="settlement-actions">
              {s.eur_settled_at ? (
                <span className="badge paid">pagado</span>
              ) : (
                <>
                  <span className="badge pending">pendiente</span>
                  <SettleEurForm id={s.id} />
                </>
              )}
              <span className="badge">
                {s.eur_payment_method === 'caja' ? 'caja' : 'cliente'}
              </span>
            </div>
          ) : (
            '—'
          )}
        </td>
        <td data-label="Acciones" data-wide data-actions>
          <div className="venta-actions">
            <DeleteRowForm id={s.id} action={eliminarVentaAction} />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <LedgerList
      items={sales}
      getId={(s) => s.id}
      getDate={(s) => s.sold_at}
      getSearchText={(s) => `${s.note} ${s.source_type === 'ves_to_eur' ? 'VES EUR' : 'Binance'}`}
      getTerse={(s) => {
        const directEur = s.source_type === 'ves_to_eur';
        const backorder = isBackordered(s.remaining_ves);
        const depleted = isDepleted(s.remaining_ves);
        return {
          time: fmtDateTime(s.sold_at),
          title: s.note || (directEur ? 'VES → EUR' : 'Binance'),
          value: fmtVes(s.ves_received),
          meta: s.note ? (directEur ? 'VES → EUR' : 'Binance') : undefined,
          badge: backorder ? (
            <span className="badge negative">en negativo</span>
          ) : depleted ? (
            <span className="badge">agotada</span>
          ) : (
            <span className="badge paid">activa</span>
          ),
        };
      }}
      rowClass={(s) =>
        isDepleted(s.remaining_ves) && !isBackordered(s.remaining_ves) ? 'depleted' : undefined
      }
      head={HEAD}
      renderFull={renderFull}
      searchLabel="Cliente / comentario"
    />
  );
}
