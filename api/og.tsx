import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const FORGE_LOGO = `
  <svg width="48" height="38" viewBox="0 0 30 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
  </svg>
`;

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  const handle = url.searchParams.get('handle');
  const avatar = url.searchParams.get('avatar');
  const bio = url.searchParams.get('bio');

  // User-specific profile OG image
  if (name || handle) {
    const displayName = name || handle || 'Forge User';
    const displayHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '';

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: 'linear-gradient(135deg, hsl(270 50% 6%) 0%, hsl(270 40% 10%) 100%)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(132,204,22,0.08) 0%, transparent 65%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              left: '-100px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)',
            }}
          />

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '64px 72px', justifyContent: 'space-between' }}>
            {/* Top: Forge branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'hsl(270 50% 16%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Forge logo SVG inline */}
                <svg width="30" height="24" viewBox="0 0 30 24">
                  <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
                </svg>
              </div>
              <span style={{ fontSize: '22px', fontWeight: '700', color: '#E7FFC4', letterSpacing: '-0.3px' }}>Forge</span>
            </div>

            {/* Middle: Profile info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: 'hsl(270 50% 20%)',
                  border: '4px solid rgba(231,255,196,0.2)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  color: '#E7FFC4',
                }}
              >
                {avatar ? (
                  <img src={avatar} width="160" height="160" style={{ objectFit: 'cover' }} />
                ) : (
                  <span>{(displayName[0] || '?').toUpperCase()}</span>
                )}
              </div>

              {/* Name + handle + bio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ fontSize: '56px', fontWeight: '800', color: 'white', letterSpacing: '-1px', lineHeight: 1.1 }}>
                  {displayName}
                </div>
                {displayHandle && (
                  <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>
                    {displayHandle}
                  </div>
                )}
                {bio && (
                  <div
                    style={{
                      fontSize: '22px',
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.4,
                      marginTop: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {bio}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: tagline */}
            <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2px' }}>
              forge-social.app · Gaming Social Network
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Generic Forge OG image (no user params)
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'hsl(270 50% 6%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(132,204,22,0.12) 0%, transparent 65%)',
          }}
        />
        <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
          <svg width="100" height="80" viewBox="0 0 30 24">
            <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
          </svg>
        </div>
        <div style={{ fontSize: '88px', fontWeight: '800', color: 'white', letterSpacing: '-2px', lineHeight: 1, marginBottom: '20px' }}>
          Forge
        </div>
        <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2px' }}>
          Your gaming social network
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
