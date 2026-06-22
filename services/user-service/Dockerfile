FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/user-service/package*.json ./services/user-service/

RUN cd shared && npm install --omit=dev
RUN cd services/user-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/user-service/ ./services/user-service/

WORKDIR /app/services/user-service

EXPOSE 5002

CMD ["node", "server.js"]
