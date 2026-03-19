import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle, Clock, ExternalLink, Mail } from 'lucide-react';
import { Header } from '../components/Header';

interface GameSubmission {
  id: string;
  title: string;
  description: string;
  genres: string[];
  platforms: string[];
  releaseDate: string;
  developer: string;
  publisher: string;
  website: string;
  steamUrl: string;
  coverArtUrl: string;
  trailerUrl: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  submittedBy: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export function ReviewSubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<GameSubmission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<GameSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load submissions from localStorage
    const saved = localStorage.getItem('forge-indie-game-submissions');
    if (saved) {
      setSubmissions(JSON.parse(saved));
    }
  }, []);

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  const handleApprove = async (submission: GameSubmission) => {
    setProcessing(true);
    
    // Update submission status
    const updated = submissions.map(sub => 
      sub.id === submission.id 
        ? { ...sub, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewNote }
        : sub
    );
    
    setSubmissions(updated);
    localStorage.setItem('forge-indie-game-submissions', JSON.stringify(updated));
    
    // TODO: Add the game to the actual games database
    
    setSelectedSubmission(null);
    setReviewNote('');
    setProcessing(false);
  };

  const handleReject = async (submission: GameSubmission) => {
    setProcessing(true);
    
    // Update submission status
    const updated = submissions.map(sub => 
      sub.id === submission.id 
        ? { ...sub, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewNote }
        : sub
    );
    
    setSubmissions(updated);
    localStorage.setItem('forge-indie-game-submissions', JSON.stringify(updated));
    
    setSelectedSubmission(null);
    setReviewNote('');
    setProcessing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'approved': return 'text-green-500 bg-green-500/10';
      case 'rejected': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Review Game Submissions</h1>
          <p className="text-muted-foreground">
            Review and approve indie game submissions to add them to Forge
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize whitespace-nowrap ${
                filter === f
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {f}
              {f !== 'all' && (
                <span className="ml-2 text-xs opacity-70">
                  ({submissions.filter(s => s.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center">
            <p className="text-muted-foreground">No submissions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <div
                key={submission.id}
                className="bg-card rounded-xl p-6 hover:bg-card/80 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Cover Art */}
                  {submission.coverArtUrl && (
                    <img
                      src={submission.coverArtUrl}
                      alt={submission.title}
                      className="w-24 h-32 object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{submission.title}</h3>
                        {submission.developer && (
                          <p className="text-sm text-muted-foreground">by {submission.developer}</p>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        <span className="capitalize">{submission.status}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {submission.description}
                    </p>

                    {/* Genres & Platforms */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {submission.genres.slice(0, 3).map(genre => (
                        <span key={genre} className="px-2 py-1 bg-accent/20 text-accent text-xs rounded">
                          {genre}
                        </span>
                      ))}
                      {submission.genres.length > 3 && (
                        <span className="px-2 py-1 bg-secondary text-xs rounded">
                          +{submission.genres.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap gap-3 mb-3 text-sm">
                      {submission.website && (
                        <a
                          href={submission.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Website
                        </a>
                      )}
                      {submission.steamUrl && (
                        <a
                          href={submission.steamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Steam
                        </a>
                      )}
                      {submission.contactEmail && (
                        <a
                          href={`mailto:${submission.contactEmail}`}
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Contact
                        </a>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                      {submission.releaseDate && (
                        <span>Released {new Date(submission.releaseDate).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Review Note */}
                    {submission.reviewNote && submission.status !== 'pending' && (
                      <div className="bg-secondary/50 rounded-lg p-3 text-sm mb-3">
                        <p className="font-medium mb-1">Review Note:</p>
                        <p className="text-muted-foreground">{submission.reviewNote}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {submission.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                        >
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Review Submission</h2>
              
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2">{selectedSubmission.title}</h3>
                <p className="text-muted-foreground">{selectedSubmission.description}</p>
              </div>

              {selectedSubmission.coverArtUrl && (
                <img
                  src={selectedSubmission.coverArtUrl}
                  alt={selectedSubmission.title}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Review Note (Optional)</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note about your decision..."
                  rows={3}
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedSubmission)}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedSubmission)}
                  disabled={processing}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setReviewNote('');
                }}
                disabled={processing}
                className="w-full mt-3 py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}