#  FROM node:20-alpine
#  WORKDIR /app

#  COPY package.json package-lock.json ./

#  RUN npm ci

#  COPY . .

#  RUN npm run build

#  EXPOSE 3000

#  ENV NODE_ENV=production

#  CMD ["npm", "start"]


# ==========================



FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Clean install dependencies
RUN npm ci

# Copy app source
COPY . .

# Build Next.js app
RUN npm run build

# ----------- Stage 2: Runtime -------------------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Copy .next directory
COPY --from=builder /app/.next ./.next

# Install production dependencies only
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --production

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
