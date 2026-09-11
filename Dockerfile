FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts && npm run build
ENV HOST=0.0.0.0 PORT=8090 SANDBOX_DATABASE=/data/sandbox.sqlite
EXPOSE 8090
CMD ["node", "dist/service/server.js"]
