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
const char* systemStatus = "NORMAL";

// ─────────────────────────────────────────────────────────────────────────────
// Command callback: handles incoming alert/buzzer commands from Digital Twin
// ─────────────────────────────────────────────────────────────────────────────
void onCommandReceived(const char* command, const char* level) {
  Serial.printf("[COMMAND] Received from Twin: %s | Level: %s\n", command, level);
  if (strcmp(command, "ALERT") == 0) {
    systemStatus = (strcmp(level, "CRITICAL") == 0) ? "CRITICAL" : "WARNING";
    triggerAlarm(true);  // Turn buzzer ON
  } else if (strcmp(command, "CLEAR") == 0 || strcmp(command, "NORMAL") == 0) {
    systemStatus = "NORMAL";
    triggerAlarm(false); // Turn buzzer OFF
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println(" Biogas Digester IoT Node — ESP8266 Firmware     ");
  Serial.println("==================================================");

  // Initialize sensors, actuators (buzzer), and OLED
  initSensors();
  initDisplay();

  // Setup networking with command callback for buzzer activation
  mqttSetup(onCommandReceived);

  Serial.println("[SYSTEM] ESP8266 initialization complete.");
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Maintain Wi-Fi and MQTT connectivity and process incoming commands
  mqttLoop();

  // 2. Periodic Sensor Acquisition and Publishing
  if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = currentMillis;

    SensorData currentReadings = readSensors();
    Serial.printf("[SENSOR] T=%.1f C | H=%.1f %% | MQ5=%.0f | MQ2=%.0f | GasEst=%.3f L/min\n",
                  currentReadings.temperature, currentReadings.humidity,
                  currentReadings.mq5_raw, currentReadings.mq2_raw,
                  currentReadings.gas_production_simulated);

    // Local safety trip: trigger buzzer if hardware detects dangerous limits
    bool isDangerous = (currentReadings.mq5_raw > 650.0f) ||
                       (currentReadings.temperature > 40.0f) ||
                       (currentReadings.temperature < 20.0f);

    const char* mq5Status = (currentReadings.mq5_raw > 550.0f) ? "ALERT" : "NORMAL";
    const char* mq2Status = (currentReadings.mq2_raw > 550.0f) ? "ALERT" : "NORMAL";

    if (isDangerous) {
      systemStatus = (currentReadings.mq5_raw > 750.0f || currentReadings.temperature > 45.0f) ? "CRITICAL" : "WARNING";
      triggerAlarm(true);
    }

    // Publish to Digital Twin via MQTT
    publishSensorReading(
      currentReadings.temperature,
      currentReadings.humidity,
      (int)currentReadings.mq5_raw,
      mq5Status,
      mq2Status,
      systemStatus
    );

    // Refresh OLED screen with latest parameters
    updateDisplay(currentReadings, systemStatus, (WiFi.status() == WL_CONNECTED), mqttIsConnected());
  }

  yield(); // Allow ESP8266 background WiFi stack & watchdog to process
  delay(10);
}
