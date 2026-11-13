# The studio's page is built by build/build.py, so the build stage needs Python as well as Node:
# node:22-bookworm has both. The image that runs keeps only the server, its packages and dist/.
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
# no scripts: Playwright, a test tool, would fetch browsers
RUN npm ci --ignore-scripts
COPY . .
RUN python3 build/build.py && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
USER node
# node itself, not npm start, so the server hears Railway's SIGTERM
CMD ["node", "server/src/main.js"]
