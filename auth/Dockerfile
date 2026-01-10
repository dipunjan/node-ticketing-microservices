FROM node:18-alpine

WORKDIR /app

# 1️⃣ Copy ONLY manifests (dependency graph)
COPY package.json .
COPY auth/package.json auth/package.json
COPY common/package.json common/package.json

# 2️⃣ Install dependencies ONCE (workspace-aware)
RUN npm install

# 3️⃣ Copy source code (sync-friendly)
COPY auth ./auth
COPY common ./common

# 4️⃣ Run the service
WORKDIR /app/auth
CMD ["npm", "run", "start:debug"]
