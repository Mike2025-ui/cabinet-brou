"""
URL configuration for App project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve  # 👈 AJOUT IMPORTANT
from django.urls import re_path       # 👈 AJOUT IMPORTANT
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

# 👇 SERVI LES MÉDIAS EN FORCE (même avec DEBUG=False)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# 👇 AJOUT : FORCER LE SERVEUR DE MÉDIAS AVEC UNE VUE EXPLICITE
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]