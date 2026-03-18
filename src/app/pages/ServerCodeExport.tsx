import { useNavigate } from 'react-router';
export function ServerCodeExport() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Available</h1>
        <button onClick={() => navigate('/')} className="text-accent underline">Go Home</button>
      </div>
    </div>
  );
}
