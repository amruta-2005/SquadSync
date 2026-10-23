import React from 'react';
import { Inbox, Plus } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No Data Available',
  description = 'There are no records to display for this team or filter criteria.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto my-8 ${className}`}>
      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" icon={Plus} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
