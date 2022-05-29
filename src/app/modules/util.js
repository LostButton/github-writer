/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * For testing purposes, we inject this function in the document, so we're able to stub it (document.location cannot
 * be changed).
 *
 * @return {Location} A document location object.
 * @protected
 */
window.__getLocation = function() {
	return window.location;
};

/**
 * For testing purposes, we inject this function in the document, so we're able to stub it
 * and avoid a read navigation.
 *
 * @param href (String) The url to navigate to.
 * @protected
 */
/* istanbul ignore next */
window.__setLocation = function( href ) {
	window.location.href = href;
};

/**
 * Indicates that unicode emojis are support. This is compatibility check 1:1 with the one done within <g-emoji>.
 *
 * @type {Boolean}
 */
export const isEmojiSupported = ( function() {
	const onWindows7 = /\bWindows NT 6.1\b/.test( navigator.userAgent );
	const onWindows8 = /\bWindows NT 6.2\b/.test( navigator.userAgent );
	const onWindows81 = /\bWindows NT 6.3\b/.test( navigator.userAgent );
	const onFreeBSD = /\bFreeBSD\b/.test( navigator.userAgent );
	const onLinux = /\bLinux\b/.test( navigator.userAgent );
	return !( onWindows7 || onWindows8 || onWindows81 || onLinux || onFreeBSD );
}() );

let _clickListeners;

export function addClickListener( selector, callback ) {
	if ( !_clickListeners ) {
		_clickListeners = [];

		document.addEventListener( 'click', ( { target } ) => {
			_clickListeners.forEach( ( { selector, callback } ) => {
				const wantedTarget = target.closest( selector );

				if ( wantedTarget ) {
					callback.call( this, wantedTarget );
				}
			} );
		}, { passive: true, capture: true } );
	}

	_clickListeners.push( { selector, callback } );
}

/**
 * Prevents clicks inside an element to trigger pjax loading.
 *
 * @param element {HTMLElement} The element which content to block.
 */
export function blockPjaxClicks( element ) {
	element.addEventListener( 'pjax:click', ev => {
		ev.preventDefault();
		ev.stopPropagation();
	}, true );
}

/**
 * Creates an element out of its outer html string.
 *
 * @param {String} html The outer html of the element.
 * @returns {HTMLElement} The element created.
 */
export function createElementFromHtml( html ) {
	const parser = new DOMParser();
	const doc = parser.parseFromString( html, 'text/html' );

	return doc.body.firstElementChild;
}

/**
 * Runs a deep pass on an object to check if all its defined properties have values (mostly dom elements).
 * If not, throws a {PageIncompatibilityError}.
 *
 * @param {Object} dom The object to be checked.
 */
export function checkDom( dom ) {
	Object.getOwnPropertyNames( dom ).forEach( key => {
		const value = dom[ key ];
		if ( value === null || typeof value === 'undefined' ) {
			throw new PageIncompatibilityError( key );
		}

		if ( value && Object.getPrototypeOf( value ) === Object.prototype ) {
			checkDom( value );
		}
	} );
}

/**
 * Thrown when the GitHub pages are now any more compatible with the app.
 *
 * We do some initialization checks on the page, to minimize the risk of execution errors while injecting the editor.
 * If GH will ever change the dom and make it incompatible, the PageIncompatibilityError is thrown.
 * This should not affect the ability of the user to use the page as we'll leave things untouched and quit.
 */
export class PageIncompatibilityError extends Error {
	/**
	 * Creates a instance of the PageIncompatibilityError class.
	 *
	 * @param elementKey {String} The object key (usually meant to point to an element), which caused the error.
	 */
	constructor( elementKey ) {
		super( `GitHub Writer error: ("${ elementKey }") not found. ` +
			`This page doesn't seem to be compatible with this application anymore. ` +
			`Upgrade to the latest version of the browser extension.` );
	}
}

