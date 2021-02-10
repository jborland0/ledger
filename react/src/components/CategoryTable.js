import React from 'react';
import { useTable } from 'react-table';
import { useDrag, useDrop } from 'react-dnd';
import update from 'immutability-helper';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { ChevronDoubleLeft, ChevronDoubleRight, ChevronLeft, ChevronRight, GripHorizontal, PencilSquare, PlusSquare, Upload } from 'react-bootstrap-icons'

const DndTable = ({ categoriesComponent, columns, data }) => {
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
	categoriesComponent.moveCategory(dragRecord.id, dragIndex - hoverIndex)
  }

  return (
      <Table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
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
				  categoriesComponent={categoriesComponent}
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

const DndRow = ({ categoriesComponent, row, index, moveRow }) => {
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
    },
	drop(item, monitor) {
		categoriesComponent.dropCategory()
	}
  })

  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: DND_ITEM_TYPE, index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0 : 1

  preview(drop(dropRef))
  drag(dragRef)

  return (
    <tr ref={dropRef} style={{ opacity }}>
      {row.cells.map(cell => {
        return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
      })}
    </tr>
  )
}

const CategoryTable = ({ categoriesComponent, categories, propsPageNumber, propsPageSize, pageCount }) => {
	
	const [pageNumber, setPageNumber] = React.useState(propsPageNumber);
	const [pageSize, setPageSize] = React.useState(propsPageSize);
		
	const columns = React.useMemo(() => [
	    { Header: <PlusSquare style={{ cursor: 'pointer' }} onClick={() => categoriesComponent.addCategory()} />, accessor: 'id', 
			Cell: props => <PencilSquare style={{ cursor: 'pointer' }} onClick={() => categoriesComponent.editCategory(props.value)} /> },
		{ Header: 'Name', accessor: 'name' }
	], []);	
	
	return (
	  <Container fluid>
		<Row>
		  <Col sm={12}>
		    <DndTable categoriesComponent={categoriesComponent} columns={columns} data={categories} />
		  </Col>
		</Row>
	    <Row>
		  <Col sm={12} className='d-flex justify-content-center'>
		    <Form inline>
			  <Form.Group controlId='pageNumber'>
				Page <Form.Control type="text" style={{ marginLeft: 5, marginRight: 5, width: 70 }} 
						value={pageNumber} onChange={(event) => setPageNumber(event.target.value)} 
						onBlur={() => categoriesComponent.setPageNumber(pageNumber)}
						onKeyPress={(event) => { if (event.charCode === 13) { categoriesComponent.setPageNumber(pageNumber) }}} /> of {pageCount}
			  </Form.Group>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginLeft: 10, marginRight: 4 }} onClick={() => categoriesComponent.firstPage()}>
				  <ChevronDoubleLeft />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 4 }} onClick={() => categoriesComponent.previousPage()}>
				  <ChevronLeft />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 4 }} onClick={() => categoriesComponent.nextPage()}>
				  <ChevronRight />
				</Button>
				<Button variant='outline-dark' style={{ paddingTop: 3, marginRight: 10 }} onClick={() => categoriesComponent.lastPage()}>
				  <ChevronDoubleRight />
				</Button>
			  <Form.Group controlId='pageSize'>
				Show <Form.Control type="text" style={{ marginLeft: 5, marginRight: 5, width: 70 }}
						value={pageSize} onChange={(event) => setPageSize(event.target.value)}
						onBlur={() => categoriesComponent.setPageSize(pageSize)}
						onKeyPress={(event) => { if (event.charCode === 13) { categoriesComponent.setPageSize(pageSize) }}} /> per page
			  </Form.Group>
			</Form>
		  </Col>
		</Row>
      </Container>
	);
}

export default CategoryTable
