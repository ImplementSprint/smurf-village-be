# CI/CD Integration Plan — BluesClues HRIS Backend

This document maps out every change needed to align the `tribeX-hris-auth-api` codebase with the ImplementSprint NestJS backend template so the central `master-pipeline-be.yml` pipeline runs cleanly.

> **Scope:** Backend only. The frontend and mobile folders are excluded from this push.
> **Rule:** The template structure must be preserved exactly. Additional files/folders are allowed.

---

## Current State vs. Required State

| Area | Current | Required |
|---|---|---|
| Source layout | Flat `src/` at repo root | `apps/api/src/` + `libs/` |
| Shared modules | Inline in `src/api-center/`, `src/common/`, `src/supabase/` | Extracted to `libs/` |
| Contracts lib | Not present | `libs/contracts/` (create empty stub) |
| `nest-cli.json` | Single-app mode (`sourceRoot: "src"`) | Monorepo mode with `apps` + `libs` entries |
| Dockerfile | `Dockerfile` at repo root | `apps/api/Dockerfile` |
| E2E tests | `test/` folder (NestJS default) | `tests/e2e/` |
| Performance tests | Not present | `tests/performance/api-smoke.js` |
| `package.json` scripts | `build`, `test:cov`, `test:e2e` (single-app) | Add `build:api`, `test:cov -- --selectProjects api` |
| GitHub variable | Not set | `BACKEND_MULTI_SYSTEMS_JSON` |
| GitHub secrets | Partially set | Full list below |

---

## Step 1 — Restructure Folders (inside `tribeX-hris-auth-api/`)

The goal is to move source code to match the template workspace shape **without deleting any feature module**.

### 1a. Create the new directory skeleton

```
apps/
  api/
    src/           ← move all current src/ contents here (except libs candidates)
    Dockerfile     ← move Dockerfile here from root
libs/
  api-center/      ← move src/api-center/ here
  common/          ← move src/common/ here
  supabase/        ← move src/supabase/ here
  contracts/       ← create new (shared message contracts, start empty)
tests/
  e2e/             ← move test/ folder contents here
  performance/
    api-smoke.js   ← create new k6 smoke script
```

### 1b. Folder move mapping

| From (current) | To (after) |
|---|---|
| `src/` (all feature modules) | `apps/api/src/` |
| `src/api-center/` | `libs/api-center/src/` |
| `src/common/` | `libs/common/src/` |
| `src/supabase/` | `libs/supabase/src/` |
| `test/` | `tests/e2e/` |
| `Dockerfile` (root) | `apps/api/Dockerfile` |

> **Note:** `src/main.ts` stays in `apps/api/src/main.ts` — it is the HTTP bootstrap entry point.
> Rename `src/app.module.ts` → `apps/api/src/api.module.ts` and `src/app.controller.ts` → `apps/api/src/api.controller.ts` to match the template convention.

---

## Step 2 — Update `nest-cli.json`

