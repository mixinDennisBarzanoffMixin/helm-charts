FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
COPY tsconfig.json ./
RUN npm run build
ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps --dns-result-order=ipv4first --inspect=0.0.0.0:9229"
EXPOSE 8080 9229
CMD ["node", "dist/index.js"]
