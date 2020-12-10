import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row, Table } from 'react-bootstrap';
import LedgerComponent from './LedgerComponent';
import LedgerTable from './LedgerTable';
import { useTable } from 'react-table';
import $ from 'jquery';

class Ledger extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			key: 1,
			account: 0,
			accounts: [],
			transactions: [],
			pageNumber: 1,
			pageSize: 10,
			pageCount: 1
		};
	}

	componentDidMount() {
		var self = this;
		
		// get user settings
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_settings/'
		}).done(function (data) {
			console.log(JSON.stringify(data));
			self.mergeState({ account: data.home_account }, () => {
				self.loadAccounts();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	loadAccount(newAccount) {
		this.mergeState({ account: newAccount }, () => {
			this.loadTransactions(this.state.pageNumber, this.state.pageSize);
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
				self.loadTransactions(self.state.pageNumber, self.state.pageSize);
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	loadTransactions(pageNumber, pageSize) {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_ledger/',
			data: 'pageNumber=' + pageNumber + '&pageSize=' + pageSize + '&entity=' + this.state.account
		}).done(function (data) {
			data['key'] = self.state.key + 1;
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
	
	reloadTransactions(event) {
		event.preventDefault();
		
		this.loadTransactions(this.state.pageNumber, this.state.pageSize);
	}
	
	addTransaction() {
		this.props.history.push(this.getParentMatchPath() + '/transactions/new');
	}
	
	editTransaction(transId) {
		this.props.history.push(this.getParentMatchPath() + '/transactions/' + transId);
	}
	
	firstPage() {
		if (this.state.pageNumber != 1) {
			this.loadTransactions(1, this.state.pageSize);
		}
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

	render() {
		return (
			<Container fluid>
				<Form inline onSubmit={(event) => this.reloadTransactions(event)}>
					<Form.Label column sm={1}>Account</Form.Label>
					<Col sm={4}>
						<Form.Control as="select" value={this.state.account} onChange={(event) => this.loadAccount(event.target.value)}>
							{this.state.accounts.map((entity) => {
								return (
									<option key={entity.pk} value={entity.pk}>{entity.fields.name}</option>
								);										
							})}
						</Form.Control>
					</Col>
				</Form>
				<Row>
					<Col sm={12}>
						<LedgerTable ledger={this} key={this.state.key}
						  transactions={this.state.transactions} propsPageNumber={this.state.pageNumber} 
						  propsPageSize={this.state.pageSize} pageCount={this.state.pageCount}/>
					</Col>
				</Row>
			</Container>
		);
	}
}

export default Ledger;