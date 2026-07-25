# syntax=docker/dockerfile:1
# Container image for the GT admissions family portal (Next.js).
# Target platform per decision D-012: Amazon ECS Fargate behind CloudFront + ALB.
#
# NOTE: by default the app fail-closes on non-loopback databases; GT_DEPLOY_MODE=hosted
# (set below and at build time) is the D-012 interim opt-in that lets it target the
# cloud synthetic Supabase project. The data layer remains synthetic-only
# (app.bind_local_synthetic_principal requires synthetic_only=true) and elevated
# service-role keys are still forbidden at runtime — see apps/web/src/lib/env.ts
# and infra/README.md.
#
# Build from the repository ROOT:  docker build -f apps/web/Dockerfile -t gt-web .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- build: install the full workspace and compile the standalone bundle ----
# We install in the same stage we build in so pnpm's per-package node_modules
# symlink farm stays intact. A previous multi-stage split copied only the root
# and apps/web node_modules, which left workspace packages (e.g.
# packages/contracts) unable to resolve their own deps like `zod` at build time.
# The final `runner` stage copies only Next's traced standalone output, so this
# fuller build stage does not bloat the shipped image.
FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

# `NEXT_PUBLIC_*` values are inlined into the CLIENT bundle at build time (see
# apps/web/src/lib/supabase/browser.ts), so the hosted Supabase target must be
# present now, not just in the runtime env. GT_DEPLOY_MODE=hosted lets the
# env guard (src/lib/env.ts) accept a non-loopback https Supabase URL here.
ARG GT_DEPLOY_MODE=hosted
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GT_RETURN_URL
ENV GT_DEPLOY_MODE=$GT_DEPLOY_MODE \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_GT_RETURN_URL=$NEXT_PUBLIC_GT_RETURN_URL
RUN pnpm --filter @gt-selection/web build

# ---- runner: slim runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Hosted synthetic backend opt-in (server-side only — NOT NEXT_PUBLIC, so never
# inlined into the client bundle). GT_DEPLOY_MODE=hosted lets the env guard accept
# the cloud Supabase target at runtime; the two GT_LOCAL_SYNTHETIC_* vars satisfy
# hostedSyntheticAdapterSchema in src/lib/env.ts so the onboarding server actions
# bind against the cloud project. The synthetic-only guarantee is enforced at the
# data layer (app.bind_local_synthetic_principal requires synthetic_only=true).
ENV GT_DEPLOY_MODE=hosted
ENV GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED=true
ENV GT_LOCAL_SYNTHETIC_PROJECT_ID=gt-selection-capstone
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
