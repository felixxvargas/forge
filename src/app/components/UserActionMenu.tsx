import { useState } from 'react';
import { MoreVertical, UserX, VolumeX, Flag, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router';

interface UserActionMenuProps {
  userId: string;
  userName: string;
}

export function UserActionMenu({ userId, userName }: UserActionMenuProps) {
  const { blockUser, muteUser, reportUser, blockedUsers, mutedUsers, unblockUser, unmuteUser } = useAppData() as any;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBlocked = blockedUsers.has(userId);
  const isMuted = mutedUsers.has(userId);

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await unblockUser(userId);
      } else {
        const confirmed = confirm(`Are you sure you want to block @${userName}? You won't see their posts or be able to interact with them.`);
        if (confirmed) {
          await blockUser(userId);
          navigate(-1); // Go back after blocking
        }
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user. Please try again.');
    }
  };

  const handleMute = async () => {
    try {
      if (isMuted) {
        await unmuteUser(userId);
      } else {
        await muteUser(userId);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error muting user:', error);
      alert('Failed to mute user. Please try again.');
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
    setIsOpen(false);
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      alert('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportUser(userId, reportReason, reportDescription);
      alert('Report submitted successfully. Our team will review it shortly.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleMute}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <VolumeX className="w-5 h-5" />
                <div>
                  <p className="font-medium">{isMuted ? 'Unmute' : 'Mute'} @{userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isMuted ? 'Start seeing their posts again' : "Stop seeing their posts"}
                  </p>
                </div>
              </button>

              <button
                onClick={handleBlock}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
              >
                <UserX className="w-5 h-5" />
                <div>
                  <p className="font-medium">{isBlocked ? 'Unblock' : 'Block'} @{userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isBlocked ? 'Allow them to interact with you' : "They won't be able to see your posts"}
                  </p>
                </div>
              </button>

              <button
                onClick={handleReport}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left border-t border-border text-red-500"
              >
                <Flag className="w-5 h-5" />
                <div>
                  <p className="font-medium">Report @{userName}</p>
                  <p className="text-xs text-muted-foreground">
                    Report this account for violating guidelines
                  </p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Report @{userName}</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select a reason...</option>
                  <option value="spam">Spam or misleading</option>
                  <option value="harassment">Harassment or hate speech</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide more context about why you're reporting this account..."
                  className="w-full px-3 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reportDescription.length}/500 characters
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Reports are reviewed by our moderation team. False reports may result in action on your account.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason || isSubmitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
