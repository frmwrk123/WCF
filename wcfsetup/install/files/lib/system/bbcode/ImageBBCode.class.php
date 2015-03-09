<?php
namespace wcf\system\bbcode;
use wcf\util\StringUtil;

/**
 * Parses the [img] bbcode tag.
 * 
 * @author	Marcel Werk
 * @copyright	2001-2015 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @package	com.woltlab.wcf
 * @subpackage	system.bbcode
 * @category	Community Framework
 */
class ImageBBCode extends AbstractBBCode {
	/**
	 * @see	\wcf\system\bbcode\IBBCode::getParsedTag()
	 */
	public function getParsedTag(array $openingTag, $content, array $closingTag, BBCodeParser $parser) {
		$src = '';
		if (isset($openingTag['attributes'][0])) {
			$src = $openingTag['attributes'][0];
		}
		
		if ($parser->getOutputType() == 'text/html') {
			$float = '';
			if (isset($openingTag['attributes'][1])) {
				$float = $openingTag['attributes'][1];
			}
			
			$style = '';
			if ($float == 'left' || $float == 'right') {
				$style = 'float: ' . $float . '; margin: ' . ($float == 'left' ? '0 15px 7px 0' : '0 0 7px 15px') . ';';
			}
			
			$width = 0;
			if (isset($openingTag['attributes'][2])) {
				$width = $openingTag['attributes'][2];
				
				$style .= 'width: ' . $width . 'px;';
			}
			
			return '<img src="'.$src.'" class="jsResizeImage" alt=""'.($style ? ' style="' . $style . '"' : '').' />';
		}
		else if ($parser->getOutputType() == 'text/simplified-html') {
			$src = StringUtil::decodeHTML($src);
			$path = parse_url($src, PHP_URL_PATH);
			if ($path !== false) {
				return StringUtil::encodeHTML(basename($path));
			}
			
			return '';
		}
	}
}
