# 🌐 IoT Monitor Service

## ⚙️ Overview

This project combines firmware and software for microcontrollers, backend services, and monitoring tools.

### 🛰️ IoT Monitor Service

A **Node.js service** responsible for:
- Identifying devices connected and allowed to send telemetry data
- Receiving telemetry from devices
- Persisting data into TimescaleDB
- Initializing database tables and hypertables
- _Sending commands to devices (wip)_


### Requirements / Tech Stack
- **Node.js**,
- **TimescaleDB**
- **MQTT**

---

## 📁 Repositories

The whole project is based on different components, split on several repositories

| Component                                                                            | Description                                                              |
|--------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| [iot-monitor-service](https://github.com/daemonzone/iot-monitor-service)             | Node.js **monitoring and control service**, interacting with the backend |  
| [iot-clients-esp8266-esp32](https://github.com/daemonzone/iot-clients-esp8266-esp32) | esp8266 / esp32 **C++ client sketches**                          |
| [iot-clients-node](https://github.com/daemonzone/iot-clients-node)                   | **Node.js clients** for newer Raspberry/OrangePi devices                 | 
| [iot-clients-node-legacy](https://github.com/daemonzone/iot-clients-node-legacy)     | Node.js clients for **older devices** (Armbian v3, mqtt4)                | 
| [iot-monitor-api](https://github.com/daemonzone/iot-monitor-api)                     | **API interface** to retrieve devices and telemetry from TimescaleDB     |
| [iot-monitor-dashboard](https://github.com/daemonzone/iot-monitor-dashboard)         | React **Web Dashboard** for device charts                                |


### 🧠 Wemos / ESP32 Clients
 - For IoT nodes based on **esp8266 / esp32** microcontrollers (i.e Wemos D1 mini)
 - Each device has its own unique identifier
 - Each device announces itself on a MQTT queue, being identified by the monitoring service.
 - Each device periodically publishes telemetry and status (e.g. temperature, humidity, status) to a per-device MQTT queue

### 💻 NodeJs Clients
Node.js based client code available for micro-computers (like Raspberry or Orange Pi)

### 🕹️ NodeJs Clients (legacy)
Node.js v10 based client code available for older micro-computers (running Armbian v3.4.113)

### 🌐 IoT Monitor API
A **Node.js service** responsible for:
  - Collecting and storing device telemetry into TimescaleDB  
  - Exposing REST endpoints to query device data and status  

### 🖥️ IoT Monitor Dashboard
**React Web Interface** to:
  - Visualize real-time device status and historical telemetry  
  - Display charts for temperature, humidity, uptime, and other metrics  
  - Filter, sort, and explore devices and their readings  

---

## 🧰 Tech Stack

| Component | Technology             | Provider (with free plan) |
|------------|------------------------|---------------------------|
| Firmware | C++ (Arduino, ESP-IDF) | -                         |
| Backend / Monitor | Node.js                | -                         |
| Database | PostgreSQL + TimescaleDB | [Neon](https://neon.com/) | 
| Messaging | MQTT / Mosquitto      | [HiveMQ](https://www.hivemq.com/) |
| Dashboard | Node.js client or web app | -                         |

---

## 🚀 Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/daemonzone/iot-monitor-service.git
   cd iot-monitor-service

2. Install **iot-monitor-service** dependencies

   _**Requires node >= 20_ 
   ```
   cd iot-monitor-service
   npm install
   ```

3. Configure the environment
   Copy .env.example to .env and fill in with Database and MQTT parameters:

   ```
   MQTT_USER=mqtt_user
   MQTT_PASS=mqtt_user  
   MQTT_BROKER_URL=mqtt://localhost
   DATABASE_URL=postgres://user:password@localhost/iot
   ```

4. Run the iot-monitor-service
   ```
   npm start
   ```

   ### 🚀 Console output

   ```
   > monitoring-server@1.0.0 start
   > node monitor.js
   
   Connected to MQTT broker
   📡 Loaded 2 active devices.
   Subscribed to devices/wemos-46fea4/status
   Subscribed to devices/wemos-52b44b/status
   📡 Status from wemos-52b44b: {"id":"wemos-52b44b","status":"up","led":"ON","ip":"10.94.176.24","uptime":163,"timestamp":"2025-11-06 00:07:01"}
   Subscribed to devices/+/register
   ✅ Status stored for wemos-52b44b at 2025-11-06 00:07:01
   ...
   ```
---

## 🧑‍💻 Author

**Davide V.**  

IoT enthusiast and full-stack developer

📍 Italy  
📫 **GitHub:** [@daemonzone](https://github.com/daemonzone)  
📧 **Email:** daemonzone@users.noreply.github.com