Switch from single-app mode to NestJS monorepo mode.

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "monorepo": true,
  "root": "apps/api",
  "sourceRoot": "apps/api/src",
  "entryFile": "main",
  "projects": {
    "api": {
      "type": "application",
      "root": "apps/api",
      "entryFile": "main",
      "sourceRoot": "apps/api/src",
      "compilerOptions": {
        "tsConfigPath": "apps/api/tsconfig.app.json",
        "deleteOutDir": true
      }
    },
    "api-center": {
      "type": "library",
      "root": "libs/api-center",
      "entryFile": "index",
      "sourceRoot": "libs/api-center/src",
      "compilerOptions": {
        "tsConfigPath": "libs/api-center/tsconfig.lib.json"
      }
    },
    "common": {
      "type": "library",
      "root": "libs/common",
      "entryFile": "index",
      "sourceRoot": "libs/common/src",
      "compilerOptions": {
        "tsConfigPath": "libs/common/tsconfig.lib.json"
      }
    },
    "supabase": {
      "type": "library",
      "root": "libs/supabase",
      "entryFile": "index",
      "sourceRoot": "libs/supabase/src",
      "compilerOptions": {
        "tsConfigPath": "libs/supabase/tsconfig.lib.json"
      }
    },
    "contracts": {
      "type": "library",
      "root": "libs/contracts",
      "entryFile": "index",
      "sourceRoot": "libs/contracts/src",
      "compilerOptions": {
        "tsConfigPath": "libs/contracts/tsconfig.lib.json"
      }
    }
  },
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": false
  }
}
```

---

## Step 3 — Update `tsconfig.json`

Add path aliases so `libs/` imports resolve correctly across the monorepo.

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@app/api-center": ["libs/api-center/src/index.ts"],
      "@app/api-center/*": ["libs/api-center/src/*"],
      "@app/common": ["libs/common/src/index.ts"],
      "@app/common/*": ["libs/common/src/*"],
      "@app/supabase": ["libs/supabase/src/index.ts"],
      "@app/supabase/*": ["libs/supabase/src/*"],
      "@app/contracts": ["libs/contracts/src/index.ts"],
      "@app/contracts/*": ["libs/contracts/src/*"]
    }
  }
}
```

Each `libs/<name>/` folder also needs its own `tsconfig.lib.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/libs/<name>",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

---

## Step 4 — Update `package.json` Scripts

The pipeline uses `build_command` and `test_command` from `BACKEND_MULTI_SYSTEMS_JSON`. Add these named scripts:

```json
{
  "scripts": {
    "build": "nest build",
    "build:api": "nest build api",
    "start": "nest start",
    "start:dev": "nest start api --watch",
    "start:debug": "nest start api --debug --watch",
    "start:prod": "node dist/apps/api/main.js",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./tests/e2e/jest-e2e.json"
  }
}
```

> The pipeline calls `npm run test:cov -- --selectProjects api` and `npm run build:api`, so both must exist.

---

## Step 5 — Move Dockerfile to `apps/api/Dockerfile`

The pipeline reads `dockerfile_path: "apps/api/Dockerfile"`. Move the existing Dockerfile there and update the `COPY` paths to reflect the new `apps/api/src` layout.

Key changes inside the Dockerfile:

```dockerfile
# Build stage — copy monorepo root config + app source
COPY package*.json nest-cli.json tsconfig.json ./
COPY apps/api ./apps/api
COPY libs ./libs

# Build only the api app
RUN npm run build:api

# Runner stage — copy compiled output
COPY --from=builder /app/dist/apps/api ./dist
```

---

## Step 6 — Create `tests/performance/api-smoke.js`

The pipeline needs a k6 smoke script at `tests/performance/api-smoke.js`. Create a minimal one targeting the health endpoint:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'apiCenter is reachable': (r) => {
      const body = JSON.parse(r.body);
      return body.checks && body.checks.apiCenter === true;
    },
  });
  sleep(1);
}
```

> Note: Adjust the `BASE_URL` path prefix if the health endpoint uses a different prefix (e.g., `/api/tribeX/auth/v1/health`).

---

## Step 7 — Update `.github/workflows/be-pipeline-caller.yml`

The caller workflow already exists and points to the correct central pipeline. No structural changes needed. Verify these inputs match:

```yaml
k6_script_path: tests/performance   # ✅ already set
```

---

## Step 8 — GitHub Repository Variables

Set this in **Settings → Variables → Repository variables**:

**Variable name:** `BACKEND_MULTI_SYSTEMS_JSON`

**Value:**
```json
[
  {
    "name": "blues-clues-hris-api",
    "dir": ".",
    "install_dir": ".",
    "project": "api",
    "image": "ghcr.io/<YOUR_ORG>/blues-clues-hris-api",
    "backend_stack": "nestjs",
    "version_stream": "api",
    "test_command": "npm run test:cov -- --selectProjects api",
    "build_command": "npm run build:api",
    "dockerfile_path": "apps/api/Dockerfile",
    "k6_script_path": "tests/performance/api-smoke.js"
  }
]
```

