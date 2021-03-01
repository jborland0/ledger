from django.db import connection
from django.db.models import Q
from . import transactions
import copy
from datetime import datetime
from datetime import timedelta
from django.utils import timezone
import pytz
from ledger.models import BanknameLookup, Entity, Ledger, TransactionType
import xml.etree.ElementTree as ET
from decimal import Decimal
import types

def bankname_to_regex(bankname):
	newBankName = ''
	for ch in bankname:
		if ch != '\r' and ch != '\n':
			if ch.isdigit():
				newBankName += '[0-9]'
			elif ch == '*':
				newBankName += '[*]'
			else:
				newBankName += ch
	return newBankName

def collect_unterminated_tag_names(xmlStr):
	unterminatedTagNames = []
	terminatedTagNames = []
	nextTagIdx = xmlStr.find('<')
	while nextTagIdx != -1:
		tagNameStartIdx = nextTagIdx + 1
		tagNameEndIdx = xmlStr.find('>', tagNameStartIdx)
		nextSearchStartIdx = tagNameEndIdx + 1
		if xmlStr[tagNameStartIdx:tagNameStartIdx + 1] != '/':
			tagName = xmlStr[tagNameStartIdx:tagNameEndIdx]
			if not tagName in unterminatedTagNames and not tagName in terminatedTagNames:
				endTag = '</' + tagName + '>'
				endTagIdx = xmlStr.find(endTag, nextSearchStartIdx)
				if endTagIdx == -1:
					unterminatedTagNames.append(tagName)
				else:
					terminatedTagNames.append(tagName)
		nextTagIdx = xmlStr.find('<', nextSearchStartIdx)
	return unterminatedTagNames

def fix_bank_xml(xmlStr):
	unterminatedTagNames = collect_unterminated_tag_names(xmlStr)
	for unterminatedTagName in unterminatedTagNames:
		xmlStr = terminate_tags(xmlStr, unterminatedTagName)
	return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + xmlStr

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
			category = Entity.objects.filter(id=transaction['transdest_id'],user=user)[0].category
			entities = Entity.objects.filter(category=category,user=user)
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

def get_user_settings(user):
	settings = types.SimpleNamespace()
	# find home and unknown accounts
	with connection.cursor() as cursor:
		cursor.execute("SELECT home_account_id, unknown_account_id FROM ledger_settings WHERE user_id = %s", [user.id])
		rows = cursor.fetchall()
		if len(rows) == 0:
			raise Exception('Could not determine home and unknown accounts')
		settings.homeAccount = Entity.objects.filter(id=rows[0][0],user=user)[0]
		settings.unknownAccount = Entity.objects.filter(id=rows[0][1],user=user)[0]
	settings.transactionTypeNone = TransactionType.objects.filter(id=1)[0]
	settings.transactionTypeReconciled = TransactionType.objects.filter(id=2)[0]
	return settings

def import_transactions(qfx, user):
	settings = get_user_settings(user)
	# create list of qfx transactions that haven't been imported yet
	qfxTransactions = qfx_to_transactions(qfx, user, settings)
	newTransactions = prune_imported_transactions(qfxTransactions, user)
	# get list of unreconciled transactions
	unreconciledTransactions = list(Ledger.objects.filter((Q(transdest=settings.homeAccount) | Q(transsource=settings.homeAccount)) & 
		Q(status=settings.transactionTypeNone.id) & Q(user=user)).order_by('-transdate'))
	# create pairs of matching transactions
	transactionPairs = pair_transactions(newTransactions, unreconciledTransactions)
	# TODO perhaps display pairs to user, allow editing, etc
	# for now... save the pairs
	save_transaction_pairs(transactionPairs, settings)

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
		cursor.execute('SELECT * FROM ledger_ledgerdisplay WHERE user_id = %s and (transsource_id = %s or transdest_id = %s)' + 
			transTypeListSQL + ' ORDER BY transdate desc', sqlparams)
		rows = cursor.fetchall()
		# turn rows into dictionaries so they can be converted to json
		keys = ('id','checknum','comments','amount','status','transdate','fitid','transdest_id','transsource_id','user_id','bankname','sourcename','destname')
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

def move_transaction_back(transId, user):
	# get the transaction we are moving
	transaction = Ledger.objects.get(id=transId)
	# get the previous transaction by trans date
	prev_trans = Ledger.objects.filter(transdate__lt=transaction.transdate,user=user).order_by('-transdate').first()
	# swap the dates
	temp_date = transaction.transdate
	transaction.transdate = prev_trans.transdate
	prev_trans.transdate = temp_date
	# save changes
	transaction.save()
	prev_trans.save()

