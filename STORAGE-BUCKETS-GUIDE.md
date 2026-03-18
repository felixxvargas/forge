# Forge Storage Buckets Guide

## 📦 Organized Bucket Structure

Forge now uses **5 separate storage buckets** for better organization and management:

```
forge-avatars/           → User profile pictures
forge-banners/           → User profile banners
forge-post-media/        → Post images, videos, gifs
forge-community-icons/   → Community icons
forge-community-banners/ → Community banner images
```

---

## 🎯 Why Multiple Buckets?

### ✅ **Benefits:**
1. **Clear Organization** - Each bucket has one purpose
2. **Better Security** - Different permissions per bucket (future)
3. **Size Limits** - Appropriate limits for each content type
4. **Easy Management** - Delete all posts? Just clear one bucket
5. **Industry Standard** - How professional apps organize storage

---

## 📋 Bucket Specifications

### 1. `forge-avatars` - Profile Pictures
- **Purpose:** User profile pictures only
- **Size Limit:** 5MB (avatars should be small)
- **Allowed Types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Public:** ✅ Yes
- **Used By:** Edit Profile page, avatar uploads

---

### 2. `forge-banners` - Profile Banners
- **Purpose:** User profile banner images
- **Size Limit:** 10MB (banners can be larger)
- **Allowed Types:** `image/jpeg`, `image/png`, `image/webp`
- **Public:** ✅ Yes
- **Used By:** Edit Profile page (future feature)

---

### 3. `forge-post-media` - Post Content
- **Purpose:** Images, videos, and gifs attached to posts
- **Size Limit:** 50MB (videos can be large)
- **Allowed Types:** `image/*`, `video/mp4`, `video/webm`, `video/quicktime`, `image/gif`
- **Public:** ✅ Yes
- **Used By:** Write Post modal, post creation

---

### 4. `forge-community-icons` - Community Icons
- **Purpose:** Small community icons/avatars
- **Size Limit:** 2MB (icons are very small)
- **Allowed Types:** `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- **Public:** ✅ Yes
- **Used By:** Community creation/editing (future feature)

---

### 5. `forge-community-banners` - Community Banners
- **Purpose:** Community header/banner images
- **Size Limit:** 10MB
- **Allowed Types:** `image/jpeg`, `image/png`, `image/webp`
- **Public:** ✅ Yes
- **Used By:** Community creation/editing (future feature)

---

## 🔄 How It Works

### Frontend → Upload API → Backend → Storage

1. **User selects a file** (e.g., profile picture)
2. **Frontend component** calls `uploadAPI.uploadFile(file, 'avatar')`
3. **Upload API** sends to `/upload` endpoint with bucket type
4. **Backend** validates JWT and routes to correct bucket
5. **Storage** saves file and returns public URL
6. **Frontend** receives URL and displays image

---

## 💻 Code Examples

### Frontend: Upload Profile Picture
```typescript
import { uploadAPI } from '../utils/api';

// Upload to avatars bucket
const result = await uploadAPI.uploadFile(file, 'avatar');
console.log('Avatar URL:', result.url);
```

### Frontend: Upload Post Image
```typescript
// Upload to post-media bucket
const result = await uploadAPI.uploadFile(file, 'post');
console.log('Post image URL:', result.url);
```

### Component: ImageUpload
```tsx
<ImageUpload 
  onUpload={handleUpload}
  accept="image/*"
  maxSizeMB={5}
  bucketType="avatar"  // Specifies which bucket
/>
```

---

## 🗂️ File Organization

Files are stored with this structure:

```
forge-avatars/
  ├── {user-id-1}/
  │   ├── a1b2c3d4-...-uuid.jpg
  │   └── e5f6g7h8-...-uuid.png
  └── {user-id-2}/
      └── i9j0k1l2-...-uuid.webp

forge-post-media/
  ├── {user-id-1}/
  │   ├── m3n4o5p6-...-uuid.jpg
  │   ├── q7r8s9t0-...-uuid.mp4
  │   └── u1v2w3x4-...-uuid.gif
  └── {user-id-2}/
      └── y5z6a7b8-...-uuid.jpg
