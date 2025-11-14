import pkg from 'pg';
const { Pool } = pkg;

export class DeviceService {
  constructor() {
    // TimescaleDB configuration from environment
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Optional caches
    this.sensorsOffsets = {};
    this.activeDevices = new Set();

    this.round = (value, decimals = 2) =>
      Number(Math.round(value * 10**decimals) / 10**decimals);
  }


  async loadSensorsOffsets() {
    try {
      const results = await this.pool.query(`SELECT * FROM sensors_offsets s ORDER BY device_id, code;`);

      for (const row of results.rows) {
        const { device_id, code, offset } = row;

        if (!this.sensorsOffsets[device_id]) {
          this.sensorsOffsets[device_id] = {};
        }

        this.sensorsOffsets[device_id][code] = offset;
      }
    } catch (err) {
      console.error("Error fetching active devices from DB:", err);
    }
  }

  async handleRegistration(payload) {
    const { id, model, ip, sensors, image } = payload;

    if (!id || !model || !ip) {
      console.warn('Missing fields in registration payload:', payload);
      return;
    }

    const query = `
      INSERT INTO devices (device_id, model, ip_addr, last_status_update, sensors, image)
      VALUES ($1, $2, $3, now(), $4, $5)
      ON CONFLICT (device_id)
      DO UPDATE SET
        model = EXCLUDED.model,
        ip_addr = EXCLUDED.ip_addr,
        sensors = EXCLUDED.sensors,
        image = COALESCE(EXCLUDED.image, devices.image),
        deleted = FALSE;
    `;

    await this.pool.query(query, [id, model, ip, JSON.stringify(payload.sensors), image]);
    console.log(`📦 Device registered: ${id}`);
  }


  async handleStatus(payload) {
    const { id, ip, uptime, timestamp, sensors_data } = payload;

    if (!id) {
      console.warn("Missing device ID in status payload:", payload);
      return;
    }

    const query = `
      INSERT INTO devices_readings
        (device_id, ip_addr, uptime, device_reading_timestamp, sensors_data, sensors_offsets)
      VALUES
        ($1, $2, $3, $4, $5, $6);
    `;

    const sensors_offsets_payload = {};
    const deviceOffsets = this.sensorsOffsets[id] || null;

    if (deviceOffsets) {
      // Apply offsets and build payload
      for (const key in sensors_data) {
        if (!deviceOffsets[key]) continue;

        const rawValue = sensors_data[key];

        if (typeof rawValue === "number") {
          const offset = deviceOffsets[key] ?? 0;
          sensors_offsets_payload[key] = offset;
          sensors_data[key] = this.round(rawValue + offset, 2);
        }
      }
    }

    const values = [
      id,
      ip,
      uptime || null,
      timestamp,
      JSON.stringify(sensors_data),           // store calibrated values
      JSON.stringify(sensors_offsets_payload) // store offsets used
    ];

    try {
      await this.pool.query(query, values);
      console.log(`✅ Status stored for ${id} at ${timestamp}`);
    } catch (err) {
      console.error(`❌ Error storing status for ${id}:`, err);
    }
  }



  // Fetch all active devices from DB and subscribe to their status topics
  async setupActiveDevices(client, devices) {
    try {
      // Fetch active devices
      const res = await this.pool.query(`SELECT device_id FROM devices WHERE status = TRUE`);
      console.log(`📡 Loaded ${res.rows.length} active devices.`);

      res.rows.forEach(row => {
        const deviceId = row.device_id;

        // Add to devices Set if not already present
        if (!devices.has(deviceId)) {
          devices.add(deviceId);

          // Subscribe to its status topic
          const statusTopic = `devices/${deviceId}/status`;
          client.subscribe(statusTopic, (err) => {
            if (err) console.error(`❌Failed to subscribe to ${statusTopic}:`, err);
            else console.log(`✅ Subscribed to ${statusTopic}`);
          });
        }
      });

    } catch (err) {
      console.error("Error fetching active devices from DB:", err);
    }
  }
}