/**
 * Injects a `<script>` element into the page, executing the provided function.
 *
 * Note that the function will be inlined as a string, so it'll not have access to any local references.
 *
 * @param {Function} fn The function to be executed.
 */
export function injectFunctionExecution( fn ) {
	// We give the convenience of passing a function here, but we have to make it a string
	// to inject it into the script element.
	let fnBody = fn.toString();

	// Remove comments they can break the execution (the browser may inline it as as a single line).
	fnBody = fnBody.replace( /\/\/.*$/mg, '' );

	const id = 'GitHub-Writer-' + Date.now();
	const script = document.createElement( 'script' );
	script.id = id;
	script.innerText =
		'(' + ( fnBody ) + ')();' +
		'document.getElementById("' + id + '").remove();';

	( document.body || /* istanbul ignore next */ document.head ).appendChild( script );
}

/**
 * Creates and opens a XMLHttpRequest matching the requirements of GitHub and browsers.
 *
 * @param url {String} The request url.
 * @param [method] {String} The request method. Defaults to 'POST'.
 * @return {XMLHttpRequest} The created XMLHttpRequest instance.
 */
export function openXmlHttpRequest( url, method = 'POST' ) {
	const location = window.__getLocation();

	const isLocal = url.startsWith( '/' );

	// Firefox needs the whole url, so we fix it here, if necessary.
	if ( isLocal ) {
		url = `${ location.protocol }//${ location.host }${ url }`;
	}

	const xhr = new XMLHttpRequest();
	xhr.open( method, url, true );

	if ( isLocal ) {
		// GitHub requires this on some of the local XHR requests.
		xhr.setRequestHeader( 'X-Requested-With', 'XMLHttpRequest' );
	}

	return xhr;
}

/**
 * Gets the html of the "New Issue" page through an xhr request and returns it as a dom.
 *
 * @returns {Promise<DocumentFragment>} A document fragment with the whole dom of the page.
 */
