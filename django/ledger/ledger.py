from django.db import connection
from . import transactions
import copy
from datetime import datetime

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
			# generate the transactions represented by this row
			transaction = generate_transaction_list(user, entity, dict(zip(keys,row)), estimatesFrom, estimatesTo)
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
		print('starting with estimate date ' + estimateDate.strftime('%m/%d/%Y'))
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
			uniqueIdx = uniqueIdx + 1
			estimateDate = transactions.increment_estimate_date(estimateDate, transaction['status'])
	else:
		# return list with single transaction
		transList.append(transaction)
	return transList
