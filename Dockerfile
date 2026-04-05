FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/stats/package.json packages/stats/
COPY packages/classifier/package.json packages/classifier/
COPY packages/tasks/package.json packages/tasks/
COPY packages/llm-client/package.json packages/llm-client/
COPY packages/storage/package.json packages/storage/
COPY packages/stigmergy-mcp/package.json packages/stigmergy-mcp/
COPY packages/executors/package.json packages/executors/
COPY packages/engine/package.json packages/engine/
COPY packages/cli/package.json packages/cli/
COPY packages/dashboard/package.json packages/dashboard/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY . .
RUN pnpm build

# Production
FROM base AS production
COPY --from=build /app /app
VOLUME ["/data"]
ENV STIGMERGY_BENCHMARK_DB=/data/stigmergy-benchmark.db
ENTRYPOINT ["pnpm", "exec", "stigmergy-benchmark"]
CMD ["--help"]
