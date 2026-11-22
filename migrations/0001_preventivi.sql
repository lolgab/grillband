CREATE TABLE preventivi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  nome TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  data_evento TEXT,
  luogo TEXT NOT NULL,
  formula TEXT,
  messaggio TEXT,
  ip TEXT
);
