-- Server-side free-copy accounting for signed-out visitors.
-- Keys are "d:<device id>" (signed device cookie) and "i:<hashed ip>".
create table if not exists copy_usage (
  key text primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);
