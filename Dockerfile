# Utiliser une image Python légère
FROM python:3.12-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système (nécessaires pour Pillow et autres packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier le fichier requirements.txt
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le projet
COPY . .

# Créer les répertoires pour les fichiers statiques et media
RUN mkdir -p /app/staticfiles /app/media && \
    chmod -R 775 /app/staticfiles /app/media && \
    chmod g+s /app/staticfiles /app/media

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput --clear

# Exposer le port (Gunicorn par défaut)
EXPOSE 8000

# Créer un utilisateur non-root pour la sécurité
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Commande pour démarrer l'application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "App.wsgi:application"]
