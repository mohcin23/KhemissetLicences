FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/workflow-service/package*.json ./services/workflow-service/

RUN cd shared && npm install --omit=dev
RUN cd services/workflow-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/workflow-service/ ./services/workflow-service/

WORKDIR /app/services/workflow-service

EXPOSE 5009

CMD ["node", "server.js"]
