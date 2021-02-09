import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from "react-bootstrap";
import LedgerComponent from "./LedgerComponent";
import $ from 'jquery';

class EditEntity extends LedgerComponent {
  	constructor(props) {
		super(props);

		this.state = {
			name: '',
			category: 0,
			categories: []
		}
	}

	componentDidMount() {
		var self = this;

		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_categories/',
		}).done(function (data) {
			self.mergeState({ categories: data });
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
		
		if (this.props.match.params.entityId != 'new') {
			$.ajax({
				type: 'get',
				url: this.getConfig().baseURL + 'django_getentity/',
				data: 'entityId=' + this.props.match.params.entityId
			}).done(function (entity) {
				self.mergeState({
					name: entity.name,
					category: entity.category_id
				});
			}).fail(function (jqXHR, textStatus, errorThrown) {
				self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
			});
		}
	}
	
	confirmDelete() {
		var self = this;
		
		this.showOKCancel('Confirm Delete', 'Are you sure you want to delete this entity?',
			(okButtonPressed) => { 
				if (okButtonPressed) {
					$.ajax({
						type: 'post',
						url: self.getConfig().baseURL + 'django_deleteentity/',
						data: JSON.stringify({ entityId: self.props.match.params.entityId })
					}).done(function (data) {
						if (data.success) {
							self.props.history.push(self.getParentMatchPath() + '/entities');
						} else {
							self.showAlert('Entity Delete Error', data.message);
						}
					}).fail(function (jqXHR, textStatus, errorThrown) {
						self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
					});					
				}
			}
		);
	}
	
	saveEntity(event) {
		var self = this;
		event.preventDefault();
		
		var entity = {
			id: this.props.match.params.entityId,
			name: this.state.name,
			category_id: this.state.category
		};
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'django_updateentity/',
			data: JSON.stringify(entity)
		}).done(function (data) {
			if (data.success) {
				self.props.history.push(self.getParentMatchPath() + '/entities');
			} else {
				self.showAlert('Entity Save Error', data.message);
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	render() {
		return (
			<Form onSubmit={(event) => this.saveEntity(event)}>
			    <Container fluid>
					<Row>
						<Col sm={{ offset: 2, span: 8 }}>
							<h2>Entity {this.props.match.params.transactionId}</h2>
						</Col>
					</Row>
					<Form.Group as={Row} controlId="name">
						<Col sm={2} />
						<Form.Label column sm={1}>Name</Form.Label>
						<Col sm={5}>
							<Form.Control type="text" value={this.state.name} onChange={(event) => this.mergeState({ name: event.target.value })}/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="category">
						<Col sm={2} />
						<Form.Label column sm={1}>Category</Form.Label>
						<Col sm={4}>
							<Form.Control as="select" value={this.state.category} onChange={(event) => this.mergeState({ category: event.target.value })}>
								{this.state.categories.map((category) => {
									return (
										<option key={category.pk} value={category.pk}>{category.fields.name}</option>
									);
								})}
							</Form.Control>
						</Col>
					</Form.Group>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" className="float-right"
								onClick={() => this.props.history.push(this.getParentMatchPath() + '/entities')}>
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

export default EditEntity;