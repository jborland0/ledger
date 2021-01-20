from datetime import datetime
from django.utils import timezone
import pytz
from distutils.util import strtobool
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
from . import ledger
from datetime import datetime

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
	# convert string params to native types
	pageNumber = int(request.GET.get('pageNumber', '1'))
	pageSize = int(request.GET.get('pageSize', '10'))
	entity = int(request.GET.get('entity', '0'))
	includeEstimates = bool(strtobool(request.GET.get('includeEstimates')))
	if includeEstimates:
		transactionTypes = None
	else:
		transactionTypes = [1,2,3]
	if includeEstimates and len(request.GET.get('estimatesFrom', '')) > 0:
		estimatesFrom = datetime.strptime(request.GET.get('estimatesFrom', ''), '%m/%d/%Y')
	else:
		estimatesFrom = None
	if includeEstimates and len(request.GET.get('estimatesTo', '')) > 0:
		estimatesTo = datetime.strptime(request.GET.get('estimatesTo', ''), '%m/%d/%Y')
	else:
		estimatesTo = None
	transactions = []
	if request.user.is_authenticated:
		# load transactions for specified entity
		transactions = ledger.load_for_entity(request.user.id, entity, transactionTypes, estimatesFrom, estimatesTo)
		# calculate total number of pages
		rowCount = len(transactions)
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
		# reduce transactions to page we want
		transactions = transactions[startIndex:endIndex]
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

def django_movetransaction(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		# get the transaction id and number of steps
		transId = data['transId']
		nSteps = data['nSteps']
		# if moving the transaction forward
		if nSteps > 0:
			# for each step
			for i in range (0, nSteps):
				# move transaction forward
				ledger.move_transaction_forward(transId)
		else:
			# for each step
			for i in range(0, -nSteps):
				# move transaction back
				ledger.move_transaction_back(transId)
		success = True
		message = 'Transaction was moved successfully'
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_register(request):
	# create dictionary for messages
	messages = {}
	# load request data
	data = json.loads(request.body)
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

def django_updatetransaction(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		# load the transaction that we are updating
		transactions = Ledger.objects.filter(id=data['id'])
		if len(transactions) == 1:
			transaction = transactions[0]
			transaction.checknum = data['checknum']
			transaction.transdate = timezone.make_aware(datetime.strptime(data['transdate'].replace('Z', 'UTC'), '%Y-%m-%dT%H:%M:%S.%f%Z'), pytz.UTC)
			transaction.transsource = Entity.objects.filter(id=data['transsource'])[0]
			transaction.transdest = Entity.objects.filter(id=data['transdest'])[0]
			transaction.comments = data['comment']
			transaction.amount = data['amount']
			status = TransactionType.objects.filter(id=data['status'])[0]
			transaction.save()
			success = True
			message = 'Transaction updated successfully'
		else:
			message = 'Expected 1 transaction but found ' + str(len(transactions))
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })
	
def django_uploadtransactions(request):
	file = request.FILES['file']
	print(file.read())
	success = True
	message = 'File was uploaded successfully'
	return JsonResponse({ 'success' : success, 'message': message })
