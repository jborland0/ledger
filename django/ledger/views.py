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
from ledger.models import Category, Entity, Ledger, Settings, TransactionType
import math
from . import ledger
from datetime import datetime
from dbsync import dbsync

def index(request):
	return render(request, 'ledger/index.html')

def django_categories(request):
	categories = []
	if request.user.is_authenticated:
		categories = Category.objects.filter(user=request.user).order_by('name')
	categories_list = serializers.serialize('json', categories)
	return HttpResponse(categories_list, content_type='application/json')

def django_categories_page(request):
	pageNumber = int(request.GET.get('pageNumber', '1'))
	pageSize = int(request.GET.get('pageSize', '10'))
	categories = []
	if request.user.is_authenticated:
		with connection.cursor() as cursor:
			# load all entities
			cursor.execute("SELECT * FROM ledger_category WHERE user_id = %s ORDER BY name", [request.user.id])
			rows = cursor.fetchall()
			keys = ('id','name','user_id')
			for row in rows:
				categories.append(dict(zip(keys,row)))
		# calculate total number of pages
		rowCount = len(categories)
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
		# reduce categories to page we want
		categories = categories[startIndex:endIndex]
	# create dictionary for response
	responseData = { 'pageNumber': pageNumber, 'pageSize': pageSize, 'pageCount': pageCount, 'categories': categories }
	return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_deletecategory(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		categories = Category.objects.filter(id=data['categoryId'],user=request.user)
		if len(categories) == 1:
			categories[0].delete()
			success = True
			message = 'Category deleted successfully'
		else:
			message = 'Expected 1 category but found ' + str(len(entities))
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_deleteentity(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		entities = Entity.objects.filter(id=data['entityId'],user=request.user)
		if len(entities) == 1:
			entities[0].delete()
			success = True
			message = 'Entity deleted successfully'
		else:
			message = 'Expected 1 entity but found ' + str(len(entities))
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_deletetransaction(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		transactions = Ledger.objects.filter(id=data['transId'],user=request.user)
		if len(transactions) == 1:
			transactions[0].delete()
			success = True
			message = 'Transaction deleted successfully'
		else:
			message = 'Expected 1 transaction but found ' + str(len(transactions))
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_entities(request):
	entities = []
	if request.user.is_authenticated:
		entities = Entity.objects.filter(user=request.user).order_by('name')
	entities_list = serializers.serialize('json', entities)
	return HttpResponse(entities_list, content_type='application/json')

def django_entities_page(request):
	pageNumber = int(request.GET.get('pageNumber', '1'))
	pageSize = int(request.GET.get('pageSize', '10'))
	category = int(request.GET.get('category', '0'))
	entities = []
	if request.user.is_authenticated:
		with connection.cursor() as cursor:
			# if 'all' was specified for category
			if category == 0:
				# load all entities
				cursor.execute("SELECT * FROM ledger_entitydisplay WHERE user_id = %s ORDER BY name", [request.user.id])
			else:
				# load all entities for this category
				cursor.execute("SELECT * FROM ledger_entitydisplay WHERE category_id = %s and user_id = %s ORDER BY name", [category, request.user.id])
			rows = cursor.fetchall()
			keys = ('id','name','category_id','user_id','category_name')
			for row in rows:
				entities.append(dict(zip(keys,row)))
		# calculate total number of pages
		rowCount = len(entities)
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
		# reduce entities to page we want
		entities = entities[startIndex:endIndex]
	# create dictionary for response
	responseData = { 'pageNumber': pageNumber, 'pageSize': pageSize, 'pageCount': pageCount, 'entities': entities }
	return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_getcategory(request):
	categoryId = request.GET.get('categoryId')
	categories = []
	if request.user.is_authenticated:
		# look up the existing category
		with connection.cursor() as cursor:
			cursor.execute("SELECT * FROM ledger_category WHERE id = %s and user_id = %s", [int(categoryId), request.user.id])
			rows = cursor.fetchall()
			keys = ('id','name','user_id')
			for row in rows:
				categories.append(dict(zip(keys,row)))
	return HttpResponse(json.dumps(categories[0],cls=DjangoJSONEncoder), content_type='application/json')

def django_getentity(request):
	entityId = request.GET.get('entityId')
	entities = []
	if request.user.is_authenticated:
		# look up the existing entity
		with connection.cursor() as cursor:
			cursor.execute("SELECT * FROM ledger_entitydisplay WHERE id = %s and user_id = %s", [int(entityId), request.user.id])
			rows = cursor.fetchall()
			keys = ('id','name','category_id','user_id','category_name')
			for row in rows:
				entities.append(dict(zip(keys,row)))
	return HttpResponse(json.dumps(entities[0],cls=DjangoJSONEncoder), content_type='application/json')

def django_gettransaction(request):
	transId = request.GET.get('transId')
	transactions = []
	if request.user.is_authenticated:
		# if we are requesting a new transaction
		if transId == 'new':
			# get user settings for home account, unknown account
			settings = ledger.get_user_settings(request.user)
			return JsonResponse({ 'id': transId, 'checknum': '', 'comments': '', 'amount': 0, 'status': settings.transactionTypeNone.id, 
				'transdate': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S'), 'fitid': None, 'transdest_id': settings.unknownAccount.id,
				'transsource_id': settings.homeAccount.id, 'user_id': request.user.id, 'sourcename': settings.homeAccount.name,
				'destname': settings.unknownAccount.name, 'bankname': '' })
		else:
			# look up the existing transaction
			with connection.cursor() as cursor:
				cursor.execute("SELECT * FROM ledger_ledgerdisplay WHERE id = %s AND user_id = %s ORDER BY transdate", [int(transId), request.user.id])
				rows = cursor.fetchall()
				keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','bankname','sourcename','destname')
				for row in rows:
					transactions.append(dict(zip(keys,row)))
		return HttpResponse(json.dumps(transactions[0],cls=DjangoJSONEncoder), content_type='application/json')

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
				ledger.move_transaction_forward(transId,request.user)
		else:
			# for each step
			for i in range(0, -nSteps):
				# move transaction back
				ledger.move_transaction_back(transId,request.user)
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
	if data['homeAccount'] == '':
		messages['homeAccount'] = 'Primary account name is required'
	# if no errors yet
	if len(messages) == 0:
		# use db transaction so name/email won't get taken
		with transaction.atomic():
			# check existing username
			existingUserCount = get_user_model().objects.filter(username = data['username']).count()
			if (existingUserCount > 0):
				messages['username'] = 'Username is not available'
			if len(messages) == 0:
				# create user account
				user = get_user_model().objects.create_user(data['username'], data['email'], data['password'])
				# create categories for accounts & unknown
				accountCategory = Category.objects.create(user=user, name='Accounts')
				unknownCategory = Category.objects.create(user=user, name='Unknown')
				# create home & unknown accounts
				homeAccount = Entity.objects.create(user=user, name=data['homeAccount'], category=accountCategory)
				unknownAccount = Entity.objects.create(user=user, name='Unknown', category=unknownCategory)
				# create settings
				settings = Settings.objects.create(user=user, home_account=homeAccount, unknown_account=unknownAccount)
				return JsonResponse({ 'success': True, 'user' : { 'id': user.id, 'username': user.username } })
	# create user failed, return error messages
	return JsonResponse({ 'success': False, 'messages': messages })

def django_settings(request):
    settings = []
    responseData = { 'home_account': 0, 'unknown_account': 0 }
    if request.user.is_authenticated:
        with connection.cursor() as cursor:
            cursor.execute("SELECT home_account_id, unknown_account_id FROM ledger_settings WHERE user_id = %s", [request.user.id])
            rows = cursor.fetchall()
            if len(rows) > 0:
                responseData = { 'home_account': rows[0][0], 'unknown_account': rows[0][1] }
    return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_test(request):
    responseData = { 'test': dbsync.left_pad('pad', '6', '0') }
    return HttpResponse(json.dumps(responseData,cls=DjangoJSONEncoder), content_type='application/json')

def django_transactiontypes(request):
	types = TransactionType.objects.order_by('id')
	types_list = serializers.serialize('json', types)
	return HttpResponse(types_list, content_type='application/json')

def django_updatecategory(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		category = None
		# if the category is new
		if (data['id'] == 'new'):
			# create new category
			category = Category(user=request.user)
		else:
			# load the category that we are updating
			categories = Category.objects.filter(id=data['id'],user=request.user)
			if len(categories) == 1:
				category = categories[0]
			else:
				message = 'Expected 1 category but found ' + str(len(categories))
		# if a category was found/created
		if category is not None:
			category.name = data['name']
			category.save()
			success = True
			message = 'Category updated successfully'
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_updateentity(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		entity = None
		# if the entity is new
		if (data['id'] == 'new'):
			# create new entity
			entity = Entity(user=request.user)
		else:
			# load the entity that we are updating
			entities = Entity.objects.filter(id=data['id'],user=request.user)
			if len(entities) == 1:
				entity = entities[0]
			else:
				message = 'Expected 1 entity but found ' + str(len(entities))
		# if an entity was found/created
		if entity is not None:
			entity.name = data['name']
			entity.category = Category.objects.filter(id=data['category_id'],user=request.user)[0]
			entity.save()
			success = True
			message = 'Entity updated successfully'
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })

def django_updatetransaction(request):
	success = False
	message = 'An unknown error occurred'
	if request.user.is_authenticated:
		data = json.loads(request.body)
		transaction = None
		# if the transaction is new
		if (data['id'] == 'new'):
			# create new transaction
			transaction = Ledger(user=request.user)
		else:
			# load the transaction that we are updating
			transactions = Ledger.objects.filter(id=data['id'],user=request.user)
			if len(transactions) == 1:
				transaction = transactions[0]
			else:
				message = 'Expected 1 transaction but found ' + str(len(transactions))
		# if a transaction was found/created
		if transaction is not None:
			transaction.checknum = data['checknum'] if len(str(data['checknum'])) > 0 else None
			transaction.transdate = timezone.make_aware(datetime.strptime(data['transdate'].replace('Z', 'UTC'), '%Y-%m-%dT%H:%M:%S.%f%Z'), pytz.UTC)
			transaction.transsource = Entity.objects.filter(id=data['transsource'],user=request.user)[0]
			transaction.transdest = Entity.objects.filter(id=data['transdest'],user=request.user)[0]
			transaction.comments = data['comment']
			transaction.amount = data['amount']
			transaction.status = data['status']
			ledger.save_transaction_unique_datetime(transaction)
			# save the bankname if requested
			if data['saveBankname']:
				ledger.save_bankname(transaction, request.user)
			success = True
			message = 'Transaction updated successfully'
	else:
		message = 'Not authenticated'
	return JsonResponse({ 'success' : success, 'message': message })
	
def django_uploadtransactions(request):
	if request.user.is_authenticated:
		try:
			file = request.FILES['file']
			ledger.import_transactions(str(file.read()), request.user)
			return JsonResponse({ 'success': True, 'message': 'Transactions imported successfully' })
		except Exception as e:
			return JsonResponse({ 'success': False, 'message': str(e) })
	else:
		return JsonResponse({ 'success': False, 'message': 'Not authenticated' })
