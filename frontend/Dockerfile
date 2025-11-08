FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY next.config.js ./
RUN npm install --silent
COPY components ./components
COPY pages ./pages
COPY styles ./styles
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start","--","-p","3000"]
