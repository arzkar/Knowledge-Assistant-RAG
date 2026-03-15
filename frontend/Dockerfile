FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
# Use npm run which correctly sets up the path to include node_modules/.bin
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Copy public and static files into the standalone folder
# This makes it easier to copy to the runner stage and helps debug if they are missing
RUN if [ -d "public" ]; then mkdir -p .next/standalone/public && cp -r public/. .next/standalone/public/; fi
RUN if [ -d ".next/static" ]; then mkdir -p .next/standalone/.next/static && cp -r .next/static/. .next/standalone/.next/static/; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# The standalone folder now contains everything needed to run the app
COPY --from=builder /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
