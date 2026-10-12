# Demo Live: Alat IoT -> Web Dashboard (tanpa DB)

Jalur demo minggu ini: **ESP32 jadi HTTP server**, dashboard fetch langsung tiap 3 detik.
Tanpa Supabase, tanpa backend. Supabase minggu depan.

## 1. File yang ditambahkan

- `firmware/SugengNode_LiveHTTP.ino` — firmware demo (WiFi + WebServer, GET `/data` JSON)
- `src/lib/liveSensor.ts` — helper polling + mapping payload ke `TPSNode`
- Panel "Kontrol Alat Live" di tab **Data Sensor** (`SugengDashboard.tsx`)
- Badge `🔴 LIVE` di daftar TPS untuk node alat fisik

## 2. Flash ESP32

1. Buka `firmware/SugengNode_LiveHTTP.ino` di Arduino IDE.
2. Install library **DHT sensor library** (Adafruit) kalau belum.
3. Isi:
   ```cpp
   const char* WIFI_SSID = "nama-wifi-kamu";
   const char* WIFI_PASS = "password-wifi-kamu";
   ```
   Wajib **satu WiFi/hotspot dengan laptop** yang buka dashboard.
4. Flash, buka Serial Monitor **115200**, catat IP, mis. `192.168.1.50`.
5. Test di browser HP/laptop: `http://192.168.1.50/data` → harus keluar JSON:
   ```json
   {"nodeId":"NODE-MGL-05","temperatureCelsius":31.2,"humidityPercent":80.5,...}
   ```

Pin ikut kode test (bukan tabel proposal, biar wiring lama tetap jalan):
DHT22=D19, JSN TRIG=D5 ECHO=D18, MQ135=A34, MQ4=A35.

## 3. Jalankan dashboard

```bash
cd ~/Development/UE/GitHub/Sugeng-Dashboard
~/.bun/bin/bun run dev --port 5432 --host
```

Buka di HP/laptop satu jaringan: `http://<IP-laptop>:5432`

## 4. Sambungkan alat → dashboard

1. Buka tab **4. Data Sensor**.
2. Di panel **Kontrol Alat Live**: isi IP ESP32 (mis. `192.168.1.50`), centang **Alat Live ON**.
   Atau klik **"Pakai alat di TPS Kampus UNTIDAR"**.
3. Kalau berhasil: badge sumber jadi `🔴 Alat Live`, status `✓ Terhubung`,
   kartu **TPS Kampus Tuguran UNTIDAR (NODE-MGL-05)** update tiap 3 detik
   (volume dari JSN-SR04T, suhu/lembap DHT22, bau MQ-135, metana MQ-4).
4. Kalau gagal: muncul `⚠ Alat tidak terjangkau` — cek 1) satu WiFi,
   2) IP benar, 3) ESP32 nyala, 4) `http://<IP>/data` bisa dibuka manual.

## 5. Catatan mapping (demo)

- Volume `V% = (H_total − S_jarak) / (H_total − S_blind) × 100%`, H=95cm, blind=20cm (ikut proposal).
- MQ analog (ADC %) → ppm **skala demo**: MQ135 ppm = pct×1.2, MQ4 ppm = pct×4.0
  supaya masuk ke threshold dashboard (bau ≥30/60, metana ≥100/250).
  Kalibrasi ppm beneran (kurva Rs/Ro) dikerjakan bareng Supabase minggu depan.
- Baterai/solar masih statis (belum ada ADC-nya di wiring sekarang).
- Status prioritas ikut logika dashboard: volume ≥80% atau bau tinggi → kritis.

## 6. Minggu depan (Supabase)

- ESP32 POST ke endpoint ingesti (FastAPI/edge) → tabel `telemetry` time-series.
- Dashboard baca Supabase (bukan IP langsung) → multi-node + histori grafik.
- Skema + kalibrasi ppm + auth token device.
