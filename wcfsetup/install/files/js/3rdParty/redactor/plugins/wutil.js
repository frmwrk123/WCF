if (!RedactorPlugins) var RedactorPlugins = {};

/**
 * Provides utility methods extending $.Redactor
 * 
 * @author	Alexander Ebert
 * @copyright	2001-2014 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 */
RedactorPlugins.wutil = {
	/**
	 * autosave worker process
	 * @var	WCF.PeriodicalExecuter
	 */
	_autosaveWorker: null,
	
	/**
	 * Initializes the RedactorPlugins.wutil plugin.
	 */
	init: function() {
		// convert HTML to BBCode upon submit
		this.$source.parents('form').submit($.proxy(this.submit, this));
		
		if (this.getOption('wautosave').active) {
			this.autosaveEnable();
			
			if (this.getOption('wautosave').saveOnInit || this.$source.data('saveOnInit')) {
				this.setOption('wAutosaveOnce', true);
			}
			else {
				this.autosaveRestore();
			}
		}
		
		// prevent Redactor's own autosave
		this.setOption('autosave', false);
		
		// disable autosave on destroy
		var $mpDestroy = this.destroy;
		var self = this;
		this.destroy = function() {
			self.autosaveDisable();
			$mpDestroy.call(self);
		};
	},
	
	/**
	 * Allows inserting of text contents in Redactor's source area.
	 * 
	 * @param	string		string
	 * @return	boolean
	 */
	insertAtCaret: function(string) {
		if (this.opts.visual) {
			console.debug("insertAtCaret() failed: Editor is in WYSIWYG-mode.");
			return false;
		}
		
		this.$source.focus();
		var $position = this.$source.getCaret();
		if ($position == -1) {
			console.debug("insertAtCaret() failed: Source is not input[type=text], input[type=password] or textarea.");
		}
		
		var $content = this.$source.val();
		$content = $content.substr(0, $position) + string + $content.substr($position);
		this.$source.val($content);
		
		return true;
	},
	
	/**
	 * Inserts content into the editor depending if it is in wysiwyg or plain mode. If 'plainValue' is
	 * null or undefined, the value from 'html' will be taken instead.
	 * 
	 * @param	string		html
	 * @param	string		plainValue
	 */
	insertDynamic: function(html, plainValue) {
		if (this.inWysiwygMode()) {
			this.insertHtml(html);
		}
		else {
			if (plainValue === undefined || plainValue === null) {
				plainValue = html;
			}
			
			this.insertAtCaret(plainValue);
		}
	},
	
	/**
	 * Sets an option value after initialization.
	 * 
	 * @param	string		key
	 * @param	mixed		value
	 */
	setOption: function(key, value) {
		this.opts[key] = value;
	},
	
	/**
	 * Reads an option value, returns null if key is unknown.
	 * 
	 * @param	string		key
	 * @return	mixed
	 */
	getOption: function(key) {
		if (this.opts[key]) {
			return this.opts[key];
		}
		
		return null;
	},
	
	/**
	 * Returns true if editor is in source mode.
	 * 
	 * @return	boolean
	 */
	inPlainMode: function() {
		return !this.opts.visual;
	},
	
	/**
	 * Returns true if editor is in WYSIWYG mode.
	 * 
	 * @return	boolean
	 */
	inWysiwygMode: function() {
		return (this.opts.visual);
	},
	
	/**
	 * Replaces all ranges from the current selection with the provided one.
	 * 
	 * @param	DOMRange	range
	 */
	replaceRangesWith: function(range) {
		getSelection().removeAllRanges();
		getSelection().addRange(range);
	},
	
	/**
	 * Returns text using BBCodes.
	 * 
	 * @return	string
	 */
	getText: function() {
		if (this.inWysiwygMode()) {
			this.wSync();
		}
		
		return this.$source.val();
	},
	
	/**
	 * Converts HTML to BBCode upon submit.
	 */
	submit: function() {
		if (this.inWysiwygMode()) {
			this.wSync();
		}
		
		this.autosavePurge();
	},
	
	/**
	 * Resets the editor's contents.
	 */
	reset: function() {
		if (this.inWysiwygMode()) {
			this.$editor.html('<p>' + this.opts.invisibleSpace + '</p>');
			this.sync();
		}
		else {
			this.$source.val('');
		}
		
		WCF.System.Event.fireEvent('com.woltlab.wcf.redactor', 'reset', { wysiwygContainerID: this.$source.wcfIdentify() });
	},
	
	/**
	 * Enables automatic saving every minute.
	 * 
	 * @param	string		key
	 */
	autosaveEnable: function(key) {
		if (!this.getOption('wautosave').active) {
			this.setOption('wautosave', {
				active: true,
				key: key
			});
		}
		
		if (this._autosaveWorker === null) {
			this._autosaveWorker = new WCF.PeriodicalExecuter($.proxy(this._saveTextToStorage, this), 60 * 1000);
		}
		
		return true;
	},
	
	/**
	 * Saves current editor text to local browser storage.
	 */
	_saveTextToStorage: function() {
		localStorage.setItem(this.getOption('wautosave').key, this.getText());
	},
	
	/**
	 * Disables automatic saving.
	 */
	autosaveDisable: function() {
		if (!this.getOption('wautosave').active) {
			return false;
		}
		
		this._autosaveWorker.stop();
		this._autosaveWorker = null;
		
		this.setOption('wautosave', {
			active: false,
			key: ''
		});
		
		return true;
	},
	
	/**
	 * Attempts to purge saved text.
	 * 
	 * @param	string		key
	 */
	autosavePurge: function() {
		localStorage.removeItem(this.getOption('wautosave').key);
	},
	
	/**
	 * Attempts to restore a saved text.
	 */
	autosaveRestore: function() {
		var $options = this.getOption('wautosave');
		var $text = localStorage.getItem($options.key);
		if ($text !== null) {
			if (this.inWysiwygMode()) {
				this.setOption('wOriginalValue', $text);
			}
			else {
				this.$source.val($text);
			}
			
			return true;
		}
		
		return false;
	},
	
	/**
	 * Replaces one button with a new one.
	 * 
	 * @param	string		target
	 * @param	string		key
	 * @param	string		title
	 * @param	object		callback
	 * @param	object		dropdown
	 * @return	jQuery
	 */
	buttonReplace: function(target, key, title, callback, dropdown) {
		var $target = this.buttonGet(target);
		
		var $button = this.buttonAddAfter(target, key, title, callback, dropdown);
		if ($target.parent().hasClass('separator')) {
			$button.parent().addClass('separator');
		}
		
		$target.parent().remove();
		
		return $button;
	},
	
	/**
	 * Removes the unicode zero-width space (0x200B).
	 * 
	 * @param	string		string
	 * @return	string
	 */
	removeZeroWidthSpace: function(string) {
		var $string = '';
		
		for (var $i = 0, $length = string.length; $i < $length; $i++) {
			var $byte = string.charCodeAt($i).toString(16);
			if ($byte != '200b') {
				$string += string[$i];
			}
		}
		
		return $string;
	},
	
	/**
	 * Synchronizes editor's source textarea.
	 */
	wSync: function() {
		this.sync(undefined, true);
		this.$source.val(this.cleanHtml(this.$source.val()));
		this._convertFromHtml();
	},
	
	/**
	 * Returns source textarea object.
	 * 
	 * @return	jQuery
	 */
	getSource: function() {
		return this.$source;
	},
	
	/**
	 * Returns editor instance name.
	 * 
	 * @return	string
	 */
	getName: function() {
		return this.$source.wcfIdentify();
	},
	
	/**
	 * Sets the selection after the last direct children of the editor.
	 */
	selectionEndOfEditor: function() {
		this.selectionEnd(this.$editor.children(':last')[0]);
	},
	
	/**
	 * Replaces the current content with the provided value.
	 * 
	 * @param	string		value
	 */
	replaceText: function(value) {
		var $wasInWysiwygMode = false;
		if (this.inWysiwygMode()) {
			this.toggle();
			$wasInWysiwygMode = true;
		}
		
		this.$source.val(value);
		
		if ($wasInWysiwygMode) {
			this.toggle();
		}
	}
};
