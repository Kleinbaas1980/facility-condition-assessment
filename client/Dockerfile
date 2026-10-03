FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts
COPY client client
ARG API_PROXY_TARGET=http://server:4000
ENV API_PROXY_TARGET=$API_PROXY_TARGET
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w client
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/client/.next/standalone ./
COPY --from=build /app/client/.next/static ./client/.next/static
COPY --from=build /app/client/public ./client/public
USER node
EXPOSE 3000
CMD ["node","client/server.js"]
