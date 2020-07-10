from django.db import transaction
from django.db.models import F
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_user_model
from django.middleware import csrf
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.core import serializers
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection
import json
from ledger.models import Ledger

def index(request):
	return HttpResponse("Hi")

@ensure_csrf_cookie
def getuser(request):
	if request.user.is_authenticated:
		return JsonResponse({ 'id': request.user.id, 'username': request.user.username })
	else:
		return JsonResponse({ 'id': -1, 'username': '' })

def ledger(request):
	transactions = []
	if request.user.is_authenticated:
		with connection.cursor() as cursor:
			cursor.execute("SELECT * FROM ledger_ledgerdisplay WHERE user_id = %s", [request.user.id])
			rows = cursor.fetchall()[:10]
			keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','sourcename','destname')
			for row in rows:
				transactions.append(dict(zip(keys,row)))
	return HttpResponse(json.dumps(transactions,cls=DjangoJSONEncoder), content_type='application/json')

def login(request):
	data = json.loads(request.body)
	user = authenticate(request, username=data['username'], password=data['password'])
	if user is None:
		return JsonResponse({ 'id': -1, 'username': '' })
	else:
		auth_login(request, user)
		return JsonResponse({ 'id': user.id, 'username': user.username })

def logout(request):
	data = json.loads(request.body)
	if request.user.is_authenticated:
		if request.user.id == data['id']:
			auth_logout(request)
			return JsonResponse({ 'success': True })
		else:
			return JsonResponse({ 'success': False, 'message': 'incorrect user id' })
	else:
		return JsonResponse({ 'success': False, 'message': 'user is not logged in' })

def register(request):
	# create dictionary for messages
	messages = {}
	# load request data
	data = json.loads(request.body)
	print(str(data))
	# trim all strings
	for key in data.keys():
		data[key] = data[key].strip()
	# make sure all fields are present
	if data['username'] == '':
		messages['username'] = 'Username is required'
	if data['password'] == '':
		messages['password'] = 'Password is required'
	if data['password'] != data['passwordMatch']:
		messages['passwordMatch'] = 'Passwords must match'
	if data['email'] == '':
		messages['email'] = 'Email is required'
	# if no errors yet
	if len(messages) == 0:
		# use db transaction so name/email won't get taken
		with transaction.atomic():
			# check existing username
			existingUserCount = get_user_model().objects.filter(username = data['username']).count()
			if (existingUserCount > 0):
				messages['username'] = 'Username is not available'
			if len(messages) == 0:
				user = get_user_model().objects.create_user(data['username'], data['email'], data['password'])
				return JsonResponse({ 'success': True, 'user' : { 'id': user.id, 'username': user.username } })
	# create user failed, return error messages
	return JsonResponse({ 'success': False, 'messages': messages })
