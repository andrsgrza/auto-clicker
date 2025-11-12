# Dockerfile
FROM node:20-bullseye

WORKDIR /app
ENV PUPPETEER_CACHE_DIR=/app/.cache

# Dependencias que Chromium necesita en runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation \
  libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libgtk-3-0 libnss3 libatspi2.0-0 libx11-6 libx11-xcb1 libxcb1 libxext6 libxrender1 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Por defecto corre en headless
ENV HEADLESS=new
CMD ["node","index.js"]