> Replace `<YOUR_ORG>` with the actual GitHub organization slug.

---

## Step 9 — GitHub Repository Secrets

Set all of these in **Settings → Secrets → Repository secrets**:

| Secret | Source | Notes |
|---|---|---|
| `SONAR_TOKEN` | SonarCloud account | Project analysis token |
| `SONAR_ORGANIZATION` | SonarCloud | Organization slug |
| `SONAR_PROJECT_KEY` | SonarCloud | Unique key for this project |
| `GH_PR_TOKEN` | GitHub PAT | Needs `pull-requests: write` |
| `K6_CLOUD_TOKEN` | Grafana Cloud | k6 execution token |
| `K6_CLOUD_PROJECT_ID` | Grafana Cloud | k6 project ID |
| `RENDER_DEPLOY_HOOK_URL_TEST` | Render dashboard | Deploy hook for test env |
| `RENDER_DEPLOY_HOOK_URL_UAT` | Render dashboard | Deploy hook for UAT env |
| `RENDER_DEPLOY_HOOK_URL_MAIN` | Render dashboard | Deploy hook for main env |
| `RENDER_HEALTHCHECK_URL_TEST` | Render dashboard | Health URL for test env |
| `RENDER_HEALTHCHECK_URL_UAT` | Render dashboard | Health URL for UAT env |
| `RENDER_HEALTHCHECK_URL_MAIN` | Render dashboard | Health URL for main env |

---

## Step 10 — Render Environment Variables

For each Render service (test / UAT / main), set these runtime environment variables matching `.env.example`:

```
NODE_ENV=production
PORT=5000
ENABLE_SWAGGER=false
ALLOWED_ORIGINS=<exact frontend URL for each environment>

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

API_CENTER_BASE_URL=
API_CENTER_TRIBE_ID=
API_CENTER_TRIBE_SECRET=
```

> `checks.apiCenter=true` is required for the pipeline health gate to pass. Ensure `API_CENTER_BASE_URL`, `API_CENTER_TRIBE_ID`, and `API_CENTER_TRIBE_SECRET` are set correctly in every Render environment.

---

## Pipeline Branch Flow

```
push to test  →  quality gates → security scan → SonarCloud → deploy to Render test  → k6 smoke → auto-PR to uat
push to uat   →  quality gates → security scan → SonarCloud → deploy to Render UAT   → k6 smoke → auto-PR to main
push to main  →  quality gates → security scan → SonarCloud → Docker build (Trivy)   → deploy to Render main → k6 smoke
```

---

## Checklist Summary

- [ ] Create `apps/api/src/` and move all feature modules from `src/`
- [ ] Extract `src/api-center/` → `libs/api-center/src/`
- [ ] Extract `src/common/` → `libs/common/src/`
- [ ] Extract `src/supabase/` → `libs/supabase/src/`
- [ ] Create `libs/contracts/src/index.ts` (empty stub)
- [ ] Add `index.ts` barrel exports to each `libs/<name>/src/`
- [ ] Update all import paths in `apps/api/src/` to use `@app/<lib>` aliases
- [ ] Rename `app.module.ts` → `api.module.ts`, `app.controller.ts` → `api.controller.ts`
- [ ] Switch `nest-cli.json` to monorepo mode
- [ ] Update `tsconfig.json` with path aliases
- [ ] Add `tsconfig.lib.json` to each `libs/<name>/`
- [ ] Add `build:api` and update scripts in `package.json`
- [ ] Move `Dockerfile` to `apps/api/Dockerfile` and update COPY paths
- [ ] Create `tests/e2e/` and move `test/` contents there
- [ ] Create `tests/performance/api-smoke.js`
- [ ] Set `BACKEND_MULTI_SYSTEMS_JSON` GitHub repository variable
- [ ] Set all 12 GitHub repository secrets
- [ ] Configure Render environments with production env vars
- [ ] Verify health endpoint returns `checks.apiCenter: true` before first pipeline run
