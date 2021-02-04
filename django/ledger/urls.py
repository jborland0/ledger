from django.urls import path
from django.urls import re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
	path('django_deletetransaction/', views.django_deletetransaction, name='django_deletetransaction'),
    path('django_entities/', views.django_entities, name='django_entities'),
    path('django_gettransaction/', views.django_gettransaction, name='django_gettransaction'),
    path('django_getuser/', views.django_getuser, name='django_getuser'),
    path('django_ledger/', views.django_ledger, name='django_ledger'),
    path('django_login/', views.django_login, name='django_login'),
    path('django_logout/', views.django_logout, name='django_logout'),
	path('django_movetransaction/', views.django_movetransaction, name='django_movetransaction'),
    path('django_register/', views.django_register, name='django_register'),
    path('django_settings/', views.django_settings, name='django_settings'),
    path('django_transactiontypes/', views.django_transactiontypes, name='django_transactiontypes'),
	path('django_updatetransaction/', views.django_updatetransaction, name='django_updatetransaction'),
	path('django_uploadtransactions/', views.django_uploadtransactions, name='django_uploadtransactions'),
    re_path(r'^(?:.*)/?$', views.index, name='index')
]
