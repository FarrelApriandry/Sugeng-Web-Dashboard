/**
 * ==============================================================================
 * SUGENG (Sistem Unggulan Pengelolaan & Monitoring Sampah Kota Magelang)
 * Dokumentasi Diagram Alur Integrasi Data (Data Integration Pipeline)
 * File: docs/tst/alur_integrasi_data.js
 * ==============================================================================
 *
 * File ini berisi definisi diagram Mermaid.js resmi yang memodelkan alur
 * integrasi data end-to-end dari perangkat edge sensor IoT di TPS hingga ke
 * web dashboard SIG dan engine optimasi rute armada DLH Kota Magelang.
 *
 * Diagram dapat digunakan pada:
 * 1. Markdown documentation (.md / GitHub preview)
 * 2. Visual rendering via Mermaid CLI / Mermaid Live Editor
 * 3. Import programatik via Node.js / Bun runtime
 */

// ==============================================================================
// 1. DIAGRAM ALUR INTEGRASI DATA END-TO-END (FLOWCHART TD)
// ==============================================================================

export const alurIntegrasiFlowchart = `
flowchart TD
    %% ==========================================================================
    %% SUGENG DATA INTEGRATION PIPELINE (VERTICAL HIGH-CLARITY ARCHITECTURE)
    %% ==========================================================================

    subgraph PerceptionTier["1. PERCEPTION & SENSING TIER (EDGE IoT NODE)"]
        direction TB
        subgraph Sensors["Transduser Sensorik (Wadah TPS HDPE 120L)"]
            direction LR
            S_US["Sensor JSN-SR04T<br/><b>Ultrasonic Waterproof IP67</b><br/>• Trig: GPIO 12 | Echo: GPIO 13<br/>• Ukur Jarak Permukaan Sampah (20 - 95 cm)"]
            S_GAS["Sensor Gas MQ-135 & MQ-4<br/><b>Deteksi Pembusukan & Metana</b><br/>• MQ-135 (NH₃ / Bau): GPIO 34 ADC1<br/>• MQ-4 (CH₄ / Metana): GPIO 35 ADC1"]
            S_ENV["Sensor DHT22 & Suplai Daya<br/><b>Mikroklimat & Baterai Mandiri</b><br/>• Data: GPIO 14 (Suhu & RH)<br/>• Solar 6V 1W + CN3065 + Li-Ion 18650"]
        end

        MCU["Mikrokontroler ESP32 DevKit V1 (Tensilica 32-bit Dual-Core)<br/>• Akuisisi ADC 12-bit & Digital Median Filtering<br/>• Formula Volume: V% = (H_total - Jarak) / (H_total - Blind) x 100%<br/>• Manajemen Deep Sleep Berkala & Pulsed Heating MOSFET FR120N"]

        Sensors -->|Sinyal ADC, One-Wire & Time of Flight| MCU
    end

    subgraph TransportTier["2. DUAL TRANSMISSION PIPELINE (PROTOKOL TRANSPORT)"]
        direction LR
        NET_HTTP["Jalur Utama: Nirkabel IoT Lapangan<br/><b>HTTP POST (JSON Telemetri)</b><br/>Header: X-Node-Token | Endpoint: /api/telemetry"]
        NET_DIRECT["Jalur Uji: Direct Hardware Lab<br/><b>USB CDC Serial (115200 Baud)</b><br/>Web Serial API Browser / Local WebSocket Bridge"]
    end

    MCU -->|Koneksi Internet WiFi / GSM| NET_HTTP
    MCU -.->|Kabel USB / Sandbox Testing| NET_DIRECT

    subgraph IngestionTier["3. INGESTION GATEWAY & MIDDLEWARE TIER (BE-SUGENG)"]
        direction TB
        GATEWAY["API Ingestion Gateway (Elysia.js + Bun Runtime Engine)<br/>• Asynchronous High Throughput I/O & OpenAPI Swagger Docs"]
        
        subgraph Processing["Pipeline Pemrosesan Data"]
            direction LR
            SEC["1. Autentikasi<br/>X-Node-Token Validation"]
            VAL["2. Sanitasi & Fallback<br/>TypeBox Strict Schema<br/>Sensor Lock (-1 Fallback)"]
            EVAL["3. Evaluasi Logika Bisnis<br/>Klasifikasi SAFE / WARNING / CRITICAL<br/>Ambang Gas Alert (NH₃ ≥ 60 / CH₄ ≥ 250)"]
        end

        GATEWAY --> SEC --> VAL --> EVAL
    end

    NET_HTTP --> GATEWAY

    subgraph PersistenceTier["4. PERSISTENCE & REALTIME TIER (SUPABASE CLOUD)"]
        direction TB
        subgraph Postgres["Basis Data PostgreSQL 15+ & PostGIS Extension"]
            direction LR
            TBL_NODES[("tps_nodes Table<br/>• Metadata Titik (ID, Nama, Alamat)<br/>• Status Keterisian Terkini (% & Liter)<br/>• Flag Sanitasi & geometry(Point, 4326)")]
            TBL_LOGS[("telemetry_logs Table<br/>• Log Time-Series Historis Lengkap<br/>• Audit Trail untuk Analisis Tren")]
            POSTGIS["PostGIS Spatial Engine<br/>• Spatial Indexing GiST<br/>• Query Geometri EPSG:4326"]
        end

        REALTIME_SRV["Supabase Realtime Service (Elixir/Phoenix WebSocket)<br/>• CDC Change Data Capture via PostgreSQL WAL<br/>• Broadcast: postgres_changes on tps_nodes"]

        TBL_NODES -->|WAL Replication Stream| REALTIME_SRV
    end

    EVAL -->|Upsert Data Keterisian Terkini| TBL_NODES
    EVAL -->|Append Riwayat Log Sensor| TBL_LOGS

    subgraph AnalyticsPresentationTier["5. ANALYTICS & PRESENTATION TIER (COMMAND CENTER COCKPIT)"]
        direction TB
        subgraph EngineCVRP["Optimasi Rute Armada (Google OR-Tools)"]
            ROUTER_ENGINE["CVRP Vehicle Routing Solver<br/>• Input: Matriks Jarak Jalan Magelang + TPS Siaga & Prioritas (≥50%)<br/>• Output: Rute Closed-Loop Pool DLH (-7.444152, 110.230185)<br/>&nbsp;&nbsp;→ TPS Siaga/Prioritas → TPSA Banyuurip → Pool DLH"]
        end

        subgraph DashboardUI["Sugeng Dashboard (Astro + React + TypeScript + Leaflet.js)"]
            direction LR
            COMP_MAP["Peta Interaktif GIS<br/>• Marker Kustom Kampus Tuguran (-7.459694, 110.216861)<br/>• Marker Pool DLH (-7.444152, 110.230185) & TPSA Banyuurip<br/>• Overlay Polyline Rute Armada CVRP"]
            COMP_MANIFEST["Manifest TPS & Wadah SVG<br/>• Indikator SVG Dinamis Realtime<br/>• Monitoring 9 Titik TPS Kota"]
            COMP_INSPECTOR["Inspector Node & Telemetri<br/>• Detail Sensor Ultrasonik & Gas<br/>• Validasi Koordinat Presisi DD"]
        end

        ROUTER_ENGINE -->|GeoJSON Path Koordinat Rute| COMP_MAP
    end

    REALTIME_SRV -->|Trigger Optimasi Armada Keterisian Siaga| ROUTER_ENGINE
    REALTIME_SRV -->|WSS Realtime Push Event| COMP_MAP
    REALTIME_SRV -->|Broadcast Status Keterisian| COMP_MANIFEST
    NET_DIRECT -.->|Direct Hardware Stream| COMP_INSPECTOR

    %% ==========================================================================
    %% COLOR SCHEME & STYLING
    %% ==========================================================================
    classDef edgeStyle fill:#f2f7f4,stroke:#2b6e49,stroke-width:1.5px,color:#183b27;
    classDef gatewayStyle fill:#f0f5fa,stroke:#2c5b88,stroke-width:1.5px,color:#152c42;
    classDef dbStyle fill:#faf6ee,stroke:#9e6e1e,stroke-width:1.5px,color:#4a320c;
    classDef aiStyle fill:#f8f2f9,stroke:#7b397d,stroke-width:1.5px,color:#3e153f;
    classDef uiStyle fill:#f4faf6,stroke:#176b49,stroke-width:2px,color:#114832;
    classDef transportStyle fill:#fbfcfb,stroke:#708276,stroke-width:1.5px,stroke-dasharray: 4 2,color:#2c3a30;

    class S_US,S_GAS,S_ENV,MCU edgeStyle;
    class GATEWAY,SEC,VAL,EVAL gatewayStyle;
    class TBL_NODES,TBL_LOGS,POSTGIS,REALTIME_SRV dbStyle;
    class ROUTER_ENGINE aiStyle;
    class COMP_MAP,COMP_MANIFEST,COMP_INSPECTOR uiStyle;
    class NET_HTTP,NET_DIRECT transportStyle;
`;

