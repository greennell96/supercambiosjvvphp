-- What an arriving lot spent covering older debt.
--
-- Both pools let a lot go negative: bolivares already paid out that no sale
-- covers yet, USDT already spent that no purchase covers yet. The next arrival
-- pays that down first, oldest debt first, and only the leftover becomes its own
-- remaining balance (applyIncomingToBackorders in lib/fifo.ts). Until now that
-- split was computed, applied, mentioned once in the success message and then
-- thrown away, so afterwards a row could not say whether it had arrived into a
-- healthy pool or into a hole.
--
-- Deleting a lot needs exactly that number. A lot that paid down an older
-- backorder cannot simply be removed: the debt it cleared would have to be put
-- back on the older lot, which may well have been drawn from again since. So the
-- delete refuses instead, and this column is what makes that refusal a fact read
-- off the row rather than a guess.
--
-- Existing rows get 0, and here the default is the truth and not a placeholder:
-- both rows that exist today were created into an empty pool, so neither of them
-- paid down anything.

alter table crypto_purchases
  add column if not exists used_to_pay_backorders numeric(20, 8) not null default 0;

alter table ves_sales
  add column if not exists used_to_pay_backorders numeric(20, 8) not null default 0;
