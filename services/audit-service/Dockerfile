FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/audit-service/package*.json ./services/audit-service/

RUN cd shared && npm install --omit=dev
RUN cd services/audit-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/audit-service/ ./services/audit-service/

WORKDIR /app/services/audit-service

EXPOSE 5008

CMD ["node", "server.js"]
