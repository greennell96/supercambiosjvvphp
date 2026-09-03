-- Envío USDT: José pays a client's EUR obligation by sending USDT straight to
-- a Binance account the client hands him, instead of paying bolívares into a
-- Venezuelan bank.
--
-- It lives in `sendings` because it IS a client sending in every way that
-- matters: same client, same amount_eur the client agreed to pay, same
-- profit line as any other envío. The only real difference is what leaves
-- Jose's side — USDT out of Binance, never bolívares — so is_personal stays
-- false (there is a real client and a real profit to compute) and a third
-- boolean carries the one thing that changes, on the same precedent migration
-- 014 set for is_personal: a flag for a genuinely single alternative, not a
-- kind/type enum that would invite a fourth case nobody has asked for.
--
-- Nothing Venezuelan exists on this row: no tasa was ever agreed (there is
-- nothing here to convert into bolívares) and no bolívares are ever paid out,
-- so rate_tasa and amount_ves_to_pay both stay null — the same "not
-- applicable, not zero" rule migration 014 used for amount_eur/rate_tasa on
-- an envío propio.
--
-- It is created ALREADY PAID (status = 'paid', paid_at = the date typed on
-- the form): the USDT genuinely leave Binance the moment José logs this, the
-- same instant computeDirectPayment costs them, so there is no separate
-- "pending" step the way a client sending's Venezuelan payout has. The client
-- side is completely untouched by any of this — client_paid_at stays null
-- until the existing "marcar cobrado" flow records it, exactly like any
-- other sending.
alter table sendings add column if not exists is_usdt boolean not null default false;

-- amount_ves_to_pay's NOT NULL used to be true of every row, because until
-- now every row had bolívares to pay. An Envío USDT never does, so that
-- guarantee has to move into the shape check below, which still requires it
-- on the two existing kinds — the check constraint is the only place left
-- making the promise the column-level NOT NULL used to make on its own.
alter table sendings alter column amount_ves_to_pay drop not null;

-- The shape rule, extended to a third branch. The two existing branches each
-- gain an explicit "amount_ves_to_pay is not null" clause: a plain
-- transcription of the column-level NOT NULL just dropped above, so losing
-- that guarantee is not a silent regression — a cliente or propio row still
-- cannot be missing its bolívares, just refused here instead of at the column.
--
-- The usdt branch mirrors computeDirectPayment's own shape: amount_eur is
-- what the client agreed to pay (so there is a real profit line, unlike a
-- propio); rate_tasa and amount_ves_to_pay are null because nothing here was
-- ever converted to bolívares; usdt_used is required and strictly positive
-- because that is the one number this operation cannot exist without — it is
-- what actually left Binance, the same floor costUsdtDraw already enforces
-- before it will compute a draw at all.
alter table sendings drop constraint if exists sendings_kind_shape_check;
alter table sendings add constraint sendings_kind_shape_check check (
  (
    is_personal = false
    and is_usdt = false
    and amount_eur is not null
    and rate_tasa is not null
    and personal_note is null
    and amount_ves_to_pay is not null
  )
  or
  (
    is_personal = true
    and is_usdt = false
    and amount_eur is null
    and rate_tasa is null
    and personal_note is not null
    and amount_ves_to_pay is not null
  )
  or
  (
    is_usdt = true
    and is_personal = false
    and amount_eur is not null
    and rate_tasa is null
    and personal_note is null
    and amount_ves_to_pay is null
    and usdt_used is not null
    and usdt_used > 0
  )
);

-- paid_via gains a third value, and deliberately its own rather than folded
-- into 'direct'. 'direct' already means "sold straight into a beneficiary's
-- VES account", the funding breakdown on /stats groups by this very column,
-- and merging the two would silently move every Envío USDT's revenue into a
-- bucket whose label would no longer describe what actually happened.
alter table sendings drop constraint if exists sendings_paid_via_check;
alter table sendings add constraint sendings_paid_via_check check (
  paid_via is null or paid_via in ('pool', 'direct', 'usdt')
);
