#!/bin/bash

# Forge Backend Verification Script
# Checks if all backend files are ready for deployment

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🔥 Forge Backend - Deployment Readiness Check 🔥      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

READY=true

# Check backend files
echo "📁 Checking backend files..."
echo ""

if [ -f "supabase/functions/server/index.tsx" ]; then
    echo "  ✅ Main server file exists"
else
    echo "  ❌ Main server file missing"
    READY=false
fi

if [ -f "supabase/functions/server/games.tsx" ]; then
    echo "  ✅ Games integration exists"
else
    echo "  ❌ Games integration missing"
    READY=false
fi

if [ -f "supabase/functions/server/kv_store.tsx" ]; then
    echo "  ✅ Database utilities exist"
else
    echo "  ❌ Database utilities missing"
    READY=false
fi

if [ -f "supabase/config.toml" ]; then
    echo "  ✅ Configuration file exists"
    
    # Check if JWT is enabled
    if grep -q "verify_jwt = true" supabase/config.toml; then
        echo "  ✅ JWT verification enabled"
    else
        echo "  ⚠️  JWT verification not enabled"
    fi
else
    echo "  ❌ Configuration file missing"
    READY=false
fi

echo ""
echo "🔗 Checking frontend integration..."
echo ""

if [ -f "src/app/utils/api.ts" ]; then
    echo "  ✅ API client exists"
    
    # Check for auth token handling
    if grep -q "forge-access-token" src/app/utils/api.ts; then
        echo "  ✅ Auth token handling present"
    else
        echo "  ⚠️  Auth token handling missing"
    fi
else
    echo "  ❌ API client missing"
    READY=false
fi

echo ""
echo "📚 Checking documentation..."
echo ""

DOCS=0
[ -f "QUICK_START.md" ] && echo "  ✅ Quick Start Guide" && ((DOCS++))
[ -f "DEPLOYMENT_GUIDE.md" ] && echo "  ✅ Deployment Guide" && ((DOCS++))
[ -f "BACKEND_SUMMARY.md" ] && echo "  ✅ Backend Summary" && ((DOCS++))
[ -f "DEPLOYMENT_COMPLETE.md" ] && echo "  ✅ Deployment Complete" && ((DOCS++))
[ -f "test-backend.html" ] && echo "  ✅ Test Tool" && ((DOCS++))
[ -f "deploy.sh" ] && echo "  ✅ Deploy Script" && ((DOCS++))

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

if [ "$READY" = true ]; then
    echo "🎉 SUCCESS! All backend files are ready for deployment!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Open: https://supabase.com/dashboard"
    echo "  2. Deploy edge function: make-server-17285bd7"
    echo "  3. Create 'avatars' bucket (public)"
    echo "  4. Sign out and sign in to refresh token"
    echo ""
    echo "📖 For detailed instructions, see: QUICK_START.md"
    echo ""
    exit 0
else
    echo "❌ Some files are missing. Please check the errors above."
    echo ""
    exit 1
fi
