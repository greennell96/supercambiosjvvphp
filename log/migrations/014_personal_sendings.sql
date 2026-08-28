-- Envios propios: the remittances Jose sends to his own family.
--
-- Same row, same table, same lifecycle as a client sending — logged pending,
-- paid later out of the shared VES/USDT pools, same FIFO draw, same 0,3%
-- interbank rule when payout_method is 'Otro'. Real money leaves the real pools,
-- so it has to be in this table and nowhere else.
--
-- What is different is only the client-facing half, and it is different because
-- that half does not exist:
--
--   * There is no client who agreed a EUR amount at a tasa. Jose knows the
--     bolivares he wants to arrive and nothing more, so amount_eur and rate_tasa
--     are NULL — not zero. Zero would read as "a free transfer", would enter
--     every sum() untouched and would quietly claim a revenue figure that was
--     never agreed with anybody.
--
--   * There is no client to collect from afterwards, so client_paid_at stays
--     null forever. Anything that counts "sin cobrar" has to skip these rows or
--     it inflates for good; see uncollected_eur in getStats().
--
-- This is one special case, deliberately a boolean and not a kind/type enum:
-- there is no second case, and an enum would invite one.

-- ------------------------------------------------------------------ clients
--
-- client_id stays NOT NULL. Every read of a sending inner-joins clients for the
-- name — listSendings, listPendingSendings, listOpenSendings, lockPendingSending,
-- editSending, markClientPaid, the top_clients stat. Making the column nullable
-- would silently drop every envio propio out of all of them (an inner join on
-- NULL matches nothing), so each would have to become a left join and each would
-- then need a fallback name. One placeholder client row costs nothing and keeps
-- all of that working exactly as written.
--
-- The name is the fallback: the placeholder is called exactly what the Cliente
-- column should read for these rows, so no list needs a special case for it
-- either. listClients() leaves it out of the pickers, where it is not a choice.
alter table clients add column if not exists is_internal boolean not null default false;

-- At most one such row can ever exist. Partial on purpose: real clients are all
-- false and there are hundreds of them, so an unpartitioned unique index would
-- allow exactly one real client. This one only covers the single true row.
create unique index if not exists clients_is_internal_unique_idx
  on clients (is_internal) where is_internal;

-- Seeded once. The guard is what makes re-running this file harmless; phone,
-- banks and dni_nie stay null because there is nobody to hold them for, and
-- registered_at is left null too — this row was never registered, it was created
-- by a migration.
insert into clients (name, is_internal)
select 'Envío propio', true
where not exists (select 1 from clients where is_internal);

-- ----------------------------------------------------------------- sendings

alter table sendings add column if not exists is_personal boolean not null default false;

-- Who the money went to ("a mi hermana"). Required on an envio propio and the
-- only record of it, since there is no client row to carry that name. It is not
-- client_payment_note and must never be folded into it: that column answers "how
-- did the CLIENT hand Jose the money in Spain", which is the opposite direction.
alter table sendings add column if not exists personal_note text;

-- Not applicable rather than zero, exactly as migration 013 did for usdt_sold /
-- price_ves_per_usdt on a VES -> EUR sale. Every existing row was written by the
-- client path and holds both, so nothing is backfilled.
alter table sendings alter column amount_eur drop not null;
alter table sendings alter column rate_tasa  drop not null;

-- The shape rule, mirroring sendings_paid_shape_check: each kind of row must
-- carry its own half and none of the other's. Safe to add against the existing
-- table because is_personal defaults to false and every row already has both
-- amount_eur and rate_tasa, so they all satisfy the first branch on the spot.
alter table sendings drop constraint if exists sendings_kind_shape_check;
alter table sendings add constraint sendings_kind_shape_check check (
  (
    is_personal = false
    and amount_eur is not null
    and rate_tasa is not null
    and personal_note is null
  )
  or
  (
    is_personal = true
    and amount_eur is null
    and rate_tasa is null
    and personal_note is not null
  )
);

-- profit_eur stays NULL on an envio propio forever, and that is the mechanism
-- the stats rely on rather than a filter of their own: revenue = amount_eur, so
-- with no amount_eur there is no profit to compute. Writing 0 would be wrong in
-- both directions — it would count as a paid sending that earned nothing, drag
-- the average and the margin down, and appear in top_clients under the
-- placeholder name. Every earnings query in getStats() already filters
-- `profit_eur is not null`, so they all exclude these rows unchanged.
--
-- The pool figures do NOT filter it out, and must not: cost_eur and usdt_used
-- are filled in normally at payment, the FIFO draw is identical, and
-- pending_payout_ves counts an unpaid envio propio because those bolivares are
-- genuinely still owed.
