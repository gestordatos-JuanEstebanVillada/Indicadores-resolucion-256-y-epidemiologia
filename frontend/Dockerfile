FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variables Vite (Tableau, etc.) — pasar en build si las necesitas:
# docker compose build --build-arg VITE_TABLEAU_CLIENT_ID=...
ARG VITE_API_ORIGIN=http://127.0.0.1:8007
ARG VITE_TABLEAU_CLIENT_ID=
ARG VITE_TABLEAU_SECRET_ID=
ARG VITE_TABLEAU_SECRET_VALUE=
ARG VITE_TABLEAU_USERNAME=

ENV VITE_API_ORIGIN=$VITE_API_ORIGIN \
    VITE_TABLEAU_CLIENT_ID=$VITE_TABLEAU_CLIENT_ID \
    VITE_TABLEAU_SECRET_ID=$VITE_TABLEAU_SECRET_ID \
    VITE_TABLEAU_SECRET_VALUE=$VITE_TABLEAU_SECRET_VALUE \
    VITE_TABLEAU_USERNAME=$VITE_TABLEAU_USERNAME

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
