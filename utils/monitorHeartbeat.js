export async function updateHeartbeat(mqttClient) {
  try {
    const date = new Date();
    const offset = -date.getTimezoneOffset();
    const timestamp = Math.floor(Date.now() / 1000);

    // Publish to /monitor/status
    mqttClient.publish("monitor/status",
      JSON.stringify({ last_heartbeat_timestamp: timestamp }),
      { retain: false }
    );
    console.info("Monitor heartbeat sent:", Date.now());
  } catch (err) {
    console.error("Failed to update heartbeat:", err);
  }
}