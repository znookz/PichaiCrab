-- 入力値のみ保存し、計算値は読み出し時に calcLot で算出する
CREATE TABLE lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  kg REAL NOT NULL CHECK (kg > 0),
  crab INTEGER NOT NULL CHECK (crab > 0),
  vn_fee REAL NOT NULL CHECK (vn_fee >= 0),
  rate1 REAL NOT NULL CHECK (rate1 > 0),
  th_fee REAL NOT NULL CHECK (th_fee >= 0),
  rate2 REAL NOT NULL CHECK (rate2 > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_lots_date ON lots (date);
