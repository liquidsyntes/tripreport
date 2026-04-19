import { getTripReports } from './actions';
import Dashboard from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialReports = await getTripReports('', 'active');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Trip Reports Dashboard</h1>
      </div>
      <Dashboard initialReports={initialReports} />
    </div>
  );
}
