FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S mv930g && adduser -S -G mv930g mv930g
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY server/mv930g ./server/mv930g
USER mv930g
EXPOSE 9300
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:9301/healthz || exit 1
CMD ["node", "server/mv930g/tcp-server.mjs"]
