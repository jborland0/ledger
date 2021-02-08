import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from "react-datepicker";
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row, Table } from 'react-bootstrap';
import LedgerComponent from './LedgerComponent';
import EntityTable from './EntityTable';
import { useTable } from 'react-table';
import $ from 'jquery';

class Entities extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			key: 1,
			category: 0,
			categories: [],
			entities: [],
			homeAccount: 0,
			pageNumber: 1,
			pageSize: 10,
			pageCount: 1,
			unknownAccount: 0
		};
	}

	componentDidMount() {
		var self = this;
		
		// get user settings
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_settings/'
		}).done(function (data) {
			self.mergeState({ 
				homeAccount: data.home_account,
				unknownAccount: data.unknown_account
			}, () => {
				self.loadCategories();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	loadCategories()
	{
		var self = this;
		
		// get list of categories
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_categories/'
		}).done(function (data) {
			// add "all" option to front of category selector
			data.unshift({ pk: 0, fields: { name: '(all)' }});
			self.mergeState({ categories: data }, () => {
				self.loadEntities();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	loadEntities(pageNumber, pageSize) {
		var self = this;
		
		if (!pageNumber) pageNumber = this.state.pageNumber;
		if (!pageSize) pageSize = this.state.pageSize;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_entities_page/',
			data: 'pageNumber=' + pageNumber + '&pageSize=' + pageSize + '&category=' + this.state.category
		}).done(function (data) {
			// update key so table will refresh
			data['key'] = self.state.key + 1;
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
		
	addEntity() {
		this.props.history.push(this.getParentMatchPath() + '/entities/new');
	}
	
	editEntity(entityId) {
		this.props.history.push(this.getParentMatchPath() + '/entities/' + entityId);
	}
	
	firstPage() {
		if (this.state.pageNumber != 1) {
			this.loadEntities(1, this.state.pageSize);
		}
	}
	
	previousPage() {
		if (this.state.pageNumber > 1) {
			this.loadEntities(this.state.pageNumber - 1, this.state.pageSize);
		}		
	}
	
	nextPage() {
		// server will correct if page number is too big
		this.loadEntities(this.state.pageNumber + 1, this.state.pageSize);		
	}
	
	lastPage() {
		// use -1 to indicate last page since we don't 
		// necessarily know how many pages there are now
		this.loadEntities(-1, this.state.pageSize);
	}
	
	setPageSize(pageSize) {
		if (pageSize != this.state.pageSize) {
			this.loadEntities(this.state.pageNumber, pageSize);
		}
	}
	
	setPageNumber(pageNumber) {
		if (pageNumber != this.state.pageNumber) {
			this.loadEntities(pageNumber, this.state.pageSize);
		}
	}

	render() {
		return (<>
			<Container fluid>
				<Form inline onSubmit={(event) => { event.preventDefault(); this.loadTransactions(); }}>
					<Form.Label column sm={1}>Category</Form.Label>
					<Col sm={4}>
						<Form.Control as="select" value={this.state.category} onChange={(event) => this.mergeState({ category: event.target.value}, () => this.loadEntities())}>
							{this.state.categories.map((category) => {
								return (
									<option key={category.pk} value={category.pk}>{category.fields.name}</option>
								);										
							})}
						</Form.Control>
					</Col>
				</Form>
				<Row>
					<Col sm={12}>
						<EntityTable entitiesComponent={this} key={this.state.key} entities={this.state.entities} 
						  propsPageNumber={this.state.pageNumber} propsPageSize={this.state.pageSize} pageCount={this.state.pageCount}/>
					</Col>
				</Row>
			</Container>
		</>);
	}
}

export default Entities;