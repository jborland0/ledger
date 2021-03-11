import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Col, Container, Row } from "react-bootstrap";
import LedgerComponent from "./LedgerComponent";
import $ from 'jquery';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

class EditTransaction extends LedgerComponent {
  	constructor(props) {
		super(props);

		this.state = {
			date: new Date(),
			checknum: '',
			transsource: '',
			transdest: '',
			comment: '',
			amount: '',
			status: 1,
			bankname: null,
			saveBankname: false,
			entities: [],
			types: []
		}
	}

	componentDidMount() {
		var self = this;

		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_entities/',
		}).done(function (data) {
			self.mergeState({ entities: data }, () => {
				self.loadTransactionTypes();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	loadTransactionTypes() {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_transactiontypes/',
		}).done(function (data) {
			self.mergeState({ types: data }, () => {
				self.loadTransaction();
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}

	loadTransaction() {
		var self = this;
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_gettransaction/',
			data: 'transId=' + this.props.match.params.transactionId
		}).done(function (transaction) {
			self.mergeState({
				date: new Date(transaction.transdate + 'Z'),
				checknum: transaction.checknum,
				transsource: transaction.transsource_id,
				transdest: transaction.transdest_id,
				comment: transaction.comments,
				amount: self.formatCurrency(transaction.amount),
				status: transaction.status,
				bankname: transaction.bankname,
				saveBankname: (transaction.bankname !== null && transaction.bankname !== '')
			});
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	confirmDelete() {
		var self = this;
		
		this.showOKCancel('Confirm Delete', 'Are you sure you want to delete this transaction?',
			(okButtonPressed) => { 
				if (okButtonPressed) {
					$.ajax({
						type: 'post',
						url: self.getConfig().baseURL + 'django_deletetransaction/',
						data: JSON.stringify({ transId: self.props.match.params.transactionId })
					}).done(function (data) {
						if (data.success) {
							self.props.history.push(self.getParentMatchPath() + '/transactions');
						} else {
							self.showAlert('Transaction Delete Error', data.message);
						}
					}).fail(function (jqXHR, textStatus, errorThrown) {
						self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
					});					
				}
			}
		);
	}
	
	formatCurrency(pennies) {
		var fltPennies = parseFloat(pennies);
		if (isNaN(fltPennies)) {
			// not a number, return as is
			return pennies;
		} else {
			var dollars = fltPennies/100.0;
			return dollars.toLocaleString('en-US', { currency: 'USD', minimumFractionDigits: 2 });
		}
	}

	parseCurrency(dollars) {
		var fltDollars = parseFloat(dollars.replace(',', ''));
		if (isNaN(fltDollars)) {
			// not a number, return as is
			return dollars;
		} else {
			return Math.round(fltDollars * 100.0);
		}
	}
	
	saveTransaction(event) {
		var self = this;
		event.preventDefault();
		
		// create object representing just the transaction
		var transaction = {
			id: this.props.match.params.transactionId,
			transdate: this.state.date,
			checknum: this.state.checknum,
			transsource: this.state.transsource,
			transdest: this.state.transdest,
			comment: this.state.comment,
			amount: this.parseCurrency(this.state.amount),
			status: this.state.status,
			saveBankname: this.state.saveBankname
		};
		
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'django_updatetransaction/',
			data: JSON.stringify(transaction)
		}).done(function (data) {
			if (data.success) {
				self.props.history.push(self.getParentMatchPath() + '/transactions');
			} else {
				self.showAlert('Transaction Save Error', data.message);
			}
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}
	
	renderBankname() {
		if (this.state.bankname != null && this.state.bankname !== '') {
			return (<>
				<Form.Group as={Row}>
					<Col sm={2} />
					<Form.Label column sm={1}>Bank&nbsp;Name</Form.Label>
					<Col sm={5} className='mt-2'>{this.state.bankname}</Col>
				</Form.Group>
				<Form.Group as={Row} controlId="saveBankname">
					<Col sm={3} />
					<Col sm={5}>
						<Form.Check type="checkbox" label="Use bank name to match future transactions"
							checked={this.state.saveBankname} onChange={(event) => this.mergeState({ saveBankname: event.target.checked })}/>
					</Col>
				</Form.Group>
			</>);
		}
	}

	render() {
		return (
			<Form onSubmit={(event) => this.saveTransaction(event)}>
			    <Container fluid>
					<Row>
						<Col sm={{ offset: 2, span: 8 }}>
							<h2>Transaction {this.props.match.params.transactionId}</h2>
						</Col>
					</Row>
					<Form.Group as={Row} controlId="date">
						<Col sm={2} />
						<Form.Label column sm={1}>Date</Form.Label>
						<Col sm={9} style={{ paddingTop: '4px' }}>
							<DatePicker
							  selected={this.state.date}
							  onChange={(date) => this.mergeState({ date: date })}
							  showTimeSelect
							  dateFormat="Pp"
							/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="checknum">
						<Col sm={2} />
						<Form.Label column sm={1}>Check&nbsp;#</Form.Label>
						<Col sm={2}>
							<Form.Control type="text" value={this.state.checknum} onChange={(event) => this.mergeState({ checknum: event.target.value })}/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="transsource">
						<Col sm={2} />
						<Form.Label column sm={1}>From</Form.Label>
						<Col sm={4}>
							<Form.Control as="select" value={this.state.transsource} onChange={(event) => this.mergeState({ transsource: event.target.value })}>
								{this.state.entities.map((entity) => {
									return (
										<option key={entity.pk} value={entity.pk}>{entity.fields.name}</option>
									);										
								})}
							</Form.Control>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="transdest">
						<Col sm={2} />
						<Form.Label column sm={1}>To</Form.Label>
						<Col sm={4}>
							<Form.Control as="select" value={this.state.transdest} onChange={(event) => this.mergeState({ transdest: event.target.value })}>
								{this.state.entities.map((entity) => {
									return (
										<option key={entity.pk} value={entity.pk}>{entity.fields.name}</option>
									);
								})}
							</Form.Control>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="comment">
						<Col sm={2} />
						<Form.Label column sm={1}>Comment</Form.Label>
						<Col sm={5}>
							<Form.Control type="text" value={this.state.comment} onChange={(event) => this.mergeState({ comment: event.target.value })}/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="amount">
						<Col sm={2} />
						<Form.Label column sm={1}>Amount</Form.Label>
						<Col sm={2}>
							<Form.Control type="text" value={this.state.amount} onChange={(event) => this.mergeState({ amount: event.target.value })}/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="status">
						<Col sm={2} />
						<Form.Label column sm={1}>Status</Form.Label>
						<Col sm={4}>
							<Form.Control as="select" value={this.state.status} onChange={(event) => this.mergeState({ status: event.target.value })}>
								{this.state.types.map((transtype) => {
									return (
										<option key={transtype.pk} value={transtype.pk}>{transtype.fields.description}</option>
									);
								})}
							</Form.Control>
						</Col>
					</Form.Group>
					{this.renderBankname()}
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" className="float-right"
								onClick={() => this.props.history.push(this.getParentMatchPath() + '/transactions')}>
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

export default EditTransaction;