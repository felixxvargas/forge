import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Link as LinkIcon, Info } from 'lucide-react';
import { Header } from '../components/Header';

export function SubmitIndieGame() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genres: [] as string[],
    platforms: [] as string[],
    releaseDate: '',
    developer: '',
    publisher: '',
    website: '',
    steamUrl: '',
    coverArtUrl: '',
    trailerUrl: '',
    contactEmail: '',
  });
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableGenres = [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 
    'Puzzle', 'Horror', 'Platformer', 'Shooter', 'Fighting',
    'Racing', 'Sports', 'Casual', 'Indie', 'MMO'
  ];

  const availablePlatforms = [
    'PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 
    'Steam', 'Epic Games', 'Itch.io', 'Mobile'
  ];

  const handleGenreToggle = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleCoverArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverArtFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, coverArtUrl: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Store submission in localStorage for demo
      const submissions = JSON.parse(localStorage.getItem('forge-indie-game-submissions') || '[]');
      const newSubmission = {
        id: `submission-${Date.now()}`,
        ...formData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        submittedBy: localStorage.getItem('forge-user-id') || 'user-1',
      };
      submissions.push(newSubmission);
      localStorage.setItem('forge-indie-game-submissions', JSON.stringify(submissions));

      setSuccess(true);
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
        <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Submission Received!</h2>
            <p className="text-muted-foreground">
              Your indie game submission is under review. We'll notify you once it's been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold mb-2">Submit Indie Game</h1>
          <p className="text-muted-foreground">
            Submit your indie game to be featured on Forge. All submissions are reviewed before approval.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Review Process</p>
            <p className="text-muted-foreground">
              Submissions typically take 3-5 business days to review. You'll be notified once your game is approved or if we need additional information.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-card rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Game Title <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter game title"
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-accent">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your game..."
                rows={4}
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Developer</label>
                <input
                  type="text"
                  value={formData.developer}
                  onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                  placeholder="Studio name"
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Publisher</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Publisher name"
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Release Date</label>
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Genres */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Genres <span className="text-accent">*</span></h2>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map(genre => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleGenreToggle(genre)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.genres.includes(genre)
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Platforms <span className="text-accent">*</span></h2>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map(platform => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handlePlatformToggle(platform)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.platforms.includes(platform)
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Media */}
          <div className="bg-card rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Media & Links</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Cover Art <span className="text-accent">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-accent transition-colors text-center">
                    {formData.coverArtUrl ? (
                      <img src={formData.coverArtUrl} alt="Cover" className="w-full h-48 object-cover rounded-lg mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {coverArtFile ? coverArtFile.name : 'Click to upload cover art'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverArtUpload}
                    className="hidden"
                    required={!formData.coverArtUrl}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourgame.com"
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Steam URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.steamUrl}
                  onChange={(e) => setFormData({ ...formData, steamUrl: e.target.value })}
                  placeholder="https://store.steampowered.com/app/..."
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trailer URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.trailerUrl}
                  onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                  placeholder="YouTube or Vimeo URL"
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-card rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Contact Information</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Contact Email <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                We'll use this to contact you about your submission
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || formData.genres.length === 0 || formData.platforms.length === 0}
            className="w-full py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}