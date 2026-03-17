FROM oven/bun:1.2-alpine AS base
WORKDIR /app
COPY package.json ./

FROM base AS development
RUN bun install
COPY . .
EXPOSE 3001
CMD ["bun", "run", "start:dev"]

FROM base AS builder
RUN bun install
COPY . .
RUN bun run build

FROM base AS production
RUN bun install --production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["bun", "dist/main.js"]