// ==============================================================================
// 2. DIAGRAM URUTAN INTERAKSI REALTIME (SEQUENCE DIAGRAM)
// ==============================================================================

export const alurIntegrasiSequence = `
sequenceDiagram
    autonumber
    actor Node as ESP32 (IoT Node)
    participant Bridge as USB Serial / WS
    participant Backend as BE-SUGENG (Elysia)
    participant DB as Supabase (PostGIS)
    participant Realtime as Supabase (WSS)
    participant Solver as OR-Tools (CVRP)
    participant Dashboard as Dashboard (GIS)

    %% --------------------------------------------------------------------------
    %% FASE 1: INGESTI WIRELESS PERIODIK
    %% --------------------------------------------------------------------------
    rect rgb(242, 247, 244)
    Note over Node,DB: 1. Transmisi Telemetri Berkala (Wireless IoT)
    Node->>Node: Bangun Deep Sleep & Aktifkan MOSFET FR120N
    Node->>Node: Sampling Sensor (JSN-SR04T, Gas MQ, DHT22)
    Node->>Backend: HTTP POST /api/telemetry (Payload + Token)
    Backend->>Backend: Validasi TypeBox Schema & Klasifikasi Status
    Backend->>DB: UPDATE public.tps_nodes & INSERT telemetry_logs
    DB->>Realtime: Trigger WAL Event (postgres_changes on tps_nodes)
    Realtime-->>Dashboard: WSS Push Broadcast Update Telemetri
    Dashboard->>Dashboard: Re-render Manifest, SVG Gauge & Marker GIS
    Node->>Node: Siklus Deep Sleep untuk Efisiensi Daya
    end

    %% --------------------------------------------------------------------------
    %% FASE 2: TESTING HARDWARE LANGSUNG (USB SERIAL / BRIDGE)
    %% --------------------------------------------------------------------------
    rect rgb(240, 245, 250)
    Note over Node,Dashboard: 2. Transmisi Uji Fisik (Direct Hardware Lab Testing)
    Node-->>Bridge: USB Serial Output (JSON 115200 Baud)
    Bridge-->>Dashboard: Web Serial API Browser / Local WebSocket Bridge
    Dashboard->>Dashboard: Live Pipeline -> Update Node NODE-05 (Kampus)
    Dashboard->>Dashboard: Update Terminal Console & Indikator Sensor Real-Time
    end

    %% --------------------------------------------------------------------------
    %% FASE 3: OPTIMASI RUTE PENGANGKUTAN ARMADA
    %% --------------------------------------------------------------------------
    rect rgb(250, 246, 238)
    Note over DB,Dashboard: 3. Optimasi Rute Pengangkutan Armada (CVRP Execution)
    Dashboard->>DB: Query Titik TPS Siaga (≥50%) & Prioritas (≥75%)
    DB-->>Solver: Data Spasial Titik, Geometri PostGIS, & Estimasi Volume
    Solver->>Solver: Eksekusi CVRP Matriks Jaringan Jalan Magelang
    Solver-->>Dashboard: Return Rute Optimal (Pool DLH → TPS → TPSA → Pool DLH)
    Dashboard->>Dashboard: Render Polyline Rute Armada di Peta Leaflet & Timeline Logistik
    end
`;

