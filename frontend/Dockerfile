# FlowForge web SPA — build with Vite, serve with nginx.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Empty VITE_API_URL → browser calls same-origin /api (nginx proxies to API_UPSTREAM).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# Runtime envsubst via official nginx image templates dir.
# Set API_UPSTREAM at deploy time (Render private DNS or Compose service name).
ENV API_UPSTREAM=https://flowforge-api.onrender.com
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
