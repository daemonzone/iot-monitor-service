-- Drop everything cleanly
DROP TABLE IF EXISTS devices_readings;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS monitor_status;

-- Main table
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE, -- unique so it can be referenced
  model VARCHAR NOT NULL,
  ip_addr VARCHAR NOT NULL,
  uptime BIGINT DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  location VARCHAR,
  sensors JSONB,
  last_status_update TIMESTAMPTZ NOT NULL,
  first_registration_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- Readings table
CREATE TABLE devices_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  device_reading_timestamp TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_addr VARCHAR,
  uptime BIGINT,
  sensors_data JSONB
);

-- Trigger function to update device status
CREATE OR REPLACE FUNCTION update_device_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_status_update = now(),
      status = TRUE,
      ip_addr = COALESCE(NEW.ip_addr, ip_addr),
      uptime  = COALESCE(NEW.uptime, uptime)
  WHERE device_id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: run after every insert on devices_readings
CREATE OR REPLACE TRIGGER trg_update_device_status
AFTER INSERT ON devices_readings
FOR EACH ROW
EXECUTE FUNCTION update_device_status();

-- Sensors table
CREATE TABLE sensors (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    unit VARCHAR,
    value_type VARCHAR DEFAULT 'numeric', -- optional: numeric, boolean, string
    icon VARCHAR
);

CREATE UNIQUE INDEX idx_sensors_code ON sensors(code);

INSERT INTO sensors (code, name, unit, value_type, icon) VALUES
('temperature', 'Temperature', '°C', 'numeric', 'FiThermometer'),
('humidity', 'Humidity', '%', 'numeric', 'FiDroplet'),
('led', 'LED State', NULL, 'boolean', 'FiSun'),
('cpu_temperature', 'CPU Temperature', '°C', 'numeric', 'FiCpu'),
('co2', 'CO₂', 'ppm', 'numeric', 'FiCloud'),
('pressure', 'Pressure', 'kPA', 'numeric', 'FiSunset'),
('coordinates', 'GPS', NULL, 'string', 'FiMapPin');

-- Sensors table
CREATE TABLE sensors_offsets (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    code VARCHAR NOT NULL,
    offset FLOAT
);

CREATE UNIQUE INDEX idx_sensors_offsets_device_id_code ON sensors_offsets(device_id, code);

