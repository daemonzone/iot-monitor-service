import 'dotenv/config';
import mqtt from 'mqtt';
import pg from 'pg';
import pkg from 'pg';
const { Pool } = pg;

import { DeviceService } from './services/deviceService.js';
import { sendWebsocketUpdate } from './utils/websocketUtils.js';
import { updateHeartbeat } from './utils/monitorHeartbeat.js';

const HEARTBEAT_TTL = 60; // seconds

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
const deviceService = new DeviceService();
const devices = new Set();
const sensors_offsets = {};

client.on('connect', async () => {
  console.log('✅ Connected to MQTT broker');

  // Fetch all active devices and subscribe
  await deviceService.setupActiveDevices(client, devices); // pass Set

  // Listen for new devices registering
  client.subscribe('devices/+/register', (err) => {
    if (err) console.error('❌ Subscribe error:', err);
    else console.log('✅ Subscribed to devices/+/register');
  });

  await deviceService.loadSensorsOffsets();
  setInterval(() => { deviceService.loadSensorsOffsets() }, HEARTBEAT_TTL * 1000);

  updateHeartbeat(client);
  setInterval(() => updateHeartbeat(client), HEARTBEAT_TTL * 1000);
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

      const loggedPayload = JSON.parse(payload);
      if (loggedPayload.image) loggedPayload.image = '[base64 image omitted]';
      console.log(`✅ Registered payload received: ${JSON.stringify(loggedPayload)}`);

      if (!devices.has(deviceId)) {
        devices.add(deviceId);

        client.subscribe(`devices/${deviceId}/status`, (err) => {
          if (err) console.error('❌ Subscribe error:', err);
          else console.log(`✅ Subscribed to devices/${deviceId}/status`);
        });
      }

      await deviceService.handleRegistration(data);

      // Clear retained registration
      client.publish(topic, "", { retain: true }, (err) => {
        if (err) console.error(`Failed to clear retained message on ${topic}:`, err);
      });

      await deviceService.setupActiveDevices(client, devices);      

      // Enable to clear retained messages from register queues
/*
      devices.forEach(device => {
        console.log("Cleaning register queue for device", device)
        const topic = `devices/${device}/register`;
        client.publish(topic, '', { retain: true }, (err) => {
          if (err) console.error(`❌ Failed to clear retained message on ${topic}:`, err);
          else console.log(`✅ Cleared retained message on ${topic}`);
        });
      });        
*/
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
      // console.log(`📡 Status from ${deviceId}:`, JSON.stringify(data));
      await deviceService.handleStatus(data);
      sendWebsocketUpdate(client, data);
    } catch (e) {
      console.error(`Invalid JSON on ${topic}:`, payload, e);
    }
  }
});

// ---------------------------------------------------
client.on('error', (err) => {
  console.error('MQTT Error:', err);
});