def move_transaction_forward(transId, user):
	# get the transaction we are moving
	transaction = Ledger.objects.get(id=transId)
	# get the next transaction by trans date
	next_trans = Ledger.objects.filter(transdate__gt=transaction.transdate,user=user).order_by('transdate').first()
	# swap the dates
	temp_date = transaction.transdate
	transaction.transdate = next_trans.transdate
	next_trans.transdate = temp_date
	# save changes
	transaction.save()
	next_trans.save()

def pair_transactions(newTransactions, unreconciledTransactions):
	transactionPairs = []
	# for each new bank transaction
	for bankTrans in newTransactions:
		localMatch = None
		# for each local transaction in unreconciled transactions
		for localTrans in unreconciledTransactions:
			# if the amounts match
			if bankTrans.amount == localTrans.amount:
				# save the match
				localMatch = localTrans
		# if a match was found
		if localMatch is not None:
			# remove the match from the list of unreconciled transactions
			unreconciledTransactions.remove(localMatch)
			# add the pair to the list of transaction pairs
			transactionPairs.append(types.SimpleNamespace(localTrans=localMatch, bankTrans=bankTrans))
		else:
			# no match for bank transaction; add it by itself
			transactionPairs.append(types.SimpleNamespace(localTrans=None, bankTrans=bankTrans))
	# for all the leftover unreconciled transactions
	for localTrans in unreconciledTransactions:
		# create a transaction pair with just the local transaction
		unmatchedPair = types.SimpleNamespace(localTrans=localTrans, bankTrans=None)
		unmatchedPairIdx = -1
		# for each existing pair
		for i in range(len(transactionPairs)):
			transactionPair = transactionPairs[i]
			# pick a date from the transaction pair
			transPairDate = transactionPair.bankTrans.transdate if transactionPair.bankTrans is not None else transactionPair.localTrans.transdate
			# if unmatched local transaction is after this pair
			if unmatchedPair.localTrans.transdate > transPairDate:
				# use this index
				unmatchedPairIdx = i
				break
		# if a place to put the unmatched transaction was not found
		if unmatchedPairIdx == -1:
			# add it at the end
			transactionPairs.append(unmatchedPair)
		else:
			# add it at the specified index
			transactionPairs.insert(unmatchedPairIdx, unmatchedPair)
	return transactionPairs

def prune_imported_transactions(transactions, user):
	# create a list of fitids
	fitids = []
	for transaction in transactions:
		fitids.append(transaction.fitid)
	# select reconciled fitids from database
	reconciledTransactions = Ledger.objects.filter(fitid__in=fitids,user=user)
	reconciledFitids = []
	for reconciledTransaction in reconciledTransactions:
		reconciledFitids.append(reconciledTransaction.fitid)
	# filter out reconciled transactions
	unreconciledTransactions = [t for t in transactions if t.fitid not in reconciledFitids]
	return unreconciledTransactions

def qfx_to_transactions(qfx, user, settings):
	# locate top level tag and fix pseudo-xml so we can parse
	ofxOpenIdx = qfx.find('<OFX>')
	ofxCloseIdx = qfx.rfind('</OFX>')
	if ofxOpenIdx == -1 or ofxCloseIdx == -1:
		raise Exception('OFX tag not found in import file')
	ofxTag = qfx[ofxOpenIdx:ofxCloseIdx + 6]
	ofxXml = fix_bank_xml(ofxTag)
	doc = ET.ElementTree(ET.fromstring(ofxXml))
	transNodes = doc.findall('./BANKMSGSRSV1/STMTTRNRS/STMTRS/BANKTRANLIST/STMTTRN')
	transactions = []
	for transNode in transNodes:
		# parse transaction fields
		fitid = transNode.findall('./FITID')[0].text
		transdate = timezone.make_aware(datetime.strptime(transNode.findall('./DTPOSTED')[0].text.replace('[0:GMT]', 'UTC'), '%Y%m%d%H%M%S.%f%Z'), pytz.UTC)
		checknumNodes = transNode.findall('./CHECKNUM')
		checknum = checknumNodes[0].text if (len(checknumNodes) > 0) else None
		bankname = bankname_to_regex(transNode.findall('./MEMO')[0].text.strip())
		amount = int(Decimal(transNode.findall('./TRNAMT')[0].text) * 100)
		# try looking up entity by bankname
		banknameLookup = BanknameLookup.objects.filter(bankname=bankname,user=user).first()
		banknameEntity = settings.unknownAccount if banknameLookup is None else banknameLookup.entity
		# assign accounts depending on whether money is going in or out
		if amount < 0:
			transsource = settings.homeAccount
			transdest = banknameEntity
			amount = -amount
		else:
			transsource = banknameEntity
			transdest = settings.homeAccount
		transactions.append(Ledger(
			checknum = checknum,
			transsource = transsource,
			transdest = transdest,
			bankname = bankname,
			amount = amount,
			status = settings.transactionTypeNone.id,
			transdate = transdate,
			fitid = fitid,
			user = user
		))
	return transactions

