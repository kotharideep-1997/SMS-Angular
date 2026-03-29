# Stage 1: Build the Angular SSR application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the entire project
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using a lightweight Node.js image
FROM node:20-alpine

WORKDIR /app

# Copy the build artifacts from the build stage
COPY --from=build /app/dist/school_management_system ./dist/school_management_system
COPY --from=build /app/package*.json ./

# Install only production dependencies (optional if SSR is standalone, but safe constraint)
RUN npm ci --omit=dev

# Expose port (default for SSR node servers is usually 4000)
EXPOSE 4000

# Command to run the Angular SSR server
CMD ["node", "dist/school_management_system/server/server.mjs"]
