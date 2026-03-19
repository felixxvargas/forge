# ⚡ Forge — Deployment Guide

Complete guide to get Forge live on GitHub + Vercel with Google OAuth.

---

## Prerequisites

- [Node.js 18+](https://nodejs.org) and [pnpm](https://pnpm.io) installed
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- A [GitHub](https://github.com) account
- A [Google Cloud](https://console.cloud.google.com) account (for OAuth)

---

## Step 1 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, region, and strong database password → **Create Project**
3. Once created, go to **Settings → API** and copy:
   - **Project URL** → extract the project ID (e.g. `xmxeafjpscgqprrreulh`)
   - **anon / public** key

---

## Step 2 — Enable Google OAuth in Supabase

1. In Supabase Dashboard → **Authentication → Providers → Google** → toggle **Enable**
2. You'll need a Google Client ID & Secret — see Step 3

### Step 3 — Create Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. **APIs & Services → OAuth consent screen** → External → fill in app name & email
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — add:
     ```
     https://<your-supabase-project-id>.supabase.co/auth/v1/callback
     ```
5. Copy the **Client ID** and **Client Secret**
6. Paste them back into Supabase → **Authentication → Providers → Google**

### Step 4 — Configure Supabase URL Settings

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://your-vercel-app.vercel.app` (update after Vercel deploy)
- **Redirect URLs** → Add:
  ```
  https://your-vercel-app.vercel.app/auth/callback
  http://localhost:5173/auth/callback
  ```

---

## Step 5 — Push to GitHub

```bash
# In the forge_deploy project folder:
git init
git add .
git commit -m "feat: initial Forge commit with auth + SignUp page"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/forge.git
git branch -M main
git push -u origin main
```

---

## Step 6 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo (`forge`)
3. Vercel auto-detects Vite — keep defaults
4. Under **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_PROJECT_ID` | your Supabase project ID |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

5. Click **Deploy** 🚀

After deploy, copy your Vercel URL (e.g. `https://forge-abc123.vercel.app`) and update the Supabase Site URL and Redirect URLs from Step 4.

---

## Step 7 — Local Development

```bash
# Install dependencies
pnpm install

# Copy env file and fill in your values
cp .env.example .env.local

# Start dev server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Auth Flow Summary

```
User clicks "Continue with Google"
  → Supabase redirects to Google
  → Google redirects to: https://yourapp.vercel.app/auth/callback
  → AuthCallback.tsx extracts session, stores token
  → If profile complete → /feed
  → If new user → /onboarding
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Google OAuth button does nothing | Check VITE_SUPABASE_* env vars are set in Vercel |
| Redirect after Google sign-in goes to wrong URL | Update Supabase Site URL + Redirect URLs |
| 404 on page refresh | Confirm vercel.json rewrites are in place |
| "Missing Supabase env vars" in console | Add vars to .env.local (local) or Vercel dashboard |
| Auth works locally but not on Vercel | Add the Vercel URL to Supabase Redirect URLs |

---

## Quick Re-deploy After Changes

```bash
git add .
git commit -m "your change"
git push
```
Vercel auto-deploys on every push to `main`. ✅
