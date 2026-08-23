# Tark Docker Deployment Guide

## Quick Start

### Production Build & Run
```bash
# Build multi-stage image (optimized ~400MB final size)
docker build -t tark:latest .

# Run with env file (secrets stay outside image)
docker run -p 3000:3000 \
  --env-file .env \
  tark:latest
```

### Local Development with Hot Reload
```bash
# Start entire stack with dev profile
docker compose --profile dev up

# Access:
# - Frontend: http://localhost:3000
# - Hot reload: auto-reload on file changes in src/, server-lib/

# Stop
docker compose down
```

### Production Compose Stack
```bash
# Build and start production container
docker compose up --build

# Verify health
docker compose ps
curl http://localhost:3000/
```

---

## Architecture

### Dockerfile (Multi-Stage)
- **Builder Stage**: Compiles TypeScript, bundles Vite frontend, esbuild backend
- **Runtime Stage**: Alpine Linux, ~400MB, non-root user, built-in healthcheck
- **Layer Caching**: `package.json` copied first to cache npm install

### docker-compose.yml
- **app**: Production container (no volumes, optimal for cloud)
- **dev**: Development container (hot reload, file bind-mounts, profile: dev)

### .dockerignore
Excludes node_modules, build artifacts, and agent/scratch directories

---

## Environment Variables

Create a `.env` file in project root with:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI
GEMINI_API_KEY=your-gemini-key

# Razorpay (Monetization)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
VITE_RAZORPAY_KEY_ID=rzp_test_xxx

# Internal Security
INTERNAL_WORKER_SECRET=your-worker-secret
CRON_SECRET=your-cron-secret
```

**Security**: Never commit `.env` to Git. Add to `.gitignore`. Secrets are injected at runtime via Docker's `env_file:` directive.

---

## Deployment

### Docker Hub
```bash
# Build and push
docker build -t your-docker-hub/tark:latest .
docker push your-docker-hub/tark:latest

# Pull on production server
docker run -p 3000:3000 \
  --env-file /etc/tark/.env \
  --restart unless-stopped \
  your-docker-hub/tark:latest
```

### Vercel (with Docker image)
1. Ensure Dockerfile uses `FROM node:22-alpine`
2. Push image to Docker Registry (Hub, ECR, etc.)
3. Deploy from registry; Vercel will pull at runtime

### Kubernetes
Create a `k8s.yaml` deployment manifest referencing the image and ConfigMap/Secret for env vars.

---

## Troubleshooting

### Container exits immediately
```bash
# Check logs
docker logs <container-id>
```

### TypeScript errors on build
```bash
# Rebuild with verbose output
docker build --progress=plain -t tark:latest .
```

### Hot reload not working in dev
Ensure `DISABLE_HMR=false` and `volumes:` are mounted correctly in compose.

### Port 3000 already in use
```bash
# Map to different port
docker run -p 3001:3000 tark:latest
```

---

## Next Steps

1. **CI/CD Pipeline**: Add GitHub Actions workflow to build and push image on commits
2. **Registry Setup**: Push to Docker Hub or private registry (ECR, Artifact Registry)
3. **Monitoring**: Integrate Docker healthcheck with your observability stack
4. **Secrets Management**: Use Docker Secrets or external vault (HashiCorp Vault, AWS Secrets Manager)
5. **Database Migrations**: Run `supabase db push` before container startup if needed