```

**Benefits:**
- ✅ Files organized by user
- ✅ Random UUIDs prevent name collisions
- ✅ Easy to find/delete all files for a user
- ✅ Clear file ownership

---

## 🔐 Security & Permissions

### Current Setup (All Public)
- All buckets are **PUBLIC**
- Anyone can view files (good for profile pics, posts)
- Only authenticated users can upload
- Users can only upload to their own folder (`user-id/...`)

### Future Enhancements
Could add:
- Private buckets for sensitive content
- Row-level security policies
- Signed URLs for temporary access
- Bandwidth limits per user

---

## 🚀 Automatic Bucket Creation

### On Server Startup
The Edge Function automatically:
1. ✅ Checks which buckets exist
2. ✅ Creates missing buckets with correct settings
3. ✅ Logs the process for debugging

```typescript
// Edge Function startup
initStorage();

// Logs:
[Storage] Existing buckets: forge-avatars, forge-banners
[Storage] Creating bucket: forge-post-media
[Storage] ✓ Created bucket: forge-post-media
[Storage] ✅ All buckets initialized
```

---

## 🛠️ Backend Upload Endpoint

### Request Format
```http
POST /make-server-17285bd7/upload
Authorization: Bearer {jwt-token}
Content-Type: multipart/form-data

file: {binary-data}
bucket: "avatar" | "banner" | "post" | "community-icon" | "community-banner"
```

### Response Format
```json
{
  "url": "https://xmxeafjpscgqprrreulh.supabase.co/storage/v1/object/public/forge-avatars/{user-id}/{uuid}.jpg",
  "path": "{user-id}/{uuid}.jpg"
}
```

---

## 📊 Bucket Mapping

Backend maps friendly names to actual bucket names:

| Frontend Parameter | Actual Bucket Name |
|-------------------|-------------------|
| `'avatar'` | `forge-avatars` |
| `'banner'` | `forge-banners` |
| `'post'` | `forge-post-media` |
| `'community-icon'` | `forge-community-icons` |
| `'community-banner'` | `forge-community-banners` |

---

## ✅ What's Already Updated

### ✅ Backend
- [x] Multiple bucket initialization
- [x] Upload endpoint accepts `bucket` parameter
- [x] Proper bucket routing
- [x] Detailed logging

### ✅ Frontend
- [x] `uploadAPI.uploadFile()` accepts bucket type
- [x] `ImageUpload` component accepts `bucketType` prop
- [x] Edit Profile uses `bucketType="avatar"`
- [x] Write Post uses `bucketType="post"`

---

## 🎨 Current Usage in Forge

| Feature | Bucket Used | Status |
|---------|------------|--------|
| Profile Pictures | `forge-avatars` | ✅ Implemented |
| Profile Banners | `forge-banners` | 🚧 Ready (future) |
| Post Images | `forge-post-media` | ✅ Implemented |
| Post Videos | `forge-post-media` | ✅ Implemented |
| Community Icons | `forge-community-icons` | 🚧 Ready (future) |
| Community Banners | `forge-community-banners` | 🚧 Ready (future) |

---

## 🐛 Troubleshooting

### Issue: Upload fails with "bucket not found"
**Solution:** 
1. Check Edge Function logs - buckets should auto-create
2. Manually create buckets in Supabase Dashboard
3. Make sure buckets are PUBLIC

### Issue: Images not displaying
**Solution:**
1. Verify bucket is PUBLIC
2. Check browser console for CORS errors
3. Verify URL format is correct

### Issue: "File too large" error
**Solution:**
1. Check file size matches bucket limit:
   - Avatars: 5MB max
   - Banners: 10MB max
   - Post media: 50MB max
   - Community icons: 2MB max
2. Compress large files before uploading

---

## 📈 Future Improvements

### Planned Features:
- [ ] Image compression on upload
- [ ] Multiple image sizes (thumbnail, medium, full)
- [ ] CDN integration for faster delivery
- [ ] Automatic format conversion (WebP)
- [ ] Bandwidth usage tracking
- [ ] User storage quotas

---

**Last Updated:** March 14, 2026  
**Version:** 2.0.0 (Multi-bucket architecture)
