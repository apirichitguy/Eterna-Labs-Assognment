CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  token_in TEXT,
  token_out TEXT,
  amount_in NUMERIC,
  status TEXT,
  created_at TIMESTAMP,
  last_error TEXT
);
