import React from 'react';
import $ from 'jquery';

class LedgerComponent extends React.Component {
	constructor(props) {
		super(props);
	}
	
	getConfig() {
		if (this.props.parent) {
			return this.props.parent.getConfig();
		} else {
			return this.props.config;
		}
	}
	
	getUser() {
		if (this.props.parent) {
			return this.props.parent.getUser();
		} else {
			return this.state.user;
		}
	}
	
	getCookie(name) {
		var cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			var cookies = document.cookie.split(';');
			for (var i = 0; i < cookies.length; i++) {
				var cookie = $.trim(cookies[i]);
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}	

	isObject(o) {
		return typeof o === 'object' && o !== null
	}

	mergeState(newState) {
		this.mergeObject(this.state, newState);
		this.setState(newState);
	}
  
	mergeObject(oldObj, newObj) {
		var self = this;
		// for each key in the old object
		Object.keys(oldObj).map(function(key) {
			// if the key is not defined in the new object
			if (newObj[key] === undefined) {
				// add value to new object
				newObj[key] = oldObj[key];
			} else if (self.isObject(oldObj[key]) && self.isObject(newObj[key])) {
				// call recursively on child objects
				self.mergeObject(oldObj[key], newObj[key]);
			}
		});
	}
	
	navigate(content) {
		if (this.props.parent) {
			this.props.parent.navigate(content);
		} else {
			this.mergeState({ content: content });
		}
	}
	
	setUser(user) {
		if (this.props.parent) {
			this.props.parent.setUser(user);
		} else {
			this.mergeState({ user: user });
		}
	}
	
	showAlert(title, content, callback) {
		this.props.parent.showAlert(title, content, callback);
	}
	
	/*
	axios error object looks like this:
	{
		"message":"Network Error",
		"name":"Error",
		"stack":"Error: Network Error bla bla bla",
		"config":{
			"url":"http://localhost:8000/ledger/login",
			"method":"post",
			"data":"{\"username\":\"jborland\",\"password\":\"******\"}",
			"headers":{
				"Accept":"application/json, text/plain, *//*",
				"Content-Type":"application/json;charset=utf-8"
			},
			"transformRequest":[null],
			"transformResponse":[null],
			"timeout":0,
			"xsrfCookieName":"XSRF-TOKEN",
			"xsrfHeaderName":"X-XSRF-TOKEN",
			"maxContentLength":-1
		}
	}	
	*/
}

export default LedgerComponent;