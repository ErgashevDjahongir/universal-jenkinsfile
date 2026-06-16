# syntax=docker/dockerfile:1
# E-TEST backend — production multi-stage build (NestJS).
# Natija: yengil image, faqat ishlab chiqarish bog'liqliklari, root bo'lmagan foydalanuvchi.

# ---- 1-bosqich: TypeScript -> JavaScript kompilyatsiya ----
FROM node:22-alpine AS builder
WORKDIR /app
# bcrypt native modulini qurish uchun kerakli vositalar
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 2-bosqich: faqat production bog'liqliklari (dev'siz) ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

# ---- 3-bosqich: runtime (yengil) ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# dumb-init signallarni to'g'ri uzatadi (graceful shutdown — onApplicationShutdown ishlashi uchun)
RUN apk add --no-cache dumb-init
COPY --chown=node:node package*.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# Yuklangan fayllar katalogi (volume mount nuqtasi)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
