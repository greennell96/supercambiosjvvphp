-- Crypto purchases: every batch ("lot") of USDT bought.
--
-- This is the FIFO cost pool for USDT ("precio izquierda"). Its mirror image is
-- ves_sales (migration 007), which is the pool for bolivares. Both are walked by
-- the same engine in lib/fifo.ts.
--
-- Like ves_sales, this table keeps BOTH raw numbers Jose actually knows at the
-- moment of the trade and the price derived from them. The derived price is what
-- the FIFO cost math reads; the raw pair is what makes a lot auditable later.

create table if not exists crypto_purchases (
  id             bigserial primary key,
  purchased_at   timestamptz    not null,        -- FIFO order is decided by this column

  eur_paid       numeric(20, 8) not null,        -- EUR handed over for this purchase
  usdt_received  numeric(20, 8) not null,        -- USDT received for them

  -- eur_paid / usdt_received, computed in lib/pools.ts and stored so the
  -- allocation audit trail can quote the exact price a lot was drawn at.
  price_eur_per_usdt numeric(20, 8) not null,

  provider       text,                           -- "Andriu", "Kacem", "Binance P2P", ...

  -- How much of this lot is still unspent.
  -- Starts equal to usdt_received and is decremented as sendings are paid.
  -- It is ALLOWED to go negative: that means USDT was already spent that no
  -- purchase covers yet (a backorder). The next purchase pays that down first.
  remaining_usdt numeric(20, 8) not null
);

-- The FIFO walk always reads "oldest first", so index exactly that order.
create index if not exists crypto_purchases_fifo_idx on crypto_purchases (purchased_at, id);
