-- Codigos: cash-collection codes issued to a client against one of their banks.
-- Independent of sendings; nothing here feeds the FIFO pool or the profit math.

create table if not exists codigos (
  id         bigserial primary key,
  client_id  bigint         not null references clients (id),
  amount     numeric(20, 8) not null,
  bank       text           not null,   -- chosen at entry time from the client's stored banks
  status     text           not null default 'pendiente',
  created_at timestamptz    not null default now(),
  retired_at timestamptz,

  constraint codigos_status_check check (status in ('pendiente', 'retirado'))
);

create index if not exists codigos_created_at_idx on codigos (created_at desc);
create index if not exists codigos_status_idx on codigos (status);
create index if not exists codigos_client_idx on codigos (client_id);
