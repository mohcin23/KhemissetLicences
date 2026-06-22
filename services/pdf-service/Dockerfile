FROM node:18-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY shared/package*.json ./shared/
COPY services/pdf-service/package*.json ./services/pdf-service/

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN cd shared && npm install --omit=dev
RUN cd services/pdf-service && npm install --omit=dev

COPY shared/ ./shared/
COPY services/pdf-service/ ./services/pdf-service/

WORKDIR /app/services/pdf-service

EXPOSE 5004

CMD ["node", "server.js"]
