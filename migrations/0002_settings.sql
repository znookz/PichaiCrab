-- 記録画面の初期値(基準値)。常に1行だけ持つ
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  rate1 REAL NOT NULL CHECK (rate1 > 0),
  rate2 REAL NOT NULL CHECK (rate2 > 0),
  vn_fee REAL NOT NULL CHECK (vn_fee >= 0),
  th_fee REAL NOT NULL CHECK (th_fee >= 0)
);

-- 既存データがあれば、最新ロットの値で初期化する
INSERT INTO settings (id, rate1, rate2, vn_fee, th_fee)
SELECT 1, rate1, rate2, vn_fee, th_fee FROM lots ORDER BY date DESC, id DESC LIMIT 1;
