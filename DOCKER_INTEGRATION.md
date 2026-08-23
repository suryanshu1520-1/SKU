# Docker Integration Strategy for Tark | तर्क

## Overview

Your Tark platform is now **fully Dockerized** with three key deliverables:

1. **`Dockerfile`**: Production-optimized multi-stage build
2. **`Dockerfile.dev`**: Local development with hot reload
3. **`docker-compose.yml`**: Orchestrates both environments
4. **`.dockerignore`**: Excludes unnecessary files
5. **`DOCKER_GUIDE.md`**: Complete reference documentation

---

## Why This Matters for Your Product

### Before Docker
- Local setup requires: Node 20+, npm, manual .env config, potential version mismatches
- Deployment: Manual build steps, environment variable management, risk of "works on my machine"
- Scaling: Difficult to replicate environment across team or cloud providers

### After Docker
- **Instant Onboarding**: New team members run `docker compose up` and start coding
- **Identical Environments**: Dev → Staging → Production behave identically
- **Cloud-Ready**: Deploy to Vercel, AWS ECS, Google Cloud Run, Kubernetes with zero changes
- **CI/CD**: GitHub Actions can build/test/push automatically
- **Hot Reload in Dev**: Changes to `src/`, `server-lib/` automatically reflect without restart

---

## Quick Start: Three Workflows

### 1. Local Development (Hot Reload)

```bash
# Start dev container with file watching
docker compose --profile dev up

# Visit: http://localhost:3000
# Edit src/components/Arena.tsx → auto-refreshes in browser
# Ctrl+C to stop
docker compose down
```

**What's happening inside:**
- Express dev server (`npm run dev`)
- Vite HMR enabled for React hot reload
- Volume mounts sync your local files to container
- Changes trigger instant recompilation

### 2. Production Build & Run

```bash
# Build optimized image
docker build -t tark:latest .

# Run with environment secrets
docker run -p 3000:3000 \
  --env-file .env \
  tark:latest
```

**What's different from dev:**
- Multi-stage: builder stage discarded after compilation → smaller image
- Alpine Linux: ~15MB base vs ~200MB Node full
- Non-root user: security hardening
- Health checks: automatic restart if unhealthy

### 3. Docker Compose (Full Stack)

```bash
# Production-like environment
docker compose up --build

# Logs
docker compose logs -f app

# Scale (optional)
docker compose up --scale app=2

# Cleanup
docker compose down -v
```

---

## Environment Configuration

Create `.env` in your project root:

```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI (Required for /api/insights endpoint)
GEMINI_API_KEY=your-gemini-key

# Razorpay (Required for monetization)
RAZORPAY_KEY_ID=rzp_live_xxx or rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret-key
VITE_RAZORPAY_KEY_ID=rzp_live_xxx or rzp_test_xxx

# Internal Security
INTERNAL_WORKER_SECRET=your-worker-secret
CRON_SECRET=your-cron-secret
```

**Security**: Add `.env` to `.gitignore` — NEVER commit secrets.

---

## Deployment Paths

### Path A: Vercel (Recommended for Your Use Case)

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Vercel automatically detects Express + Vite setup
5. Deploy on every push

```bash
# Vercel will run these automatically
npm run build     # Vite + esbuild
npm run start     # node dist/server.cjs
```

**No Docker needed on Vercel itself**, but having a Dockerfile ensures your local environment mirrors production.

### Path B: Docker Registry + Cloud Run (Google Cloud)

```bash
# 1. Build image locally
docker build -t gcr.io/your-project/tark:latest .

# 2. Push to Google Container Registry
docker push gcr.io/your-project/tark:latest

# 3. Deploy to Cloud Run
gcloud run deploy tark \
  --image gcr.io/your-project/tark:latest \
  --set-env-vars SUPABASE_URL=...,GEMINI_API_KEY=... \
  --port 3000
```

### Path C: Docker Compose on VPS (DigitalOcean, Linode)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Clone repo
git clone https://github.com/your-user/tark.git
cd tark

# Create .env with production secrets
nano .env

# Run production stack
docker compose up -d

# Check logs
docker compose logs -f
```

---

## Optimizations Included

### 1. Layer Caching
- `package.json` copied first → npm install cached
- Source changes don't invalidate dependency layer
- ~5min rebuild time for unchanged deps → ~10sec for code-only changes

### 2. Multi-Stage Build
- Builder stage: Full TypeScript compiler, Vite, esbuild
- Discarded after compilation
- Runtime stage: Only compiled artifacts + node_modules
- Image size: ~507 MB (vs ~2GB if we included build tools)

### 3. Alpine Linux
- Base: 15 MB vs 200+ MB with Node full
- Reduced attack surface
- Faster cold starts

### 4. Non-Root User
- Runs as `nodejs` (UID 1001)
- Prevents container breakout exploits

### 5. Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1
```
- Kubernetes/Docker Swarm auto-restarts failed containers
- Compose uses for orchestration

