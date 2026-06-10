FROM node:20-alpine

WORKDIR /app

# Dependencies installieren
COPY package.json .
RUN npm install --omit=dev

# App-Dateien kopieren
COPY server.js .
COPY public/ public/

# OpenShift: non-root (node user hat UID 1000, Gruppe 0 schreibberechtigt)
RUN chown -R 1000:0 /app && chmod -R g=u /app
USER 1000

EXPOSE 8080
CMD ["node", "server.js"]
