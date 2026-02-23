FROM node:20-slim AS builder

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env.production && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env.production
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY api ./api
COPY server.js ./

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
