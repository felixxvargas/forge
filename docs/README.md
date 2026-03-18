# Forge Documentation

Welcome to the Forge documentation! This folder contains all project documentation, guides, and specifications.

**📌 All documentation has been consolidated into the `/docs` folder for easy access.**

---

## 📚 Core Documentation (START HERE!)

### Getting Started
- **[PROJECT_SPEC.md](PROJECT_SPEC.md)** ⭐ **NEW!** - Complete project specification and overview
  - Full tech stack, architecture, and features
  - All API endpoints documented
  - Database schema reference
  - User flows and design system
  - **This is your main reference document!**
  
- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Setup and configuration guide
  - Quick start with admin panel
  - Database seeding instructions
  - User account creation
  - Google OAuth setup
  - Admin operations

### Development
- **[../guidelines/Guidelines.md](../guidelines/Guidelines.md)** - Development guidelines
  - Component patterns
  - Code style conventions
  - State management best practices
  - UI/UX guidelines

### Deployment
- **[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)** - Current deployment status
  - Known issues (cold start 404s)
  - Testing checklist
  - Troubleshooting guide
  
- **[DEPLOYMENT_HELP.md](DEPLOYMENT_HELP.md)** - Deployment troubleshooting
- **[GOOGLE_OAUTH_TROUBLESHOOTING.md](GOOGLE_OAUTH_TROUBLESHOOTING.md)** - OAuth setup help

---

## 📋 Reference Documentation

### Database
- **[DATABASE_SCHEMA.sql](DATABASE_SCHEMA.sql)** - Database structure and schema
  - KV store key patterns
  - Data models
  - Relationships

### Credits
- **[ATTRIBUTIONS.md](ATTRIBUTIONS.md)** - Third-party licenses and credits
  - Open source libraries
  - External APIs
  - Fonts and assets

---

## 📝 Progress Tracking

### Feature Logs
- **[COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)** - Completed features log
- **[COMPLETED_UPDATES.md](COMPLETED_UPDATES.md)** - Recent updates
- **[COMPLETED_FIXES_PART2.md](COMPLETED_FIXES_PART2.md)** - Bug fixes part 2
- **[COMPLETED_FIXES_PART3.md](COMPLETED_FIXES_PART3.md)** - Bug fixes part 3

### Current Status
- **[FIXES_IN_PROGRESS.md](FIXES_IN_PROGRESS.md)** - Active work items

---

## 🔍 Quick Links by Topic

### For New Developers
1. Read [PROJECT_SPEC.md](PROJECT_SPEC.md) for complete overview
2. Review [../guidelines/Guidelines.md](../guidelines/Guidelines.md) for code conventions  
3. Follow [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) to get started
4. Check [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for known issues

### For Users
1. Check [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for account creation
2. See [PROJECT_SPEC.md](PROJECT_SPEC.md) for feature descriptions
3. Review [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for current status

### For Admins
1. Read [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Admin Operations section
2. See [PROJECT_SPEC.md](PROJECT_SPEC.md) - Admin Endpoints section
3. Check [DATABASE_SCHEMA.sql](DATABASE_SCHEMA.sql) for data structure

---

## 🎯 Common Tasks

### Initialize Database
See: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md#quick-start)
- Use admin panel at `/admin`
- Click "Seed Database" button

### Configure Google OAuth
See: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md#google-oauth-setup)  
Also: [GOOGLE_OAUTH_TROUBLESHOOTING.md](GOOGLE_OAUTH_TROUBLESHOOTING.md)

### Fix Cold Start 404s
See: [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md#workaround-for-cold-starts)
- Run `deploymentCheck()` in console
- Wait for warmup, then retry

### Understanding the API
See: [PROJECT_SPEC.md](PROJECT_SPEC.md#api-endpoints)
- All endpoints documented
- Request/response examples
- Authentication requirements

---

## 📞 Support

### Documentation Issues
If you find errors or need clarification in the docs:
1. Check all related docs (they link to each other)
2. Review the main [PROJECT_SPEC.md](PROJECT_SPEC.md)
3. Contact project maintainers

### External Resources
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com)

---

## 📑 Document Index

```
/docs/
├── README.md (this file)          # Documentation index
├── PROJECT_SPEC.md                # Complete project specification ⭐
├── SETUP_INSTRUCTIONS.md          # Setup and configuration guide ⭐
├── DEPLOYMENT_STATUS.md           # Current deployment status ⭐
├── DEPLOYMENT_HELP.md             # Deployment troubleshooting
├── DATABASE_SCHEMA.sql            # Database structure
├── ATTRIBUTIONS.md                # Licenses and credits
├── COMPLETED_FEATURES.md          # Feature completion log
├── COMPLETED_UPDATES.md           # Updates log
├── COMPLETED_FIXES_PART2.md       # Bug fixes log (part 2)
├── COMPLETED_FIXES_PART3.md       # Bug fixes log (part 3)
├── FIXES_IN_PROGRESS.md           # Current work items
└── GOOGLE_OAUTH_TROUBLESHOOTING.md # OAuth setup guide

/guidelines/
└── Guidelines.md                  # Development guidelines ⭐
```

⭐ = Most important/frequently referenced

---

**Last Updated**: March 13, 2026  
**Forge Version**: 1.0.0