FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache — only re-runs when package files change)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Cloud Run injects PORT; default to 8080
EXPOSE 8080

CMD ["node", "server.js"]
