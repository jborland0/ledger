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
			transactions: [],
			pageNumber: 1,
			pageSize: 10,
			pageCount: 1
		};
	}

	componentDidMount() {
		this.loadTransactions(this.state.pageNumber, this.state.pageSize);
	}
	
	loadTransactions(pageNumber, pageSize) {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'ledger/',
			data: 'pageNumber=' + pageNumber + '&pageSize=' + pageSize
		}).done(function (data) {
			data['key'] = self.state.key + 1;
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
	
	addTransaction() {
		console.log('add transaction')
	}
	
	editTransaction(transId) {
		console.log('edit transaction ' + transId);
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
			console.log("set page size to " + pageSize);
			this.loadTransactions(this.state.pageNumber, pageSize);
		}
	}
	
	setPageNumber(pageNumber) {
		if (pageNumber != this.state.pageNumber) {
			console.log('set page number to ' + pageNumber);
			this.loadTransactions(pageNumber, this.state.pageSize);
		}
	}

	render() {
		return (
			<Container fluid>
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