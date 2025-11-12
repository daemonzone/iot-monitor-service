import crypto from "crypto";

function broadcast(wss, data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

export function sendWebsocketUpdate(client, data) {
	const websocket_topic = `websockets/${data.id}/status`;

 	try {
    client.publish(websocket_topic, JSON.stringify(data), { retain: false }, (err) => {
      if (err) console.error(`Failed to send message on ${topic}:`, err);
      else console.log("📡 Status broadcasted to", websocket_topic);
    });
	} catch (e) {
    console.error('Error sending update:', e);
  }
}