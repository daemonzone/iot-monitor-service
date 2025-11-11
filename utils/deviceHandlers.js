import pkg from 'pg';
const { Pool } = pkg;

// TimescaleDB configuration from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handleRegistration(payload) {
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

  await pool.query(query, [id, model, ip, JSON.stringify(payload.sensors), image]);
  console.log(`📦 Device registered: ${id}`);
}


export async function handleStatus(payload) {
  const { id, ip, uptime, timestamp, sensors_data } = payload;

  if (!id) {
    console.warn("Missing device ID in status payload:", payload);
    return;
  }

  const query = `
    INSERT INTO devices_readings
      (device_id, ip_addr, uptime, device_reading_timestamp, sensors_data)
    VALUES
      ($1, $2, $3, $4, $5);
  `;

  const values = [
    id,
    ip,
    uptime || null,
    timestamp,
    sensors_data
  ];

  try {
    await pool.query(query, values);
    console.log(`✅ Status stored for ${id} at ${timestamp}`);
  } catch (err) {
    console.error(`❌Error storing status for ${id}:`, err);
  }
}


// Fetch all active devices from DB and subscribe to their status topics
export async function setupActiveDevices(client, devices) {
  try {
    // Fetch active devices
    const res = await pool.query(`SELECT device_id FROM devices WHERE status = TRUE`);
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


