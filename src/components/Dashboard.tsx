"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Archive, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { getTripReports, changeStatus } from '@/app/actions';
import { toast } from 'sonner';

export default function Dashboard({ initialReports }: { initialReports: any[] }) {
  const [reports, setReports] = useState(initialReports);
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await getTripReports(search, status);
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, [status, search]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'deleted' && !confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    try {
      await changeStatus(id, newStatus);
      setReports(reports.filter(r => r.id !== id));
      toast.success(`Record marked as ${newStatus}`);
    } catch (e) {
      toast.error("Failed to change status");
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    window.location.href = `/api/export?format=${format}`;
    toast.success(`Exporting ${format.toUpperCase()}...`);
  };

  const handleExportPDF = async () => {
    toast.info("Generating PDF...");
    try {
      const pdfMakeModule = (await import('pdfmake/build/pdfmake')) as any;
      const pdfFontsModule = (await import('pdfmake/build/vfs_fonts')) as any;
      let pdfMake = pdfMakeModule.default || pdfMakeModule;
      if (pdfMakeModule.pdfMake) pdfMake = pdfMakeModule.pdfMake;
      const pdfFonts = pdfFontsModule.default || pdfFontsModule;
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

      const docDefinition = {
        content: [
          { text: 'Trip Reports Export', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', 'auto', 'auto', '*'],
              body: [
                [{ text: 'Date', bold: true }, { text: 'Type', bold: true }, { text: 'Dosage', bold: true }, { text: 'Location', bold: true }, { text: 'Notes', bold: true }],
                ...reports.map(r => [
                  r.sessionDate ? new Date(r.sessionDate).toLocaleDateString() : 'N/A',
                  r.psychedelicType || 'N/A',
                  r.dosageGrams !== null ? r.dosageGrams.toString() : 'N/A',
                  r.location || 'N/A',
                  (r.notes || '').substring(0, 150)
                ])
              ]
            }
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }
        },
        defaultStyle: {
          fontSize: 10
        }
      };
      
      pdfMake.createPdf(docDefinition).download('trips-export.pdf');
      toast.success("PDF exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['active', 'draft', 'archived', 'deleted'].map(s => (
            <button 
              key={s}
              className={`btn ${status === s ? 'btn-primary' : ''}`}
              onClick={() => setStatus(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flex: '1', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} size={18} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search reports..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '35px' }}
            />
          </div>
          
          <button onClick={() => handleExport('json')} className="btn">JSON</button>
          <button onClick={() => handleExport('csv')} className="btn">CSV</button>
          <button onClick={handleExportPDF} className="btn">PDF</button>
          
          <Link href="/create" className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Plus size={18} /> Add
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading records...</div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--muted)' }}>No records found</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Try adjusting your search or add a new trip report.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.map((report) => (
            <div key={report.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>
                    {report.sessionDate ? new Date(report.sessionDate).toLocaleDateString() : 'Unknown Date'}
                  </h3>
                  <span className={`status-badge badge-${report.status}`}>{report.status}</span>
                </div>
                
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {report.psychedelicType || 'No type selected'} 
                  {report.dosageGrams ? ` • ${report.dosageGrams}g` : ''} 
                  {report.mushroomStrain ? ` • ${report.mushroomStrain}` : ''}
                </p>
                
                {report.notes && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {report.notes}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(status === 'active' || status === 'draft' || status === 'archived') && (
                  <Link href={`/edit/${report.id}`} className="btn" title="Edit">
                    <Edit2 size={16} />
                  </Link>
                )}
                
                {status === 'active' && (
                  <button className="btn" onClick={() => handleStatusChange(report.id, 'archived')} title="Archive">
                    <Archive size={16} />
                  </button>
                )}

                {(status === 'archived' || status === 'deleted') && (
                  <button className="btn" onClick={() => handleStatusChange(report.id, 'active')} title="Restore">
                    <RotateCcw size={16} />
                  </button>
                )}
                
                {status !== 'deleted' && (
                  <button className="btn btn-danger" onClick={() => handleStatusChange(report.id, 'deleted')} title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
