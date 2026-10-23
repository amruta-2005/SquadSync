/**
 * Utility functions for formatting dates, percentages, and risk styles.
 */

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins > 0) {
      return `${diffMins}m ago`;
    }
    return 'Just now';
  } catch {
    return dateString;
  }
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export function getRiskLevelBadge(level) {
  const norm = String(level || '').toLowerCase();
  switch (norm) {
    case 'critical':
      return {
        label: 'Critical Risk',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'high':
      return {
        label: 'High Risk',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500'
      };
    case 'medium':
    case 'moderate':
      return {
        label: 'Medium Risk',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'low':
      return {
        label: 'Low Risk',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500'
      };
    default:
      return {
        label: level || 'Unknown',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}

export function getWorkloadStatusBadge(status) {
  const norm = String(status || '').toLowerCase();
  if (norm.includes('overburden') || norm.includes('high') || norm.includes('heavy')) {
    return {
      label: 'Overburdened',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500'
    };
  }
  if (norm.includes('under') || norm.includes('low') || norm.includes('inactive')) {
    return {
      label: 'Underutilized',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    };
  }
  return {
    label: 'Balanced',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  };
}

export function getReviewStatusBadge(status) {
  const norm = String(status || '').toLowerCase();
  if (norm.includes('unreviewed') || norm.includes('needs_review') || norm.includes('pending')) {
    return {
      label: 'Needs Review',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200'
    };
  }
  if (norm.includes('approved')) {
    return {
      label: 'Approved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200'
    };
  }
  if (norm.includes('changes_requested')) {
    return {
      label: 'Changes Requested',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200'
    };
  }
  return {
    label: status || 'Pending',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200'
  };
}
