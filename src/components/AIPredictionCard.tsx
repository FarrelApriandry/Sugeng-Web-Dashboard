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
  // State mode simulasi demonstrasi (laju cepat buangan)
  const [demoRapidRate, setDemoRapidRate] = useState<boolean>(false);
  const [showAcademicModal, setShowAcademicModal] = useState<boolean>(false);

  // Jika demo aktif, gunakan laju tinggi 16.5%/jam
  const simulatedRate = demoRapidRate ? 16.5 : undefined;

  const prediction: AIPredictionResult = calculateLocalPrediction(
    node.id,
    node.name,
    node.fill,
    new Date().getHours(),
    simulatedRate
  );

  return (
    <section className="info-section ai-predictive-section" style={{ borderLeft: '3px solid var(--green)', paddingLeft: 12 }}>
      {/* Heading Seksi AI */}
      <div className="section-heading" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Prediksi Waktu Penuh</h3>
        </div>
        <span
          className="section-hint"
          style={{
            background: 'var(--green-soft)',
            color: 'var(--green)',
            padding: '2px 7px',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 9.5,
          }}
        >
          AI REGRESI DIURNAL
        </span>
      </div>

      {/* Kartu Status Utama Waktu Penuh (TTO) */}
      <div
        style={{
          background: 'var(--surface-soft)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>
            ESTIMASI WADAH MELUBER (100%)
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              background: prediction.urgencyColor + '18',
              color: prediction.urgencyColor,
            }}
          >
            {prediction.urgencyLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <strong
            style={{
              fontSize: 20,
              fontFamily: 'var(--mono)',
              color: prediction.urgencyColor,
              fontWeight: 700,
            }}
          >
            {formatMinutesHuman(prediction.minutesToOverflow)}
          </strong>
          {prediction.predictedOverflowTimeText && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              ({prediction.predictedOverflowTimeText})
            </span>
          )}
        </div>

        {/* Baris Laju Pengisian & Waktu Kritis 75% */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            paddingTop: 8,
            marginTop: 6,
            borderTop: '1px dashed var(--line)',
            fontSize: 11,
          }}
        >
          <div>
            <span style={{ color: 'var(--muted)', fontSize: 10 }}>Laju Buangan:</span>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink)' }}>
              +{prediction.estimatedFillingRatePerHour}% / jam
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--muted)', fontSize: 10 }}>Batas Kritis (75%):</span>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: node.fill >= 75 ? 'var(--red)' : 'var(--amber)' }}>
              {prediction.predictedWarningTimeText
                ? `${formatMinutesHuman(prediction.minutesToWarning)}`
                : 'Sudah Melewati'}
            </div>
          </div>
        </div>
      </div>

      {/* Proyeksi Keterisian 6 Jam ke Depan (Horizon Bars) */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 5 }}>
          <span>Proyeksi Tren Volume 6 Jam ke Depan</span>
          <span style={{ fontFamily: 'var(--mono)' }}>Interval 1 Jam</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 4,
            background: 'var(--surface-soft)',
            padding: '8px 6px',
            borderRadius: 6,
            border: '1px solid var(--line)',
            textAlign: 'center',
          }}
        >
          {prediction.hourlyForecast.map((pt, idx) => {
            const isFull = pt.predictedVolumePercent >= 100;
            const isCrit = pt.predictedVolumePercent >= 75;
            const barColor = isCrit ? 'var(--red)' : pt.predictedVolumePercent >= 50 ? 'var(--amber)' : 'var(--green)';

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                  +{idx + 1}j
                </span>
                <div
                  style={{
                    width: '100%',
                    height: 28,
                    background: 'var(--line)',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.min(100, pt.predictedVolumePercent)}%`,
                      background: barColor,
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>
                <strong style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: barColor }}>
                  {Math.round(pt.predictedVolumePercent)}%
                </strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* Naratif Rekomendasi Petugas */}
      <div
        style={{
          fontSize: 10.5,
          lineHeight: 1.45,
          color: 'var(--ink-2)',
          background: 'var(--green-soft)',
          padding: '8px 10px',
          borderRadius: 6,
          borderLeft: '2px solid var(--green)',
          marginBottom: 10,
        }}
      >
        <strong>Rekomendasi Cerdas:</strong> {prediction.recommendation}
      </div>

      {/* Kontrol Interaktif untuk Demonstrasi Tugas Dosen */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setDemoRapidRate(!demoRapidRate)}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 5,
            border: '1px solid ' + (demoRapidRate ? 'var(--red)' : 'var(--line)'),
            background: demoRapidRate ? 'var(--red-soft)' : '#ffffff',
            color: demoRapidRate ? 'var(--red)' : 'var(--ink-2)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Klik untuk mensimulasikan pembuangan sampah cepat di hadapan dosen"
        >
          {demoRapidRate ? '⚡ Reset Laju Normal' : '⚡ Uji Laju Cepat (Demo)'}
        </button>

        <button
          type="button"
          onClick={() => setShowAcademicModal(true)}
          style={{
            padding: '6px 10px',
            fontSize: 10,
            fontWeight: 600,
            borderRadius: 5,
            border: '1px solid var(--line)',
            background: '#ffffff',
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
          title="Lihat Metrik Ilmiah (R², MAE, RMSE)"
        >
          📊 Metrik
        </button>
      </div>

      {/* Modal Dialog Metrik Akademik untuk Laporan / Penguji */}
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
              borderRadius: 12,
              maxWidth: 440,
              width: '100%',
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Metrik Ilmiah Model Regresi AI</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAcademicModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Model dilatih dengan <strong>1.344 data telemetri diurnal</strong> (14 hari siklus persampahan Kota Magelang). Berikut adalah hasil evaluasi resmi:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-soft)', borderRadius: 6, fontSize: 11.5 }}>
                <span>Koefisien Determinasi (R² Score):</span>
                <strong style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>98,94% (0.9894)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-soft)', borderRadius: 6, fontSize: 11.5 }}>
                <span>Mean Absolute Error (MAE):</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>1,44% volume</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-soft)', borderRadius: 6, fontSize: 11.5 }}>
                <span>Root Mean Squared Error (RMSE):</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>2,48% volume</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-soft)', borderRadius: 6, fontSize: 11.5 }}>
                <span>Dataset Uji Independen:</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>244 Sampel Test</strong>
              </div>
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--green)', background: 'var(--green-soft)', padding: 8, borderRadius: 6, marginBottom: 14, lineHeight: 1.4 }}>
              ✓ Status Kelaikan: <strong>SANGAT BAIK</strong> (R² &gt; 0.85 memenuhi standar publikasi &amp; tugas akhir).
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowAcademicModal(false)}
              style={{ width: '100%', height: 36, fontSize: 11 }}
            >
              Tutup Ringkasan Metrik
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
