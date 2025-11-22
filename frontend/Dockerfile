# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY frontend/package*.json /app/
RUN npm ci || npm install

# Copy the rest
COPY frontend/ /app

ENV VITE_API_BASE=http://localhost:8000
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
