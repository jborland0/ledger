import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Col, Container, Row, Table } from "react-bootstrap";
import { useTable } from 'react-table';
import $ from 'jquery';

function LedgerTable(props) {

	const [transactions, setTransactions] = useState([]);

	useEffect(() => {
		$.ajax({
			type: 'get',
			url: props.parent.getConfig().baseURL + 'ledger/'
		}).done(function (ajaxData) {
			console.log(ajaxData[0]);
			setTransactions(ajaxData);
			console.log("transactions set!");
		}).fail(function (jqXHR, textStatus, errorThrown) {
			props.parent.showAlert('Server Error', 'Server returned a status of ' + jqXHR.status);
		});
	}, []);
	
	const data = React.useMemo(() => transactions, [transactions]);
		
	const columns = React.useMemo(() => [
		{ Header: 'Date', accessor: 'transdate' },
		{ Header: 'From', accessor: 'sourcename' },
		{ Header: 'To', accessor: 'destname' },
		{ Header: 'Note', accessor: 'comments' },
		{ Header: 'Amount', accessor: 'amount' },
		{ Header: 'Balance', accessor: 'balance' },
		{ Header: 'Reconciled', accessor: 'reconciled' }
	], []);
	
	const {
		getTableProps,
		getTableBodyProps,
		headerGroups,
		rows,
		prepareRow,
	} = useTable({ columns, data });
	
	return (
		<Table striped bordered hover size="sm" {...getTableProps()}>
			<thead>
				{headerGroups.map(headerGroup => (
					<tr {...headerGroup.getHeaderGroupProps()}>
						{headerGroup.headers.map(column => (
							<th {...column.getHeaderProps()}>
								{column.render('Header')}
							</th>
						))}
					</tr>
				))}
			</thead>
			<tbody {...getTableBodyProps()}>
				{rows.map(row => {
					prepareRow(row)
					return (
						<tr {...row.getRowProps()}>
							{row.cells.map(cell => {
								return (
									<td {...cell.getCellProps()}>
										{cell.render('Cell')}
									</td>
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</Table>
	);
}

export default LedgerTable;