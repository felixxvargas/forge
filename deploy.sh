#!/bin/bash

# Forge - Quick Deployment Script
# This script deploys the edge function to Supabase

echo "🔥 Forge - Supabase Deployment Script"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo "  OR"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if already logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase..."
    supabase login
fi

echo "✅ Authenticated"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "🔗 Project not linked. Please enter your project ID:"
    read -p "Project ID: " project_id
    supabase link --project-ref "$project_id"
fi

echo "✅ Project linked"
echo ""

# Deploy the edge function
echo "🚀 Deploying edge function 'make-server-17285bd7'..."
echo ""

supabase functions deploy make-server-17285bd7

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Next steps:"
    echo "1. Verify 'avatars' bucket exists in Storage (must be public)"
    echo "2. Sign out and sign in to get fresh access token"
    echo "3. Test posting and profile picture upload"
    echo ""
    echo "📋 Check DEPLOYMENT_GUIDE.md for troubleshooting"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Try deploying via Supabase Dashboard instead:"
    echo "https://supabase.com/dashboard → Edge Functions → Deploy"
    echo ""
fi
