from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/annonces/', views.api_annonces, name='api_annonces'),
    path('api/annonce/<str:id_annonce>/', views.api_annonce_detail, name='api_annonce_detail'),
    path('api/annonces/creer/', views.creer_annonce, name='creer_annonce'),
    path('api/annonces/<str:id_annonce>/supprimer/', views.supprimer_annonce, name='supprimer_annonce'),
    path('api/annonces/<str:id_annonce>/modifier/', views.modifier_annonce, name='modifier_annonce'),
    path('api/annonce/<str:id_annonce>/commentaire/', views.ajouter_commentaire, name='ajouter_commentaire'),
    path('admin-cabinet-bou-2024/', views.admin_panel, name='admin_panel'),
    #path('2fa/setup/', views.setup_2fa, name='setup_2fa'),
]