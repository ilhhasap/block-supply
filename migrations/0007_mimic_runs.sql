-- One row per Mimic generation (screenshot to editable block). Used for the daily limit and to see what each run cost.
-- A run that fails is marked 'failed' and no longer counts against the limit.
create table if not exists mimic_runs (
  id bigserial primary key,
  user_id text not null,
  status text not null default 'pending',
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists mimic_runs_user_idx on mimic_runs (user_id, created_at);
