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
			transactions: []
		};
	}

	componentDidMount() {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'ledger/'
		}).done(function (ajaxData) {
			console.log(ajaxData[0]);
			self.setState({ transactions: ajaxData });
			console.log("transactions set!");
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	render() {
		return (
			<Container fluid>
				<Row>
					<Col sm={12}>
						<LedgerTable parent={this} transactions={this.state.transactions}/>
					</Col>
				</Row>
			</Container>
		);
	}
}

export default Ledger;