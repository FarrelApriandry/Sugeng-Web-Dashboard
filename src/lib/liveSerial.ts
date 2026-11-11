// Pembaca USB Serial via Realtime WebSocket & Web Serial API
// Firmware kirim 1 baris JSON:{...} tiap 2 detik (lihat firmware/SugengNode_USBSerial.ino)
import type { LiveSensorPayload } from './liveSensor';

export function isSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && !!((navigator as any).serial);
}

function parseLine(line: string): LiveSensorPayload | null {
  const t = line.trim();
  if (!t.startsWith('JSON:')) return null;
  try {
    return JSON.parse(t.slice(5)) as LiveSensorPayload;
  } catch {
    return null;
  }
}

function friendlyError(e: unknown): string {
  const err = e as { name?: string; message?: string };
  if (err?.name === 'NotFoundError' || err?.name === 'AbortError')
    return 'Pemilihan port dibatalkan — klik lagi lalu pilih port ESP32 (mis. CP2102 / ttyUSB0).';
  if (err?.name === 'InvalidStateError')
    return 'Port sedang dipakai (tutup Arduino Serial Monitor dulu), lalu coba lagi.';
  if (err?.name === 'SecurityError')
    return 'Browser menolak akses serial — buka dashboard via http://localhost:5432 (bukan IP-LAN), pakai Chrome/Edge.';
  return err?.message || 'Gagal membuka port serial.';
}

let activePort: any = null;
let stopFlag = false;

export async function disconnectSerial(): Promise<void> {
  stopFlag = true;
  const p = activePort;
  activePort = null;
  if (p) {
    try {
      await p.close();
    } catch {
      /* abaikan */
    }
  }
}

export async function connectSerial(
  onData: (p: LiveSensorPayload) => void,
  onError: (msg: string) => void,
  baudRate = 115200
): Promise<void> {
  const nav = navigator as any;
  if (!nav?.serial)
    throw new Error(
      'Browser tidak mendukung Web Serial — pakai Chrome/Edge di laptop dan buka via http://localhost:5432.'
    );
  await disconnectSerial();
  let port: any;

  // Filter khusus perangkat ESP32 / USB UART agar Chromium tidak hang saat scanning port motherboard (ttyS0-31)
  const filters = [
    { usbVendorId: 0x10c4 }, // Silicon Labs CP2102 (ESP32 Sugeng Node)
    { usbVendorId: 0x1a86 }, // WCH CH340
    { usbVendorId: 0x0403 }, // FTDI
    { usbVendorId: 0x303a }, // Espressif USB native
    { usbVendorId: 0x2341 }, // Arduino
  ];

  try {
    try {
      port = await nav.serial.requestPort({ filters });
    } catch (e: any) {
      if (e?.name === 'NotFoundError' || e?.name === 'AbortError') {
        throw new Error(friendlyError(e));
      }
      port = await nav.serial.requestPort();
    }
    await port.open({ baudRate });
  } catch (e) {
    throw new Error(friendlyError(e));
  }
  activePort = port;
  stopFlag = false;

  // Loop baca — jalan di background, tiap baris JSON: -> onData
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (port.readable && !stopFlag && activePort === port) {
      const reader = port.readable.getReader();
      try {
        for (;;) {
          if (stopFlag || activePort !== port) break;
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split('\n');
            buf = parts.pop() ?? '';
            for (const line of parts) {
              const p = parseLine(line);
              if (p && !stopFlag) onData(p);
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* abaikan */
        }
      }
      if (!port.readable) break;
    }
  } catch (e) {
    if (!stopFlag && activePort === port) {
      const msg = friendlyError(e);
      try {
        await port.close();
      } catch {
        /* abaikan */
      }
      if (activePort === port) activePort = null;
      onError(msg);
    }
  }
}

/* ---------- REALTIME WEBSOCKET BRIDGE (<1ms LATENCY PUSH) ---------- */
let activeWs: WebSocket | null = null;

export async function isBridgeAvailable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 600);
    const res = await fetch('http://127.0.0.1:5050/live', { signal: ctrl.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function disconnectBridge(): void {
  if (activeWs) {
    try {
      activeWs.close();
    } catch {
      /* abaikan */
    }
    activeWs = null;
  }
}

export async function connectBridge(
  onData: (p: LiveSensorPayload) => void,
  onError: (msg: string) => void
): Promise<void> {
  disconnectBridge();
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket('ws://127.0.0.1:5050');
      let opened = false;

      ws.onopen = () => {
        opened = true;
        activeWs = ws;
        console.log('[WEBSOCKET] Terhubung realtime ke ESP32 via ws://127.0.0.1:5050');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as LiveSensorPayload;
          if (payload && payload.nodeId) {
            onData(payload);
          }
        } catch (e) {
          console.error('[WEBSOCKET PARSE ERROR]', e);
        }
      };

      ws.onerror = (e) => {
        if (!opened) {
          reject(new Error('Gagal menghubungkan ke WebSocket ws://127.0.0.1:5050'));
        } else {
          onError('Koneksi WebSocket terputus.');
        }
      };

      ws.onclose = () => {
        activeWs = null;
        if (opened) {
          onError('Koneksi WebSocket ditutup.');
        }
      };

      // Timeout 3 detik jika tidak kunjung open
      setTimeout(() => {
        if (!opened) {
          try { ws.close(); } catch {}
          reject(new Error('Timeout menghubungkan ke WebSocket ws://127.0.0.1:5050'));
        }
      }, 3000);

    } catch (err: any) {
      reject(err);
    }
  });
}
