FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/auth-service/package*.json ./services/auth-service/

RUN cd shared && npm install --omit=dev
RUN cd services/auth-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/auth-service/ ./services/auth-service/

WORKDIR /app/services/auth-service

EXPOSE 5001

CMD ["node", "server.js"]
