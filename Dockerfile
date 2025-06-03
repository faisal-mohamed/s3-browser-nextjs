# -------- Build stage --------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies (frozen-lockfile to match exact versions)
RUN npm ci

# Copy rest of the project
COPY . .

# Build Next.js app
RUN npm run build

# -------- Production stage --------
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install only production dependencies (if needed)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose Next.js default port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
