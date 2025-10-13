# ---- Base image ----
FROM node:24.4.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build


# Use a minimal static file server
# Bun now ships `bun run vite preview` or you can use `bunx serve`
# But better to use Bun’s native preview for Vite

EXPOSE 4173

CMD ["pnpm", "run", "preview", "-c", "./vite.config.ts"]