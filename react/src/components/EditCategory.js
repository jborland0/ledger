import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from "react-bootstrap";
import LedgerComponent from "./LedgerComponent";
import $ from 'jquery';

class EditCategory extends LedgerComponent {
  	constructor(props) {
		super(props);

		this.state = {
			name: '',
		}
	}

	componentDidMount() {
		var self = this;
		
		if (this.props.match.params.categoryId != 'new') {
			$.ajax({
				type: 'get',
				url: this.getConfig().baseURL + 'django_getcategory/',
				data: 'categoryId=' + this.props.match.params.categoryId
			}).done(function (category) {
				self.mergeState({
					name: category.name
				});
			}).fail(function (jqXHR, textStatus, errorThrown) {
				self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
			});
		}
	}
	
	confirmDelete() {
		var self = this;
		
		this.showOKCancel('Confirm Delete', 'Are you sure you want to delete this category?',
			(okButtonPressed) => { 
				if (okButtonPressed) {
					$.ajax({
						type: 'post',
						url: self.getConfig().baseURL + 'django_deletecategory/',
						data: JSON.stringify({ categoryId: self.props.match.params.categoryId })
					}).done(function (data) {
						if (data.success) {
							self.props.history.push(self.getParentMatchPath() + '/categories');
						} else {
							self.showAlert('Category Delete Error', data.message);
						}
					}).fail(function (jqXHR, textStatus, errorThrown) {
						self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
					});					
				}
			}
		);
	}
	
	saveCategory(event) {
		var self = this;
		event.preventDefault();
		
		var category = {
			id: this.props.match.params.categoryId,
			name: this.state.name
		};
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'django_updatecategory/',
			data: JSON.stringify(category)
		}).done(function (data) {
			if (data.success) {
				self.props.history.push(self.getParentMatchPath() + '/categories');
			} else {
				self.showAlert('Category Save Error', data.message);
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	render() {
		return (
			<Form onSubmit={(event) => this.saveCategory(event)}>
			    <Container fluid>
					<Row>
						<Col sm={{ offset: 2, span: 8 }}>
							<h2>Category {this.props.match.params.categoryId}</h2>
						</Col>
					</Row>
					<Form.Group as={Row} controlId="name">
						<Col sm={2} />
						<Form.Label column sm={1}>Name</Form.Label>
						<Col sm={5}>
							<Form.Control type="text" value={this.state.name} onChange={(event) => this.mergeState({ name: event.target.value })}/>
						</Col>
					</Form.Group>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" className="float-right"
								onClick={() => this.props.history.push(this.getParentMatchPath() + '/categories')}>
								Cancel
							</Button>
							<Button variant="primary" className="float-right" style={{ marginRight: '10px'}}
								onClick={() => this.confirmDelete()}>
								Delete
							</Button>
							<Button variant="primary" type="submit" className="float-right" style={{ marginRight: '10px'}}>
								Save
							</Button>
						</Col>
					</Row>
				</Container>
			</Form>
		);
	}
}

export default EditCategory;