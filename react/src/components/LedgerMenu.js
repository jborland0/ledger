import React from 'react';
import { Switch, Route } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from 'react-bootstrap';
import Categories from './Categories';
import EditCategory from './EditCategory';
import Entities from './Entities';
import EditEntity from './EditEntity';
import LedgerComponent from './LedgerComponent';
import Ledger from './Ledger';
import Login from './Login';
import Register from './Register';
import Sync from './Sync';
import EditTransaction from './EditTransaction';
import $ from 'jquery';
import LoadingOverlay from 'react-loading-overlay-ts'

class LedgerMenu extends LedgerComponent {
  	constructor(props) {
		super(props);
		
		this.state = {
			alert: {
				title: '',
				content: '',
				canCancel: false,
				callback: null,
				show: false
			},
			overlay: false,
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
			url: this.getConfig().baseURL + "django_getuser/",
		}).done(function (user) {
			if (user.id == -1) {
				self.mergeState({ user: user });
				self.props.history.push(self.props.match.path + '/login');
			} else {
				self.mergeState({ user: user });
				self.props.history.push(self.props.match.path + '/transactions');
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	logOut() {
		var self = this;
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'django_logout/',
			data: JSON.stringify(this.state.user)
		}).done(function (data) {
			if (data.success) {
				self.mergeState({ user: { id: -1, username: '' }});
				self.props.history.push(self.props.match.path + '/login');
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
				canCancel: false,
				callback: callback,
				show: true
			}
		});
	}
	
	showOKCancel(title, content, callback) {
		this.mergeState({
			alert: {
				title: title,
				content: content,
				canCancel: true,
				callback: callback,
				show: true
			}
		});
	}		

	onAlertClose(okButtonPressed) {
		// save local values so we can reset state
		var callback = this.state.alert.callback;
		var canCancel = this.state.alert.canCancel;
		
		this.mergeState({
			alert: {
				title: '',
				content: '',
				canCancel: false,
				callback: null,
				show: false
			}
		}, () => {
			if (callback) {
				if (canCancel) {
					callback(okButtonPressed);
				} else {
					callback();
				}
			}			
		});
	}
	
	renderLedgerLinks() {
		if (this.state.user.id != -1) {
			return(<>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/transactions')}>Transactions</Nav.Link>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/entities')}>Entities</Nav.Link>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/categories')}>Categories</Nav.Link>
				{/*<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/sync')}>Sync</Nav.Link>*/}
			</>);
		}
	}
	
	renderAccountLinks() {
		if (this.state.user.id == -1) {
			return(<>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/register')}>Register</Nav.Link>
				<Nav.Link href='#' onSelect={(eventKey, event) => this.props.history.push(this.props.match.path + '/login')}>Log In</Nav.Link>
			</>)
		} else {
			return(<>
				<Nav.Link href='#' onSelect={() => this.logOut()}>Log Out</Nav.Link>
			</>);			
		}
	}
	
	renderCancelButton() {
		if (this.state.alert.canCancel) {
			return (<Button variant="primary" onClick={() => this.onAlertClose(false)}>Cancel</Button>);
		}
	}
 
	render() {
		return (
			<LoadingOverlay active={this.state.overlay} spinner>
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
					<Nav style={{ width: "50%" }}>
						{this.renderLedgerLinks()}
					</Nav>
					<Nav className="justify-content-end" style={{ width: "50%" }}>
						{this.renderAccountLinks()}
					</Nav>
				</Navbar>
				<div style={{height: '10px', width: '100%'}}></div>
				<Switch>
					<Route path={this.props.match.path + '/transactions/:transactionId'} render={props => <EditTransaction parent={this} {...props} />} />
					<Route path={this.props.match.path + '/entities/:entityId'} render={props => <EditEntity parent={this} {...props} />} />
					<Route path={this.props.match.path + '/categories/:categoryId'} render={props => <EditCategory parent={this} {...props} />} />
					<Route exact path={this.props.match.path + '/transactions'} render={props => <Ledger parent={this} {...props} />} />
					<Route exact path={this.props.match.path + '/entities'} render={props => <Entities parent={this} {...props} />} />
					<Route exact path={this.props.match.path + '/categories'} render={props => <Categories parent={this} {...props} />} />
					{/*<Route exact path={this.props.match.path + '/sync'} render={props => <Sync parent={this} {...props} />} />*/}
					<Route exact path={this.props.match.path + '/login'} render={props => <Login parent={this} {...props} />} />
					<Route exact path={this.props.match.path + '/register'} render={props => <Register parent={this} {...props} />} />
				</Switch>
				<Modal show={this.state.alert.show} onHide={() => this.onAlertClose(false)}>
					<Modal.Header closeButton>
						<Modal.Title>{this.state.alert.title}</Modal.Title>
					</Modal.Header>

					<Modal.Body>
						<p>{this.state.alert.content}</p>
					</Modal.Body>

					<Modal.Footer>
						<Button variant="primary" onClick={() => this.onAlertClose(true)}>OK</Button>
						{this.renderCancelButton()}
					</Modal.Footer>
				</Modal>
			</LoadingOverlay>
		)
	}
}

export default LedgerMenu;