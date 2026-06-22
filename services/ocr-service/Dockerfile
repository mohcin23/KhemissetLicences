FROM node:18-alpine

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/ocr-service/package*.json ./services/ocr-service/

RUN cd shared && npm install --omit=dev
RUN cd services/ocr-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/ocr-service/ ./services/ocr-service/

WORKDIR /app/services/ocr-service

EXPOSE 5005

CMD ["node", "server.js"]
