-- Clients: the people who send money. One row per person.

create table if not exists clients (
  id            bigserial primary key,
  name          text not null,
  phone         text,          -- stored as text, not a number (leading zeros, "+34", etc.)
  banks         text[],        -- a client can have more than one bank
  dni_nie       text,
  registered_at date
);

-- Search-by-name is case-insensitive, so index the lowercased name.
create index if not exists clients_name_idx on clients (lower(name));
create index if not exists clients_phone_idx on clients (phone);
