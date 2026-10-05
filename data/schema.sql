CREATE TABLE qr_static_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  card_number TEXT NOT NULL CHECK (length(trim(card_number)) > 0),
  constant TEXT NOT NULL CHECK (length(trim(constant)) > 0),
  device_id TEXT NOT NULL CHECK (length(trim(device_id)) > 0)
);

INSERT INTO qr_static_config (id, card_number, constant, device_id)
VALUES (
  1,
  'V010803716',
  'PHD',
  'Jfeb8df47-0fa7-465c-b3f2-13055bcb1b50'
);
