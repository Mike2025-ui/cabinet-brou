from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages
from .models import Annonce, Image, Document, Commentaire, DemandeContact
import json
from django.conf import settings
import os
#import qrcode
from io import BytesIO
import base64

# ============================================================
# PAGES HTML
# ============================================================

def index(request):
    """Page d'accueil du site"""
    return render(request, 'annonces/index.html')


@login_required
def admin_panel(request):
    """Page admin - accessible uniquement après connexion"""
    return render(request, 'annonces/index.html', {'show_admin': True})


def force_logout(request):
    """Déconnexion forcée"""
    logout(request)
    return redirect('/')


# ============================================================
# API POUR LE JAVASCRIPT
# ============================================================

def api_annonces(request):
    """API qui retourne TOUTES les annonces au format JSON"""
    annonces = Annonce.objects.filter(est_publie=True)
    
    data = []
    for a in annonces:
        images_urls = [img.image.url if img.image else '' for img in a.images.all()]
        documents_list = [{'nom': doc.nom, 'url': doc.fichier.url if doc.fichier else ''} for doc in a.documents.all()]
        commentaires_list = [{
            'auteur': c.auteur,
            'date': c.date.strftime('%d %b. %Y'),
            'note': c.note,
            'texte': c.texte
        } for c in a.commentaires.all()]
        
        data.append({
            'id': a.id_annonce,
            'titre': a.titre,
            'type': a.type,
            'ville': a.ville,
            'quartier': a.quartier,
            'prix': a.prix,
            'surface': a.surface or '',
            'description': a.description,
            'imgPrincipale': a.img_principale.url if a.img_principale else '',
            'images': images_urls,
            'documents': documents_list,
            'note': float(a.note),
            'commentaires': commentaires_list
        })
    
    return JsonResponse(data, safe=False)


def api_annonce_detail(request, id_annonce):
    """API qui retourne UNE SEULE annonce (par son ID)"""
    try:
        annonce = Annonce.objects.get(id_annonce=id_annonce, est_publie=True)
    except Annonce.DoesNotExist:
        return JsonResponse({'error': 'Annonce non trouvée'}, status=404)
    
    images_urls = [img.image.url if img.image else '' for img in annonce.images.all()]
    documents_list = [{'nom': doc.nom, 'url': doc.fichier.url if doc.fichier else ''} for doc in annonce.documents.all()]
    commentaires_list = [{
        'auteur': c.auteur,
        'date': c.date.strftime('%d %b. %Y'),
        'note': c.note,
        'texte': c.texte
    } for c in annonce.commentaires.all()]
    
    data = {
        'id': annonce.id_annonce,
        'titre': annonce.titre,
        'type': annonce.type,
        'ville': annonce.ville,
        'quartier': annonce.quartier,
        'prix': annonce.prix,
        'surface': annonce.surface or '',
        'description': annonce.description,
        'imgPrincipale': annonce.img_principale.url if annonce.img_principale else '',
        'images': images_urls,
        'documents': documents_list,
        'note': float(annonce.note),
        'commentaires': commentaires_list
    }
    
    return JsonResponse(data, safe=False)


@require_http_methods(["POST"])
def creer_annonce(request):
    """Crée une nouvelle annonce avec upload de fichiers"""
    try:
        titre = request.POST.get('titre')
        type_bien = request.POST.get('type')
        ville = request.POST.get('ville')
        quartier = request.POST.get('quartier')
        prix = request.POST.get('prix')
        surface = request.POST.get('surface', '')
        description = request.POST.get('description')
        
        if not all([titre, type_bien, ville, quartier, prix, description]):
            return JsonResponse({'error': 'Tous les champs obligatoires doivent être remplis'}, status=400)
        
        annonce = Annonce(
            titre=titre,
            type=type_bien,
            ville=ville,
            quartier=quartier,
            prix=prix,
            surface=surface,
            description=description,
            est_publie=True
        )
        
        if request.FILES.get('img_principale'):
            annonce.img_principale = request.FILES['img_principale']
        
        annonce.sauvegarder_avec_id()
        
        for img_file in request.FILES.getlist('images'):
            Image.objects.create(annonce=annonce, image=img_file, ordre=0)
        
        for doc_file in request.FILES.getlist('documents'):
            Document.objects.create(annonce=annonce, nom=doc_file.name, fichier=doc_file)
        
        return JsonResponse({'success': True, 'id': annonce.id_annonce})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["DELETE"])
