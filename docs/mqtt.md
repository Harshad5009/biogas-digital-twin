# MQTT Protocol & Topics Reference

## 1. Broker Configuration
- **Host**: `localhost` (or ESP8266 network IP)
- **TCP Port**: `1883`
- **WebSocket Port**: `9001`
- **Default Client ID**: `biogas-backend` (Backend), `ESP8266_Biogas_Digester01` (ESP8266)

---

## 2. Topic Taxonomy

### 1. `biogas/digester01/sensors`
- **Direction**: ESP8266 / Simulator -> Backend
- **QoS**: 0 or 1
- **Frequency**: Every 5 seconds
- **Payload Schema**:
```json
{
  "device_id": "digester01",
  "temperature": 32.4,
  "humidity": 62.0,
  "mq5": 385,
  "mq2": 310,
  "methane": 58.2,
  "gas_production": 2.503,
  "source": "ESP8266"
}
```

### 2. `biogas/digester01/commands`
- **Direction**: Backend -> ESP8266
- **Purpose**: Actuator triggering, alarm sounder, status LEDs
- **Payload Schema**:
```json
{
  "command": "ALERT",
  "level": "CRITICAL"
}
```

### 3. `biogas/digester01/alerts`
- **Direction**: Backend -> Subscribers / ESP8266
- **Payload Schema**:
```json
{
  "command": "ALERT",
  "level": "WARNING",
  "message": "Sustained temperature decline detected (trend-based)"
}
```

### 4. `biogas/digester01/status`
- **Direction**: Backend -> Network Monitoring
- **Payload Schema**:
```json
{
  "backend": "ONLINE",
  "mqtt_connected": true,
  "data_source": "SIMULATION"
}
```
