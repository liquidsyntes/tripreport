import TripForm from '../../components/TripForm';

export default function CreatePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Create Trip Report</h1>
      <TripForm />
    </div>
  );
}
