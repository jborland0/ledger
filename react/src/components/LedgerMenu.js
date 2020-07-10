import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from 'react-bootstrap';
import LedgerComponent from './LedgerComponent';
import Ledger from './Ledger';
import Login from './Login';
import Register from './Register';
import $ from 'jquery';

class LedgerMenu extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			alert: {
				title: "",
				content: "",
				callback: null,
				show: false
			},
			content: 'login',
			user: {
				id: -1,
				username: ''
			}
		}
		
		var self = this;
		$.ajaxSetup({
			beforeSend: function(xhr, settings) {
				if (settings.type=='POST') {
					xhr.setRequestHeader("X-CSRFToken", self.getCookie('csrftoken'));
				}
			},
			cache: false,
			xhrFields: {
			   withCredentials: true
			}
		});
	}
	
	componentDidMount() {
		var self = this;

		$.ajax({
			type: "get",
			url: this.getConfig().baseURL + "getuser/",
		}).done(function (user) {
			if (user.id == -1) {
				self.mergeState({ user: user, content: 'login' });
			} else {
				self.mergeState({ user: user, content: 'ledger' });
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	logOut() {
		var self = this;
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'logout/',
			data: JSON.stringify(this.state.user)
		}).done(function (data) {
			if (data.success) {
				self.mergeState({ user: { id: -1, username: '' }});
				self.navigate('login');
			} else {
				self.showAlert('Server Error', data.message);
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	showAlert(title, content, callback) {		
		this.mergeState({
			alert: {
				title: title,
				content: content,
				callback: callback,
				show: true
			}
		});
	}

	onAlertClose() {
		var callback = this.state.alert.callback;
		
		this.mergeState({
			alert: {
				title: "",
				content: "",
				callback: null,
				show: false
			}
		});
		
		if (callback) callback();
	}
	
	renderAccountLinks() {
		if (this.state.user.id == -1) {
			return(<>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.mergeState({ content: 'register' })}>Register</Nav.Link>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.mergeState({ content: 'login' })}>Log In</Nav.Link>
			</>)
		} else {
			return(<>
				<Nav.Link href='#' onSelect={() => this.logOut()}>Log Out</Nav.Link>
			</>);			
		}
	}
	
	renderContent() {
		if (this.state.content == 'ledger') {
			return (<Ledger parent={this} />);
		} else if (this.state.content == 'login') {
			return (<Login parent={this} />);
		} else if (this.state.content == 'register') {
			return (<Register parent={this} />);
		}
	}
 
	render() {
		return (
			<>
				<Navbar bg="dark" variant="dark">
					<Navbar.Brand href="/">
						<img
							alt=""
							src={require('../images/mosquito_tiny.png')}
							className="d-inline-block"
							style={{marginTop: -7}}
						/>{' '}
						Ledger
					</Navbar.Brand>
					<Nav className="justify-content-end" style={{ width: "100%" }}>
						{this.renderAccountLinks()}
					</Nav>
				</Navbar>
				<div style={{height: '10px', width: '100%'}}></div>
				{this.renderContent()}
				<Modal show={this.state.alert.show} onHide={() => this.onAlertClose()}>
					<Modal.Header closeButton>
						<Modal.Title>{this.state.alert.title}</Modal.Title>
					</Modal.Header>

					<Modal.Body>
						<p>{this.state.alert.content}</p>
					</Modal.Body>

					<Modal.Footer>
						<Button variant="primary" onClick={() => this.onAlertClose()}>OK</Button>
					</Modal.Footer>
				</Modal>
			</>
		)
	}
}

export default LedgerMenu;