def supprimer_annonce(request, id_annonce):
    """Supprime une annonce"""
    try:
        annonce = Annonce.objects.get(id_annonce=id_annonce)
        if annonce.img_principale:
            try:
                os.remove(os.path.join(settings.MEDIA_ROOT, str(annonce.img_principale)))
            except:
                pass
        annonce.delete()
        return JsonResponse({'success': True})
    except Annonce.DoesNotExist:
        return JsonResponse({'error': 'Annonce non trouvée'}, status=404)


@require_http_methods(["POST"])
def modifier_annonce(request, id_annonce):
    """Modifie une annonce (avec support upload image)"""
    try:
        annonce = Annonce.objects.get(id_annonce=id_annonce)
        
        annonce.titre = request.POST.get('titre', annonce.titre)
        annonce.type = request.POST.get('type', annonce.type)
        annonce.ville = request.POST.get('ville', annonce.ville)
        annonce.quartier = request.POST.get('quartier', annonce.quartier)
        annonce.prix = request.POST.get('prix', annonce.prix)
        annonce.surface = request.POST.get('surface', annonce.surface)
        annonce.description = request.POST.get('description', annonce.description)
        
        if request.FILES.get('img_principale'):
            if annonce.img_principale:
                try:
                    os.remove(os.path.join(settings.MEDIA_ROOT, str(annonce.img_principale)))
                except:
                    pass
            annonce.img_principale = request.FILES['img_principale']
        
        annonce.save()
        
        return JsonResponse({'success': True})
    except Annonce.DoesNotExist:
        return JsonResponse({'error': 'Annonce non trouvée'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["POST"])
def ajouter_commentaire(request, id_annonce):
    """Ajoute un commentaire à une annonce"""
    try:
        annonce = Annonce.objects.get(id_annonce=id_annonce)
        data = json.loads(request.body)
        
        Commentaire.objects.create(
            annonce=annonce,
            auteur=data['auteur'],
            note=data['note'],
            texte=data['texte']
        )
        
        commentaires = annonce.commentaires.all()
        moyenne = sum(c.note for c in commentaires) / commentaires.count()
        annonce.note = round(moyenne, 1)
        annonce.save()
        
        return JsonResponse({'success': True})
    except Annonce.DoesNotExist:
        return JsonResponse({'error': 'Annonce non trouvée'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ============================================================
# DOUBLE AUTHENTIFICATION (2FA)
# ============================================================

#from django_otp.plugins.otp_totp.models import TOTPDevice
#rom django.contrib import messages
#import secrets

#@login_required
#def setup_2fa(request):
#    """Configuration de la double authentification"""
#    
#    # Supprimer l'ancien périphérique non confirmé
#    TOTPDevice.objects.filter(user=request.user, confirmed=False).delete()
#    
#    # Créer un nouveau périphérique
#    device = TOTPDevice.objects.create(
#        user=request.user,
#        name='default',
#        confirmed=False
#    )
#    
#    # Générer une clé secrète en base32 (format standard Google Authenticator)
#    # Générer 20 bytes (160 bits) puis encoder en base32
#    raw_key = secrets.token_bytes(20)
#    base32_key = base64.b32encode(raw_key).decode().replace('=', '')
#    device.key = base32_key
#    device.save()
#    
#    # Créer l'URL pour le QR code
#    otpauth_url = f"otpauth://totp/Cabinet%20Bou:{request.user.username}?secret={device.key}&issuer=Cabinet%20Bou"
#    
#    # Générer le QR code
#    qr = qrcode.QRCode(box_size=10, border=4)
#    qr.add_data(otpauth_url)
#    qr.make(fit=True)
#    img = qr.make_image(fill_color="black", back_color="white")
#    
#    buffer = BytesIO()
#    img.save(buffer, format="PNG")
#    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
#    qr_code_data = f"data:image/png;base64,{qr_base64}"
#    
#    if request.method == 'POST':
#        token = request.POST.get('token', '').strip()
#        
#        if device.verify_token(token):
#            device.confirmed = True
#            device.save()            messages.success(request, "✅ Double authentification activée avec succès !")
#            return redirect('/admin-cabinet-bou-2024/')
#        else:
#            messages.error(request, "❌ Code invalide. Réessayez.")
#    
#    return render(request, '2fa_setup.html', {
#        'qrcode': qr_code_data,
#        'secret_key': device.key
#    })