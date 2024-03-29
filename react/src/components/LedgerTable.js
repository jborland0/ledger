import React from 'react';
import { useTable } from 'react-table';
import { useDrag, useDrop } from 'react-dnd';
import update from 'immutability-helper';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { ChevronDoubleLeft, ChevronDoubleRight, ChevronLeft, ChevronRight, GripHorizontal, PencilSquare, PlusSquare, Upload } from 'react-bootstrap-icons'

const DndTable = ({ ledger, columns, data }) => {
  const [records, setRecords] = React.useState(data)

  const getRowId = React.useCallback(row => {
    return row.id
  }, [])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    data: records,
    columns,
    getRowId
  })

  const moveRow = (dragIndex, hoverIndex) => {
    const dragRecord = records[dragIndex]
    setRecords(
      update(records, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragRecord],
        ],
      })
    )
	ledger.moveTransaction(dragRecord.id, dragIndex - hoverIndex)
  }

  return (
      <Table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              <th></th>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(
            (row, index) =>
              prepareRow(row) || (
                <DndRow
				  ledger={ledger}
                  index={index}
                  row={row}
                  moveRow={moveRow}
                  {...row.getRowProps()}
                />
              )
          )}
        </tbody>
      </Table>
  )
}

const DND_ITEM_TYPE = 'row'

const DndRow = ({ ledger, row, index, moveRow }) => {
  const dropRef = React.useRef(null)
  const dragRef = React.useRef(null)

  const [, drop] = useDrop({
    accept: DND_ITEM_TYPE,
    hover(item, monitor) {
      if (!dropRef.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }
      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect()
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      // Determine mouse position
      const clientOffset = monitor.getClientOffset()
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }
      // Time to actually perform the action
      moveRow(dragIndex, hoverIndex)
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    }
  })

  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: DND_ITEM_TYPE, index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
	end(item, monitor) {
		ledger.dropTransaction();
	}
  })

  const opacity = isDragging ? 0 : 1

  preview(drop(dropRef))
  drag(dragRef)

  return (
    <tr ref={dropRef} style={{ opacity }}>
      <td ref={dragRef}><GripHorizontal style={{ cursor: 'pointer' }} /></td>
      {row.cells.map(cell => {
        return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
      })}
    </tr>
  )
}

const LedgerTable = ({ ledger, transactions, transactionTypes, propsPageNumber, propsPageSize, pageCount }) => {
	
	const [pageNumber, setPageNumber] = React.useState(propsPageNumber);
	const [pageSize, setPageSize] = React.useState(propsPageSize);
	
	const formatString = (str, status) => {
		if (status === 1) {
			return (<div className='text-danger'>{str}</div>);
		} else if (status === 2) {
			return (<>{str}</>);
		} else {
			return (<div className='text-success'>{str}</div>);
		}
	};
	
	const formatDate = (dateobj) => {
		var dateOptions = { day: '2-digit', month: '2-digit', year: '2-digit' };
		var timeOptions = { hour12: true, hour: '2-digit', minute:'2-digit', second:'2-digit' };
		var date = new Date(dateobj.transdate);
		var datestr = date.toLocaleDateString('en', dateOptions) + " " + date.toLocaleTimeString('en', timeOptions);
		return formatString(datestr, dateobj.status);
	};
	
	const formatCurrency = (amount, status) => {
		var dollars = parseFloat(amount)/100.0;
		return formatString(dollars.toLocaleString('en-US', { currency: 'USD', minimumFractionDigits: 2 }), status);
	};
		
	const columns = React.useMemo(() => [
	    { Header: <PlusSquare style={{ cursor: 'pointer' }} onClick={() => ledger.addTransaction()} />, accessor: 'id', 
			Cell: props => <PencilSquare style={{ cursor: 'pointer' }} onClick={() => ledger.editTransaction(props.value)} /> },
		{ Header: 'Date', accessor: 'transdate', Cell: props => formatDate(props.value) },
		{ Header: 'From', accessor: 'sourcename', Cell: props => formatString(props.value.sourcename, props.value.status) },
		{ Header: 'To', accessor: 'destname', Cell: props => formatString(props.value.destname, props.value.status) },
		{ Header: 'Note', accessor: 'comments', Cell: props => formatString(props.value.comments, props.value.status) },
		{ Header: <div className='text-right'>Amount</div>, accessor: 'amount',
			Cell: props => <div className='text-right'>{formatCurrency(props.value.amount, props.value.status)}</div> },
		{ Header: <div className='text-right'>Balance</div>, accessor: 'balance',
			Cell: props => <div className='text-right'>{formatCurrency(props.value.balance, props.value.status)}</div> },
		{ Header: <div className='text-right'>Reconciled</div>, accessor: 'reconciled',
			Cell: props => <div className='text-right'>{formatCurrency(props.value.reconciled, props.value.status)}</div> }
	], []);	
	
	return (
	  <Container fluid>
		<Row>
		  <Col sm={12}>
		    <DndTable ledger={ledger} columns={columns} data={transactions} />
		  </Col>
		</Row>
	    <Row>
		  <Col sm={1}>
			<Button variant='secondary' onClick={() => ledger.showUploadDialog()}><Upload /></Button>
		  </Col>
		  <Col sm={10} className='d-flex justify-content-center'>
		    <Form inline>
			  <Form.Group controlId='pageNumber'>
				Page <Form.Control type="text" style={{ marginLeft: 5, marginRight: 5, width: 70 }} 
						value={pageNumber} onChange={(event) => setPageNumber(event.target.value)} 
						onBlur={() => ledger.setPageNumber(pageNumber)}
						onKeyPress={(event) => { if (event.charCode === 13) { ledger.setPageNumber(pageNumber) }}} /> of {pageCount}
			  </Form.Group>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginLeft: 10, marginRight: 4 }} onClick={() => ledger.firstPage()}>
				  <ChevronDoubleLeft />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 4 }} onClick={() => ledger.previousPage()}>
				  <ChevronLeft />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 4 }} onClick={() => ledger.nextPage()}>
				  <ChevronRight />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 10 }} onClick={() => ledger.lastPage()}>
				  <ChevronDoubleRight />
				</Button>
			  <Form.Group controlId='pageSize'>
				Show <Form.Control type="text" style={{ marginLeft: 5, marginRight: 5, width: 70 }}
						value={pageSize} onChange={(event) => setPageSize(event.target.value)}
						onBlur={() => ledger.setPageSize(pageSize)}
						onKeyPress={(event) => { if (event.charCode === 13) { ledger.setPageSize(pageSize) }}} /> per page
			  </Form.Group>
			</Form>
		  </Col>
		</Row>
      </Container>
	);
}

export default LedgerTable
