FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY config.mjs drive.mjs images.mjs image-worker.mjs service.mjs server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
