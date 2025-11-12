-- Drop everything cleanly
DROP TABLE IF EXISTS devices_readings;
DROP TABLE IF EXISTS devices;

-- Main table
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE, -- unique so it can be referenced
  model VARCHAR NOT NULL,
  ip_addr VARCHAR NOT NULL,
  uptime BIGINT DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT false,
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
  led BOOLEAN,
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION
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
