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

class Categories extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			key: 1,
			categories: [],
			pageNumber: 1,
			pageSize: 10,
			pageCount: 1,
		};
	}

	componentDidMount() {
		this.loadCategories();
	}
	
	loadCategories(pageNumber, pageSize) {
		var self = this;
		
		if (!pageNumber) pageNumber = this.state.pageNumber;
		if (!pageSize) pageSize = this.state.pageSize;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_categories_page/',
			data: 'pageNumber=' + pageNumber + '&pageSize=' + pageSize
		}).done(function (data) {
			// update key so table will refresh
			data['key'] = self.state.key + 1;
			self.mergeState(data);
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});		
	}
		
	addCategory() {
		this.props.history.push(this.getParentMatchPath() + '/categories/new');
	}
	
	editCategory(categoryId) {
		this.props.history.push(this.getParentMatchPath() + '/categories/' + categoryId);
	}
	
	firstPage() {
		if (this.state.pageNumber != 1) {
			this.loadCategories(1, this.state.pageSize);
		}
	}
	
	previousPage() {
		if (this.state.pageNumber > 1) {
			this.loadCategories(this.state.pageNumber - 1, this.state.pageSize);
		}		
	}
	
	nextPage() {
		// server will correct if page number is too big
		this.loadCategories(this.state.pageNumber + 1, this.state.pageSize);		
	}
	
	lastPage() {
		// use -1 to indicate last page since we don't 
		// necessarily know how many pages there are now
		this.loadCategories(-1, this.state.pageSize);
	}
	
	setPageSize(pageSize) {
		if (pageSize != this.state.pageSize) {
			this.loadCategories(this.state.pageNumber, pageSize);
		}
	}
	
	setPageNumber(pageNumber) {
		if (pageNumber != this.state.pageNumber) {
			this.loadCategories(pageNumber, this.state.pageSize);
		}
	}

	render() {
		return (<>
			<Container fluid>
				<Row>
					<Col sm={12}>
						<CategoryTable categoriesComponent={this} key={this.state.key} categories={this.state.categories} 
						  propsPageNumber={this.state.pageNumber} propsPageSize={this.state.pageSize} pageCount={this.state.pageCount}/>
					</Col>
				</Row>
			</Container>
		</>);
	}
}

export default Categories;