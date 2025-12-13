# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

# Güvenlik için Alpine paketlerini güncelle
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Sadece dependency dosyalarını kopyala (cache için iyi)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Lock file'a göre doğru package manager'ı kullan
RUN if [ -f package-lock.json ]; then \
        npm ci; \
    elif [ -f pnpm-lock.yaml ]; then \
        npm install -g pnpm && pnpm install; \
    elif [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile; \
    else \
        npm install; \
    fi

# Uygulama kaynak kodunu kopyala ve build et
COPY . .
RUN npm run build

# ── Runtime stage (static files) ───────────────────────────────────────────────
FROM nginx:stable-alpine

# Güvenlik için Alpine paketlerini güncelle
RUN apk update && apk upgrade --no-cache

# SPA routing icin custom nginx.conf kullan
COPY nginx.conf /etc/nginx/conf.d/default.conf

# SPA build çıktısını kopyala
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
