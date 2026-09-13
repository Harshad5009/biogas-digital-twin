/**
 * display.h — SSD1306 0.96" I2C OLED display driver for ESP8266.
 */

#ifndef DISPLAY_H
#define DISPLAY_H

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"
#include "sensors.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledAvailable = false;

void initDisplay() {
  // Wire.begin(SDA, SCL) for ESP8266 (D2=GPIO4, D1=GPIO5)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    Serial.println("[WARN] SSD1306 OLED not found at 0x3C. Continuing without screen.");
    oledAvailable = false;
  } else {
    oledAvailable = true;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 15);
    display.println("BIOGAS DIGITAL TWIN");
    display.setCursor(15, 35);
    display.println("ESP8266 Node");
    display.display();
    delay(1000);
  }
}

void updateDisplay(const SensorData& data, const char* status, bool wifiOk, bool mqttOk) {
  if (!oledAvailable) return;

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Header line
  display.setCursor(0, 0);
  display.print("TWIN ");
  display.print(wifiOk ? "W:OK " : "W:-- ");
  display.print(mqttOk ? "M:OK" : "M:--");

  // Separator line
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Temp & Humidity
  display.setCursor(0, 14);
  display.print("T: ");
  display.print(data.temperature, 1);
  display.print("C  H: ");
  display.print(data.humidity, 1);
  display.print("%");

  // MQ-5 and MQ-2 Indicators
  display.setCursor(0, 28);
  display.print("MQ5: ");
  display.print((int)data.mq5_raw);
  display.print("  MQ2: ");
  display.print((int)data.mq2_raw);

  // Gas production estimate
  display.setCursor(0, 42);
  display.print("Gas Est: ");
  display.print(data.gas_production_simulated, 2);
  display.print(" L/m");

  // System Status
  display.setCursor(0, 54);
  display.print("Stat: ");
  display.print(status);

  display.display();
}

#endif // DISPLAY_H
