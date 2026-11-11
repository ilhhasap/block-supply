-- Request counters for Better Auth's rate limiter, shared across serverless instances.
create table if not exists "rateLimit" (
  id text primary key,
  key text not null unique,
  count integer not null,
  "lastRequest" bigint not null
);
