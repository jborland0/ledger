from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('ledger/', include('ledger.urls')),
    path('admin/', admin.site.urls),
]
