from datetime import datetime
from datetime import timedelta
from dateutil.relativedelta import relativedelta

class Status:
	NONE = 1
	RECONCILED = 2
	ESTIMATE = 3

    # recurring estimates and budgets in 128-255 range
	ESTIMATE_YEARLY = 128
	ESTIMATE_QUARTERLY = 129
	ESTIMATE_BIMONTHLY = 130
	ESTIMATE_MONTHLY = 131
	ESTIMATE_WEEKLY = 132       
	BUDGET_MONTHLY = 133
	ESTIMATE_BIWEEKLY = 134
	BUDGET_BIWEEKLY = 135
	ESTIMATE_4WEEKS = 136
	ESTIMATE_BIWEEKLY_1STOFMO = 137
	ESTIMATE_BIWEEKLY_2NDOFMO = 138

    # projections in 256-512
	PROJECTION = 256

def compare_date_only(dta, dtb):
	# compare dates with midnight for time
	dtaMidnight = datetime.strptime(dta.strftime('%m/%d/%Y'), '%m/%d/%Y')
	dtbMidnight = datetime.strptime(dtb.strftime('%m/%d/%Y'), '%m/%d/%Y')
	if dtaMidnight < dtbMidnight:
		return -1
	elif dtaMidnight > dtbMidnight:
		return 1
	else:
		return 0

def increment_estimate_date(estimateDate, status):
	if status == Status.ESTIMATE_YEARLY:
		return estimateDate + timedelta(years=1)
	elif status == Status.ESTIMATE_QUARTERLY:
		return estimateDate + relativedelta(months=+3)
	elif status == Status.ESTIMATE_BIMONTHLY:
		return estimateDate + relativedelta(months=+2)
	elif status == Status.ESTIMATE_MONTHLY or status == Status.BUDGET_MONTHLY:
		return estimateDate + relativedelta(months=+1)
	elif status == Status.ESTIMATE_WEEKLY:
		return estimateDate + timedelta(days=7)
	elif status == Status.ESTIMATE_BIWEEKLY or status == Status.BUDGET_BIWEEKLY:
		return estimateDate + timedelta(days=14)
	elif status == Status.ESTIMATE_BIWEEKLY_1STOFMO:
		intCurrentMonth = estimateDate.month
		newEstimateDate = estimateDate + timedelta(days=14)
		# keep adding 2 weeks until we are in the next month
		while intCurrentMonth == newEstimateDate.month:
			newEstimateDate = newEstimateDate + timedelta(days=14)
		return newEstimateDate
	elif status == Status.ESTIMATE_BIWEEKLY_2NDOFMO:
		intCurrentMonth = estimateDate.month
		newEstimateDate = estimateDate + timedelta(days=14)
		# if we have gone into the next month, add 2 more weeks so we are not the first
		if intCurrentMonth != newEstimateDate.month:
			newEstimateDate = newEstimateDate + timedelta(days=14)
		return newEstimateDate
	else:
		raise ValueError('Can''t increment transaction of type ' + status)

def insert_date_ordered(transactions, transaction):
	# binary search to find insertion point
	left = 0
	right = len(transactions)
	mid = (left + right) // 2
	while left != right:
		if transaction['transdate'] < transactions[mid]['transdate']:
			right = mid
		elif transaction['transdate'] > transactions[mid]['transdate']:
			left = mid + 1
		else:
			break
		mid = (left + right) // 2
	transactions.insert(mid, transaction)

def insert_date_ordered_desc(transactions, transaction):
	# binary search to find insertion point
	left = 0
	right = len(transactions)
	mid = (left + right) // 2
	while left != right:
		if transaction['transdate'] > transactions[mid]['transdate']:
			right = mid
		elif transaction['transdate'] < transactions[mid]['transdate']:
			left = mid + 1
		else:
			break
		mid = (left + right) // 2
	transactions.insert(mid, transaction)

def is_recurring_estimate(status):
	return (status == Status.ESTIMATE_YEARLY or
			status == Status.ESTIMATE_QUARTERLY or
			status == Status.ESTIMATE_BIMONTHLY or
			status == Status.ESTIMATE_MONTHLY or
			status == Status.ESTIMATE_WEEKLY or
			status == Status.ESTIMATE_BIWEEKLY or
			status == Status.ESTIMATE_BIWEEKLY_1STOFMO or
			status == Status.ESTIMATE_BIWEEKLY_2NDOFMO)