def save_bankname(transaction, user):
	# entity with which to associate the bank name
	banknameEntity = None		
	# if there is a bank name
	if transaction.bankname is not None and transaction.bankname != '':
		settings = get_user_settings(user)
		# if this is going to a known account
		if transaction.transdest != settings.unknownAccount:
			# if the destination is the home account
			if transaction.transdest == settings.homeAccount:
				# if the source is not the Unknown or home account
				if transaction.transsource != settings.unknownAccount and transaction.transsource != settings.homeAccount:
					# associate the bank name with the source account
					banknameEntity = transaction.transsource
			else:
				# associate the bank name with the destination account
				banknameEntity = transaction.transdest
	# if an account was chosen for the bankname
	if banknameEntity is not None:
		bankname = None
		# look for existing bankname
		banknames = BanknameLookup.objects.filter(bankname=transaction.bankname,user=user)
		# if bankname was found
		if len(banknames) == 0:
			bankname = BanknameLookup(bankname=transaction.bankname,user=user)
		elif len(banknames) == 1:
			bankname = banknames[0]
		elif len(banknames) > 1:
			raise Exception('Expected 1 bank name but found ' + len(banknames))
	# if a bankname record was found/created
	if bankname is not None:
		# set entity and save
		bankname.entity = banknameEntity
		bankname.save()

def save_transaction_pairs(transactionPairs, settings):
	# for each transaction
	for transPair in transactionPairs:
		saveLocalTrans = False
		# if there is a local transaction
		if transPair.localTrans is not None:
			# if there is a bank transaction
			if transPair.bankTrans is not None:				
				# copy bank fitid
				transPair.localTrans.fitid = transPair.bankTrans.fitid
				# copy bank name
				transPair.localTrans.bankname = transPair.bankTrans.bankname
				# copy transaction date
				transPair.localTrans.transdate = transPair.bankTrans.transdate
				# indicate update
				saveLocalTrans = True
		else:
			# if there is a bank transaction
			if transPair.bankTrans is not None:
				# use bank transaction as new local transaction
				transPair.localTrans = transPair.bankTrans
				# indicate update transaction
				saveLocalTrans = True
		# if we need to update the transaction
		if saveLocalTrans:
			# if both source and destination are known
			if transPair.localTrans.transsource != settings.unknownAccount and transPair.localTrans.transdest != settings.unknownAccount:
				# mark transaction as reconciled
				transPair.localTrans.status = settings.transactionTypeReconciled.id
			# save the transaction
			save_transaction_unique_datetime(transPair.localTrans)

def save_transaction_unique_datetime(transaction):
	# if this transaction isn't in the database already
	if transaction.id is None:
		# while there exists a transaction with this datetime
		while Ledger.objects.filter(transdate=transaction.transdate,user=transaction.user).count() > 0:
			# add a second to the transaction's datetime
			transaction.transdate += timedelta(seconds=1)
	else:
		# while there exists a transaction with this datetime, and it isn't this one
		while Ledger.objects.filter(~Q(id=transaction.id) & Q(transdate=transaction.transdate) & Q(user=transaction.user)).count() > 0:
			# add a second to the transaction's datetime
			transaction.transdate += timedelta(seconds=1)
		
	# transaction is unique, save it
	transaction.save()

def terminate_tags(xmlStr, tagName):
	startTag = '<' + tagName + '>'
	endTag = '</' + tagName + '>'
	searchFrom = 0
	startTagIdx = xmlStr.find(startTag, searchFrom)
	strbuf = ''
	while startTagIdx != -1:
		nextTagIdx = xmlStr.find('<', startTagIdx + len(startTag))
		strbuf += xmlStr[searchFrom:nextTagIdx]
		strbuf += endTag
		searchFrom = nextTagIdx
		startTagIdx = xmlStr.find(startTag, searchFrom)
	strbuf += xmlStr[searchFrom:]
	return strbuf
