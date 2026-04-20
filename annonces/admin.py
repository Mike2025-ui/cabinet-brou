from django.contrib import admin
from .models import Annonce, Image, Document, Commentaire, DemandeContact

class ImageInline(admin.TabularInline):
    model = Image
    extra = 3

class DocumentInline(admin.TabularInline):
    model = Document
    extra = 2

@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    list_display = ['id_annonce', 'titre', 'type', 'ville', 'prix', 'est_publie']
    list_filter = ['type', 'est_publie']
    search_fields = ['titre', 'ville']
    inlines = [ImageInline, DocumentInline]
    
    # Champs à afficher dans le formulaire d'ajout/modification
    fieldsets = (
        ('Informations de base', {
            'fields': ('id_annonce', 'titre', 'type', 'est_publie')
        }),
        ('Localisation', {
            'fields': ('ville', 'quartier')
        }),
        ('Caractéristiques', {
            'fields': ('prix', 'surface', 'description')
        }),
        ('Image principale', {
            'fields': ('img_principale',)
        }),
        ('Note', {
            'fields': ('note',)
        }),
    )
    readonly_fields = ('id_annonce', 'date_creation', 'date_modification')

@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ['annonce', 'image', 'ordre']
    list_filter = ['annonce__type']

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'annonce', 'fichier']
    list_filter = ['annonce__type']
    search_fields = ['nom']

@admin.register(Commentaire)
class CommentaireAdmin(admin.ModelAdmin):
    list_display = ['auteur', 'annonce', 'note', 'date']
    list_filter = ['note', 'date']
    search_fields = ['auteur', 'texte']

@admin.register(DemandeContact)
class DemandeContactAdmin(admin.ModelAdmin):
    list_display = ['prenom', 'nom', 'telephone', 'annonce', 'date', 'traite']
    list_filter = ['traite', 'date']
    search_fields = ['prenom', 'nom', 'telephone']
    actions = ['marquer_comme_traite']
    
    def marquer_comme_traite(self, request, queryset):
        queryset.update(traite=True)
    marquer_comme_traite.short_description = "Marquer les demandes comme traitées"