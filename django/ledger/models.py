from django.conf import settings
from django.db import models

class TransactionType(models.Model):
	def __str__(self):
		return self.description
	description = models.CharField(max_length=63)
	unsel_fg_color = models.CharField(max_length=15)
	unsel_bg_color = models.CharField(max_length=15)
	sel_fg_color = models.CharField(max_length=15)
	sel_bg_color = models.CharField(max_length=15)

class Category(models.Model):
	def __str__(self):
		return self.user.username + ': ' + self.name
	name = models.CharField(max_length=255)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	
class Entity(models.Model):
	def __str__(self):
		return self.user.username + ': ' + self.name
	name = models.CharField(max_length=255)
	category = models.ForeignKey(Category, on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

class Settings(models.Model):
	def __str__(self):
		return self.user.username
	home_account = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='home_account')
	unknown_account = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='unknown_account')
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete = models.CASCADE)

class BanknameLookup(models.Model):
	def __str__(self):
		return self.user.username + ': ' + self.bankname
	bankname = models.CharField(max_length=255)
	entity = models.ForeignKey(Entity, on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

class Ledger(models.Model):
	def __str__(self):
		return self.user.username + ': ' + self.transsource.name + ' => ' + self.transdest.name + ' ' + str(self.amount)
	checknum = models.IntegerField(null=True, blank=True)
	transsource = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='transsource')
	transdest = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='transdest')
	comments = models.CharField(max_length=255, null=True, blank=True)
	amount = models.IntegerField()
	status = models.IntegerField()
	transdate = models.DateTimeField()
	fitid = models.CharField(max_length=255, null=True, blank=True)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
