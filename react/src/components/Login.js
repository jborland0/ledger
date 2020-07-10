import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from "react-bootstrap";
import LedgerComponent from "./LedgerComponent";
import $ from 'jquery';

class Login extends LedgerComponent {
  	constructor(props) {
		super(props);

		this.state = {
			username: '',
			password: ''
		}
	}
	
	login(event) {
		var self = this;
		event.preventDefault();
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'login/',
			data: JSON.stringify(this.state)
		}).done(function (data) {
			self.setUser(data);
			self.mergeState({ username: '', password: '' });
			self.navigate('ledger');
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	render() {
		return (
			<Form onSubmit={(event) => this.login(event)}>
				<Container fluid>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="username">
								<Form.Label>Username</Form.Label>
								<Form.Control type="text" value={this.state.username} onChange={(event) => this.mergeState({username: event.target.value})} />
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Form.Group controlId="password">
								<Form.Label>Password</Form.Label>
								<Form.Control type="password" value={this.state.password} onChange={(event) => this.mergeState({password: event.target.value})} />
							</Form.Group>
						</Col>
					</Row>
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" type="submit" className="float-right">
								Log In
							</Button>
						</Col>
					</Row>
				</Container>
			</Form>
		);
	}
}

export default Login;