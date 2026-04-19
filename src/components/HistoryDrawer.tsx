"use client";

import { useState } from 'react';
import { Clock } from 'lucide-react';

export default function HistoryDrawer({ history }: { history: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!history || history.length === 0) return null;

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--secondary)' }}>
        <Clock size={16} /> View History
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '400px', background: 'var(--input-bg)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', zIndex: 100, padding: '2rem', overflowY: 'auto', transition: 'transform 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0 }}>Version History</h3>
              <button className="btn" onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map((h) => (
                <div key={h.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--background)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>v{h.version}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>Action: {h.actionType}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                    Changed: {(() => {
                      try {
                        return JSON.parse(h.changedFields).join(', ');
                      } catch {
                        return h.changedFields;
                      }
                    })()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
