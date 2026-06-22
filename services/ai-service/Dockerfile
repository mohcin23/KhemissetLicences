FROM node:18-alpine

WORKDIR /app

COPY services/ai-service/package*.json ./
RUN npm install --production

COPY services/ai-service/ .

EXPOSE 5006

CMD ["node", "server.js"]
