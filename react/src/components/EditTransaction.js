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
			status: '',
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
			self.mergeState({ entities: data });
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
		
		$.ajax({
			type: 'get',
			url: this.getConfig().baseURL + 'django_transactiontypes/',
		}).done(function (data) {
			self.mergeState({ types: data });
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});

		if (this.props.match.params.transactionId !== 'new') {
			$.ajax({
				type: 'get',
				url: this.getConfig().baseURL + 'django_gettransaction/',
				data: 'transId=' + this.props.match.params.transactionId
			}).done(function (data) {
				var transaction = data[0];
				self.mergeState({
					date: new Date(transaction.transdate),
					checknum: transaction.checknum,
					transsource: transaction.transsource_id,
					transdest: transaction.transdest_id,
					comment: transaction.comments,
					amount: transaction.amount,
					status: transaction.status
				});
			}).fail(function (jqXHR, textStatus, errorThrown) {
				self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
			});
		}
	}
	
	saveTransaction(event) {
		var self = this;
		event.preventDefault();
		
		console.log(this.state);
		
		/*
		$.ajax({
			type: 'post',
			url: this.getConfig().baseURL + 'login/',
			data: JSON.stringify(this.state)
		}).done(function (data) {
			self.setUser(data);
			self.mergeState({ username: '', password: '' });
			self.props.history.push(self.getParentMatchPath() + '/transactions');
		}).fail(function (jqXHR, textStatus, errorThrown) {
			self.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
		*/
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
							<Form.Control type="text" onChange={(event) => this.mergeState({ checknum: event.target.value })}/>
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
							<Form.Control type="text" onChange={(event) => this.mergeState({ comment: event.target.value })}/>
						</Col>
					</Form.Group>
					<Form.Group as={Row} controlId="amount">
						<Col sm={2} />
						<Form.Label column sm={1}>Amount</Form.Label>
						<Col sm={2}>
							<Form.Control type="text" onChange={(event) => this.mergeState({ amount: event.target.value })}/>
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
					<Row>
						<Col sm={{offset: 2, span: 8}} md={{offset: 3, span: 6}} lg={{offset: 4, span: 4}}>
							<Button variant="primary" type="submit" className="float-right">
								Cancel
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