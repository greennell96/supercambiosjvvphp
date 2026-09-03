-- Gives the EUR side of a VES -> EUR entry a payment source, and makes the
-- 'caja' source an actual outflow instead of a bare personal reminder.
--
-- Until now eur_settled_at only told Jose whether he had paid; it never said
-- WHERE those euros came from. That is exactly the same gap lib/caja.ts
-- already closed for compras via crypto_purchases.paid_from_cash in migration
-- 015: a flag on the row that IS the movement, not a second table that could
-- drift from it. This is the same shape, on ves_sales instead.
--
-- 'caja' means the euros left Jose's own cash on hand, so the caja ledger has
-- to see them go. 'cliente' means the client's own EUR side settled the debt
-- directly (a bank transfer, a separate payment) and no cash of Jose's ever
-- moved, so the ledger has nothing to read for that row.
alter table ves_sales add column if not exists eur_payment_method text;

-- Backfill BEFORE the constraint below, and to 'cliente' rather than 'caja':
-- this column did not exist yet, so no row recorded here could possibly have
-- taken euros out of a caja that migration 015 had not created either. Every
-- existing ves_to_eur row is truthfully a case where no cash of Jose's left
-- his pocket through this route.
update ves_sales
set eur_payment_method = 'cliente'
where source_type = 'ves_to_eur' and eur_payment_method is null;

-- Same drop-then-add shape migration 013 uses for source_type, so re-running
-- this file after a later edit to the rule replaces it instead of stacking a
-- second, possibly contradictory, constraint under a different name.
--
-- A ves_to_eur row must say which of the two payment methods it used; every
-- other source_type has no EUR side to pay at all, so the column has to stay
-- null there or it would look like a Binance row had a payment method too.
alter table ves_sales drop constraint if exists ves_sales_eur_payment_method_check;
alter table ves_sales add constraint ves_sales_eur_payment_method_check check (
  (source_type = 'ves_to_eur' and eur_payment_method in ('caja', 'cliente'))
  or
  (source_type <> 'ves_to_eur' and eur_payment_method is null)
);

-- The caja read in lib/queries.ts only ever wants settled 'caja' rows out of
-- ves_to_eur, so the index is shaped to exactly that predicate rather than to
-- the column alone — the same partial-index pattern migration 015 uses for
-- crypto_purchases.paid_from_cash and codigos.retired_at.
create index if not exists ves_sales_caja_settled_idx
  on ves_sales (eur_settled_at)
  where eur_payment_method = 'caja' and source_type = 'ves_to_eur';
