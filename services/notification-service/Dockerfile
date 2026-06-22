FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/notification-service/package*.json ./services/notification-service/

RUN cd shared && npm install --omit=dev
RUN cd services/notification-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/notification-service/ ./services/notification-service/

WORKDIR /app/services/notification-service

EXPOSE 5007

CMD ["node", "server.js"]
