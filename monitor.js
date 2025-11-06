import 'dotenv/config';
import mqtt from 'mqtt';
import pg from 'pg';
import pkg from 'pg';
const { Pool } = pg;

import { handleRegistration, handleStatus, setupActiveDevices } from './libs/deviceHandlers.js';

// TimescaleDB configuration from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// MQTT configuration from environment
const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

// Connect options
const options = {
  username: MQTT_USER,
  password: MQTT_PASS,
  rejectUnauthorized: false // optional, depends on your cert setup
};

const client = mqtt.connect(MQTT_BROKER, options);
const devices = new Set();

client.on('connect', async () => {
  console.log('Connected to MQTT broker');

  // Fetch all active devices and subscribe
  await setupActiveDevices(client, devices); // pass Set

  // Listen for new devices registering
  client.subscribe('devices/+/register', (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log('Subscribed to devices/+/register');
  });
});

// ---------------------------------------------------
// MQTT message handler
// ---------------------------------------------------
client.on('message', async (topic, message) => {
  const payload = message.toString();
  if (!payload) return;

  // --- registration ---
  const regMatch = topic.match(/^devices\/(.+)\/register$/);
  if (regMatch) {
    const deviceId = regMatch[1];

    try {
      const data = JSON.parse(payload);

      if (!devices.has(deviceId)) {
        devices.add(deviceId);

        await handleRegistration(data);

        client.subscribe(`devices/${deviceId}/status`, (err) => {
          if (err) console.error('Subscribe error:', err);
          else console.log(`Subscribed to devices/${deviceId}/status`);
        });

        // Clear retained registration
        client.publish(topic, "", { retain: true }, (err) => {
          if (err) console.error(`Failed to clear retained message on ${topic}:`, err);
        });

        await setupActiveDevices(client, devices);
      }
    } catch (e) {
      console.error(`Invalid JSON on ${topic}:`, payload, e);
    }

    return;
  }

  // --- status updates ---
  const statusMatch = topic.match(/^devices\/(.+)\/status$/);
  if (statusMatch) {
    const deviceId = statusMatch[1];

    try {
      const data = JSON.parse(payload);
      console.log(`📡 Status from ${deviceId}:`, JSON.stringify(data));
      await handleStatus(data);
    } catch (e) {
      console.error(`Invalid JSON on ${topic}:`, payload, e);
    }
  }
});

// ---------------------------------------------------
client.on('error', (err) => {
  console.error('MQTT Error:', err);
});


