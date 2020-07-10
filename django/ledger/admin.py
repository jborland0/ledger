from django.contrib import admin
from .models import TransactionType, Settings, Category, Entity, BanknameLookup, Ledger

# Register your models here.
admin.site.register(TransactionType)
admin.site.register(Settings)
admin.site.register(Category)
admin.site.register(Entity)
admin.site.register(BanknameLookup)
admin.site.register(Ledger)
