# Build stage
FROM oven/bun:alpine AS builder

WORKDIR /app

COPY ./package.json ./bun.lock ./

RUN bun install

COPY . .

RUN bun run build

# Runner stage - Use Node.js instead of Bun for compatibility with http-server
FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/build .

# Install http-server globally
RUN npm install -g http-server

# Expose port 8080 for the http-server
EXPOSE 8080

# Start the http-server
CMD ["http-server", "."]
