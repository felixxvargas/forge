// Creates the Android closed beta announcement post on the @forge account.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create-beta-post.mjs
//
// Get the service role key from: Supabase Dashboard → Project Settings → API → service_role

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmxeafjpscgqprrreulh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY env var is required.');
  console.error('Example: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-beta-post.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const POST_CONTENT = `We just opened the Forge Android Closed Beta 🎉

Be one of the first to experience Forge natively on Android. Sign up and we'll send you a Google Play invite within a week.

👉 forge-social.app/android-beta`;

const IMAGE_URL = 'https://forge-social.app/android-beta-banner.svg';

async function main() {
  const { data: forgeUser, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', 'forge')
    .single();

  if (userError || !forgeUser) {
    console.error('Could not find @forge account:', userError?.message ?? 'not found');
    process.exit(1);
  }

  console.log('Found @forge user:', forgeUser.id);

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: forgeUser.id,
      content: POST_CONTENT,
      images: [IMAGE_URL],
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (postError) {
    console.error('Failed to create post:', postError.message);
    process.exit(1);
  }

  console.log('Post created! ID:', post.id);
  console.log('View at: https://forge-social.app/post/' + post.id);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
