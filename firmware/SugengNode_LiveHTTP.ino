// =======================================================
// SUGENG NODE — Live HTTP Demo (tanpa DB / tanpa Supabase)
// ESP32 DevKit V1 + DHT22 + JSN-SR04T + MQ-135 + MQ-4
// Jalur demo minggu ini: ESP32 jadi HTTP server,
// dashboard fetch langsung http://<IP-ESP32>/data tiap 2 detik.
//
// Cara pakai:
//  1. Isi WIFI_SSID + WIFI_PASS (satu WiFi/hotspot dgn laptop)
//  2. Flash file ini (tetap butuh lib DHT sensor library)
//  3. Buka Serial Monitor 115200 -> catat IP (mis. 192.168.1.50)
//  4. Di dashboard: tab Data Sensor -> Sumber: Alat Live -> isi IP -> ON
//  5. Test browser: http://<IP-ESP32>/data harus keluar JSON
//
// Pin ikut kode test lu (bukan tabel proposal, biar wiring tetap):
//  DHT22 DATA=D19, JSN TRIG=D5 ECHO=D18, MQ135=A34, MQ4=A35
// =======================================================
#include <WiFi.h>
#include <WebServer.h>
#include "DHT.h"

// ---------- KONFIG WIFI (GANTI) ----------
const char* WIFI_SSID = "GANTI_SSID";
const char* WIFI_PASS = "GANTI_PASSWORD";

// ---------- PIN (ikut kode test lu) ----------
#define DHTPIN    19
#define DHTTYPE   DHT22
#define TRIG_PIN  5
#define ECHO_PIN  18
#define MQ135_PIN 34
#define MQ4_PIN   35

// ---------- Konstanta bak 120L (ikut dummyData/proposal) ----------
#define H_TOTAL_CM 95.0
#define S_BLIND_CM 20.0

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// Cache bacaan terakhir (biar /data selalu jawab walau sensor error)
float lastTemp = 0, lastHum = 0, lastDist = -1, lastVol = 0;
int lastMq135Adc = 0, lastMq4Adc = 0;
float lastMq135Pct = 0, lastMq4Pct = 0;
unsigned long bootMs = 0;

float hitungVolumePct(float jarakCm) {
  if (jarakCm < 0) return lastVol; // out of range -> tahan nilai lama
  float v = (H_TOTAL_CM - jarakCm) / (H_TOTAL_CM - S_BLIND_CM) * 100.0;
  if (v < 0) v = 0;
  if (v > 100) v = 100;
  return v;
}

// Mapping demo ADC% -> ppm (skala dashboard: gas bau >=30/60, metana >=100/250)
float mq135PctToPpm(float pct) { return pct * 1.2; }   // 0-100% -> 0-120 ppm
float mq4PctToPpm(float pct)   { return pct * 4.0; }    // 0-100% -> 0-400 ppm

void bacaSensor() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (!isnan(temp)) lastTemp = temp;
  if (!isnan(hum))  lastHum  = hum;

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float dist = (duration > 0) ? (duration * 0.0343 / 2.0) : -1.0;
  lastDist = dist;
  lastVol = hitungVolumePct(dist);

  lastMq135Adc = analogRead(MQ135_PIN);
  lastMq4Adc   = analogRead(MQ4_PIN);
  lastMq135Pct = (lastMq135Adc / 4095.0) * 100.0;
  lastMq4Pct   = (lastMq4Adc / 4095.0) * 100.0;
}

void kirimCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleData() {
  kirimCORS();
  bacaSensor();
  float mq135ppm = mq135PctToPpm(lastMq135Pct);
  float mq4ppm   = mq4PctToPpm(lastMq4Pct);
  String json = "{";
  json += "\"nodeId\":\"NODE-MGL-05\",";
  json += "\"temperatureCelsius\":" + String(lastTemp, 1) + ",";
  json += "\"humidityPercent\":" + String(lastHum, 1) + ",";
  json += "\"measuredDistanceCm\":" + String(lastDist, 1) + ",";
  json += "\"currentVolumePercent\":" + String(lastVol, 1) + ",";
  json += "\"gasPpmMQ135\":" + String(mq135ppm, 1) + ",";
  json += "\"methanePpmMQ4\":" + String(mq4ppm, 1) + ",";
  json += "\"mq135Adc\":" + String(lastMq135Adc) + ",";
  json += "\"mq4Adc\":" + String(lastMq4Adc) + ",";
  json += "\"mq135Pct\":" + String(lastMq135Pct, 1) + ",";
  json += "\"mq4Pct\":" + String(lastMq4Pct, 1) + ",";
  // Statis dulu (belum ada ADC baterai/panel di wiring sekarang)
  json += "\"batteryVoltage\":4.05,";
  json += "\"batteryPercent\":91,";
  json += "\"wifiRssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptimeSec\":" + String((millis() - bootMs) / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void handleRoot() {
  kirimCORS();
  String html = "<h1>SUGENG Node OK</h1><p>Buka <a href='/data'>/data</a> untuk JSON live.</p>";
  server.send(200, "text/html", html);
}

void handleOptions() {
  kirimCORS();
  server.send(204, "text/plain", "");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  bootMs = millis();

  Serial.println("\n=========================================");
  Serial.println("     SUGENG NODE — LIVE HTTP DEMO       ");
  Serial.println("=========================================");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Menghubungkan WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK! IP ESP32:");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi GAGAL — cek SSID/PASS. /data tetap jalan di AP? Tidak. Flash ulang.");
  }

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.on("/api/sensors", handleData); // alias
  server.onNotFound(handleOptions);
  server.begin();
  Serial.println("HTTP server jalan di port 80. GET /data");
}

void loop() {
  server.handleClient();

  // Log serial tiap 2 dtk (kayak kode test lu)
  static unsigned long lastLog = 0;
  if (millis() - lastLog > 2000) {
    lastLog = millis();
    bacaSensor();
    Serial.println("-----------------------------------------");
    if (isnan(lastTemp) || isnan(lastHum)) {
      Serial.println("DHT22 (D19) -> [ERROR]");
    } else {
      Serial.printf("DHT22 -> %.1f C | %.1f %%\n", lastTemp, lastHum);
    }
    if (lastDist < 0) Serial.println("JSN-SR04T -> [OUT OF RANGE]");
    else Serial.printf("JSN-SR04T -> %.1f cm | Vol %.1f %%\n", lastDist, lastVol);
    Serial.printf("MQ135 ADC %d (%.1f %%) -> %.1f ppm | MQ4 ADC %d (%.1f %%) -> %.1f ppm\n",
      lastMq135Adc, lastMq135Pct, mq135PctToPpm(lastMq135Pct),
      lastMq4Adc, lastMq4Pct, mq4PctToPpm(lastMq4Pct));
    Serial.print("Akses JSON: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/data");
  }
}
