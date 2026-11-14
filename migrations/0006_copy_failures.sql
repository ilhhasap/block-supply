-- One row per "Couldn't copy" a visitor sees, so the owner's dashboard can show which blocks fail and why.
-- `actor` matches copy_events ("u:<user id>", "d:<hashed device id>", or "anon" with no cookie yet).
create table if not exists copy_failures (
  id bigserial primary key,
  block_id text not null,
  user_id text,
  actor text not null,
  message text not null,
  browser text,
  created_at timestamptz not null default now()
);

create index if not exists copy_failures_created_idx on copy_failures (created_at);
create index if not exists copy_failures_block_idx on copy_failures (block_id);
