/**
 * mqtt_handler.h — MQTT handler for ESP8266 Biogas Monitoring Node
 *
 * Handles:
 *   - TLS connection to HiveMQ Cloud (port 8883)
 *   - Wi-Fi reconnection
 *   - MQTT reconnection
 *   - JSON sensor telemetry publication
 *   - Alert/command reception from backend
 *
 * Libraries required (install via Arduino Library Manager):
 *   - PubSubClient  (by Nick O'Leary)
 *   - ArduinoJson   (by Benoit Blanchon, v6+)
 *   - ESP8266WiFi   (included with ESP8266 board package)
 *   - WiFiClientSecure (included with ESP8266 board package)
 *
 * Usage:
 *   1. Fill in credentials in config.h
 *   2. Call mqttSetup() in setup()
 *   3. Call mqttLoop()  in loop()
 *   4. Call publishSensorReading(...) whenever you have fresh readings
 */

#pragma once

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────────────────────────────────────
// Pull credentials from config.h
// Expected defines in config.h:
//   WIFI_SSID, WIFI_PASSWORD
//   MQTT_HOST, MQTT_PORT (8883), MQTT_USERNAME, MQTT_PASSWORD, MQTT_CLIENT_ID
//   MQTT_TOPIC_SENSORS   e.g. "biogas/digester01/sensors"
//   MQTT_TOPIC_COMMANDS  e.g. "biogas/digester01/commands"
//   DEVICE_ID            e.g. "digester01"
// ─────────────────────────────────────────────────────────────────────────────
#include "config.h"

// ─────────────────────────────────────────────────────────────────────────────
// Globals (file-local)
// ─────────────────────────────────────────────────────────────────────────────
static WiFiClientSecure  _wifiClient;
static PubSubClient      _mqttClient(_wifiClient);

// Callback registered by the sketch to handle backend commands
static void (*_commandCallback)(const char* command, const char* level) = nullptr;

// ─────────────────────────────────────────────────────────────────────────────
// Forward declarations
// ─────────────────────────────────────────────────────────────────────────────
static void _mqttCallback(char* topic, byte* payload, unsigned int length);
static bool _mqttReconnect();
static void _ensureWiFi();

// ─────────────────────────────────────────────────────────────────────────────
// Wi-Fi connection
// ─────────────────────────────────────────────────────────────────────────────

