# Use the official Node.js image as the base image
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Build the NestJS application
RUN npm run build

# Use a lightweight Node.js image for the final image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the built application and production dependencies from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/main"]