CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    unit VARCHAR,
    value_type VARCHAR DEFAULT 'numeric' -- optional: numeric, boolean, string
);

CREATE UNIQUE INDEX idx_sensors_code ON sensors(code);

ALTER TABLE devices ADD COLUMN sensors VARCHAR;

-- ALTER TABLE devices_readings DROP COLUMN led, temperature, humidity;
ALTER TABLE devices_readings ADD COLUMN sensors_data JSONB;

INSERT INTO sensors (code, name, unit) VALUES
  ('temperature', 'Temperature', '°C', 'numeric'),
  ('humidity', 'Humidity', '%', 'numeric'),
  ('led', 'LED State', NULL, 'boolean'),
  ('cpu_temperature', 'CPU Temperature', '°C', 'numeric'),
  ('co2', 'CO₂', 'ppm', 'numeric');
