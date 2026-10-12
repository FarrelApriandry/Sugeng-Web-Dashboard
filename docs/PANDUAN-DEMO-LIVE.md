# Demo Live: Alat IoT -> Web Dashboard via USB (tanpa WiFi / tanpa DB)

Jalur demo: **ESP32 colok kabel USB ke laptop**, dashboard baca serial langsung
via Web Serial API. Tanpa WiFi, tanpa Supabase. Supabase minggu depan.

## 1. File

- `firmware/SugengNode_USBSerial.ino` — firmware USB (Serial 115200, baris `JSON:{...}` tiap 2 dtk)
- `src/lib/liveSensor.ts` — tipe payload + mapping ke `TPSNode`
- `src/lib/liveSerial.ts` — pembaca Web Serial API
- Panel "Kontrol Alat Live" di tab **Data Sensor** (`SugengDashboard.tsx`)
- Badge `🔴 USB` di daftar TPS untuk node alat fisik

## 2. Flash ESP32

1. Buka `firmware/SugengNode_USBSerial.ino` di Arduino IDE.
2. Install library **DHT sensor library** (Adafruit) kalau belum.
3. Flash seperti biasa via USB. Tidak perlu isi SSID/password — tidak pakai WiFi.
4. Buka Serial Monitor **115200** → harus kelihatan log manusia + baris:
   ```
   JSON:{"nodeId":"NODE-MGL-05","temperatureCelsius":31.2,...}
   ```
5. **Tutup Serial Monitor** sebelum buka dashboard (port tidak bisa dipakai 2 aplikasi).

Pin ikut kode test lu: DHT22=D19, JSN TRIG=D5 ECHO=D18, MQ135=A34, MQ4=A35.

## 3. Jalankan dashboard (WAJIB localhost)

Web Serial API cuma jalan di **secure context** → buka via `localhost`, bukan IP-LAN.
Dan cuma didukung **Chrome / Edge** (tidak bisa Firefox).

```bash
cd ~/Development/UE/GitHub/Sugeng-Dashboard
~/.bun/bin/bun run dev --port 5432
```

Buka di laptop yang dicolok ESP32: `http://localhost:5432`

> Kalau mau tampil di HP/proyektor, buka 2 tab: localhost buat USB,
> IP-LAN buat display (yang display tetap data contoh).

## 4. Sambungkan alat → dashboard

1. Colok USB ESP32 ke laptop (biarkan tetap tercolok).
2. Buka tab **4. Data Sensor**.
3. Klik **🔌 Hubungkan via USB** → pilih port ESP32 di popup browser
   (muncul sebagai "USB Serial", "CP210x", "CH340", atau `/dev/ttyUSB0`).
4. Kalau berhasil: badge sumber jadi `🔴 Alat Live (USB)`, status `✓ Terhubung via USB`,
   kartu **TPS Kampus Tuguran UNTIDAR (NODE-MGL-05)** update tiap 2 detik
   (volume dari JSN-SR04T, suhu/lembap DHT22, bau MQ-135, metana MQ-4).
5. Klik **Putuskan USB** kalau mau balik ke data contoh / mau buka Arduino Monitor.

## 5. Troubleshooting

| Gejala | Solusi |
|---|---|
| Popup port tidak muncul / browser tidak dukung | Pakai Chrome/Edge terbaru, buka via `http://localhost:5432` |
| `Port sedang dipakai` | Tutup Arduino Serial Monitor / tab lain yang pegang port |
| `Pemilihan port dibatalkan` | Klik lagi, pilih port yang benar (cabut-colok untuk identifikasi) |
| Data tidak update tapi status terhubung | Cek Serial Monitor: baris `JSON:` keluar tiap 2 dtk? |
| Karakter aneh / JSON gagal parse | Pastikan baud 115200 sama di firmware & dashboard |

Cek port di Linux: `ls /dev/ttyUSB* /dev/ttyACM*` — pastikan user masuk grup `dialout`:
`sudo usermod -aG dialout $USER` lalu logout/login lagi.

## 6. Catatan mapping (demo)

- Volume `V% = (H_total − S_jarak) / (H_total − S_blind) × 100%`, H=95cm, blind=20cm (ikut proposal).
- MQ analog (ADC %) → ppm **skala demo**: MQ135 ppm = pct×1.2, MQ4 ppm = pct×4.0
  supaya masuk ke threshold dashboard (bau ≥30/60, metana ≥100/250).
  Kalibrasi ppm beneran (kurva Rs/Ro) dikerjakan bareng Supabase minggu depan.
- Baterai/solar masih statis (belum ada ADC-nya di wiring sekarang).
- Status prioritas ikut logika dashboard: volume ≥80% atau bau tinggi → kritis.

## 7. Minggu depan (Supabase)

- ESP32 POST ke endpoint ingesti (FastAPI/edge) → tabel `telemetry` time-series.
- Dashboard baca Supabase (bukan USB langsung) → multi-node + histori grafik.
- Skema + kalibrasi ppm + auth token device.
