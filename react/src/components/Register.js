import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from "react-bootstrap";
import LedgerComponent from "./LedgerComponent";
import $ from 'jquery';

class Register extends LedgerComponent {
  	constructor(props) {
		super(props);

		this.state = {
			registration: {
				username: '',
				password: '',
				passwordMatch: '',
				email: ''
			},
			messages: {}
		}
	}
	
	register(event) {
		var self = this;
		event.preventDefault();
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'django_register/',
			data: JSON.stringify(this.state.registration)
		}).done(function (data) {
			if (data.success) {
				self.mergeState({ registration: { username: '', password: '', passwordMatch: '', email: '' }, messages: {}});
				self.props.history.push(self.getParentMatchPath() + '/login');
			} else {
				self.mergeState({ messages: data.messages });
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	render() {
		return (
			<Form onSubmit={(event) => this.register(event)}>
				<Container fluid>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="username">
								<Form.Label>Username</Form.Label>
								<Form.Control type="text" value={this.state.registration.username} 
									onChange={(event) => this.mergeState({ registration: {username: event.target.value} })} 
									isInvalid={this.state.messages.username} />
								<Form.Control.Feedback type="invalid">
									{this.state.messages.username}
								</Form.Control.Feedback>
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="password">
								<Form.Label>Password</Form.Label>
								<Form.Control type="password" value={this.state.registration.password} 
									onChange={(event) => this.mergeState({ registration: {password: event.target.value} })} />
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="passwordMatch">
								<Form.Label>Retype Password</Form.Label>
								<Form.Control type="password" value={this.state.registration.passwordMatch} 
									onChange={(event) => this.mergeState({ registration: {passwordMatch: event.target.value} })} />
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="email">
								<Form.Label>Email</Form.Label>
								<Form.Control type="text" value={this.state.registration.email} 
									onChange={(event) => this.mergeState({ registration: { email: event.target.value} })} />
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" type="submit" className="float-right">
								Register
							</Button>
						</Col>
					</Row>
				</Container>
			</Form>
		);
	}
}

export default Register;