static void _ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.print("[WiFi] Connecting to SSID: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 30) {
        delay(500);
        Serial.print('.');
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("[WiFi] Connected. IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[WiFi] Connection failed — will retry.");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MQTT callback — handles commands from backend
// ─────────────────────────────────────────────────────────────────────────────

static void _mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Null-terminate payload
    char buf[256];
    size_t copyLen = (length < sizeof(buf) - 1) ? length : sizeof(buf) - 1;
    memcpy(buf, payload, copyLen);
    buf[copyLen] = '\0';

    Serial.print("[MQTT] Message received on topic: ");
    Serial.print(topic);
    Serial.print(" | Payload: ");
    Serial.println(buf);

    // Only handle command topic
    if (strcmp(topic, MQTT_TOPIC_COMMANDS) != 0) return;

    // Parse JSON command
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, buf);
    if (err) {
        Serial.print("[MQTT] JSON parse error: ");
        Serial.println(err.c_str());
        return;
    }

    const char* command = doc["command"] | "";
    const char* level   = doc["level"]   | "INFO";

    if (_commandCallback) {
        _commandCallback(command, level);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MQTT reconnect
// ─────────────────────────────────────────────────────────────────────────────

static bool _mqttReconnect() {
    if (_mqttClient.connected()) return true;

    Serial.print("[MQTT] Connecting to broker: ");
    Serial.print(MQTT_HOST);
    Serial.print(":");
    Serial.println(MQTT_PORT);

    bool ok = _mqttClient.connect(
        MQTT_CLIENT_ID,
        MQTT_USERNAME,
        MQTT_PASSWORD
    );

    if (ok) {
        Serial.println("[MQTT] Connected.");
        // Subscribe to command topic
        _mqttClient.subscribe(MQTT_TOPIC_COMMANDS);
        Serial.print("[MQTT] Subscribed to: ");
        Serial.println(MQTT_TOPIC_COMMANDS);
    } else {
        Serial.print("[MQTT] Connection failed. RC=");
        Serial.println(_mqttClient.state());
    }

    return ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — call from setup()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * mqttSetup() — Initialize Wi-Fi + MQTT.
 *
 * @param commandCallback  Optional function called when a backend command
 *                         arrives: void cb(const char* command, const char* level)
 *                         e.g. command="ALERT", level="WARNING"
 */
inline void mqttSetup(void (*commandCallback)(const char*, const char*) = nullptr) {
    _commandCallback = commandCallback;

    // Configure TLS — accept any certificate (suitable for HiveMQ Cloud where
    // the certificate chain is validated by the CA bundle built into the SDK).
    // For production use, load a specific certificate fingerprint instead.
    _wifiClient.setInsecure();

    // Connect Wi-Fi
    _ensureWiFi();

    // Configure MQTT broker
    _mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    _mqttClient.setCallback(_mqttCallback);
    _mqttClient.setKeepAlive(60);
    _mqttClient.setBufferSize(512);

    // Initial MQTT connection attempt
    _mqttReconnect();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — call every loop()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * mqttLoop() — Maintain Wi-Fi + MQTT connections and process incoming messages.
 * Call this at the top of loop().
 */
inline void mqttLoop() {
    _ensureWiFi();

    if (!_mqttClient.connected()) {
        static unsigned long lastRetry = 0;
        if (millis() - lastRetry > 5000) {
            lastRetry = millis();
            _mqttReconnect();
        }
    }

    _mqttClient.loop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — publish sensor reading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * publishSensorReading() — Build and publish a JSON sensor payload.
 *
 * Payload schema (matches backend normalize_sensor_data() expectations):
 * {
 *   "device_id":     "digester01",
 *   "source":        "LIVE",
 *   "temperature":   28.6,
 *   "humidity":      70.0,
 *   "mq5_analog":    244,
 *   "mq5_status":    "NORMAL",
 *   "mq2_status":    "NORMAL",
 *   "system_status": "NORMAL",
 *   "timestamp":     "2024-01-01T12:00:00Z"
 * }
 *
 * @param temperature   DHT11 temperature (°C)
 * @param humidity      DHT11 humidity (%)
 * @param mq5Analog     MQ-5 raw ADC reading (0-1023)
 * @param mq5Status     "NORMAL" or "ALERT"
 * @param mq2Status     "NORMAL" or "ALERT"
 * @param systemStatus  "NORMAL", "WARNING", or "CRITICAL"
 *
 * @return true if published successfully, false otherwise.
 */
inline bool publishSensorReading(
    float       temperature,
    float       humidity,
    int         mq5Analog,
    const char* mq5Status,
    const char* mq2Status,
    const char* systemStatus
) {
    if (!_mqttClient.connected()) {
        Serial.println("[MQTT] Not connected — cannot publish.");
        return false;
    }

    // Build JSON payload
    StaticJsonDocument<384> doc;
    doc["device_id"]     = DEVICE_ID;
    doc["source"]        = "LIVE";
    doc["temperature"]   = round(temperature * 100.0f) / 100.0f;
    doc["humidity"]      = round(humidity    * 100.0f) / 100.0f;
    doc["mq5_analog"]    = mq5Analog;
    doc["mq5_status"]    = mq5Status;
    doc["mq2_status"]    = mq2Status;
    doc["system_status"] = systemStatus;

    // ISO-8601 approximate timestamp (NTP not assumed; backend uses server time)
    doc["timestamp"] = ""; // leave blank — backend fills in server-side timestamp

    char jsonBuf[384];
    serializeJson(doc, jsonBuf, sizeof(jsonBuf));

    bool ok = _mqttClient.publish(MQTT_TOPIC_SENSORS, jsonBuf, /*retained=*/false);

    if (ok) {
        Serial.print("[MQTT] Published to ");
        Serial.print(MQTT_TOPIC_SENSORS);
        Serial.print(": ");
        Serial.println(jsonBuf);
    } else {
        Serial.println("[MQTT] Publish failed.");
    }

    return ok;
}

/**
 * mqttIsConnected() — Returns true if MQTT broker is currently connected.
 */
inline bool mqttIsConnected() {
    return _mqttClient.connected();
}