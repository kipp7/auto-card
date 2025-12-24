FROM node:18-alpine AS admin-build

WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci
COPY admin ./
RUN npm run build

FROM node:18-alpine

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server ./
COPY web /app/web
COPY --from=admin-build /app/admin/dist /app/admin/dist

EXPOSE 3000

CMD ["node", "app.js"]
