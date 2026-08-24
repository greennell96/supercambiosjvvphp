-- The client's side of a sending, and the codigo that proves it.
--
-- sendings.status has only ever answered one question: has JOSE paid the
-- beneficiary in Venezuela. Whether the CLIENT has paid Jose, here in Spain, was
-- nowhere in the schema — client_payment_note (migration 009) says HOW the money
-- was handed over, in free text, but never WHETHER it arrived. These columns are
-- that missing half, and they are deliberately independent of status: a sending
-- can be paid out before the client settles, or settled long before it is paid.
--
-- Nothing here feeds a calculation. No pool is drawn, no cost is recognised,
-- amount_ves_to_pay and profit_eur do not move. It is status tracking, exactly
-- like the note it sits next to.
--
-- Bundled with codigos.code in one migration because the link between the two
-- tables, below, is what makes them one change rather than two.

-- ------------------------------------------------------------------ codigos

-- The actual bank code Jose reads out to the client. The table has tracked the
-- amount, the bank and the status of a codigo since migration 006 without ever
-- holding the string that IS the codigo.
--
-- Rows logged before this column existed get '', which means "not written down",
-- not "the code is empty" — the lists show a dash for those. The default exists
-- only to backfill them and is dropped straight away, so from here on every new
-- codigo has to say what its code is.
alter table codigos add column if not exists code text not null default '';
alter table codigos alter column code drop default;

-- ----------------------------------------------------------------- sendings

alter table sendings add column if not exists client_paid_at        timestamptz;
alter table sendings add column if not exists client_payment_method text;

-- The six ways a client can hand Jose the money in Spain, in his own words.
-- 'OTRO' is the free-input one, and what he writes then goes into
-- client_payment_note: that column already exists for exactly this and a second
-- free-text column would only give the same fact two places to live.
alter table sendings drop constraint if exists sendings_client_payment_method_check;
alter table sendings add constraint sendings_client_payment_method_check check (
  client_payment_method is null
  or client_payment_method in ('CODIGO', 'EFECTIVO', 'CARREFOUR', 'BIZUM', 'A_CLIENTE', 'OTRO')
);

-- Both or neither, the same shape rule sendings_paid_shape_check enforces on the
-- payout side: a client payment that says when must also say how.
alter table sendings drop constraint if exists sendings_client_paid_shape_check;
alter table sendings add constraint sendings_client_paid_shape_check check (
  (client_paid_at is null and client_payment_method is null)
  or
  (client_paid_at is not null and client_payment_method is not null)
);

-- ---------------------------------------------------------------- the link

-- The codigo issued against that payment, when there was one. The link is
-- optional on both ends: most codigos pay for nothing in this table, and most
-- client payments are cash or Bizum and have no codigo.
--
-- 'on delete set null', not the default 'no action', and that is the whole point
-- of the clause: a codigo pointing at a sending must never become the reason the
-- sending cannot be deleted. Deleting a sending unlinks its codigo and leaves it
-- standing on its own, like every codigo that was never linked — so
-- deleteSendingInTx in lib/queries.ts needs to know nothing about this column.
--
-- The other direction is not the FK's job and cannot be: deleting the codigo has
-- to clear client_paid_at/client_payment_method back off the sending, which is
-- an update, not a delete. That lives in deleteCodigo().
alter table codigos
  add column if not exists sending_id bigint references sendings (id) on delete set null;

-- One codigo links to at most one sending. Partial, because unlinked is the
-- normal state and there are many of those: Postgres already counts nulls as
-- distinct in a unique index, so the `where` changes nothing about what is
-- allowed — it keeps the index down to the handful of rows that are linked.
create unique index if not exists codigos_sending_unique_idx
  on codigos (sending_id) where sending_id is not null;

-- "Which sendings has the client not paid for yet" is the /codigos link picker's
-- only question, and the one the /envios list asks per row.
create index if not exists sendings_client_paid_idx on sendings (client_paid_at);
