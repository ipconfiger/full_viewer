# Deployment Guide

## Repository Setup Complete

The `apps/embed` application has been successfully extracted as a standalone repository at:
```
/Users/alex/Projects/workspace/fisheye-panorama-embed/
```

## What Was Done

### 1. Repository Structure Created
- Created new standalone repository structure
- Removed all workspace dependencies
- Inlined all code from `@fisheye-panorama/core` and `@fisheye-panorama/react`

### 2. Code Inlined
- **Core package** (5 files, ~1300 lines)
  - types.ts
  - renderer.ts
  - projection.ts
  - labelRenderer.ts
  - index.ts

- **React package** (1 file, ~170 lines)
  - index.ts (useFishEyePanorama hook)

- **Embed app** (4 files)
  - App.tsx
  - main.tsx
  - App.css
  - utils/urlParams.ts

### 3. Configuration Files Updated
- ✅ package.json - Removed workspace dependencies
- ✅ tsconfig.json - Updated baseUrl and paths
- ✅ vite.config.ts - Copied from embed app
- ✅ vercel.json - Created for Vercel deployment
- ✅ .gitignore - Created
- ✅ README.md - Comprehensive bilingual documentation

### 4. Build System Verified
- ✅ npm install - Dependencies installed successfully
- ✅ npm run type-check - TypeScript compilation passes
- ✅ npm run build - Production build successful
  - Bundle size: 160.97 kB (gzipped: 51.71 kB)
  - CSS: 0.92 kB (gzipped: 0.45 kB)

### 5. Git Repository Initialized
- ✅ Initial commit created with comprehensive message
- ✅ Branch renamed to `main`
- ✅ Ready for GitHub push

## Next Steps

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `fisheye-panorama-embed`
3. Description: Fish-eye panorama viewer embeddable app
4. Visibility: Public (or Private as needed)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 2: Push to GitHub

```bash
cd /Users/alex/Projects/workspace/fisheye-panorama-embed
git remote add origin https://github.com/YOUR_USERNAME/fisheye-panorama-embed.git
git push -u origin main
```

### Step 3: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `fisheye-panorama-embed` from GitHub
4. Vercel will auto-detect Vite configuration
5. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Step 4: Update README with Deploy URL

After deployment, update the README.md with your actual Vercel URL:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/fisheye-panorama-embed)
```

## Verification Checklist

### Local Verification ✅
- [x] Dependencies install without errors
- [x] TypeScript compilation passes
- [x] Production build succeeds
- [x] Build output size is reasonable (~160KB)

### Post-Deployment Verification (After GitHub + Vercel)
- [ ] Repository accessible on GitHub
- [ ] Vercel deployment successful
- [ ] Production site loads without errors
- [ ] Test with sample panorama image
- [ ] Test URL parameter parsing
- [ ] Test label overlay functionality
- [ ] Test multiple projection modes
- [ ] Test keyboard navigation
- [ ] Test mouse drag and zoom
- [ ] Test iframe embedding from external site

## Test URLs

Once deployed, test with these URLs:

### Basic Test
```
https://your-domain.vercel.app/?src=https://example.com/panorama.jpg
```

### With Labels
```javascript
const labels = [
  { id: "1", x: 1800, y: 900, w: 100, h: 50, title: "Label 1" }
];
const encoded = btoa(JSON.stringify(labels));
`https://your-domain.vercel.app/?src=panorama.jpg&labels=${encoded}`
```

### Different Projections
```
?projection=EQUISOLID
?projection=RECTILINEAR
?projection=STEREOGRAPHIC
?projection=EQUIDISTANT
```

## Architecture

### Directory Structure
```
fisheye-panorama-embed/
├── src/
│   ├── core/              # Inlined from @fisheye-panorama/core
│   │   ├── types.ts       # Type definitions
│   │   ├── renderer.ts    # Main renderer class
│   │   ├── projection.ts  # Projection algorithms
│   │   ├── labelRenderer.ts # Label rendering
│   │   └── index.ts       # Core exports
│   ├── react/             # Inlined from @fisheye-panorama/react
│   │   └── index.ts       # useFishEyePanorama hook
│   ├── utils/
│   │   └── urlParams.ts   # URL parameter parsing
│   ├── App.tsx            # Main app component
│   ├── App.css
│   └── main.tsx           # Entry point
├── public/
│   ├── panorama.jpg       # Sample image
│   └── test.html          # Test page
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json            # Vercel config
├── .gitignore
└── README.md
```

### Import Path Changes
All imports have been updated from workspace package names to relative paths:

**Before:**
```typescript
import { useFishEyePanorama } from '@fisheye-panorama/react';
import { ProjectionType } from '@fisheye-panorama/core';
```

**After:**
```typescript
import { useFishEyePanorama } from './react';
import { ProjectionType } from './core';
```

## Troubleshooting

### Build Fails
- Run `npm install` to ensure all dependencies are installed
- Run `npm run type-check` to check for TypeScript errors
- Check Node.js version (should be 18+)

### Vercel Deployment Fails
- Check build logs in Vercel dashboard
- Ensure vercel.json is in repository root
- Verify package.json has correct build script

### Images Not Loading
- Check CORS headers on image server
- Ensure image URL is accessible
- Check browser console for errors

### Labels Not Showing
- Verify labels are Base64 encoded
- Check label coordinate format (x: 0-3600, y: 0-1800)
- Check browser console for parsing errors

## Files Changed Summary

### Modified Files (from original)
- src/App.tsx - Updated imports
- src/main.tsx - Removed unused React import
- src/utils/urlParams.ts - Updated imports
- src/core/projection.ts - Fixed unused parameters
- src/core/renderer.ts - Renamed unused variable

### New Files
- package.json - Standalone package configuration
- vercel.json - Vercel deployment configuration
- .gitignore - Git ignore rules
- README.md - Bilingual documentation
- DEPLOYMENT.md - This file

### Copied Files (unchanged)
- src/core/types.ts
- src/core/renderer.ts
- src/core/labelRenderer.ts
- src/react/index.ts
- src/App.css
- src/vite-env.d.ts
- index.html
- vite.config.ts
- tsconfig.json (updated)
- tsconfig.node.json
- public/*

## Maintenance

### Updating from Original Repository
If changes are made to the original monorepo packages:

1. Copy updated files from `packages/core/src/` to `src/core/`
2. Copy updated files from `packages/react/src/` to `src/react/`
3. Copy updated files from `apps/embed/src/` to `src/`
4. Update import paths if needed
5. Run `npm run type-check` and `npm run build`
6. Commit and push changes
7. Vercel will auto-deploy

### Version Management
Since this is a standalone app, version management is simple:
- Update version in package.json
- Create git tag: `git tag v1.0.0`
- Push tags: `git push --tags`
- Vercel will deploy tagged versions automatically

## Contact

For issues or questions about the deployment, refer to the main project documentation or create an issue in the GitHub repository.
