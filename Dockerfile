# Use a lightweight Node.js image
FROM node:18-alpine

# Install expo-cli globally
RUN npm install -g expo-cli@latest

# Set working directory inside container
WORKDIR /app

# Copy package.json and lock file first for caching
COPY mobile/Bishop/package.json mobile/Bishop/yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the project
COPY mobile/Bishop/ ./

# Expose Metro bundler port (default: 8081)
EXPOSE 8081

# Start Expo CLI in non-interactive, no web mode
CMD ["npx", "expo", "start", "--lan", "--no-dev", "--non-interactive"]

