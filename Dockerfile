FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

FROM deps AS builder
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
COPY . .
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env.production && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env.production
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY api ./api
COPY server.js ./

RUN npm prune --omit=dev 2>/dev/null; true

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
