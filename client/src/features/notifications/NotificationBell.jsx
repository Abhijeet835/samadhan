import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';

import { useNotifications } from './useNotifications';

export default function NotificationBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const label = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Link to="/notifications" className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t('notifications.bellLabel', { count: unreadCount })}>
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white" aria-live="polite">
          {label}
        </span>
      )}
    </Link>
  );
}