export function getNewIssuePageDom() {
	return new Promise( ( resolve, reject ) => {
		const location = window.__getLocation();

		// Build the url for the new issue page => /organization/repo/issues/new
		const url = location.pathname.match( /^\/.+?\/.+?\// ) + 'issues/new';

		const xhr = openXmlHttpRequest( url, 'GET' );

		xhr.addEventListener( 'error', () => reject( new Error( `Error loading $(url).` ) ) );
		xhr.addEventListener( 'abort', () => reject() );
		xhr.addEventListener( 'load', () => {
			const parser = new DOMParser();
			const doc = parser.parseFromString( xhr.response, 'text/html' );

			// Resolve the dom document.
			resolve( doc );
		} );

		xhr.send();
	} );
}

/**
 * Concatenates the initials of words and names present in a string.
 *
 * @param {String} text The text to be parsed.
 * @returns {String} A string with the concatenated initials. An empty string if nothing found.
 */
export function getInitials( text ) {
	if ( text && text.match ) {
		const initials = text.match( /\b\w/g );
		if ( initials ) {
			return initials.join( '' );
		}
	}

	return '';
}

/**
 * Escapes HTML by replacing the `&,<,>,",'` characters with their HTML entity counterparts.
 *
 * @param html {String} The html to be escaped.
 * @returns {String} The escaped version of html.
 */
export function escapeHtml( html ) {
	const entities = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		'\'': '&#39;',
		'`': '&#96;'
	};

	return html.replace( /[&<>"'`]/g, char => entities[ char ] );
}

/**
 * Escapes regular expression special characters in a string.
 *
 * @param string {String}
 * @returns {String} The escaped string.
 */
export function escapeRegex( string ) {
	return string.replace( /[\\^$.*+?()[\]{}|]/g, '\\$&' );
}

/**
 * Acts as a container for dom manipulations, make it possible to easily revert them.
 */
export class DomManipulator {
	/**
	 * Creates an instance of the DomManipulator class.
	 */
	constructor() {
		this._rollbackOperations = [];
	}

	/**
	 * Adds an attribute to an element with a desired value. It overwrites if it already exists.
	 *
	 * The rollback operation for this action will always remove the attribute, even if it existed earlier.
	 *
	 * @param target {HTMLElement} The target element.
	 * @param name {String} The attribute name.
	 * @param value {*} The value to be set. It is converted to a string.
	 */
	addAttribute( target, name, value ) {
		target.setAttribute( name, value );

		this.addRollbackOperation( () => target.removeAttribute( name ) );
	}

	/**
	 * Adds a class to an element.
	 *
	 * The rollback operation will always remove the class, even if it existed already.
	 *
	 * @param target {HTMLElement} The target element.
	 * @param name {String} The class name.
	 */
	addClass( target, name ) {
		target.classList.add( name );

		this.addRollbackOperation( () => target.classList.remove( name ) );
	}

	/**
	 * Toggles a class in an element.
	 *
	 * The rollback operation will always remove the class, even if it existed already.
	 *
	 * @param target {HTMLElement} The target element.
	 * @param name {String} The class name.
	 * @param force {Boolean} `true` to force add the class. `false` to force remove it.
	 */
	toggleClass( target, name, force ) {
		target.classList.toggle( name, force );

		this.addRollbackOperation( () => target.classList.remove( name ) );
	}

	/**
	 * Appends a node into another node (usually an HTMLElement).
	 *
	 * @param target {ParentNode} The target element.
	 * @param node {Node|String} The node to be added.
	 */
	append( target, node ) {
		target.append( node );

		this.addRollbackOperation( () => node.remove() );
	}

	/**
	 * Appends a node after another one.
	 *
	 * @param existingNode {ChildNode} The existing node.
	 * @param node {Node|String} The node to be appended.
	 */
	appendAfter( existingNode, node ) {
		existingNode.after( node );

		this.addRollbackOperation( () => node.remove() );
	}

	/**
	 * Appends a node into another node (usually an HTMLElement) at the beginning of its child list.
	 *
	 * @param target {ParentNode} The target element.
	 * @param node {Node|String} The node to be added.
	 */
	prepend( target, node ) {
		target.prepend( node );

		this.addRollbackOperation( () => node.remove() );
	}

	/**
	 * Setup an event listener to the given target.
	 *
	 * @param target {EventTarget|String} The event target or a target css selector string.
	 * @param event {String} The event name.
	 * @param callback {Function} Callback to execute when the event fires. It receives the ( event, target ) parameters.
	 * @param [options] {Object} An options object specifies characteristics about the event listener.
	 *        See the dom documentation for EventTarget.addEventListener for options.
	 */
	addEventListener( target, event, callback, options = {} ) {
		if ( typeof target === 'string' ) {
			const selector = target;
			const listener = ev => {
				const wantedTarget = ev.target.closest( selector );

				if ( wantedTarget ) {
					callback.call( wantedTarget, ev, wantedTarget );
				}
			};

			Object.assign( options, { passive: true, capture: true } );

			document.addEventListener( event, listener, options );
			this.addRollbackOperation( () => document.removeEventListener( event, listener, options ) );
		} else {
			const listener = ev => {
				callback.call( target, ev, target );
			};

			target.addEventListener( event, listener, options );
			this.addRollbackOperation( () => target.removeEventListener( event, listener, options ) );
		}
	}

	/**
	 * Adds an operation to be executed during rollback.
	 *
	 * These operations will be removed after rollback and will not be executed again.
	 *
	 * @param operation {Function} The operation.
	 */
	addRollbackOperation( operation ) {
		this._rollbackOperations.push( operation );
	}

	/**
	 * Reverts all manipulations made through the class instance since its creation or the last call of this method.
	 */
	rollback() {
		this._rollbackOperations.forEach( operation => operation() );
		this._rollbackOperations = [];
	}
}
