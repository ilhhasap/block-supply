-- One row per successful "Copy to Figma", for the owner's stats page.
-- `actor` is "u:<user id>" for signed-in visitors or "d:<hashed device id>" for anonymous ones,
-- so unique copiers can be counted without storing anything identifying.
create table if not exists copy_events (
  id bigserial primary key,
  block_id text not null,
  user_id text,
  actor text not null,
  created_at timestamptz not null default now()
);

create index if not exists copy_events_block_idx on copy_events (block_id);
create index if not exists copy_events_created_idx on copy_events (created_at);
