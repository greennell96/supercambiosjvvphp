-- "Como pago" — how the client handed the money over here in Spain.
--
-- Free text, Jose's own note: codigo de cajero, efectivo, transferencia, ...
-- This is the SPANISH side of the transfer and has nothing to do with
-- sendings.payout_method, which is about how the bolivares reach the
-- beneficiary in Venezuela.
--
-- It never feeds any calculation, so unlike the money fields it stays editable
-- after a sending is paid. It is not asked for at creation: the intake form is
-- deliberately four fields.
--
-- Added as its own migration rather than folded into 004 so it applies to a
-- database that already ran 001-008.

alter table sendings add column if not exists client_payment_note text;
