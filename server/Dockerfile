# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port (Back4App will set this via environment variable)
EXPOSE 3001

# Start the application
CMD ["node", "index.js"]
