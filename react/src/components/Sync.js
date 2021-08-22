import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from "react-datepicker";
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row, Table } from 'react-bootstrap';
import LedgerComponent from './LedgerComponent';
import CategoryTable from './CategoryTable';
import { useTable } from 'react-table';
import $ from 'jquery';

class Sync extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			test: ''
		};
	}

	componentDidMount() {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_test/'
		}).done(function (data) {
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
	
	render() {
		return (<>
			<Container fluid>
				<Row>
					<Col sm={12}>
						{this.state.test}
					</Col>
				</Row>
			</Container>
		</>);
	}
}

export default Sync;