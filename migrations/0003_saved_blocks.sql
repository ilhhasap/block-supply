-- Blocks a signed-in user has bookmarked. One row per (user, block).
create table if not exists saved_blocks (
  user_id text not null,
  block_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, block_id)
);