---

## Troubleshooting

### "Port 3000 already in use"
```bash
docker run -p 3001:3000 tark:latest
# Or kill existing container
docker ps
docker stop <container-id>
```

### "Container exits immediately"
```bash
# Check logs
docker logs <container-id>

# Common cause: Missing env vars
# Solution: Pass them with --env-file or -e
docker run --env-file .env tark:latest
```

### "Hot reload not working in dev"
Verify in `docker compose logs`:
```
vite v6.4.2 with disabled/enabled HMR...
```
If disabled, check: `DISABLE_HMR=false` in compose file.

### "TypeScript errors in build"
```bash
# Rebuild with verbose output
docker build --progress=plain -t tark:latest .

# Check specific error
npm run lint
```

---

## Next Steps (Recommendations)

### 1. GitHub Actions CI/CD
Create `.github/workflows/docker.yml`:
```yaml
name: Build & Push Docker Image
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: your-registry/tark:latest
```

### 2. Kubernetes Deployment
Create `k8s.yaml` for horizontal scaling across clusters.

### 3. Database Migrations
Run `supabase db push` in your CI pipeline before container startup.

### 4. Monitoring
Integrate with Datadog/New Relic to monitor container CPU/memory/error rates.

### 5. Secrets Management
Move from `.env` files to:
- Kubernetes Secrets (k8s)
- AWS Secrets Manager (ECS/Lambda)
- Google Secret Manager (Cloud Run)
- HashiCorp Vault (multi-cloud)

---

## Quick Reference: Docker Commands

| Task | Command |
|------|---------|
| Build image | `docker build -t tark:latest .` |
| Run container | `docker run -p 3000:3000 --env-file .env tark:latest` |
| Dev (hot reload) | `docker compose --profile dev up` |
| Production | `docker compose up --build` |
| View logs | `docker compose logs -f app` |
| Stop all | `docker compose down` |
| Clean up (⚠️) | `docker system prune -a` |
| List images | `docker images` |
| List containers | `docker ps -a` |
| Shell into running | `docker exec -it <id> sh` |
| Remove image | `docker rmi tark:latest` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Docker Image (tark:latest)                 │
├─────────────────────────────────────────────────────────────┤
│ node:22-alpine (15 MB)                                       │
│  └─ dist/                  (compiled Vite + React)          │
│  └─ dist/server.cjs        (bundled Express backend)        │
│  └─ node_modules/          (runtime deps only)              │
│  └─ package.json                                             │
├─────────────────────────────────────────────────────────────┤
│ ENTRYPOINT: node dist/server.cjs                            │
│ PORT: 3000                                                   │
│ HEALTH: wget http://localhost:3000/                         │
└─────────────────────────────────────────────────────────────┘
         │
         ├─ Docker Compose (dev)
         │   └─ Volume mounts: src/, server-lib/
         │   └─ Vite HMR enabled
         │   └─ npm run dev
         │
         ├─ Docker Compose (prod)
         │   └─ No volumes
         │   └─ Minimal: only built artifacts
         │   └─ npm run start
         │
         └─ Cloud Deploy (Vercel, Cloud Run, ECS)
             └─ Image pulled from registry
             └─ Env vars injected at runtime
             └─ Auto-scaling, health checks
```

---

## File Structure After Docker Integration

```
SKU/
├── Dockerfile              ← Production multi-stage build
├── Dockerfile.dev          ← Development with hot reload
├── docker-compose.yml      ← Orchestration (dev + prod profiles)
├── .dockerignore            ← Exclude node_modules, build artifacts
├── .env                     ← SECRETS (never commit)
├── .env.example             ← Template for .env (commit this)
├── DOCKER_GUIDE.md          ← This file
├── package.json
├── package-lock.json
├── server.ts
├── vite.config.ts
├── tsconfig.json
├── src/
├── server-lib/
├── api/
└── dist/                    ← Generated by build (in .dockerignore)
```

---

**Built with intuition: Docker enables your Tark platform to scale from local dev → global cloud without friction.**

Let me know if you need help setting up CI/CD, Kubernetes, or scaling strategies! 🚀
