<?php
namespace wcf\system\edit;
use wcf\data\object\type\IObjectTypeProvider;

/**
 * Represents an object which edit history can be saved.
 * 
 * @author	Tim Duesterhus
 * @copyright	2001-2015 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @package	com.woltlab.wcf
 * @subpackage	system.edit
 * @category	Community Framework
 */
interface IHistorySavingObjectTypeProvider extends IObjectTypeProvider {
	/**
	 * Checks the permissions to review the edit history
	 * and to revert to an older version of the given
	 * IHistorySavingObject.
	 * You must throw a \wcf\system\exception\PermissionDeniedException
	 * to deny access!
	 * 
	 * @param	\wcf\system\edit\IHistorySavingObject	$object
	 */
	public function checkPermissions(IHistorySavingObject $object);
	
	/**
	 * Returns the identifier of the appropriate page menu item.
	 * 
	 * @return	string
	 */
	public function getActivePageMenuItem();
}
