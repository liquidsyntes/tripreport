import { getTripReportById } from '../../actions';
import TripForm from '../../../components/TripForm';
import HistoryDrawer from '../../../components/HistoryDrawer';
import { notFound } from 'next/navigation';

export default async function EditPage({ params }: { params: { id: string } }) {
  const report = await getTripReportById(params.id);
  
  if (!report) {
    notFound();
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Edit Trip Report</h1>
        <HistoryDrawer history={report.history} />
      </div>
      <TripForm initialData={report} reportId={report.id} />
    </div>
  );
}
