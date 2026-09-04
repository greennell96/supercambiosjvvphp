-- Envío USDT becomes an ordinary pending sending.
--
-- Migration 019 created it already paid, on the reasoning that the USDT leave
-- Binance the moment José logs it. Live use disproved that: José logs the
-- envío when the client asks for it and sends the USDT afterwards, exactly
-- like every other sending. So the row is now created PENDING and the FIFO
-- draw over crypto_purchases moves to "marcar pagado", where the other two
-- kinds already do theirs.
--
-- That needs a column 019 did not have. A client sending stores the payout it
-- owes at creation (amount_ves_to_pay) and draws exactly that at payment; an
-- Envío USDT now needs the same thing in its own unit, because its obligation
-- is in USDT and no tasa converts it. usdt_to_deliver is that column, and it
-- is the direct analogue of amount_ves_to_pay: written at creation, never
-- recomputed at payment, kept afterwards as the record of what was agreed.
--
-- It is deliberately NOT usdt_used. usdt_used means "USDT this sending
-- actually consumed from the pool", is written by the draw, and stays null
-- until the sending is paid — on all three kinds, now including this one.
-- The two are equal in practice today, because the draw takes exactly what
-- was agreed; they mean different things and one may not stand in for the
-- other.
alter table sendings add column if not exists usdt_to_deliver numeric(20, 8);

-- The Envíos USDT already in the database were created paid, under 019, and
-- their usdt_used is the figure that was agreed and drawn in the same breath.
-- Copying it forward is what makes them satisfy the shape rule below, and it
-- is true of them: it is what José undertook to deliver.
update sendings
set usdt_to_deliver = usdt_used
where is_usdt = true and usdt_to_deliver is null and usdt_used is not null;

-- The shape rule, with the usdt branch corrected.
--
-- What changes there: usdt_used is no longer required, because a pending
-- Envío USDT has not drawn anything yet — the same "written by the draw, null
-- until then" that 004 established for the other two kinds. usdt_to_deliver
-- takes over the "this operation cannot exist without it" role, required and
-- strictly positive, exactly as amount_ves_to_pay is on the other two.
--
-- The cliente and propio branches gain "usdt_to_deliver is null": there is no
-- USDT obligation on either, and without the clause a stray value could be
-- written to a row where it would mean nothing.
alter table sendings drop constraint if exists sendings_kind_shape_check;
alter table sendings add constraint sendings_kind_shape_check check (
  (
    is_personal = false
    and is_usdt = false
    and amount_eur is not null
    and rate_tasa is not null
    and personal_note is null
    and amount_ves_to_pay is not null
    and usdt_to_deliver is null
  )
  or
  (
    is_personal = true
    and is_usdt = false
    and amount_eur is null
    and rate_tasa is null
    and personal_note is not null
    and amount_ves_to_pay is not null
    and usdt_to_deliver is null
  )
  or
  (
    is_usdt = true
    and is_personal = false
    and amount_eur is not null
    and rate_tasa is null
    and personal_note is null
    and amount_ves_to_pay is null
    and usdt_to_deliver is not null
    and usdt_to_deliver > 0
  )
);
