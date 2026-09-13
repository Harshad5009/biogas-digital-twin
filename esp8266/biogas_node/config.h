/**
 * config.h — ESP8266 Biogas Digester Node Hardware & Network Configuration
 *
 * Project: IoT-Enabled Digital Twin for Real-Time Biogas Digester Monitoring
 * Target Microcontroller: ESP8266 (NodeMCU v2/v3, Wemos D1 Mini)
 *
 * SENSORS & PERIPHERALS:
 * - DHT11 (Temperature & Humidity)
 * - MQ-5 (Gas Indicator)
 * - MQ-2 (Gas/Smoke Indicator)
 * - SSD1306 I2C OLED (0.96")
 * - Active 5V Buzzer
 * - Potentiometer (for simulation control demo)
 *
 * SINGLE ADC ARCHITECTURE:
 * ESP8266 features only ONE analog input pin (A0, 0-1024, 10-bit ADC).
 * Configure HARDWARE_MODE below to select your active A0 connection.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// 1. HARDWARE OPERATING MODE (ESP8266 Single ADC Selection)
// ============================================================================
#define MODE_MQ5_PHYSICAL   1  // A0 physically connected to MQ-5 analog output
#define MODE_MQ2_PHYSICAL   2  // A0 physically connected to MQ-2 analog output
#define MODE_POT_DEMO       3  // A0 physically connected to Potentiometer (demo mode)

// Set the active mode (Change as needed for your breadboard setup):
#define HARDWARE_MODE       MODE_MQ5_PHYSICAL

// ============================================================================
// 2. PIN DEFINITIONS (NodeMCU ESP8266)
// ============================================================================
// DHT11 Sensor
#define DHT_PIN             14       // NodeMCU D5 (GPIO 14)
#define DHT_TYPE            DHT11    // DHT11 or DHT22

// Single Analog Pin
#define MQ_ANALOG_PIN       A0       // ESP8266 ADC0 (TOUT, 0 - 1024)

// I2C OLED Display (SSD1306)
#define I2C_SDA_PIN         4        // NodeMCU D2 (GPIO 4)
#define I2C_SCL_PIN         5        // NodeMCU D1 (GPIO 5)
#define OLED_I2C_ADDR       0x3C     // Standard I2C address for 0.96" OLED

// Actuators
#define BUZZER_PIN          12       // NodeMCU D6 (GPIO 12) - Active Buzzer
#define STATUS_LED_PIN      2        // NodeMCU D4 (GPIO 2 / Built-in LED, Active LOW)

// ============================================================================
// 3. WI-FI CREDENTIALS (Configure for your local network)
// ============================================================================
#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

// ============================================================================
// 4. MQTT BROKER CONFIGURATION
// ============================================================================
#define MQTT_BROKER         "192.168.1.100"   // IP address of computer running Mosquitto / Backend
#define MQTT_PORT           1883
#define MQTT_USER           ""                // Leave empty if anonymous
#define MQTT_PASS           ""
#define MQTT_CLIENT_ID      "ESP8266_Biogas_Digester01"

// MQTT Topics
#define TOPIC_SENSORS       "biogas/digester01/sensors"
#define TOPIC_STATUS        "biogas/digester01/status"
#define TOPIC_COMMANDS      "biogas/digester01/commands"
#define TOPIC_ALERTS        "biogas/digester01/alerts"

// ============================================================================
// 5. TIMING & IDENTIFICATION
// ============================================================================
#define SENSOR_READ_INTERVAL_MS   5000   // Sample & publish every 5 seconds
#define OLED_REFRESH_INTERVAL_MS  1000   // Refresh screen every second
#define MQTT_RECONNECT_DELAY_MS   5000   // Reconnect retry interval

#define DEVICE_ID           "digester01"
#define SOURCE_ID           "ESP8266"

#endif // CONFIG_H
