FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/demandes-service/package*.json ./services/demandes-service/

RUN cd shared && npm install --omit=dev
RUN cd services/demandes-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/demandes-service/ ./services/demandes-service/

WORKDIR /app/services/demandes-service

EXPOSE 5003

CMD ["node", "server.js"]
