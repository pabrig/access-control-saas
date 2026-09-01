# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/typescript-config ./packages/typescript-config
EXPOSE 4000
CMD ["pnpm", "--filter", "api", "start"]
