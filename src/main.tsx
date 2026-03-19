import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{ background: '#1c1228', color: '#b8d84e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontFamily: 'sans-serif' }}>
      ⚡ FORGE IS WORKING
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
