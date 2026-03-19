# Monitor Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the `apps/monitor/` project with Fastify, React, Tailwind, shadcn/ui, typed config, and dev/build/start scripts so the app runs locally and serves a dashboard shell with an API health route.

**Architecture:** Single TypeScript application. Fastify backend serves a Vite-built React frontend in production. In development, Vite dev server proxies API calls to Fastify. Environment variables loaded via dotenv with a typed config module.

**Tech Stack:** TypeScript, Fastify, React 19, Vite, Tailwind CSS v4, shadcn/ui, React Router, dotenv

---

### Task 1: Initialize project and install core dependencies

**Files:**
- Create: `apps/monitor/package.json`
- Create: `apps/monitor/tsconfig.json`
- Create: `apps/monitor/.gitignore`
- Create: `apps/monitor/.env.example`

- [ ] **Step 1: Create the project directory and package.json**

```bash
mkdir -p apps/monitor
cd apps/monitor
npm init -y
```

Then set `package.json` to:

```json
{
  "name": "hitesh-monitor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server/index.ts",
    "dev:web": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js"
  }
}
```

- [ ] **Step 2: Install server dependencies**

```bash
cd apps/monitor
npm install fastify @fastify/static dotenv
```

- [ ] **Step 3: Install frontend dependencies**

```bash
npm install react react-dom react-router
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install -D typescript tsx vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/react @types/react-dom @types/node
```

- [ ] **Step 5: Create tsconfig.json**

Create `apps/monitor/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/web/*"],
      "@server/*": ["src/server/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/monitor/tsconfig.server.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist/server",
    "rootDir": "src/server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": false
  },
  "include": ["src/server"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create .gitignore**

Create `apps/monitor/.gitignore`:

```
node_modules/
dist/
.env
```

- [ ] **Step 7: Create .env.example**

Create `apps/monitor/.env.example`:

```
PORT=3100
HOST=0.0.0.0
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/monitor
```

- [ ] **Step 8: Commit**

```bash
git add apps/monitor/package.json apps/monitor/package-lock.json apps/monitor/tsconfig.json apps/monitor/tsconfig.server.json apps/monitor/.gitignore apps/monitor/.env.example
git commit -m "scaffold monitor project with dependencies and config"
```

---

### Task 2: Typed config module

**Files:**
- Create: `apps/monitor/src/server/config.ts`

- [ ] **Step 1: Create the config module**

Create `apps/monitor/src/server/config.ts`:

```typescript
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/monitor",
  isDev: (process.env.NODE_ENV || "development") === "development",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/monitor/src/server/config.ts
git commit -m "add typed config module with env loading"
```

---

### Task 3: Fastify server with health route

**Files:**
- Create: `apps/monitor/src/server/index.ts`
- Create: `apps/monitor/src/server/api/health.ts`

- [ ] **Step 1: Create the health route**

Create `apps/monitor/src/server/api/health.ts`:

```typescript
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
```

- [ ] **Step 2: Create the Fastify server entry point**

Create `apps/monitor/src/server/index.ts`:

```typescript
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { healthRoutes } from "./api/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = Fastify({ logger: true });

  await app.register(healthRoutes);

  if (!config.isDev) {
    await app.register(fastifyStatic, {
      root: path.resolve(__dirname, "../../dist/web"),
      prefix: "/",
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile("index.html");
    });
  }

  await app.listen({ port: config.port, host: config.host });
  console.log(`Monitor running at http://${config.host}:${config.port}`);
}

start();
```

- [ ] **Step 3: Verify the server starts**

```bash
cd apps/monitor
cp .env.example .env
npx tsx src/server/index.ts
```

Expected: Server starts on port 3100, `GET /api/health` returns `{"status":"ok","timestamp":"..."}`.

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/server/
git commit -m "add Fastify server with health route"
```

---

### Task 4: Vite config and React app shell

**Files:**
- Create: `apps/monitor/vite.config.ts`
- Create: `apps/monitor/index.html`
- Create: `apps/monitor/src/web/main.tsx`
- Create: `apps/monitor/src/web/app.tsx`
- Create: `apps/monitor/src/web/app.css`

- [ ] **Step 1: Create Vite config**

Create `apps/monitor/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/web"),
    },
  },
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3100",
    },
  },
});
```

- [ ] **Step 2: Create index.html**

Create `apps/monitor/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/web/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create app.css with Tailwind import**

Create `apps/monitor/src/web/app.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Create the React entry point**

Create `apps/monitor/src/web/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 5: Create the App component with route stubs**

Create `apps/monitor/src/web/app.tsx`:

```tsx
import { Routes, Route, Link } from "react-router";

function Overview() {
  return <h2 className="text-xl font-semibold">Overview</h2>;
}

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">Monitor</span>
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-100">
            Overview
          </Link>
        </div>
      </nav>
      <main className="px-6 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify the frontend dev server starts**

```bash
cd apps/monitor
npx vite
```

Expected: Vite dev server starts, browser shows the dashboard shell with "Monitor" nav and "Overview" heading. Tailwind styles apply (dark background, light text).

- [ ] **Step 7: Commit**

```bash
git add apps/monitor/vite.config.ts apps/monitor/index.html apps/monitor/src/web/
git commit -m "add React app shell with Vite, Tailwind, and routing"
```

---

### Task 5: shadcn/ui setup

**Files:**
- Create: `apps/monitor/components.json`
- Create: `apps/monitor/src/web/lib/utils.ts`

- [ ] **Step 1: Install shadcn/ui dependencies**

```bash
cd apps/monitor
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 2: Create the cn utility**

Create `apps/monitor/src/web/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create components.json for shadcn CLI**

Create `apps/monitor/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/web/app.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 4: Add a shadcn component to verify the setup works**

```bash
cd apps/monitor
npx shadcn@latest add button
```

Expected: Creates `apps/monitor/src/web/components/ui/button.tsx` and adds CSS variables to `app.css`.

- [ ] **Step 5: Verify button renders**

Update `apps/monitor/src/web/app.tsx` to add a Button import and render it:

```tsx
import { Routes, Route, Link } from "react-router";
import { Button } from "@/components/ui/button";

function Overview() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Overview</h2>
      <Button className="mt-4">Test Button</Button>
    </div>
  );
}
```

Run `npx vite`, open the browser, and confirm the button renders with shadcn styling. Then remove the test button — it was only for verification.

- [ ] **Step 6: Commit**

```bash
git add apps/monitor/components.json apps/monitor/src/web/lib/ apps/monitor/src/web/components/ apps/monitor/src/web/app.css apps/monitor/package.json apps/monitor/package-lock.json
git commit -m "add shadcn/ui setup with button component"
```

---

### Task 6: Production build verification

**Files:**
- No new files

- [ ] **Step 1: Run the Vite build**

```bash
cd apps/monitor
npx vite build
```

Expected: Produces `dist/web/` with `index.html` and JS/CSS assets.

- [ ] **Step 2: Start the production server**

```bash
cd apps/monitor
npm run build
NODE_ENV=production node dist/server/index.js
```

Expected: Fastify starts, serves the built React app at `/`, health route responds at `/api/health`, SPA routing works (unknown routes serve `index.html`).

Note: If the server compilation via `tsc -p tsconfig.server.json` has issues, fall back to `NODE_ENV=production npx tsx src/server/index.ts` for now and fix the build config.

- [ ] **Step 3: Commit any build-related fixes**

If anything needed adjustment, commit the fixes.

```bash
git add -A apps/monitor/
git commit -m "verify production build and static serving"
```
