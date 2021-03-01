import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from "react-datepicker";
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row, Table } from 'react-bootstrap';
import LedgerComponent from './LedgerComponent';
import LedgerTable from './LedgerTable';
import { useTable } from 'react-table';
import $ from 'jquery';

class Ledger extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		// get current date info
		var dtNow = new Date();
		var month = dtNow.getMonth();
		var year = dtNow.getFullYear();
		
		// construct date for 1st of month
		var firstOfMonth = new Date(year, month, 1);
		
		// construct date for last of month
		var lastOfMonth = new Date(firstOfMonth);
		lastOfMonth = new Date(lastOfMonth.setMonth(lastOfMonth.getMonth()+1));
		lastOfMonth = new Date(lastOfMonth.setDate(lastOfMonth.getDate()-1));
		
		this.state = {
			key: 1,
			account: 0,
			accounts: [],
			includeEstimates: false,
			estimatesFrom: firstOfMonth,
			estimatesTo: lastOfMonth,
			transactions: [],
			transactionTypes: [],
			pageNumber: 1,
			pageSize: 10,
			pageCount: 1,
			moveTransactionId: 0,
			moveSteps: 0,
			showUploadDialog: false,
			selectedFile: null
		};
	}
	
	formatDate(date) {
		return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
	}

	componentDidMount() {
		var self = this;
		
		// get user settings
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_settings/'
		}).done(function (data) {
			self.mergeState({ account: data.home_account }, () => {
				self.loadAccounts();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
		
	loadAccounts() {
		var self = this;
		
		// get list of accounts
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_entities/'
		}).done(function (data) {
			self.mergeState({ accounts: data }, () => {
				self.loadTransactionTypes();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	loadTransactionTypes() {
		var self = this;
		
		// get list of transaction types
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_transactiontypes/'
		}).done(function (data) {
			self.mergeState({ transactiontypes: data }, () => {
				self.loadTransactions(self.state.pageNumber, self.state.pageSize);
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});	
	}
	
	loadTransactions(pageNumber, pageSize) {
		var self = this;
		
		if (!pageNumber) pageNumber = this.state.pageNumber;
		if (!pageSize) pageSize = this.state.pageSize;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_ledger/',
			data: 'pageNumber=' + pageNumber + '&pageSize=' + pageSize + '&entity=' + 
				this.state.account + '&includeEstimates=' + this.state.includeEstimates + 
				'&estimatesFrom=' + this.formatDate(this.state.estimatesFrom) +
				'&estimatesTo=' + this.formatDate(this.state.estimatesTo)
		}).done(function (data) {
			data['key'] = self.state.key + 1;
			// loop over transactions
			for (var i = 0; i < data.transactions.length; i++) {
				// add transaction type to all displayed fields
				data.transactions[i].transdate = {
					transdate: data.transactions[i].transdate,
					status: data.transactions[i].status
				};
				data.transactions[i].sourcename = {
					sourcename: data.transactions[i].sourcename,
					status: data.transactions[i].status
				};
				data.transactions[i].destname = {
					destname: data.transactions[i].destname,
					status: data.transactions[i].status
				};
				data.transactions[i].comments = {
					comments: data.transactions[i].comments,
					status: data.transactions[i].status
				};
				data.transactions[i].amount = {
					amount: data.transactions[i].amount,
					status: data.transactions[i].status
				};
				data.transactions[i].balance = {
					balance: data.transactions[i].balance,
					status: data.transactions[i].status
				};
				data.transactions[i].reconciled = {
					reconciled: data.transactions[i].reconciled,
					status: data.transactions[i].status
				};
			}
			
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
		
	addTransaction() {
		this.props.history.push(this.getParentMatchPath() + '/transactions/new');
	}
	
	editTransaction(transId) {

		// look for suffix on the ID
		var suffixStartIdx = ('' + transId).indexOf('_');
		
		// if there is a suffix
		if (suffixStartIdx >= 0) {
			// strip it off so we are editing the original transaction
			transId = transId.substring(0, suffixStartIdx);
		}
		
		this.props.history.push(this.getParentMatchPath() + '/transactions/' + transId);
	}
	
	moveTransaction(transId, nSteps) {
		this.mergeState({ moveTransaction: transId, moveSteps: this.state.moveSteps + nSteps });
	}
	
	dropTransaction() {
		var self = this;
		var moveTrans = {
			transId: this.state.moveTransaction,
			nSteps: this.state.moveSteps
		};
		this.mergeState({ moveTransaction: 0, moveSteps: 0 }, () => {
			if (moveTrans.nSteps !== 0) {
				$.ajax({
					type: 'post',
					url: this.getConfig().baseURL + 'django_movetransaction/',
					data: JSON.stringify(moveTrans)
				}).done(function (data) {
					if (data.success) {
						self.loadTransactions(self.state.pageNumber, self.state.pageSize);
					} else {
						self.showAlert('Move Transaction Error', data.message);
					}
				}).fail(function (jqXHR, textStatus, errorThrown) {
					self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
				});
			}
		});
	}
	
	firstPage() {
		if (this.state.pageNumber != 1) {
			this.loadTransactions(1, this.state.pageSize);
		}
	}
	
	onFileChange(event) {
		var file = event.target.files[0];
		// reject files that are too large
		if (file.size > 10000000) file = null; 
		this.mergeState({ selectedFile: file });
	}
	
	previousPage() {
		if (this.state.pageNumber > 1) {
			this.loadTransactions(this.state.pageNumber - 1, this.state.pageSize);
		}		
	}
	
	nextPage() {
		// server will correct if page number is too big
		this.loadTransactions(this.state.pageNumber + 1, this.state.pageSize);		
	}
	
	lastPage() {
		// use -1 to indicate last page since we don't 
		// necessarily know how many pages there are now
		this.loadTransactions(-1, this.state.pageSize);
	}
	
	setPageSize(pageSize) {
		if (pageSize != this.state.pageSize) {
			this.loadTransactions(this.state.pageNumber, pageSize);
		}
	}
	
	setPageNumber(pageNumber) {
		if (pageNumber != this.state.pageNumber) {
			this.loadTransactions(pageNumber, this.state.pageSize);
		}
	}
	
	showUploadDialog() {
		this.mergeState({ showUploadDialog: true });
	}
	
	uploadFile() {
		var self = this;
		
		this.mergeState({ showUploadDialog: false }, () => {
			if (self.state.selectedFile !== null) {
				var filedata = new FormData();
				filedata.append('file', self.state.selectedFile);
				self.loadingOverlay(true, () => {
					$.ajax({
						type: 'post',
						url: self.getConfig().baseURL + 'django_uploadtransactions/',
						data: filedata,
						cache: false,
						contentType: false,
						processData: false
					}).done(function (data) {
						self.loadingOverlay(false, () => { 	
							if (data.success) {
								self.loadTransactions(self.state.pageNumber, self.state.pageSize);
							} else {
								self.showAlert('Upload Transactions Error', data.message);
							}
						});
					}).fail(function (jqXHR, textStatus, errorThrown) {
						self.loadingOverlay(false, () => { 	
							self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
						});
					});
				});
			}
		});
	}

	render() {
		return (<>
			<Container fluid>
				<Form inline onSubmit={(event) => { event.preventDefault(); this.loadTransactions(); }}>
					<Form.Label column sm={1}>Account</Form.Label>
					<Col sm={4}>
						<Form.Control as="select" value={this.state.account} onChange={(event) => this.mergeState({ account: event.target.value}, () => this.loadTransactions())}>
							{this.state.accounts.map((entity) => {
								return (
									<option key={entity.pk} value={entity.pk}>{entity.fields.name}</option>
								);										
							})}
						</Form.Control>
					</Col>
					<Col sm={2}>
						<Form.Check type="checkbox" label="Include estimates from" defaultChecked={this.state.includeEstimates} 
							onChange={(event) => this.mergeState({ includeEstimates: event.target.checked }, () => this.loadTransactions())} />
					</Col>
					<Col sm={2}>
						<DatePicker
						  selected={this.state.estimatesFrom}
						  onChange={(date) => this.mergeState({ estimatesFrom: date }, () => this.loadTransactions())}
						/>
					</Col>
					<Form.Label column sm={1}>to</Form.Label>
					<Col sm={2}>
						<DatePicker
						  selected={this.state.estimatesTo}
						  onChange={(date) => this.mergeState({ estimatesTo: date }, () => this.loadTransactions())}
						/>
					</Col>
				</Form>
				<Row>
					<Col sm={12}>
						<LedgerTable ledger={this} key={this.state.key} transactions={this.state.transactions} 
						  transactionTypes={this.state.transactiontypes} propsPageNumber={this.state.pageNumber} 
						  propsPageSize={this.state.pageSize} pageCount={this.state.pageCount}/>
					</Col>
				</Row>
			</Container>
			<Modal show={this.state.showUploadDialog} onHide={() => this.mergeState({ showUploadDialog: false})}>
				<Modal.Header closeButton>
					<Modal.Title>Upload Transactions</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<Form>
					  <Form.Group>
						<Form.File label="Select a .qfx file" onChange={(event) => this.onFileChange(event)} />
					  </Form.Group>
					</Form>
				</Modal.Body>

				<Modal.Footer>
					<Button variant="primary" onClick={() => this.uploadFile()}>OK</Button>
					<Button variant="secondary" onClick={() => this.mergeState({ showUploadDialog: false})}>Cancel</Button>
				</Modal.Footer>
			</Modal>
		</>);
	}
}

export default Ledger;