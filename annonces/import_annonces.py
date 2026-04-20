import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from annonces.models import Annonce, Image, Document, Commentaire

# Vos annonces existantes (copiées depuis votre script.js)
annonces_data = [
    {
        "id": "A001",
        "titre": "Terrain nu – Titre foncier sécurisé",
        "type": "terrain",
        "ville": "Abidjan",
        "quartier": "Cocody Riviera",
        "prix": "35 000 000 FCFA",
        "surface": "600",
        "description": "Superbe terrain de 600 m² situé dans le quartier résidentiel de Cocody Riviera...",
        "img_principale": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
            "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&q=80"
        ],
        "documents": [
            {"nom": "Titre Foncier – Page 1", "url": "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&q=80"},
            {"nom": "Plan de bornage", "url": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80"}
        ],
        "note": 4.8,
        "commentaires": [
            {"auteur": "Kouamé A.", "date": "12 jan. 2024", "note": 5, "texte": "Terrain bien situé..."},
            {"auteur": "Fatou D.", "date": "05 fév. 2024", "note": 4, "texte": "Service impeccable..."}
        ]
    },
    # Ajoutez les 5 autres annonces ici (A002 à A006)
    # Je peux vous les fournir complètes sur demande
]

def importer_annonces():
    for data in annonces_data:
        # Créer l'annonce principale
        annonce = Annonce(
            id_annonce=data['id'],
            titre=data['titre'],
            type=data['type'],
            ville=data['ville'],
            quartier=data['quartier'],
            prix=data['prix'],
            surface=data.get('surface', ''),
            description=data['description'],
            img_principale=data['img_principale'],
            note=data.get('note', 0),
            est_publie=True
        )
        annonce.save()
        
        # Ajouter les images secondaires
        for idx, img_url in enumerate(data.get('images', [])):
            Image.objects.create(
                annonce=annonce,
                url=img_url,
                ordre=idx
            )
        
        # Ajouter les documents
        for doc in data.get('documents', []):
            Document.objects.create(
                annonce=annonce,
                nom=doc['nom'],
                url=doc['url']
            )
        
        # Ajouter les commentaires
        for com in data.get('commentaires', []):
            Commentaire.objects.create(
                annonce=annonce,
                auteur=com['auteur'],
                note=com['note'],
                texte=com['texte']
            )
        
        print(f"✅ Annonce {data['id']} importée")

if __name__ == "__main__":
    importer_annonces()