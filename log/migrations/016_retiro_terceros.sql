-- Quién retiró un código, y qué significa eso para la caja.
--
-- Until now every retirado código meant the same thing: Jose went to the cajero
-- himself, so the cash landed in his pocket and the confirmación de retiros in
-- migration 015 counted it into la caja. That is one of three real cases, and
-- the other two put the money somewhere else entirely:
--
--   * A runner — Andriu, Andres, Carmen, Yulitza, Chelo — withdraws it and holds
--     the notes until he hands them over. Real money, really owed to Jose, but
--     NOT in his pocket yet, so counting it into the caja on the day of the
--     retiro would claim cash he cannot produce if he counts his pocket.
--
--   * A crypto seller takes it at the cajero as his own payment for USDT he
--     already sold Jose. Those euros never pass through the pocket in either
--     direction — there is nothing to collect and nothing to pay — so they are
--     out of the caja permanently and the only thing worth recording is that
--     this is where the código went.
--
-- Same rule as the rest of la caja: nothing is stored that can be derived. What
-- a runner is holding is not a column anywhere. It is
-- (sum of códigos he retired) − (sum of what he has delivered), recomputed on
-- every read, so correcting a código's amount or voiding an entrega corrects
-- the balance by itself. See lib/retiro-terceros.ts.

-- ------------------------------------------------- who can retire on request

-- A real table, and not the free text `bank` and `provider` are elsewhere in
-- this app. Those two only ever get grouped for a report, so a typo costs a
-- split row in a table. Here a name is the key to somebody's outstanding
-- balance: "Andriu" typed as "andriu " would silently fork one person holding
-- 800 € into two people holding 500 € and 300 €, and nothing on screen would
-- say so.
create table if not exists retiro_agentes (
  id         bigserial   primary key,
  name       text        not null,
  created_at timestamptz not null default now()
);

-- Case- and whitespace-insensitive identity, so the "Otro" box reuses an
-- existing person instead of forking one the moment the name is typed
-- differently. This index is also what findOrCreateRetiroAgente's `on conflict`
-- infers, so its expression has to stay exactly as written here.
create unique index if not exists retiro_agentes_name_key
  on retiro_agentes (lower(trim(name)));

-- The five Jose actually sends. Seeded rather than typed so the picker is right
-- the first time it is opened; anybody else arrives through "Otro". One
-- statement, so `order by created_at, id` in listRetiroAgentes keeps them in
-- this order and puts later additions after them.
insert into retiro_agentes (name)
select v.name from (values ('Andriu'), ('Andres'), ('Carmen'), ('Yulitza'), ('Chelo')) as v(name)
where not exists (select 1 from retiro_agentes a where lower(trim(a.name)) = lower(trim(v.name)));

-- ----------------------------------------------------------------- códigos

-- Who retired this código, when it was not Jose himself.
--
--   null          — Jose retired it. The unchanged default: counted into the
--                   caja's confirmable daily total the moment it is retirado,
--                   exactly as before this migration.
--   runner        — a named retiro_agentes row is holding the cash. Out of the
--                   caja until he delivers it (see retiro_entregas below).
--   crypto_seller — the cash paid a USDT provider at the cajero and never
--                   touches the pocket. Out of the caja permanently, no agente
--                   and no delivery: it is a tag and nothing more.
--
-- Deliberately two nullable columns on codigos rather than a join table. A
-- código has exactly one retiro and can only have one, so a second table would
-- be a one-row-per-código table with a unique key on it — the same fact, one
-- join further away.
alter table codigos add column if not exists retirado_por_kind text;
alter table codigos add column if not exists retirado_por_agente_id bigint references retiro_agentes (id);

-- The shape rule, in the same drop-then-add form migrations 012-014 use so the
-- file stays re-runnable. Every existing row has both columns null and so
-- satisfies the first branch on the spot.
--
-- This is the load-bearing half of the whole feature: it is what makes "a
-- runner holds this money" impossible to write without saying WHICH runner, and
-- "a crypto seller took it" impossible to write with a runner attached. The two
-- exclusion clauses in lib/queries.ts trust that a non-null kind is one of
-- these two spellings and nothing else.
alter table codigos drop constraint if exists codigos_retirado_por_check;
alter table codigos add constraint codigos_retirado_por_check check (
  (retirado_por_kind is null and retirado_por_agente_id is null) or
  (retirado_por_kind = 'runner' and retirado_por_agente_id is not null) or
  (retirado_por_kind = 'crypto_seller' and retirado_por_agente_id is null)
);

-- Partial, because a runner-retired código is the rare row: nearly every código
-- has a null kind. This is the index behind the per-agente sum on /estadisticas.
create index if not exists codigos_retirado_por_agente_idx
  on codigos (retirado_por_agente_id) where retirado_por_kind = 'runner';

-- --------------------------------------------- cash a runner handed over

-- The ONLY source of truth for money reaching Jose from a runner, and the sixth
-- source of the caja ledger.
--
-- One row per delivery, not one running balance per agente: a runner hands over
-- what he has on him, which is routinely part of what he owes, and the partial
-- deliveries are the record. delivered_at is the instant it happened, so it
-- sorts into the libro de caja beside everything else that moved that day —
-- unlike a retiro confirmation, which is about a whole día and is dated to its
-- midnight.
--
-- amount_eur > 0 and no sign column: a delivery is money coming in. A mistyped
-- row is voided, not erased, so its operation key remains an idempotency guard
-- and the correction remains visible in the history. An entrega larger than
-- what the runner owed is allowed and shows up as a negative saldo — an advance
-- is a real thing and hiding it would be worse than reporting it.
create table if not exists retiro_entregas (
  id            bigserial      primary key,
  agente_id     bigint         not null references retiro_agentes (id),
  amount_eur    numeric(20, 8) not null check (amount_eur > 0),
  expected_saldo_eur numeric(20, 8) not null,
  delivered_at  timestamptz    not null default now(),
  operation_key uuid           not null,
  voided_at     timestamptz
);

create index if not exists retiro_entregas_agente_idx on retiro_entregas (agente_id);
create unique index if not exists retiro_entregas_operation_key_idx
  on retiro_entregas (operation_key);
