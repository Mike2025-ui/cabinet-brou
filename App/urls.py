"""
URL configuration for App project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# Vue pour le health check
def health_check(request):
    return HttpResponse("OK", status=200)

urlpatterns = [
    path('accounts/', include('django.contrib.auth.urls')),
    path('admin/', admin.site.urls),
    path('', include('annonces.urls')),
    path('health/', health_check),
]

# Servir les fichiers médias EN TOUT TEMPS (même en production)
# car nous n'avons pas de serveur web dédié (Nginx) pour les servir
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)