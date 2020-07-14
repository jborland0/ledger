import React from 'react';
import logo from './logo.svg';
import './App.css';
import LedgerMenu from './components/LedgerMenu';
import config from './config/index';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
	return (
	  <DndProvider backend={HTML5Backend}>
		<LedgerMenu config={config} />
	  </DndProvider>
	);
}

export default App;
