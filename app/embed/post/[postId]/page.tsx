import type { Metadata } from 'next';

export const revalidate = 3600;
export function generateStaticParams() { return [{ postId: '_' }]; }

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SUPABASE = `https://${projectId}.supabase.co/rest/v1`;
const hdrs = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

async function fetchPost(postId: string | undefined) {
  if (!postId || postId === '_') return null;
  try {
    const res = await fetch(
      `${SUPABASE}/posts?select=*,author:profiles!user_id(id,display_name,handle,profile_picture)&id=eq.${postId}&limit=1`,
      { headers: hdrs, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
  } catch { return null; }
}

async function fetchPollVotes(postId: string): Promise<Record<number, number>> {
  try {
    const res = await fetch(
      `${SUPABASE}/poll_votes?select=option_index&post_id=eq.${postId}`,
      { headers: hdrs, next: { revalidate: 60 } }
    );
    if (!res.ok) return {};
    const rows: { option_index: number }[] = await res.json();
    const counts: Record<number, number> = {};
    for (const { option_index } of rows) counts[option_index] = (counts[option_index] ?? 0) + 1;
    return counts;
  } catch { return {}; }
}

async function fetchQuotedPost(quotePostId: string) {
  try {
    const res = await fetch(
      `${SUPABASE}/posts?select=id,content,images,author:profiles!user_id(display_name,handle)&id=eq.${quotePostId}&limit=1`,
      { headers: hdrs, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
  } catch { return null; }
}

async function fetchLinkMeta(url: string) {
  try {
    const res = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'success') return null;
    const d = json.data ?? {};
    return {
      title: d.title as string | undefined,
      description: d.description as string | undefined,
      image: (d.image?.url ?? null) as string | null,
    };
  } catch { return null; }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ postId: string }> }
): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPost(postId);
  if (!post) return { title: 'Post | Forge' };
  const author = (post.author as any)?.display_name ?? 'Forge user';
  return { title: `${author} on Forge` };
}

