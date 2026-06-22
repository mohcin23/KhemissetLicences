FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/licences-service/package*.json ./services/licences-service/

RUN cd shared && npm install --omit=dev
RUN cd services/licences-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/licences-service/ ./services/licences-service/

WORKDIR /app/services/licences-service

EXPOSE 5010

CMD ["node", "server.js"]
