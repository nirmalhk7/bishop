# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from mobile/Bishop
COPY mobile/Bishop/package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Install specific version of webpack config and other necessary packages
RUN npm install --save-dev \
    @expo/webpack-config@^19.0.1 \
    @expo/metro-runtime@~1.0.0 \
    babel-preset-expo@~10.0.1 \
    --legacy-peer-deps

# Copy source code
COPY mobile/Bishop/ .

# Create a temporary metro.config.js (all in one line)
RUN echo 'const { getDefaultConfig } = require("@expo/metro-config"); const config = getDefaultConfig(__dirname); module.exports = config;' > metro.config.js

# Update app.json to include web platform
RUN sed -i 's/"web": {/"platforms": ["web"], "web": {/' app.json

# Create a webpack.config.js file (all in one line)
RUN echo 'const createExpoWebpackConfigAsync = require("@expo/webpack-config"); module.exports = async function (env, argv) { const config = await createExpoWebpackConfigAsync(env, argv); return config; };' > webpack.config.js

# Install expo-cli
RUN npm install -g expo-cli@latest

# Build for web platform with increased memory
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npx expo export:web

# Production stage
FROM nginx:alpine

# Copy the built web files to nginx
COPY --from=builder /app/web-build /usr/share/nginx/html/

# Create a script to start nginx with the correct port
RUN echo '#!/bin/sh\nPORT="${PORT:-8080}"\nsed -i "s/listen 8080/listen $PORT/g" /etc/nginx/conf.d/default.conf\nnginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Configure nginx with proper mime types and compression
RUN echo 'server { listen 8080; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache"; } location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { expires 1y; add_header Cache-Control "public, no-transform"; } location ~* \.(?:manifest|appcache|html?|xml|json)$ { expires -1; } gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 6; gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss text/javascript; }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["/start.sh"]