export default async function EmbedPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await fetchPost(postId);

  const baseUrl = 'https://forge-social.app';

  if (!post) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px', background: '#1c1228', color: '#aca3b8', fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
        Post not found
      </div>
    );
  }

  const poll = (post.poll as { options: string[]; end_date: string } | null) ?? null;

  const [pollVotes, quotedPost, linkMeta] = await Promise.all([
    poll ? fetchPollVotes(postId) : Promise.resolve({} as Record<number, number>),
    post.quote_post_id ? fetchQuotedPost(post.quote_post_id) : Promise.resolve(null),
    post.url ? fetchLinkMeta(post.url) : Promise.resolve(null),
  ]);

  const author = post.author as any;
  const handle = ((author?.handle ?? '') || '').replace(/^@/, '');
  const images: string[] = Array.isArray(post.images) ? post.images : [];
  const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  const nonVideoImages = images.filter(u => !isVideo(u));
  const postUrl = `${baseUrl}/post/${postId}`;

  const initials = (author?.display_name || handle || '?').slice(0, 1).toUpperCase();
  const avatarColors = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];
  const colorIdx = initials.charCodeAt(0) % avatarColors.length;

  // Poll totals
  const totalVotes = poll ? Object.values(pollVotes).reduce((s, c) => s + c, 0) : 0;
  const pollEnded = poll ? new Date(poll.end_date) <= new Date() : false;

  return (
    <div style={{ background: '#1c1228', minHeight: '100vh', padding: '0', margin: '0' }}>
      <div style={{
        background: '#1c1228',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        margin: '0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#f0f4f8',
        maxWidth: '550px',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <a href={`${baseUrl}/profile/${handle}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, textDecoration: 'none' }}>
            {author?.profile_picture ? (
              <img
                src={author.profile_picture}
                alt={author.display_name || handle}
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: avatarColors[colorIdx], display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '600', color: '#fff',
              }}>
                {initials}
              </div>
            )}
          </a>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <a href={`${baseUrl}/profile/${handle}`} target="_blank" rel="noopener noreferrer"
                style={{ fontWeight: '600', fontSize: '15px', color: '#f0f4f8', textDecoration: 'none' }}>
                {author?.display_name || handle}
              </a>
              <span style={{ color: '#aca3b8', fontSize: '13px' }}>@{handle}</span>
              {post.created_at && (
                <span style={{ color: '#aca3b8', fontSize: '13px', marginLeft: 'auto' }}>
                  {formatDate(post.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div style={{ padding: '12px 16px', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {post.content}
          </div>
        )}

        {/* Poll */}
        {poll && (
          <div style={{ margin: '0 16px 12px', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aca3b8" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span style={{ fontSize: '12px', color: '#aca3b8' }}>
                {pollEnded ? 'Poll ended' : `Ends ${new Date(poll.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                {totalVotes > 0 && ` · ${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`}
              </span>
            </div>
            <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {poll.options.map((option, i) => {
                const count = pollVotes[i] ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <div key={i} style={{ position: 'relative', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(124,58,237,0.25)', borderRadius: '7px', transition: 'width 0.3s' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 10px', fontSize: '13px', fontWeight: '500' }}>
                      <span style={{ color: '#f0f4f8' }}>{option}</span>
                      {totalVotes > 0 && <span style={{ color: '#aca3b8', fontSize: '12px' }}>{pct}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quoted post */}
        {quotedPost && (() => {
          const qa = quotedPost.author as any;
          const qHandle = ((qa?.handle ?? '') || '').replace(/^@/, '');
          const qImages: string[] = Array.isArray(quotedPost.images) ? quotedPost.images : [];
          const qNonVideo = qImages.filter((u: string) => !isVideo(u));
          return (
            <a
              href={`${baseUrl}/post/${quotedPost.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', margin: '0 16px 12px', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.04)', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600', fontSize: '13px', color: '#f0f4f8' }}>{qa?.display_name || qHandle}</span>
                <span style={{ fontSize: '12px', color: '#aca3b8' }}>@{qHandle}</span>
              </div>
              {quotedPost.content && (
                <p style={{ margin: 0, fontSize: '13px', color: '#d4cfe0', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                  {quotedPost.content}
                </p>
              )}
              {qNonVideo.length > 0 && (
                <img src={qNonVideo[0]} alt="" style={{ marginTop: '8px', width: '100%', borderRadius: '8px', objectFit: 'cover', maxHeight: '160px', display: 'block' }} />
              )}
            </a>
          );
        })()}

        {/* Images */}
        {nonVideoImages.length > 0 && (
          <div style={{
            padding: '0 16px 12px',
            display: 'grid',
            gap: '4px',
            gridTemplateColumns: nonVideoImages.length === 1 ? '1fr' : '1fr 1fr',
          }}>
            {nonVideoImages.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" style={{
                width: '100%', borderRadius: '8px', objectFit: 'cover',
                aspectRatio: nonVideoImages.length === 1 ? '16/9' : '1/1',
                display: 'block',
              }} />
            ))}
          </div>
        )}

        {/* Video thumbnail placeholder */}
        {images.some(isVideo) && nonVideoImages.length === 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              background: '#2d1f47', borderRadius: '8px', aspectRatio: '16/9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#aca3b8"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}

        {/* URL preview card */}
        {post.url && (
          <div style={{ margin: '0 16px 12px' }}>
            {linkMeta ? (
              <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.03)' }}>
                {linkMeta.image && (
                  <img src={linkMeta.image} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '10px 12px' }}>
                  {linkMeta.title && <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: '600', color: '#f0f4f8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{linkMeta.title}</p>}
                  {linkMeta.description && <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#aca3b8', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{linkMeta.description}</p>}
                  <span style={{ fontSize: '11px', color: '#aca3b8' }}>{getDomain(post.url)}</span>
                </div>
              </a>
            ) : (
              <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '99px', background: 'rgba(255,255,255,0.04)', fontSize: '12px', color: '#aca3b8', textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                {getDomain(post.url)}
              </a>
            )}
          </div>
        )}

        {/* Stats + footer */}
        <div style={{
          padding: '10px 16px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aca3b8', fontSize: '13px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            {formatCount(post.like_count ?? 0)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aca3b8', fontSize: '13px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {formatCount(post.comment_count ?? 0)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aca3b8', fontSize: '13px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
            {formatCount(post.repost_count ?? 0)}
          </span>
          <div style={{ flex: 1 }} />
          <a href={postUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#E7FFC4', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
            <svg width="14" height="14" viewBox="0 0 512 512" fill="#E7FFC4" style={{ borderRadius: '3px', flexShrink: 0 }}>
              <rect width="512" height="512" rx="124" fill="#7C3AED"/>
              <path d="M343.327 372.089C341.855 376.789 340.942 379.948 336.451 379.948C328.23 380.11 257.815 380.102 253.057 379.975C248.091 379.842 246.556 377.301 248.426 369.671C250.295 362.04 251.435 360.182 240.418 360.182C231.647 360.182 228.454 359.966 218.437 359.966C210.456 359.966 210.497 360.182 207.703 368.302C205.772 373.909 205.579 380.5 199.147 380.5C190.711 380.5 117.908 380.5 109.857 380.5C100.357 380.5 102.88 372.191 104.377 367.342C114.699 333.913 126.933 293.759 137.739 257.838C139.656 251.465 140.218 247.185 162.297 242.554C184.376 237.923 181.933 237.485 203.685 232.52C219.6 228.887 219.423 227.685 221.916 219.118C228.021 198.137 221.916 219.118 228.021 198.137C230.125 190.906 228.173 189.864 203.685 186.354C193.775 184.934 204.195 186.386 181.696 182.845C159.198 179.304 157.303 179.337 158.326 173.651C159.036 169.707 166.532 140.928 167.674 138.003C170.493 130.84 171.53 131.517 201.31 131.517C258.77 131.517 327.832 131.517 385.195 131.517C413.663 131.517 413.969 131.517 411.017 141.652C404.62 163.615 411.017 141.652 402.597 170.561C398.892 183.28 387.14 183.365 363.572 186.705C330.209 191.433 363.572 186.705 330.209 191.433C315.24 193.554 316.222 193.787 313.205 203.189C310.187 212.592 310.727 213.364 308.034 222.906C306.374 228.793 305.752 233.066 318.301 236.379C341.693 242.554 358.884 247.045 368.778 249.571C378.672 252.097 375.765 261.915 373.594 269.779C371.422 277.642 349.923 351.038 343.327 372.089Z" fill="#E7FFC4"/>
            </svg>
            View on Forge
          </a>
        </div>
      </div>
    </div>
  );
}
