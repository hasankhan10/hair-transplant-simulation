# Step 1: Base Image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Step 2: Build Stage
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Note: Using npm since pnpm-lock is missing, but corepack handles it
RUN npm install
COPY . .
# Build Frontend
RUN npm run build

# Step 3: Production Stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Sharp requirements & common libs for Node native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./
RUN npm install --omit=dev

# Copy built frontend
COPY --from=build /app/dist ./dist
# Copy public assets (important for your references)
COPY --from=build /app/public ./public
# Copy backend code
COPY --from=build /app/server ./server

EXPOSE 3001

# Start the server
# Using tsx to run the server directly
CMD ["npx", "tsx", "server/index.ts"]
