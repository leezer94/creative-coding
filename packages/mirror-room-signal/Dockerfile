# Build from monorepo root:
#   docker build -f packages/mirror-room-signal/Dockerfile .

FROM node:20-alpine
WORKDIR /app

COPY packages/mirror-room-signal/package.json ./
RUN npm install --omit=dev

COPY packages/mirror-room-signal/src ./src

ENV NODE_ENV=production
ENV MIRROR_ROOM_SIGNAL_PORT=8787
EXPOSE 8787

CMD ["node", "./src/server.mjs"]
