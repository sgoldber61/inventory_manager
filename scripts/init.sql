CREATE TABLE store (
  id serial primary key,
  quantity integer not null default 0,
  day date not null,
  unique(day)
);

CREATE TABLE records (
  id serial primary key,
  purchased integer not null default 0,
  sold integer not null default 0,
  expired integer not null default 0,
  in_inventory integer not null default 0,
  day date not null,
  unique(day)
);

CREATE INDEX day_index
ON records (day);
