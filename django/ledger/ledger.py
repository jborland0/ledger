from django.db import connection
from . import transactions
import copy
from datetime import datetime
from datetime import timedelta
from django.utils import timezone
import pytz
from ledger.models import Entity, Ledger

def load_for_entity(user, entity, transactionTypes, estimatesFrom, estimatesTo): 
	transList = []
	with connection.cursor() as cursor:
		# create initial SQL param list
		sqlparams = [user, entity, entity]
		# create empty SQL transaction type list
		transTypeListSQL = ''
		if transactionTypes != None and len(transactionTypes) > 0:
			# append to parameter array and SQL list
			for transactionType in transactionTypes:
				sqlparams.append(transactionType)
				if len(transTypeListSQL) > 0:
					transTypeListSQL += ','
				transTypeListSQL += '%s'
			# compose 'in' clause
			transTypeListSQL = ' and status in (' + transTypeListSQL + ')'
		cursor.execute('SELECT * FROM ledger_ledgerdisplay WHERE user_id = %s and (transsource_id = %s or transdest_id = %s)' + transTypeListSQL + ' ORDER BY transdate desc', sqlparams)
		rows = cursor.fetchall()
		# turn rows into dictionaries so they can be converted to json
		keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','sourcename','destname')
		for row in rows:
			# create dictionary for transaction
			transdict = dict(zip(keys,row))
			# make transaction date timezone-aware
			transdict['transdate'] = timezone.make_aware(transdict['transdate'], pytz.UTC)
			# generate the transactions represented by this row
			transaction = generate_transaction_list(user, entity, transdict, estimatesFrom, estimatesTo)
			for trans in transaction:
				transactions.insert_date_ordered_desc(transList, trans)
		# second pass to calculate running balances
		balance = 0
		reconciledBalance = 0
		for trans in reversed(transList):
			# if the transfer is not to the same account
			if (trans['transsource_id'] != trans['transdest_id']):
				if (trans['transsource_id'] == entity):
					# money is leaving the account
					balance -= trans['amount']
					if (trans['status'] == transactions.Status.RECONCILED):
						reconciledBalance -= trans['amount']
				else:
					# money is entering the account
					balance += trans['amount']
					if (trans['status'] == transactions.Status.RECONCILED):
						reconciledBalance += trans['amount']
			trans['balance'] = balance
			trans['reconciled'] = reconciledBalance
	return transList

def generate_transaction_list(user, entity, transaction, estimatesFrom, estimatesTo):
	transList = []
	if transactions.is_recurring_estimate(transaction['status']):
		# increment estimate date until it's >= "from" date
		estimateDate = transaction['transdate']
		while transactions.compare_date_only(estimateDate, estimatesFrom) < 0:
			estimateDate = transactions.increment_estimate_date(estimateDate, transaction['status'])
		# append index to make sure id's are unique
		uniqueIdx = 0
		# add transactions until we are > "to" date
		while transactions.compare_date_only(estimateDate, estimatesTo) <= 0:
			# add copy of transaction
			newTrans = copy.deepcopy(transaction)
			newTrans['id'] = str(newTrans['id']) + '_' + str(uniqueIdx)
			newTrans['transdate'] = estimateDate
			transList.append(newTrans)
			uniqueIdx += 1
			estimateDate = transactions.increment_estimate_date(estimateDate, transaction['status'])
	elif transaction['status'] == transactions.Status.BUDGET_BIWEEKLY:
		# increment trans date until it's > today
		# that will be the end of our budgeting period
		budgetStop = transaction['transdate']
		midnightTomorrow = datetime.strptime((datetime.now() + timedelta(days=1)).strftime('%m/%d/%Y'), '%m/%d/%Y')
		while transactions.compare_date_only(budgetStop, midnightTomorrow) < 0:
			budgetStop = transactions.increment_estimate_date(budgetStop, transaction['status'])
		# find a date that is two weeks before budgetStop.
		# that is the beginning of our budgeting period.
		budgetStart = budgetStop - timedelta(days=14)
		# add up everything from the past two weeks with this same source &
		# destination. Subtract it from the budget, with a minimum of 
		# zero since we don't want the budget to go negative - that
		# would add phantom money to the account.
		uniqueIdx = 0
		while transactions.compare_date_only(budgetStop, estimatesTo) <= 0:
			# change of plans - don't just add up this destination, 
			# add up all destinations with the same category as this one.
			categoryId = Entity.objects.filter(id=transaction['transdest_id'])[0].category.id
			# rsCategory = stmt.executeQuery("SELECT id FROM ledger_entity WHERE category = " + categoryId);
			entities = Entity.objects.filter(category__id=categoryId)
			entityList = ''
			for entity in entities:
				if len(entityList) > 0:
					entityList += ','
				entityList += str(entity.id)
			sumSoFar = 0
			with connection.cursor() as cursor:
				cursor.execute('SELECT sum(amount) AS sum_so_far FROM ledger_ledger ' +
					'WHERE transsource_id = %s AND transdest_id IN (' + entityList + ') ' +
					'AND transdate >= %s AND transdate < %s AND id != %s',
					[transaction['transsource_id'], datetime.strptime(budgetStart.strftime('%m/%d/%Y'), '%m/%d/%Y'),
					datetime.strptime((budgetStop + timedelta(days=1)).strftime('%m/%d/%Y'), '%m/%d/%Y'), transaction['id']])
				for row in cursor:
					if row[0] != None:
						sumSoFar = row[0]
			remaining = transaction['amount'] - sumSoFar
			if remaining < 0:
				remaining = 0
			# insert copy of transaction with values for this budgeting period
			newTrans = copy.deepcopy(transaction)
			newTrans['id'] = str(newTrans['id']) + '_' + str(uniqueIdx)
			newTrans['transdate'] = budgetStop
			newTrans['amount'] = remaining
			transList.append(newTrans)
			uniqueIdx += 1
			# move to next budgeting period
			budgetStart = budgetStop
			budgetStop = budgetStart + timedelta(days=14)
	else:
		# return list with single transaction
		transList.append(transaction)
	return transList

def move_transaction_back(transId):
	# get the transaction we are moving
	transaction = Ledger.objects.get(id=transId)
	# get the previous transaction by trans date
	prev_trans = Ledger.objects.filter(transdate__lt=transaction.transdate).order_by('-transdate').first()
	# swap the dates
	temp_date = transaction.transdate
	transaction.transdate = prev_trans.transdate
	prev_trans.transdate = temp_date
	# save changes
	transaction.save()
	prev_trans.save()

def move_transaction_forward(transId):
	# get the transaction we are moving
	transaction = Ledger.objects.get(id=transId)
	# get the next transaction by trans date
	next_trans = Ledger.objects.filter(transdate__gt=transaction.transdate).order_by('transdate').first()
	# swap the dates
	temp_date = transaction.transdate
	transaction.transdate = next_trans.transdate
	next_trans.transdate = temp_date
	# save changes
	transaction.save()
	next_trans.save()
