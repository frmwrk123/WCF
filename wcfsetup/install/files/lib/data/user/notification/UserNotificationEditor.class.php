<?php
namespace wcf\data\user\notification;
use wcf\data\DatabaseObjectEditor;
use wcf\system\WCF;

/**
 * Provides functions to edit user notifications.
 * 
 * @author	Marcel Werk
 * @copyright	2001-2014 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @package	com.woltlab.wcf
 * @subpackage	data.user.notification
 * @category	Community Framework
 */
class UserNotificationEditor extends DatabaseObjectEditor {
	/**
	 * @see	\wcf\data\DatabaseObjectDecorator::$baseClass
	 */
	protected static $baseClass = 'wcf\data\user\notification\UserNotification';
	
	/**
	 * Marks this notification as confirmed.
	 */
	public function markAsConfirmed() {
		$this->update(array(
			'confirmTime' => TIME_NOW,
			'mailNotified' => 1
		));
		
		// delete notification_to_user assignment (mimic legacy notification system)
		$sql = "DELETE FROM	wcf".WCF_N."_user_notification_to_user
			WHERE		notificationID = ?";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute(array($this->notificationID));
	}
}
