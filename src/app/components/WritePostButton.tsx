import { PenLine } from 'lucide-react';
import { useNavigate } from 'react-router';

export function WritePostButton() {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate('/new-post')}
      className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-accent/90 transition-all hover:scale-110 flex items-center justify-center md:bottom-8"
      aria-label="Write post"
    >
      {/* Quill/Feather icon */}
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-6 h-6"
      >
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </svg>
    </button>
  );
}