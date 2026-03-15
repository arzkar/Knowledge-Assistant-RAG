FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
# Use npm run which correctly sets up the path to include node_modules/.bin
CMD ["npm", "run", "start:dev"]

FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

FROM base AS production
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
