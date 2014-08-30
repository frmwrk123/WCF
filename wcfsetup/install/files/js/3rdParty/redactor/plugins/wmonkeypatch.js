if (!RedactorPlugins) var RedactorPlugins = {};

/**
 * This plugin makes liberally use of dumb monkey patching to adjust Redactor for our needs. In
 * general this is a collection of methods whose side-effects cannot be prevented in any other
 * way or a work-around would cause a giant pile of boilerplates.
 * 
 * ATTENTION!
 * This plugin partially contains code taken from Redactor, Copyright (c) 2009-2014 Imperavi LLC.
 * Under no circumstances you are allowed to use potions or entire code blocks for use anywhere
 * except when directly working with WoltLab Community Framework.
 * 
 * @author	Alexander Ebert
 * @copyright	2001-2014 WoltLab GmbH, 2009-2014 Imperavi LLC.
 * @license	http://imperavi.com/redactor/license/
 */
RedactorPlugins.wmonkeypatch = {
	/**
	 * Initializes the RedactorPlugins.wmonkeypatch plugin.
	 */
	init: function() {
		var self = this;
		var $identifier = this.$source.wcfIdentify();
		
		var $mpIndentingStart = this.indentingStart;
		this.indentingStart = function(cmd) {
			if (self.mpIndentingStart(cmd)) {
				$mpIndentingStart.call(self, cmd);
			}
		};
		
		// keydown w/ event aborting through callback
		var $mpBuildEventKeydown = this.buildEventKeydown;
		this.buildEventKeydown = function(e) {
			var $eventData = {
				cancel: false,
				event: e
			};
			
			WCF.System.Event.fireEvent('com.woltlab.wcf.redactor', 'keydown_' + $identifier, $eventData);
			
			if ($eventData.cancel !== true) {
				return $mpBuildEventKeydown.call(self, e);
			}
			
			return false;
		};
		
		var $mpToggleCode = this.toggleCode;
		this.toggleCode = function(direct) {
			var $height = self.normalize(self.$editor.css('height'));
			
			$mpToggleCode.call(self, direct);
			
			self.$source.height($height);
		};
		
		var $mpModalInit = this.modalInit;
		this.modalInit = function(title, content, width, callback) {
			self.mpModalInit();
			
			$mpModalInit.call(self, title, content, width, callback);
		};
		
		var $mpModalShowOnDesktop = this.modalShowOnDesktop;
		this.modalShowOnDesktop = function() {
			$mpModalShowOnDesktop.call(self);
			
			$(document.body).css('overflow', false);
		};
		
		var $mpDestroy = this.destroy;
		this.destroy = function() {
			self.callback('destroy', false, { });
			
			$mpDestroy.call(self);
		};
		
		var $mpSync = this.sync;
		this.sync = function(e, forceSync) {
			if (forceSync === true) {
				$mpSync.call(self, e);
			}
		};
		
		// handle indent/outdent
		var $mpButtonActiveObserver = this.buttonActiveObserver;
		this.buttonActiveObserver = function(e, btnName) {
			$mpButtonActiveObserver.call(self, e, btnName);
			
			self.mpButtonActiveObserver(e, btnName);
		};
		if (this.opts.activeButtons) {
			this.$editor.off('mouseup.redactor keyup.redactor').on('mouseup.redactor keyup.redactor', $.proxy(this.buttonActiveObserver, this));
		}
		this.$toolbar.find('a.re-indent, a.re-outdent').addClass('redactor_button_disabled');
		
		// image editing
		var $mpImageResizeControls = this.imageResizeControls;
		this.imageResizeControls = function($image) {
			if (!$image.data('attachmentID')) {
				$mpImageResizeControls.call(self, $image);
			}
			
			return false;
		};
		
		var $mpImageEdit = this.imageEdit;
		this.imageEdit = function(image) {
			$mpImageEdit.call(self, image);
			
			$('#redactor_image_source').val($(image).prop('src'));
		};
		
		var $mpImageSave = this.imageSave;
		this.imageSave = function(el) {
			$(el).prop('src', $('#redactor_image_source').val());
			
			$mpImageSave.call(self, el);
		};
		
		// backspace
		var $mpBuildEventKeydownBackspace = this.buildEventKeydownBackspace;
		this.buildEventKeydownBackspace = function(e, current, parent) {
			if ($mpBuildEventKeydownBackspace.call(self, e, current, parent) !== false) {
				return self.mpBuildEventKeydownBackspace(e, current, parent);
			}
			
			return false;
		};
		
		this.setOption('modalOpenedCallback', $.proxy(this.modalOpenedCallback, this));
		this.setOption('dropdownShowCallback', $.proxy(this.dropdownShowCallback, this));
		
		this.modalTemplatesInit();
	},
	
	cleanRemoveSpaces: function(html, buffer) {
		return html;
	},
	
	/**
	 * Enable/Disable the 'Indent'/'Outdent' for lists/outside lists.
	 * 
	 * @param	object		e
	 * @param	string		btnName
	 */
	mpButtonActiveObserver: function(e, btnName) {
		var parent = this.getParent();
		parent = (parent === false) ? null : $(parent);
		
		var self = this;
		var $editor = this.$editor.get()[0];
		var $toggleButtons = function(searchFor, buttonSelector, inverse, className, skipInSourceMode) {
			var $buttons = self.$toolbar.find(buttonSelector);
			if (parent && parent.closest(searchFor, $editor).length != 0) {
				$buttons[(inverse ? 'removeClass' : 'addClass')](className);
			}
			else {
				if (skipInSourceMode && !self.opts.visual) {
					return;
				}
				
				$buttons[(inverse ? 'addClass' : 'removeClass')](className);
			}
		};
		
		$toggleButtons('ul', 'a.re-indent, a.re-outdent', true, 'redactor_button_disabled');
		$toggleButtons('inline.inlineCode', 'a.re-__wcf_tt', false, 'redactor_act');
		$toggleButtons('blockquote.quoteBox', 'a.re-__wcf_quote', false, 'redactor_button_disabled', true);
		$toggleButtons('sub', 'a.re-subscript', false, 'redactor_act');
		$toggleButtons('sup', 'a.re-superscript', false, 'redactor_act');
	},
	
	/**
	 * Overwrites $.Redactor.inlineRemoveStyle() to drop empty <inline> elements.
	 * 
	 * @see		$.Redactor.inlineRemoveStyle()
	 * @param	string		rule
	 */
	inlineRemoveStyle: function(rule) {
		this.selectionSave();
		
		this.inlineEachNodes(function(node) {
			$(node).css(rule, '');
			this.removeEmptyAttr(node, 'style');
		});
		
		// WoltLab modifications START
		// drop all <inline> elements without an actual attribute
		this.$editor.find('inline').each(function(index, inlineElement) {
			if (!inlineElement.attributes.length) {
				var $inlineElement = $(inlineElement);
				$inlineElement.replaceWith($inlineElement.html());
			}
		});
		// WoltLab modifications END
		
		this.selectionRestore();
		this.sync();
	},
	
	/**
	 * Overwrites $.Redactor.inlineMethods() to fix calls to inlineSetClass().
	 * 
	 * @see		$.Redactor.inlineMethods()
	 * @param	string		type
	 * @param	string		attr
	 * @param	string		value
	 */
	inlineMethods: function(type, attr, value) {
		this.bufferSet();
		this.selectionSave();

		var range = this.getRange();
		var el = this.getElement();

		if ((range.collapsed || range.startContainer === range.endContainer) && el && !this.nodeTestBlocks(el))
		{
			$(el)[type](attr, value);
		}
		else
		{
			var cmd, arg = value;
			switch (attr)
			{
				case 'font-size':
					cmd = 'fontSize';
					arg = 4;
				break;
				case 'font-family':
					cmd = 'fontName';
				break;
				case 'color':
					cmd = 'foreColor';
				break;
				case 'background-color':
					cmd = 'backColor';
				break;
			}
			
			// WoltLab modifications START
			if (type === 'addClass') {
				cmd = 'fontSize';
				arg = 4;
			}
			// WoltLab modifications END

			this.document.execCommand(cmd, false, arg);

			var fonts = this.$editor.find('font');
			$.each(fonts, $.proxy(function(i, s)
			{
				this.inlineSetMethods(type, s, attr, value);

			}, this));

		}

		this.selectionRestore();
		this.sync();
	},
	
	/**
	 * Drops the indentation if not within a list.
	 * 
	 * @param	string		cmd
	 */
	mpIndentingStart: function(cmd) {
		if (this.getBlock().tagName == 'LI') {
			return true;
		}
		
		return false;
	},
	
	/**
	 * Provides WCF-like overlays.
	 */
	modalTemplatesInit: function() {
		this.setOption('modal_image',
			'<fieldset>'
				+ '<dl>'
					+ '<dt><label for="redactor_file_link">' + this.opts.curLang.image_web_link + '</label></dt>'
					+ '<dd><input type="text" name="redactor_image_source" id="redactor_image_source" class="long"  /></dd>'
				+ '</dl>'
				+ '<dl>'
					+ '<dt><label for="redactor_form_image_align">' + this.opts.curLang.image_position + '</label></dt>'
					+ '<dd>'
						+ '<select id="redactor_form_image_align">'
							+ '<option value="none">' + this.opts.curLang.none + '</option>'
							+ '<option value="left">' + this.opts.curLang.left + '</option>'
							+ '<option value="right">' + this.opts.curLang.right + '</option>'
						+ '</select>'
					+ '</dd>'
				+ '</dl>'
			+ '</fieldset>'
			+ '<div class="formSubmit">'
				+ '<button id="redactor_upload_btn">' + this.opts.curLang.insert + '</button>'
			+ '</div>'
		);
		
		this.setOption('modal_image_edit', this.getOption('modal_image').replace(
			'<button id="redactor_upload_btn">' + this.opts.curLang.insert + '</button>',
			'<button id="redactorSaveBtn">' + this.opts.curLang.save + '</button>'
		));
		
		this.setOption('modal_link',
			'<fieldset>'
				+ '<dl>'
					+ '<dt><label for="redactor_link_url">URL</label></dt>'
					+ '<dd><input type="text" id="redactor_link_url" class="long" /></dd>'
				+ '</dl>'
				+ '<dl>'
					+ '<dt><label for="redactor_link_url_text">' + this.opts.curLang.text + '</label></dt>'
					+ '<dd><input type="text" id="redactor_link_url_text" class="long" /></dd>'
				+ '</dl>'
			+ '</fieldset>'
			+ '<div class="formSubmit">'
				+ '<button id="redactor_insert_link_btn">' + this.opts.curLang.insert + '</button>'
			+ '</div>'
		);
		
		this.setOption('modal_table',
			'<fieldset>'
				+ '<dl>'
					+ '<dt><label for="redactor_table_rows">' + this.opts.curLang.rows + '</label></dt>'
					+ '<dd><input type="number" size="5" value="2" min="0" id="redactor_table_rows" class="tiny" /></dd>'
				+ '</dl>'
				+ '<dl>'
					+ '<dt><label for="redactor_table_columns">' + this.opts.curLang.columns + '</label></dt>'
					+ '<dd><input type="number" size="5" value="3" min="0" id="redactor_table_columns" class="tiny" /></dd>'
				+ '</dl>'
			+ '</fieldset>'
			+ '<div class="formSubmit">'
				+ '<button id="redactor_insert_table_btn">' + this.opts.curLang.insert + '</button>'
			+ '</div>'
		);
		
		this.setOption('modal_quote',
			'<fieldset>'
				+ '<dl>'
					+ '<dt><label for="redactorQuoteAuthor">' + WCF.Language.get('wcf.bbcode.quote.edit.author') + '</label></dt>'
					+ '<dd><input type="text" id="redactorQuoteAuthor" class="long" /></dd>'
				+ '</dl>'
				+ '<dl>'
					+ '<dt><label for="redactorQuoteLink">' + WCF.Language.get('wcf.bbcode.quote.edit.link') + '</label></dt>'
					+ '<dd><input type="text" id="redactorQuoteLink" class="long" /></dd>'
				+ '</dl>'
			+ '</fieldset>'
			+ '<div class="formSubmit">'
				+ '<button id="redactorEditQuote">' + this.opts.curLang.save + '</button>'
			+ '</div>'
		);
	},
	
	mpModalInit: function() {
		// modal overlay
		if (!$('#redactor_modal_overlay').length) {
			this.$overlay = $('<div id="redactor_modal_overlay" class="dialogOverlay" />').css({ height: '100%', zIndex: 50000 }).hide().appendTo(document.body);
		}
		
		if (!$('#redactor_modal').length) {
			this.$modal = $('<div id="redactor_modal" class="dialogContainer" />').css({ display: 'none', zIndex: 50001 }).appendTo(document.body);
			$('<header class="dialogTitlebar"><span id="redactor_modal_header" class="dialogTitle" /><a id="redactor_modal_close" class="dialogCloseButton" /></header>').appendTo(this.$modal);
			$('<div class="dialogContent"><div id="redactor_modal_inner" /></div>').appendTo(this.$modal);
		}
		
		this.$modal.children('.dialogContent').removeClass('dialogForm');
	},
	
	modalOpenedCallback: function() {
		// handle positioning of form submit controls
		var $heightDifference = 0;
		if (this.$modal.find('.formSubmit').length) {
			$heightDifference = this.$modal.find('.formSubmit').outerHeight();
			
			this.$modal.children('.dialogContent').addClass('dialogForm').css({ marginBottom: $heightDifference + 'px' });
		}
		else {
			this.$modal.children('.dialogContent').removeClass('dialogForm').css({ marginBottom: '0px' });
		}
		
		// fix position
		var $dimensions = this.$modal.getDimensions('outer');
		this.$modal.css({
			marginLeft: -1 * Math.round($dimensions.width / 2) + 'px',
			marginTop: -1 * Math.round($dimensions.height / 2) + 'px'
		});
	},
	
	dropdownShowCallback: function(data) {
		if (!data.dropdown.hasClass('dropdownMenu')) {
			data.dropdown.addClass('dropdownMenu');
			data.dropdown.children('.redactor_separator_drop').replaceWith('<li class="dropdownDivider" />');
			data.dropdown.children('a').wrap('<li />');
		}
	},
	
	/**
	 * Overwrites $.Redactor.inlineEachNodes(), the original method compares "selectionHtml"
	 * and "parentHtml" to check if the callback should be invoked. In some cases the "parentHtml"
	 * may contain a trailing unicode zero-width space and the comparision will fail, even though
	 * the "entire" node is selected.
	 * 
	 * @see	$.Redactor.inlineEachNodes()
	 */
	inlineEachNodes: function(callback) {
		var range = this.getRange(),
			node = this.getElement(),
			nodes = this.getNodes(),
			collapsed;

		if (range.collapsed || range.startContainer === range.endContainer && node)
		{
			nodes = $(node);
			collapsed = true;
		}

		$.each(nodes, $.proxy(function(i, node)
		{
			if (!collapsed && node.tagName !== 'INLINE')
			{
				var selectionHtml = this.getSelectionText();
				var parentHtml = $(node).parent().text();
				// if parentHtml contains a trailing 0x200B, the comparison will most likely fail
				var selected = this.removeZeroWidthSpace(selectionHtml) == this.removeZeroWidthSpace(parentHtml);

				if (selected && node.parentNode.tagName === 'INLINE' && !$(node.parentNode).hasClass('redactor_editor'))
				{
					node = node.parentNode;
				}
				else return;
			}
			callback.call(this, node);

		}, this ) );
	},
	
	/**
	 * Overwrites $.Redactor.imageCallbackLink() to provide proper image insert behavior.
	 * 
	 * @see	$.Redactor.imageCallbackLink()
	 */
	imageCallbackLink: function() {
		var $src = $.trim($('#redactor_image_source').val());
		if ($src.length) {
			var $float = '';
			var $alignment = $('#redactor_form_image_align').val();
			switch ($alignment) {
				case 'left':
					$float = ' style="float: left;"';
				break;
				
				case 'right':
					$float = ' style="float: right;"';
				break;
			}
			
			var $data = '<img id="image-marker" src="' + $src + '"' + $float + ' />';
			
			this.imageInsert($data, true);
		}
		else {
			this.modalClose();
		}
	},
	
	/**
	 * Overwrites $.Redactor.observeLinks() to prevent quote headers being recognized as ordinary URLs.
	 * 
	 * @see	$.Redactor.observeLinks()
	 */
	observeLinks: function() {
		this.$editor.find('a:not(.redactorQuoteEdit)').on('click', $.proxy(this.linkObserver, this));
		
		this.$editor.on('click.redactor', $.proxy(function(e)
		{
			this.linkObserverTooltipClose(e);
		}, this));
		
		$(document).on('click.redactor', $.proxy(function(e)
		{
			this.linkObserverTooltipClose(e);
		}, this));
	},
	
	/**
	 * Overwrites $.Redactor.observeImages() to prevent smileys being recognized as ordinary images.
	 * 
	 * @see	$.Redactor.observeImages()
	 */
	observeImages: function() {
		if (this.opts.observeImages === false) return false;

		this.$editor.find('img:not(.smiley)').each($.proxy(function(i, elem)
		{
			if (this.browser('msie')) $(elem).attr('unselectable', 'on');

			var parent = $(elem).parent();
			if (!parent.hasClass('royalSlider') && !parent.hasClass('fotorama'))
			{
				this.imageResize(elem);
			}

		}, this));

		// royalSlider and fotorama
		this.$editor.find('.fotorama, .royalSlider').on('click', $.proxy(this.editGallery, this));

	},
	
	/**
	 * Handles deletion of quotes in design mode.
	 * 
	 * @param	object		event
	 * @param	object		current
	 * @param	object		parent
	 * @return	boolean
	 */
	mpBuildEventKeydownBackspace: function(event, current, parent) {
		var $value = $.trim((current.textContent) ? current.textContent : current.innerText);
		
		if ($value == '' && parent.parentNode && parent.parentNode.tagName == 'BLOCKQUOTE') {
			var $parentNode = parent.parentNode.parentNode;
			$(parent.parentNode).remove();
			this.selectionStart($parentNode);
			
			return false;
		}
	},
	
	/**
	 * Overwrites $.Redactor.cleanGetTabs() to prevent HTML indentation.
	 * 
	 * @see	$.Redactor.cleanGetTabs()
	 */
	cleanGetTabs: function() {
		return '';
	},
};
