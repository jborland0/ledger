import React from 'react';
import logo from './logo.svg';
import './App.css';
import LedgerMenu from './components/LedgerMenu';
import config from './config/index';

function App() {
	return (
		<LedgerMenu config={config} />
	);
}

export default App;
