/**
 * sensors.h — Sensor acquisition and conversion routines for ESP8266.
 *
 * ACADEMIC NOTICE:
 * - DHT11 measures ambient temperature (°C) and relative humidity (%).
 * - MQ-5 & MQ-2 provide raw analog ADC readings (0-1024 on ESP8266 10-bit ADC).
 * - Gas production & methane percentages are estimated/simulated unless
 *   laboratory-grade calibrated sensors are used.
 *
 * ESP8266 SINGLE ADC HANDLING:
 * ESP8266 has only A0. Based on HARDWARE_MODE:
 * - MODE_MQ5_PHYSICAL: A0 is read for MQ-5; MQ-2 is estimated proportionally for twin completeness.
 * - MODE_MQ2_PHYSICAL: A0 is read for MQ-2; MQ-5 is estimated proportionally for twin completeness.
 * - MODE_POT_DEMO: A0 potentiometer dynamically controls the simulated gas process parameter.
 */

#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <DHT.h>
#include "config.h"

// Global DHT sensor instance
DHT dht(DHT_PIN, DHT_TYPE);

struct SensorData {
  float temperature;
  float humidity;
  float mq5_raw;
  float mq2_raw;
  float methane_simulated;
  float gas_production_simulated;
  bool valid;
};

void initSensors() {
  dht.begin();
  pinMode(MQ_ANALOG_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, HIGH); // Active LOW -> OFF
}

SensorData readSensors() {
  SensorData data;
  data.valid = true;

  // 1. Read DHT11 Temperature and Humidity
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("[WARN] DHT11 read error! Using fallback baseline values.");
    data.temperature = 31.4; // Fallback plausible ambient temperature
    data.humidity = 63.0;
  } else {
    data.temperature = t;
    data.humidity = h;
  }

  // 2. Read ESP8266 Single ADC (A0, 10-bit: 0 - 1024)
  // Multi-sample averaging for stable measurement
  long adc_sum = 0;
  const int SAMPLES = 12;
  for (int i = 0; i < SAMPLES; i++) {
    adc_sum += analogRead(MQ_ANALOG_PIN);
    delay(4);
  }
  float adc_val = (float)(adc_sum / SAMPLES);

  #if HARDWARE_MODE == MODE_MQ5_PHYSICAL
    data.mq5_raw = adc_val;
    // Secondary MQ-2 indicator: estimated based on relative atmospheric baseline
    data.mq2_raw = (adc_val > 0) ? (adc_val * 0.82f) : 310.0f;
  #elif HARDWARE_MODE == MODE_MQ2_PHYSICAL
    data.mq2_raw = adc_val;
    // Secondary MQ-5 indicator: estimated based on relative atmospheric baseline
    data.mq5_raw = (adc_val > 0) ? (adc_val * 1.18f) : 380.0f;
  #elif HARDWARE_MODE == MODE_POT_DEMO
    // Potentiometer controls gas indicator directly for live simulation demonstration
    data.mq5_raw = adc_val;
    data.mq2_raw = adc_val * 0.85f;
  #else
    data.mq5_raw = adc_val;
    data.mq2_raw = adc_val * 0.82f;
  #endif

  // 3. Process Variable Simulation / Estimation
  // IMPORTANT: Clearly documented as simulation estimates
  // Formula mimics mesophilic microbial kinetics:
  float temp_factor = exp(-pow(data.temperature - 35.0, 2) / (2 * 64.0));
  data.gas_production_simulated = 2.5 * temp_factor * (data.mq5_raw / 500.0);
  if (data.gas_production_simulated > 4.5) data.gas_production_simulated = 4.5;
  if (data.gas_production_simulated < 0.1) data.gas_production_simulated = 0.1;

  data.methane_simulated = 55.0 + (data.temperature - 25.0) * 0.35 + (data.mq5_raw / 1024.0) * 8.0;
  if (data.methane_simulated > 72.0) data.methane_simulated = 72.0;
  if (data.methane_simulated < 30.0) data.methane_simulated = 30.0;

  return data;
}

void triggerAlarm(bool enable) {
  digitalWrite(BUZZER_PIN, enable ? HIGH : LOW);
  digitalWrite(STATUS_LED_PIN, enable ? LOW : HIGH); // Active LOW LED
}

#endif // SENSORS_H
