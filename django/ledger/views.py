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
from ledger.models import Entity, Ledger, TransactionType
import math

def index(request):
	return render(request, 'ledger/index.html')
	
def django_entities(request):
	entities = []
	if request.user.is_authenticated:
		entities = Entity.objects.filter(user__id=request.user.id).order_by('name')
		entities_list = serializers.serialize('json', entities)
	return HttpResponse(entities_list, content_type='application/json')

def django_gettransaction(request):
	transId = int(request.GET.get('transId'))
	transactions = []
	if request.user.is_authenticated:
		with connection.cursor() as cursor:
			cursor.execute("SELECT * FROM ledger_ledgerdisplay WHERE id = %s AND user_id = %s ORDER BY transdate", [transId, request.user.id])
			rows = cursor.fetchall()
			keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','sourcename','destname')
			for row in rows:
				transactions.append(dict(zip(keys,row)))
	return HttpResponse(json.dumps(transactions,cls=DjangoJSONEncoder), content_type='application/json')

@ensure_csrf_cookie
def django_getuser(request):
	if request.user.is_authenticated:
		return JsonResponse({ 'id': request.user.id, 'username': request.user.username })
	else:
		return JsonResponse({ 'id': -1, 'username': '' })

def django_ledger(request):
	pageNumber = int(request.GET.get('pageNumber', '1'))
	pageSize = int(request.GET.get('pageSize', '10'))
	entity = int(request.GET.get('entity', '0'))
	transactions = []
	if request.user.is_authenticated:
		with connection.cursor() as cursor:
			cursor.execute("SELECT * FROM ledger_ledgerdisplay WHERE user_id = %s and (transsource_id = %s or transdest_id = %s) ORDER BY transdate desc", [request.user.id, entity, entity])
			rows = cursor.fetchall()
			# calculate total number of pages
			rowCount = len(rows)
			pageCount = math.ceil(rowCount/pageSize)
			# make sure requested page is in range
			# special case -1 indicates last page
			if pageNumber == -1 or pageNumber > pageCount:				
				pageNumber = pageCount
			elif pageNumber < 1:
				pageNumber = 1
			# calculate start and end indices
			startIndex = (pageNumber - 1) * pageSize
			endIndex = startIndex + pageSize
			if endIndex > rowCount:
				endIndex = rowCount
			# reduce rows to page we want
			rows = rows[startIndex:endIndex]
			# turn rows into dictionaries so they can be converted to json
			keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','sourcename','destname')
			for row in rows:
				transactions.append(dict(zip(keys,row)))
			# create dictionary for response
	responseData = { 'pageNumber': pageNumber, 'pageSize': pageSize, 'pageCount': pageCount, 'transactions': transactions }
	return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_login(request):
	data = json.loads(request.body)
	user = authenticate(request, username=data['username'], password=data['password'])
	if user is None:
		return JsonResponse({ 'id': -1, 'username': '' })
	else:
		auth_login(request, user)
		return JsonResponse({ 'id': user.id, 'username': user.username })

def django_logout(request):
	data = json.loads(request.body)
	if request.user.is_authenticated:
		if request.user.id == data['id']:
			auth_logout(request)
			return JsonResponse({ 'success': True })
		else:
			return JsonResponse({ 'success': False, 'message': 'incorrect user id' })
	else:
		return JsonResponse({ 'success': False, 'message': 'user is not logged in' })

def django_register(request):
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

def django_settings(request):
    settings = []
    responseData = { 'home_account': 0, 'unknown_account': 0 }
    if request.user.is_authenticated:
        with connection.cursor() as cursor:
            cursor.execute("SELECT home_account, unknown_account FROM ledger_settings_id WHERE user_id = %s", [request.user.id])
            rows = cursor.fetchall()
            if len(rows) > 0:
                responseData = { 'home_account': rows[0][0], 'unknown_account': rows[0][1] }
    return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_transactiontypes(request):
	types = TransactionType.objects.order_by('id')
	types_list = serializers.serialize('json', types)
	return HttpResponse(types_list, content_type='application/json')
