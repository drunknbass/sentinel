# GitHub Workflows

This directory contains automated CI/CD workflows for the Sentinel project.

## Workflows

### PR Checks (`pr-checks.yml`)
Runs on all pull requests targeting the `main` branch.

**Checks performed:**
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Unit tests (Vitest)
- ✅ Production build verification

**Requirements:**
- All checks must pass before PR can be merged
- Runs on Ubuntu with Node.js 20

### Deploy to Production (`deploy-production.yml`)
Runs when code is pushed to the `main` branch (after PR merge).

**Steps:**
1. Validates all quality checks
2. Builds production bundle
3. Vercel automatically deploys to production

## Setup Instructions

### 1. Enable Branch Protection

Go to GitHub repo settings → Branches → Add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `Quality Checks`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

### 2. Vercel Integration

Ensure Vercel is connected to your GitHub repository:
- Production branch: `main`
- Preview branches: All other branches (including `develop`)

### 3. Workflow

```
develop branch
    ↓
    Create PR → main
    ↓
    PR Checks run (typecheck, lint, test, build)
    ↓
    Review & Approve
    ↓
    Merge to main
    ↓
    Deploy workflow validates
    ↓
    Vercel auto-deploys to production
```

## Troubleshooting

**If workflows fail:**
1. Check workflow logs in GitHub Actions tab
2. Run checks locally: `npm run typecheck && npx next lint && npm test && npm run build`
3. Fix issues in develop branch
4. Push fixes and rerun checks

**If Vercel deployment fails:**
1. Check Vercel dashboard for deployment logs
2. Ensure environment variables are configured in Vercel
3. Verify build settings match local development
