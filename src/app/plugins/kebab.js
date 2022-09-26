/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { addToolbarToDropdown, createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import normalizeToolbarConfig from '@ckeditor/ckeditor5-ui/src/toolbar/normalizetoolbarconfig';

import kebabIcon from '../icons/kebab.svg';

/**
 * Introduces the 'kebab' ui button dropdown.
 *
 * The items to be displayed in the dropdown toolbar are taken from the 'kebabToolbar' editor configuration.
 */
export default class Kebab extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;

		// Register the 'kebab' component, a dropdown.
		editor.ui.componentFactory.add( 'kebab', locale => {
			const dropdown = createDropdown( locale );

			dropdown.class = 'github-writer-kebab-button';
			dropdown.panelPosition = 'sw';

			dropdown.buttonView.set( {
				label: 'More options...',
				icon: kebabIcon,
				// The tooltipped tooltipped-n (north) classes enable the GH tooltip.
				class: 'github-writer-kebab-button'
			} );

			dropdown.buttonView.extendTemplate( {
				attributes: {
					// The GH tooltip text is taken from aria-label.
					'aria-label': 'More options...'
				}
			} );

			// Initializes the 'toolbarView' property of the dropdown.
			addToolbarToDropdown( dropdown, [] );

			// Fill the toolbar with the configured items.
			const toolbarConfig = normalizeToolbarConfig( editor.config.get( 'kebabToolbar' ) );
			dropdown.toolbarView.fillFromConfig( toolbarConfig.items, editor.ui.componentFactory );

			return dropdown;
		} );
	}
}
