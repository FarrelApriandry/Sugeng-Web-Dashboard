#!/usr/bin/env python3
"""
SUGENG IOT - Dual WebSocket & HTTP Local Serial Bridge
Membaca otomatis /dev/ttyUSB* atau /dev/ttyACM* (ESP32 Sugeng Node) dan mengeksposnya secara REAL-TIME via:
  - WebSocket: ws://127.0.0.1:5050 (Push realtime <1ms tanpa polling!)
  - HTTP REST: http://127.0.0.1:5050/live (Fallback)
"""

import os
import sys
import glob
import time
import json
import socket
import select
import termios
import hashlib
import base64
import threading

PORT = 5050
BAUD = termios.B115200
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

LATEST_DATA = None
LAST_SEEN_TIME = 0
CURRENT_PORT = None

WS_CLIENTS = set()
CLIENTS_LOCK = threading.Lock()

def find_serial_device():
    candidates = sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))
    return candidates[0] if candidates else None

def make_ws_frame(message: str) -> bytes:
    """Encode string payload into unmasked RFC 6455 text frame (server to client)."""
    data = message.encode("utf-8")
    length = len(data)
    if length <= 125:
        header = bytes([0x81, length])
    elif length <= 65535:
        header = bytes([0x81, 126, (length >> 8) & 0xFF, length & 0xFF])
    else:
        header = bytes([0x81, 127]) + length.to_bytes(8, "big")
    return header + data

def broadcast_ws(payload_dict: dict):
    """Kirim data secara instan ke SEMUA browser yang terhubung via WebSocket."""
    with CLIENTS_LOCK:
        if not WS_CLIENTS:
            return
        msg = json.dumps(payload_dict)
        frame = make_ws_frame(msg)
        dead = set()
        for client in WS_CLIENTS:
            try:
                client.sendall(frame)
            except Exception:
                dead.add(client)
        for d in dead:
            WS_CLIENTS.discard(d)
            try:
                d.close()
            except Exception:
                pass

def serial_worker():
    global LATEST_DATA, LAST_SEEN_TIME, CURRENT_PORT
    while True:
        device = find_serial_device()
        if not device:
            print("[BRIDGE SERIAL] Menunggu kabel USB ESP32 dicolokkan...")
            time.sleep(1.5)
            continue

        CURRENT_PORT = device
        print(f"[BRIDGE SERIAL] Terdeteksi port {device}! Membuka koneksi serial (115200 baud)...")
        try:
            fd = os.open(device, os.O_RDWR | os.O_NOCTTY)
            attrs = termios.tcgetattr(fd)
            attrs[4] = BAUD
            attrs[5] = BAUD
            termios.tcsetattr(fd, termios.TCSANOW, attrs)
            print(f"[BRIDGE SERIAL] Berhasil terhubung ke {device}!")

            buf = ""
            while True:
                chunk = os.read(fd, 256).decode("utf-8", errors="replace")
                if not chunk:
                    break
                buf += chunk
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    line = line.strip()
                    if line.startswith("JSON:"):
                        try:
                            payload = json.loads(line[5:])
                            payload["_port"] = device
                            payload["_transport"] = "websocket"
                            LATEST_DATA = payload
                            LAST_SEEN_TIME = time.time()
                            print(f"[REALTIME ESP32 -> WS] Suhu: {payload.get('temperatureCelsius')}°C | Jarak: {payload.get('measuredDistanceCm')}cm | Vol: {payload.get('currentVolumePercent')}% | Gas: {payload.get('gasPpmMQ135')}ppm")
                            broadcast_ws(payload)
                        except Exception:
                            pass
        except Exception as e:
            print(f"[BRIDGE SERIAL] Serial {device} terputus: {e}. Mencari port kembali...")
            time.sleep(1.5)

def handle_client(conn, addr):
    global LATEST_DATA
    try:
        req = conn.recv(4096).decode("utf-8", errors="replace")
        if not req:
            conn.close()
            return

        lines = req.split("\r\n")
        req_line = lines[0] if lines else ""
        headers = {}
        for l in lines[1:]:
            if ": " in l:
                k, v = l.split(": ", 1)
                headers[k.lower()] = v.strip()

        # Cek apakah request adalah Upgrade WebSocket
        if headers.get("upgrade", "").lower() == "websocket" and "sec-websocket-key" in headers:
            key = headers["sec-websocket-key"]
            accept_val = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
            response = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept_val}\r\n\r\n"
            )
            conn.sendall(response.encode("utf-8"))
            
            with CLIENTS_LOCK:
                WS_CLIENTS.add(conn)
            print(f"[WEBSOCKET] Client browser terhubung dari {addr}! Total klien aktif: {len(WS_CLIENTS)}")

            # Kirim data terkini secara instan saat baru konek
            if LATEST_DATA:
                try:
                    conn.sendall(make_ws_frame(json.dumps(LATEST_DATA)))
                except Exception:
                    pass

            # Loop listener client (untuk keepalive / close frame)
            conn.setblocking(False)
            while True:
                r, _, _ = select.select([conn], [], [], 2.0)
                if r:
                    data = conn.recv(1024)
                    if not data:
                        break
                    # Cek jika client kirim close frame (opcode 0x8)
                    if data[0] & 0x0F == 0x08:
                        break
        else:
            # Fallback HTTP GET /live
            if "GET /live" in req_line or "GET /" in req_line:
                data = LATEST_DATA if LATEST_DATA is not None else {"status": "waiting_for_esp32_data"}
                body = json.dumps(data).encode("utf-8")
                resp = (
                    "HTTP/1.1 200 OK\r\n"
                    "Content-Type: application/json\r\n"
                    "Access-Control-Allow-Origin: *\r\n"
                    "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
                    "Access-Control-Allow-Headers: Content-Type\r\n"
                    f"Content-Length: {len(body)}\r\n\r\n"
                ).encode("utf-8") + body
                conn.sendall(resp)
            elif "OPTIONS" in req_line:
                resp = (
                    "HTTP/1.1 200 OK\r\n"
                    "Access-Control-Allow-Origin: *\r\n"
                    "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
                    "Access-Control-Allow-Headers: Content-Type\r\n"
                    "Content-Length: 0\r\n\r\n"
                ).encode("utf-8")
                conn.sendall(resp)
            else:
                resp = b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
                conn.sendall(resp)
            conn.close()

    except Exception:
        pass
    finally:
        with CLIENTS_LOCK:
            if conn in WS_CLIENTS:
                WS_CLIENTS.remove(conn)
                print(f"[WEBSOCKET] Client browser terputus: {addr}. Sisa klien: {len(WS_CLIENTS)}")
        try:
            conn.close()
        except Exception:
            pass

def server_worker():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", PORT))
    server.listen(10)
    print(f"[BRIDGE SERVER] Server aktif di port {PORT}!")
    print(f"  -> WebSocket : ws://127.0.0.1:{PORT} (Push Realtime <1ms)")
    print(f"  -> HTTP REST  : http://127.0.0.1:{PORT}/live (Fallback)")

    while True:
        try:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()
        except Exception:
            break

if __name__ == "__main__":
    t_serial = threading.Thread(target=serial_worker, daemon=True)
    t_serial.start()
    try:
        server_worker()
    except KeyboardInterrupt:
        print("\n[BRIDGE] Server dihentikan.")
