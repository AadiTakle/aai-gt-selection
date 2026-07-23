# syntax=docker/dockerfile:1
# Container image for the GT admissions family portal (Next.js).
# Target platform per decision D-012: Amazon ECS Fargate behind CloudFront + ALB.
#
# NOTE: the app currently fail-closes on non-loopback databases and on
# NODE_ENV=production (see apps/web/src/lib/env.ts and instrumentation.ts). This
# image builds and runs against the local synthetic stack only. Relaxing those
# guards for a real environment is a separate, reviewed governance change under
# D-012 — see infra/README.md.
#
# Build from the repository ROOT:  docker build -f apps/web/Dockerfile -t gt-web .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps: install the whole workspace with a frozen lockfile ----
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db-types/package.json packages/db-types/package.json
COPY packages/test-fixtures/package.json packages/test-fixtures/package.json
RUN pnpm install --frozen-lockfile

# ---- build: compile the Next.js standalone bundle ----
FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @gt-selection/web build

# ---- runner: slim runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone output includes a minimal server + only the needed node_modules
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