// ==============================================================================
// 3. FUNGSI EXPORT & VIEWER HTML OTOMATIS
// ==============================================================================

/**
 * Menghasilkan dokumen HTML lengkap mandiri dengan Mermaid.js CDN
 * sehingga diagram dapat langsung dibuka dan dilihat di browser web.
 *
 * @returns {string} Konten file HTML
 */
export function generateHtmlViewer() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUGENG - Alur Integrasi Data Arsitektur IoT</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg: #f4f7f5;
      --surface: #ffffff;
      --ink: #16291e;
      --muted: #526659;
      --line: #d3dfd6;
      --green: #176b49;
      --green-dark: #0f4b32;
      --green-soft: #eaf4ee;
      --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: var(--font-sans);
      padding: 24px 32px 60px;
      line-height: 1.5;
    }
    .header-bar {
      max-width: 1540px;
      margin: 0 auto 22px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 22px 28px;
      box-shadow: 0 2px 10px rgba(20, 45, 30, 0.03);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--green);
      background: var(--green-soft);
      border: 1px solid #c2dbcb;
      padding: 3px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
      letter-spacing: 0.04em;
    }
    .badge::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #122419;
      letter-spacing: -0.025em;
    }
    p.lead {
      color: var(--muted);
      font-size: 13.5px;
      margin-top: 4px;
    }
    .header-meta {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .header-meta span {
      font-family: var(--font-mono);
      font-size: 11px;
      background: #f1f6f3;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #d5e2d8;
      color: #274030;
    }
    .main-wrap {
      max-width: 1540px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .diagram-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px 24px 20px;
      box-shadow: 0 4px 18px rgba(18, 42, 28, 0.04);
      display: flex;
      flex-direction: column;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-titles h2 {
      font-size: 17px;
      font-weight: 700;
      color: #162b1e;
    }
    .card-titles p {
      font-size: 12.5px;
      color: var(--muted);
      margin-top: 2px;
    }
    .controls-toolbar {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f1f6f3;
      padding: 4px 7px;
      border: 1px solid #d5e2d8;
      border-radius: 8px;
    }
    .ctrl-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 11px;
      font-size: 11.5px;
      font-weight: 600;
      font-family: var(--font-sans);
      color: #24382c;
      background: #ffffff;
      border: 1px solid #c8d8cc;
      border-radius: 5px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .ctrl-btn:hover {
      background: #e5f1ea;
      color: var(--green);
      border-color: #aed1ba;
    }
    .ctrl-btn:active {
      transform: scale(0.96);
    }
    .zoom-level-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--green);
      min-width: 48px;
      text-align: center;
      padding: 0 4px;
    }
    /* Pan-Zoom Canvas Viewport */
    .viewport {
      width: 100%;
      height: 860px;
      position: relative;
      overflow: hidden;
      background: radial-gradient(#dbe4de 1px, transparent 1px) 0 0 / 22px 22px, #ffffff;
      border: 1px solid var(--line);
      border-radius: 9px;
      cursor: grab;
      user-select: none;
      transition: height 0.2s ease;
    }
    .viewport:active {
      cursor: grabbing;
    }
    .pan-canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
      display: inline-block;
      padding: 30px;
    }
    .pan-canvas svg {
      display: block !important;
      max-width: none !important;
      height: auto !important;
    }
    /* Fullscreen state */
    .viewport:fullscreen,
    .viewport:-webkit-full-screen {
      height: 100vh !important;
      border-radius: 0;
      border: 0;
    }
    .helper-tip {
      font-size: 11.5px;
      color: #687e70;
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .helper-tip kbd {
      background: #eef4f0;
      border: 1px solid #cbdcd0;
      border-radius: 4px;
      padding: 1px 6px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: #274030;
      font-weight: 600;
    }
    footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: var(--muted);
      font-family: var(--font-mono);
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="badge">Arsitektur Terpadu Sistem SUGENG</div>
      <h1>Alur Integrasi Data: Edge IoT ke Dashboard Web SIG</h1>
      <p class="lead">Pemodelan pipeline transmisi data telemetri, middleware ingesti berkecepatan tinggi, persistensi spasial PostGIS, hingga pemetaan rute dinamis CVRP.</p>
    </div>
    <div class="header-meta">
      <span>Versi: 2.1 Enterprise</span>
      <span>PostGIS EPSG:4326</span>
    </div>
  </div>

  <div class="main-wrap">
    <!-- Card 1: Flowchart 5-Tier -->
    <div class="diagram-card" id="card-flowchart">
      <div class="card-head">
        <div class="card-titles">
          <h2>1. Diagram Alur Integrasi End-to-End (5-Tier Architecture)</h2>
          <p>Keterhubungan sensor fisik di TPS, modul komputasi ESP32, gateway Elysia.js, Supabase PostGIS, solver OR-Tools, dan dashboard SIG.</p>
        </div>
        <div class="controls-toolbar" data-target="viewport-flowchart">
          <button class="ctrl-btn btn-zoom-in" title="Perbesar diagram (+)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
            Zoom +
          </button>
          <button class="ctrl-btn btn-zoom-out" title="Perkecil diagram (-)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
            Zoom -
          </button>
          <span class="zoom-level-badge">100%</span>
          <button class="ctrl-btn btn-reset" title="Kembalikan ukuran asli 100%">100%</button>
          <button class="ctrl-btn btn-fit-width" title="Sesuaikan diagram selebar kontainer">↔ Pas Lebar</button>
          <button class="ctrl-btn btn-fit-all" title="Lihat seluruh diagram (Bird's Eye)">⊡ Pas Layar</button>
          <button class="ctrl-btn btn-toggle-scroll" title="Buka tinggi penuh tanpa batas gulir kanvas">↕ Buka Penuh</button>
          <button class="ctrl-btn btn-fullscreen" title="Buka layar penuh">⛶ Fullscreen</button>
          <button class="ctrl-btn btn-download-svg" title="Unduh diagram format vektor SVG">⬇ SVG</button>
        </div>
      </div>

      <div class="viewport" id="viewport-flowchart">
        <div class="pan-canvas" id="canvas-flowchart">
          <div class="mermaid">
${alurIntegrasiFlowchart.trim()}
          </div>
        </div>
      </div>
      <div class="helper-tip">
        <span>💡 <strong>Navigasi Interaktif:</strong> Geser mouse <kbd>Drag & Pan</kbd> untuk menggeser kanvas · Putar <kbd>Scroll Mouse</kbd> untuk Zoom · Klik ganda <kbd>Double Click</kbd> untuk Pas Lebar · Tombol <kbd>↕ Buka Penuh</kbd> untuk melihat seluruh diagram secara utuh</span>
      </div>
    </div>

    <!-- Card 2: Sequence Diagram -->
    <div class="diagram-card" id="card-sequence">
      <div class="card-head">
        <div class="card-titles">
          <h2>2. Diagram Urutan Interaksi & Sinkronisasi Real-Time (Sequence Diagram)</h2>
          <p>Tahapan alur pengiriman nirkabel berkala, direct USB testing laboratorium, perubahan data WAL, dan eksekusi optimasi armada.</p>
        </div>
        <div class="controls-toolbar" data-target="viewport-sequence">
          <button class="ctrl-btn btn-zoom-in" title="Perbesar diagram (+)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
            Zoom +
          </button>
          <button class="ctrl-btn btn-zoom-out" title="Perkecil diagram (-)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
            Zoom -
          </button>
          <span class="zoom-level-badge">100%</span>
          <button class="ctrl-btn btn-reset" title="Kembalikan ukuran asli 100%">100%</button>
          <button class="ctrl-btn btn-fit-width" title="Sesuaikan diagram selebar kontainer">↔ Pas Lebar</button>
          <button class="ctrl-btn btn-fit-all" title="Lihat seluruh diagram (Bird's Eye)">⊡ Pas Layar</button>
          <button class="ctrl-btn btn-toggle-scroll" title="Buka tinggi penuh tanpa batas gulir kanvas">↕ Buka Penuh</button>
          <button class="ctrl-btn btn-fullscreen" title="Buka layar penuh">⛶ Fullscreen</button>
          <button class="ctrl-btn btn-download-svg" title="Unduh diagram format vektor SVG">⬇ SVG</button>
        </div>
      </div>

      <div class="viewport" id="viewport-sequence">
        <div class="pan-canvas" id="canvas-sequence">
          <div class="mermaid">
${alurIntegrasiSequence.trim()}
          </div>
        </div>
      </div>
      <div class="helper-tip">
        <span>💡 <strong>Navigasi Interaktif:</strong> Geser mouse <kbd>Drag & Pan</kbd> untuk menggeser kanvas · Putar <kbd>Scroll Mouse</kbd> untuk Zoom · Klik ganda <kbd>Double Click</kbd> untuk Pas Lebar · Tombol <kbd>↕ Buka Penuh</kbd> untuk melihat seluruh diagram secara utuh</span>
      </div>
    </div>

    <footer>
      SUGENG Kota Magelang · Universitas Tidar · Dinas Lingkungan Hidup
    </footer>
  </div>

  <script>
    // 1. Inisialisasi Mermaid dengan ukuran font yang besar dan jelas
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '15px',
        primaryColor: '#f2f7f4',
        primaryBorderColor: '#176b49',
        primaryTextColor: '#16291e',
        lineColor: '#2b5a3d',
        secondaryColor: '#f0f5fa',
        secondaryBorderColor: '#2c5b88',
        tertiaryColor: '#faf6ee',
        tertiaryBorderColor: '#9e6e1e'
      },
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 42,
        rankSpacing: 56
      },
      sequence: {
        useMaxWidth: false,
        actorFontSize: '15px',
        messageFontSize: '14px',
        noteFontSize: '13.5px'
      }
    });

    // 2. Controller Interaktif Pan & Zoom
    function setupInteractiveViewport(viewportId, canvasId, toolbar) {
      const viewport = document.getElementById(viewportId);
      const canvas = document.getElementById(canvasId);
      if (!viewport || !canvas) return;

      let scale = 1.0;
      let posX = 20;
      let posY = 24;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let isFullHeight = false;

      const badge = toolbar.querySelector('.zoom-level-badge');

      function updateTransform() {
        if (isFullHeight) {
          canvas.style.transform = 'none';
          if (badge) badge.textContent = '100%';
          return;
        }
        canvas.style.transform = \`translate(\${posX}px, \${posY}px) scale(\${scale})\`;
        if (badge) badge.textContent = \`\${Math.round(scale * 100)}%\`;
      }

      function zoom(factor, centerX, centerY) {
        if (isFullHeight) return;
        const prevScale = scale;
        scale = Math.min(3.5, Math.max(0.25, scale * factor));
        if (centerX !== undefined && centerY !== undefined) {
          posX = centerX - (centerX - posX) * (scale / prevScale);
          posY = centerY - (centerY - posY) * (scale / prevScale);
        }
        updateTransform();
      }

      function fitToWidth() {
        if (isFullHeight) return;
        const svg = canvas.querySelector('svg');
        if (!svg) return;
        const vRect = viewport.getBoundingClientRect();
        const sRect = svg.getBoundingClientRect();
        const unscaledW = sRect.width / scale;

        const scaleX = (vRect.width - 40) / unscaledW;
        scale = Math.min(1.0, Math.max(0.35, scaleX));

        posX = Math.max(16, (vRect.width - unscaledW * scale) / 2);
        posY = 24;
        updateTransform();
      }

      function resetZoom() {
        if (isFullHeight) return;
        const svg = canvas.querySelector('svg');
        const vRect = viewport.getBoundingClientRect();
        const sRect = svg ? svg.getBoundingClientRect() : null;
        const unscaledW = (svg && sRect) ? (sRect.width / scale) : 1200;

        scale = 1.0;
        posX = Math.max(16, (vRect.width - unscaledW) / 2);
        posY = 24;
        updateTransform();
      }

      function fitToAll() {
        if (isFullHeight) return;
        const svg = canvas.querySelector('svg');
        if (!svg) return;
        const vRect = viewport.getBoundingClientRect();
        const sRect = svg.getBoundingClientRect();
        const unscaledW = sRect.width / scale;
        const unscaledH = sRect.height / scale;

        const scaleX = (vRect.width - 40) / unscaledW;
        const scaleY = (vRect.height - 40) / unscaledH;
        scale = Math.min(scaleX, scaleY, 1.0);
        scale = Math.max(0.2, scale);

        posX = Math.max(16, (vRect.width - unscaledW * scale) / 2);
        posY = Math.max(20, (vRect.height - unscaledH * scale) / 2);
        updateTransform();
      }

      // Drag / Pan Events
      viewport.addEventListener('mousedown', (e) => {
        if (isFullHeight || e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX - posX;
        startY = e.clientY - posY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging || isFullHeight) return;
        posX = e.clientX - startX;
        posY = e.clientY - startY;
        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Wheel Zoom
      viewport.addEventListener('wheel', (e) => {
        if (isFullHeight) return;
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        zoom(factor, mouseX, mouseY);
      }, { passive: false });

      // Double click to fit width
      viewport.addEventListener('dblclick', () => {
        fitToWidth();
      });

      // Toolbar Buttons
      toolbar.querySelector('.btn-zoom-in')?.addEventListener('click', () => {
        const rect = viewport.getBoundingClientRect();
        zoom(1.2, rect.width / 2, rect.height / 2);
      });

      toolbar.querySelector('.btn-zoom-out')?.addEventListener('click', () => {
        const rect = viewport.getBoundingClientRect();
        zoom(0.83, rect.width / 2, rect.height / 2);
      });

      toolbar.querySelector('.btn-reset')?.addEventListener('click', resetZoom);
      toolbar.querySelector('.btn-fit-width')?.addEventListener('click', fitToWidth);
      toolbar.querySelector('.btn-fit-all')?.addEventListener('click', fitToAll);

      // Toggle Full Height / Continuous Scroll
      const toggleScrollBtn = toolbar.querySelector('.btn-toggle-scroll');
      toggleScrollBtn?.addEventListener('click', () => {
        isFullHeight = !isFullHeight;
        if (isFullHeight) {
          viewport.style.height = 'auto';
          viewport.style.overflow = 'visible';
          viewport.style.cursor = 'default';
          canvas.style.position = 'relative';
          scale = 1.0;
          posX = 0;
          posY = 0;
          updateTransform();
          toggleScrollBtn.textContent = '⊡ Tutup Kanvas';
          toggleScrollBtn.style.background = '#e5f1ea';
          toggleScrollBtn.style.color = 'var(--green)';
        } else {
          viewport.style.height = '860px';
          viewport.style.overflow = 'hidden';
          viewport.style.cursor = 'grab';
          canvas.style.position = 'absolute';
          toggleScrollBtn.textContent = '↕ Buka Penuh';
          toggleScrollBtn.style.background = '#ffffff';
          toggleScrollBtn.style.color = '#24382c';
          fitToWidth();
        }
      });

      // Fullscreen
      toolbar.querySelector('.btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          viewport.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });

      // Download SVG
      toolbar.querySelector('.btn-download-svg')?.addEventListener('click', () => {
        const svg = canvas.querySelector('svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = \`\${viewportId}-diagram.svg\`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      });

      // Initial auto-fit: Pas Lebar (Fit Width) dengan skala optimal
      setTimeout(fitToWidth, 600);
      setTimeout(fitToWidth, 1300);
    }

    // Pasang controller setelah DOM siap
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.controls-toolbar').forEach(tb => {
        const targetId = tb.dataset.target;
        if (targetId === 'viewport-flowchart') {
          setupInteractiveViewport('viewport-flowchart', 'canvas-flowchart', tb);
        } else if (targetId === 'viewport-sequence') {
          setupInteractiveViewport('viewport-sequence', 'canvas-sequence', tb);
        }
      });
    });
  </script>
</body>
</html>`;
}

// ==============================================================================
// 4. EKSEKUSI MANDIRI (CLI EXPORT)
// ==============================================================================

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('alur_integrasi_data.js')) {
  import('fs').then(({ writeFileSync }) => {
    import('path').then(({ resolve, dirname }) => {
      const targetHtml = resolve(dirname(process.argv[1]), 'alur_integrasi_data.html');
      writeFileSync(targetHtml, generateHtmlViewer(), 'utf-8');
      console.log('✓ File viewer HTML berhasil dibuat:', targetHtml);
    });
  });
}

// Kompatibilitas CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    alurIntegrasiFlowchart,
    alurIntegrasiSequence,
    generateHtmlViewer,
  };
}
