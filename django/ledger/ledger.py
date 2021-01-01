from django.db import connection

def load_for_entity(user, entity, transactionTypes, estimatesFrom, estimatesTo): 
	transactions = []
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
			transactions.append(dict(zip(keys,row)))
	return transactions
