FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# ── Install dependencies ────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/cloud/package.json  packages/cloud/

RUN pnpm install --frozen-lockfile

# ── Build shared + cloud ────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY packages/shared/ packages/shared/
COPY packages/cloud/ packages/cloud/

RUN pnpm --filter @claw-im/shared build && \
    pnpm --filter @claw-im/cloud  build

# ── Production image ────────────────────────────────────
FROM base AS runner
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/cloud/package.json  packages/cloud/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared/dist/ packages/shared/dist/
COPY --from=build /app/packages/cloud/dist/  packages/cloud/dist/

# Copy drizzle config + schema source for db:push at startup
COPY packages/cloud/drizzle.config.ts packages/cloud/
COPY packages/cloud/src/db/schema.ts  packages/cloud/src/db/

# Install drizzle-kit in the runner stage for db:push
RUN cd packages/cloud && pnpm add -D drizzle-kit

COPY packages/cloud/scripts/startup.sh packages/cloud/scripts/

RUN chmod +x packages/cloud/scripts/startup.sh

EXPOSE 3820

CMD ["packages/cloud/scripts/startup.sh"]
