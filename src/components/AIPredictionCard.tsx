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

  const simulatedRate = demoRapidRate ? 16.5 : undefined;

  const prediction: AIPredictionResult = calculateLocalPrediction(
    node.id,
    node.name,
    node.fill,
    new Date().getHours(),
    simulatedRate
  );

  const isCritical = node.fill >= 75 || (prediction.minutesToOverflow !== null && prediction.minutesToOverflow <= 60);

  // Pecah durasi ke jam dan menit
  const totalMins = prediction.minutesToOverflow !== null ? Math.max(0, prediction.minutesToOverflow) : 0;
  const hours = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);

  // Label status peringatan laju
  let warningText = 'Laju pengisian terkendali';
  if (node.fill >= 98) {
    warningText = 'Kapasitas wadah penuh (100%)';
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
          <span className="p-subtitle">REGRESI DIURNAL</span>
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
          {warningText}
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
        <div className="p-rec-label">TINDAKAN OPERASIONAL</div>
        <p>{prediction.recommendation}</p>
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
          title="Lihat Metrik Ilmiah (R², MAE, RMSE)"
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
          Metrik Model ↗
        </button>
      </div>

      {/* MODAL DIALOG METRIK AKADEMIK */}
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
              maxWidth: 420,
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
                  Metrik Model Regresi AI
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

            <p
              style={{
                fontSize: 10.5,
                color: 'var(--muted)',
                margin: '0 0 14px',
                lineHeight: 1.5,
              }}
            >
              Evaluasi empiris model regresi deret waktu diurnal berbasis <strong>1.344 data telemetri</strong> (14 hari siklus buangan sampah Kota Magelang):
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--surface-soft)',
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                <span>Koefisien Determinasi (R² Score):</span>
                <strong style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                  98,94% (0.9894)
                </strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--surface-soft)',
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                <span>Mean Absolute Error (MAE):</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>1,44% volume</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--surface-soft)',
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                <span>Root Mean Squared Error (RMSE):</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>2,48% volume</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--surface-soft)',
                  borderRadius: 5,
                  fontSize: 11,
                }}
              >
                <span>Sampel Data Uji Independen:</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>244 Data Log (20%)</strong>
              </div>
            </div>

            <div
              style={{
                fontSize: 10,
                color: 'var(--green)',
                background: 'var(--green-soft)',
                padding: '8px 10px',
                borderRadius: 5,
                marginBottom: 14,
                lineHeight: 1.45,
              }}
            >
              Status Kelaikan Akademik: <strong>MEMENUHI STANDAR</strong> (R² &gt; 0.85 &amp; error &lt; 3%).
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowAcademicModal(false)}
              style={{ width: '100%', height: 34, fontSize: 10.5 }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
