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


class AnnonceSitemap(Sitemap):
    """Sitemap pour les annonces"""
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        return Annonce.objects.filter(est_publie=True)

    def lastmod(self, obj):
        return obj.date_modification

    def location(self, obj):
        return f"/?annonce={obj.id}"


sitemaps = {
    'static': StaticSitemap,
    'annonces': AnnonceSitemap,
}
