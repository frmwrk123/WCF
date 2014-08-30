{assign var=smileyCategories value=$__wcf->getSmileyCache()->getCategories()}
{if !$permissionCanUseSmilies|isset}{assign var=permissionCanUseSmilies value='user.message.canUseSmilies'}{/if}
{if !$wysiwygContainerID|isset}{assign var=wysiwygContainerID value='text'}{/if}

{capture assign='__messageFormSettingsInlineContent'}{include file='messageFormSettingsInline'}{/capture}
{assign var='__messageFormSettingsInlineContent' value=$__messageFormSettingsInlineContent|trim}

<div class="messageTabMenu"{if $preselectTabMenu|isset} data-preselect="{$preselectTabMenu}"{/if} data-wysiwyg-container-id="{$wysiwygContainerID}">
	<nav class="messageTabMenuNavigation jsOnly">
		<ul>
			{if MODULE_SMILEY && $__wcf->getSession()->getPermission($permissionCanUseSmilies) && $smileyCategories|count}<li data-name="smilies"><a>{lang}wcf.message.smilies{/lang}</a></li>{/if}
			{if MODULE_ATTACHMENT && !$attachmentHandler|empty && $attachmentHandler->canUpload()}<li data-name="attachments"><a>{lang}wcf.attachment.attachments{/lang}</a></li>{/if}
			{if $__messageFormSettingsInlineContent}<li data-name="settings"><a>{lang}wcf.message.settings{/lang}</a></li>{/if}
			{event name='tabMenuTabs'}
		</ul>
	</nav>
	
	{if MODULE_SMILEY && $__wcf->getSession()->getPermission($permissionCanUseSmilies) && $smileyCategories|count}{include file='messageFormSmilies'}{/if}
	{if MODULE_ATTACHMENT && !$attachmentHandler|empty && $attachmentHandler->canUpload()}{include file='messageFormAttachments'}{/if}
	
	{if $__messageFormSettingsInlineContent}{@$__messageFormSettingsInlineContent}{/if}
	
	{event name='tabMenuContents'}
</div>

<script data-relocate="true">
	//<![CDATA[
	$(function() {
		$('.messageTabMenu').messageTabMenu();
	});
	//]]>
</script>