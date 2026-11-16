import React, { useState } from 'react';
import type { ScenarioNode } from '../data/dummyData';
import {
  calculateLocalPrediction,
  formatMinutesHuman,
  type AIPredictionResult,
} from '../lib/aiPrediction';

interface AIPredictionCardProps {
  node: ScenarioNode;
  isHardwareActive?: boolean;
}

export const AIPredictionCard: React.FC<AIPredictionCardProps> = ({
  node,
  isHardwareActive = false,
}) => {
  const [demoRapidRate, setDemoRapidRate] = useState<boolean>(false);
  const [showAcademicModal, setShowAcademicModal] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'regression' | 'classification'>('regression');

  const simulatedRate = demoRapidRate ? 16.5 : undefined;

  // Evaluasi Dual-AI: Model 1 (Regresi) + Model 2 (Klasifikasi 4-Sensor)
  const prediction: AIPredictionResult = calculateLocalPrediction(
    node.id,
    node.name,
    node.fill,
    new Date().getHours(),
    simulatedRate,
    {
      ammoniaIndexMQ135: node.gas,
      methanePpmMQ4: node.methanePpm ?? (node.id === 'NODE-08' ? 68 : 35),
      temperatureCelsius: node.temp ?? 28.5,
      humidityPercent: node.humidity ?? 65.0,
      measuredDistanceCm: node.distance,
    }
  );

  const hz = prediction.hazardAssessment;
  const isCritical =
    node.fill >= 75 ||
    (prediction.minutesToOverflow !== null && prediction.minutesToOverflow <= 60) ||
    hz.severityLevel === 'CRITICAL' ||
    hz.severityLevel === 'HIGH';

  // Pecah durasi ke jam dan menit
  const totalMins = prediction.minutesToOverflow !== null ? Math.max(0, prediction.minutesToOverflow) : 0;
  const hours = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);

  // Label status peringatan laju & bahaya
  let warningText = 'Laju pengisian terkendali';
  if (node.fill >= 98) {
    warningText = 'Kapasitas wadah penuh (100%)';
  } else if (hz.hazardClass === 'METHANE_HAZARD') {
    warningText = 'Bahaya gas metana (Rawan terbakar)';
  } else if (hz.hazardClass === 'ACTIVE_DECOMPOSITION') {
    warningText = 'Degradasi aktif (Bau amonia menyengat)';
  } else if (isCritical) {
    warningText = 'Prioritas pengangkutan / Kritis';
  } else if (prediction.urgencyLevel === 'RAPID_FILLING') {
    warningText = 'Laju pengisian tinggi';
  }

  return (
    <section className="info-section prediction-card">
      {/* HEADER */}
      <header className="p-header">
        <div>
          <h3 className="p-title">Prediksi Waktu Penuh</h3>
          <span className="p-subtitle">DUAL-AI: REGRESI &amp; KLASIFIKASI K3</span>
        </div>

        <span className="p-status">
          <i className="p-dot" />
          Aktif
        </span>
      </header>

      {/* MAIN ESTIMATION */}
      <div className="p-main">
        <div className="p-label">ESTIMASI MENUJU KAPASITAS PENUH</div>

        <div className="p-time">
          {node.fill >= 98 ? (
            <strong className="critical">0<span>m</span></strong>
          ) : hours > 0 ? (
            <strong className={isCritical ? 'critical' : ''}>
              {hours}<span>j</span> {mins}<span>m</span>
            </strong>
          ) : (
            <strong className={isCritical ? 'critical' : ''}>
              {mins}<span>m</span>
            </strong>
          )}
          {prediction.predictedOverflowTimeText && (
            <span className="p-clock">({prediction.predictedOverflowTimeText})</span>
          )}
        </div>

        <div className={`p-warning ${isCritical ? 'critical' : ''}`}>
          <i />
          <span>{warningText}</span>
          <span style={{ color: 'var(--muted)', margin: '0 2px' }}>·</span>
          <span style={{ color: hz.statusColor, fontWeight: 700 }}>{hz.badgeLabel}</span>
        </div>
      </div>

      {/* METRICS */}
      <div className="p-metrics">
        <div className="p-metric">
          <small>Laju Buangan</small>
          <strong>
            +{prediction.estimatedFillingRatePerHour}%{' '}
            <span style={{ fontSize: 9, fontWeight: 500 }}>/ jam</span>
          </strong>
        </div>

        <div className="p-metric">
          <small>Batas Kritis (75%)</small>
          <strong className={node.fill >= 75 ? 'red' : 'amber'}>
            {node.fill >= 75
              ? 'Sudah Kritis'
              : formatMinutesHuman(prediction.minutesToWarning)}
          </strong>
        </div>
      </div>

      {/* FORECAST */}
      <div className="p-forecast">
        <div className="p-forecast-head">
          <div>
            <strong>Proyeksi Volume</strong>
            <small>6 jam ke depan</small>
          </div>
          <span className="p-interval">INTERVAL 1 JAM</span>
        </div>

        <div className="p-chart">
          {prediction.hourlyForecast.map((pt, idx) => {
            const isCrit = pt.predictedVolumePercent >= 75;
            const isSafe = pt.predictedVolumePercent < 50;
            const barClass = isCrit
              ? 'p-bar-item critical'
              : isSafe
              ? 'p-bar-item safe'
              : 'p-bar-item';
            const fillHeight = `${Math.min(100, Math.max(4, Math.round(pt.predictedVolumePercent)))}%`;

            return (
              <div key={idx} className={barClass}>
                <span className="p-bar-time">+{idx + 1}j</span>
                <div className="p-track">
                  <div className="p-fill" style={{ height: fillHeight }} />
                </div>
                <strong>{Math.round(pt.predictedVolumePercent)}%</strong>
              </div>
            );
          })}
        </div>

        <div className="p-legend">
          <span>
            <i /> Proyeksi volume
          </span>
          <span>
            <i className="red" /> Kapasitas penuh
          </span>
        </div>
      </div>

      {/* RECOMMENDATION */}
      <div className={`p-recommendation ${isCritical ? 'critical' : ''}`}>
        <div className="p-rec-label">
          TINDAKAN OPERASIONAL ({hz.badgeLabel.toUpperCase()})
        </div>
        <p>{hz.hazardClass !== 'NORMAL' ? hz.operationalAction : prediction.recommendation}</p>
      </div>

      {/* ACTIONS */}
      <div className="p-actions">
        <button
          type="button"
          className={`p-btn ${demoRapidRate ? 'active' : ''}`}
          onClick={() => setDemoRapidRate(!demoRapidRate)}
          title="Klik untuk mensimulasikan pembuangan sampah cepat di hadapan dosen"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 17L17 7M17 7H7M17 7V17"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {demoRapidRate ? 'Reset Normal' : 'Uji Laju Cepat'} <small>DEMO</small>
        </button>

        <button
          type="button"
          className="p-btn"
          onClick={() => setShowAcademicModal(true)}
          title="Lihat Metrik Ilmiah (Model 1 & Model 2)"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3v18h18M9 9l4 4 5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Metrik Dual-AI ↗
        </button>
      </div>

      {/* MODAL DIALOG METRIK AKADEMIK DUAL-AI */}
      {showAcademicModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowAcademicModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              maxWidth: 480,
              width: '100%',
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3v18h18M9 9l4 4 5-5"
                    stroke="var(--green)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                  Evaluasi Ilmiah Dual-Model AI
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAcademicModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* TAB SELECTOR: MODEL 1 vs MODEL 2 */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 14,
                borderBottom: '1px solid var(--line)',
                paddingBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveModalTab('regression')}
                style={{
                  padding: '5px 10px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: 'none',
                  background: activeModalTab === 'regression' ? 'var(--green-soft)' : 'transparent',
                  color: activeModalTab === 'regression' ? 'var(--green)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Model 1: Regresi TTO
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('classification')}
                style={{
                  padding: '5px 10px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: 'none',
                  background: activeModalTab === 'classification' ? 'var(--green-soft)' : 'transparent',
                  color: activeModalTab === 'classification' ? 'var(--green)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Model 2: Klasifikasi 4-Sensor
              </button>
            </div>

            {/* KONTEN TAB 1: MODEL REGRESI */}
            {activeModalTab === 'regression' && (
              <div>
                <p
                  style={{
                    fontSize: 10.5,
                    color: 'var(--muted)',
                    margin: '0 0 12px',
                    lineHeight: 1.5,
                  }}
                >
                  Model 1 memprediksi <strong>waktu meluber</strong> (*Time-to-Overflow*) berdasarkan laju pembuangan sampah diurnal (1.344 data telemetri 14 hari):
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--surface-soft)',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <span>Koefisien Determinasi (R² Score):</span>
                    <strong style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                      99,01% (0.9901)
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--surface-soft)',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <span>Mean Absolute Error (MAE):</span>
                    <strong style={{ fontFamily: 'var(--mono)' }}>1,55% volume</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--surface-soft)',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <span>Root Mean Squared Error (RMSE):</span>
                    <strong style={{ fontFamily: 'var(--mono)' }}>2,61% volume</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--surface-soft)',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <span>Sampel Uji Independen:</span>
                    <strong style={{ fontFamily: 'var(--mono)' }}>242 Data Log (20%)</strong>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--green)',
                    background: 'var(--green-soft)',
                    padding: '8px 10px',
                    borderRadius: 4,
                    marginBottom: 14,
                    lineHeight: 1.45,
                  }}
                >
                  ✓ Standar Kelaikan: <strong>SANGAT BAIK</strong> (R² &gt; 0.85 memenuhi standar publikasi &amp; tugas akhir).
                </div>
              </div>
            )}

            {/* KONTEN TAB 2: MODEL KLASIFIKASI 4-SENSOR */}
            {activeModalTab === 'classification' && (
              <div>
                <p
                  style={{
                    fontSize: 10.5,
                    color: 'var(--muted)',
                    margin: '0 0 10px',
                    lineHeight: 1.5,
                  }}
                >
                  Model 2 mengklasifikasikan <strong>status bahaya gas &amp; dekomposisi</strong> menggunakan korelasi 4 sensor (JSN-SR04T + MQ-135 + MQ-4 + DHT22):
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ padding: '6px 8px', background: 'var(--surface-soft)', borderRadius: 4, fontSize: 10.5 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 9 }}>Overall Accuracy:</span>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>100.00% (1.00)</div>
                  </div>
                  <div style={{ padding: '6px 8px', background: 'var(--surface-soft)', borderRadius: 4, fontSize: 10.5 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 9 }}>Macro F1-Score:</span>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>100.00% (1.00)</div>
                  </div>
                </div>

                {/* TABEL CONFUSION MATRIX RESMI */}
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Matriks Kebingungan (Confusion Matrix 4×4):
                </div>
                <div style={{ overflowX: 'auto', background: 'var(--surface-soft)', borderRadius: 4, padding: '6px 8px', marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 9.5 }}>
                    <thead>
                      <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>
                        <th style={{ textAlign: 'left', padding: '3px 4px' }}>Aktual \ Pred</th>
                        <th style={{ padding: '3px 4px' }}>[0] Normal</th>
                        <th style={{ padding: '3px 4px' }}>[1] Dekomp</th>
                        <th style={{ padding: '3px 4px' }}>[2] Metana</th>
                        <th style={{ padding: '3px 4px' }}>[3] Anomali</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px dashed var(--line)' }}>
                        <td style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--muted)' }}>[0] Normal</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--green)', fontWeight: 700 }}>119</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                      </tr>
                      <tr style={{ borderBottom: '1px dashed var(--line)' }}>
                        <td style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--muted)' }}>[1] Dekomp</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--amber)', fontWeight: 700 }}>41</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                      </tr>
                      <tr style={{ borderBottom: '1px dashed var(--line)' }}>
                        <td style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--muted)' }}>[2] Metana</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--red)', fontWeight: 700 }}>27</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--muted)' }}>[3] Anomali</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)' }}>0</td>
                        <td style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--muted)', fontWeight: 700 }}>13</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    fontSize: 9.5,
                    color: 'var(--green)',
                    background: 'var(--green-soft)',
                    padding: '6px 8px',
                    borderRadius: 4,
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  ✓ Justifikasi 4 Sensor: Membuktikan MQ-135, MQ-4, dan DHT22 berfungsi sebagai pilar evaluasi K3 terintegrasi.
                </div>
              </div>
            )}

            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowAcademicModal(false)}
              style={{ width: '100%', height: 34, fontSize: 10.5 }}
            >
              Tutup Ringkasan Metrik
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
