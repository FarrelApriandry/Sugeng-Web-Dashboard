// Pembaca USB Serial via Web Serial API (Chrome/Edge).
// Firmware kirim 1 baris JSON:{...} tiap 2 detik (lihat firmware/SugengNode_USBSerial.ino)
// Syarat browser: secure context -> buka dashboard via http://localhost:5432
// (tidak jalan di http://IP-LAN / Firefox).
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
    return 'Pemilihan port dibatalkan — klik lagi lalu pilih port ESP32 (mis. USB Serial / ttyUSB0).';
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
  try {
    port = await nav.serial.requestPort();
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
