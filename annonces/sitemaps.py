from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Annonce

class StaticSitemap(Sitemap):
    """Sitemap pour les pages statiques"""
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return ['index']  # Seulement la route qui existe

    def location(self, item):
        return reverse(item)

    def lastmod(self, item):
        # Retourne la date de modification la plus récente des annonces
        latest = Annonce.objects.filter(est_publie=True).order_by('-date_modification').first()
        return latest.date_modification if latest else None


class AnnonceSitemap(Sitemap):
    """Sitemap pour les annonces"""
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        return Annonce.objects.filter(est_publie=True).order_by('-date_modification')

    def lastmod(self, obj):
        return obj.date_modification

    def location(self, obj):
        return f"/?annonce={obj.id_annonce}"

    def get_urls(self, site=None, **kwargs):
        """Personnalise les URLs du sitemap pour inclure les images"""
        urls = super().get_urls(site=site, **kwargs)
        
        for url in urls:
            annonce_id = url['item'].id_annonce
            images = [img.image.url for img in url['item'].images.all()]
            
            if images:
                url['image'] = [{'loc': img} for img in images]
        
        return urls


sitemaps = {
    'static': StaticSitemap,
    'annonces': AnnonceSitemap,
}
