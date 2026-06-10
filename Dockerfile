# ── Build Stage ───────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runtime Stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim

LABEL maintainer="your-team@example.com" \
      app="notizen-app" \
      version="1.0.0"

# OpenShift läuft mit zufälliger UID – Gruppe root (0) muss schreibberechtigt sein
RUN groupmod -g 1001 www-data && \
    usermod  -u 1001 -g 1001 www-data && \
    mkdir -p /app && \
    chown -R 1001:0 /app && \
    chmod -R g=u   /app

WORKDIR /app

# Dependencies aus Build-Stage kopieren
COPY --from=builder /install /usr/local

# App-Dateien kopieren
COPY --chown=1001:0 . .

# Port 8080 (kein root nötig)
EXPOSE 8080

# Nicht als root laufen (OpenShift-Anforderung)
USER 1001

# Gunicorn als WSGI-Server, Initialisierung der DB vor Start
CMD ["sh", "-c", "python -c 'from app import app, init_db; \
    ctx = app.app_context(); ctx.push(); init_db(); ctx.pop()' && \
    gunicorn --bind 0.0.0.0:8080 \
             --workers 2 \
             --threads 2 \
             --timeout 60 \
             --access-logfile - \
             --error-logfile - \
             app:app"]
