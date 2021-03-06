import React from 'react';
import logo from './logo.svg';
import './App.css';
import LedgerMenu from './components/LedgerMenu';
import config from './config/index';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrowserRouter, Route } from "react-router-dom";

function App() {
	return (
		<DndProvider backend={HTML5Backend}>
			<BrowserRouter>
				<Route path={config.baseRoute} render={props => <LedgerMenu config={config} {...props} />} />
			</BrowserRouter>
	    </DndProvider>
	);
}

export default App;
