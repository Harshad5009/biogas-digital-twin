/**
 * biogas_node.ino — Main Arduino sketch for ESP8266 Biogas Digester Node.
 *
 * Project: IoT-Enabled Digital Twin for Real-Time Biogas Digester Monitoring
 * Hardware: ESP8266 + DHT11 + MQ-5 + MQ-2 + SSD1306 OLED + Buzzer
 */

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "display.h"
#include "mqtt_handler.h"

unsigned long lastSensorReadTime = 0;
unsigned long lastDisplayRefreshTime = 0;
unsigned long lastReconnectAttempt = 0;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println(" Biogas Digester IoT Node — ESP8266 Firmware     ");
  Serial.println("==================================================");

  // Initialize sensors, actuators, and OLED
  initSensors();
  initDisplay();

  // Setup networking
  setupWiFi();
  setupMQTT();

  Serial.println("[SYSTEM] ESP8266 initialization complete.");
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Maintain WiFi & MQTT connectivity without blocking
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      if (currentMillis - lastReconnectAttempt > MQTT_RECONNECT_DELAY_MS) {
        lastReconnectAttempt = currentMillis;
        reconnectMQTT();
      }
    } else {
      mqttClient.loop();
    }
  }

  // 2. Periodic Sensor Acquisition and Publishing
  if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = currentMillis;

    SensorData currentReadings = readSensors();
    Serial.printf("[SENSOR] T=%.1f C | H=%.1f %% | MQ5=%.0f | MQ2=%.0f | GasEst=%.3f L/min\n",
                  currentReadings.temperature, currentReadings.humidity,
                  currentReadings.mq5_raw, currentReadings.mq2_raw,
                  currentReadings.gas_production_simulated);

    // Publish to Digital Twin via MQTT
    publishSensorData(currentReadings);

    // Refresh OLED screen with latest parameters
    updateDisplay(currentReadings, systemStatus, (WiFi.status() == WL_CONNECTED), mqttClient.connected());
  }

  yield(); // Allow ESP8266 background WiFi stack & watchdog to process
  delay(10);
}
