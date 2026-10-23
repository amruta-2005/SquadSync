import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckSquare,
  AlertOctagon,
  Clock,
  Calendar,
  User,
  Award,
  Tag,
  MessageSquare,
  History,
  Send,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate } from '../../utils/formatters';

export default function TaskDetailsModal({
  isOpen,
  onClose,
  task,
  teamId,
  members = [],
  repositoryPeople = [],
  onTaskUpdated,
  onTaskDeleted
}) {
  const { addToast } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'discussion' | 'history'
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('To Do');
  const [storyPoints, setStoryPoints] = useState(1.0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');
  const [blockerReason, setBlockerReason] = useState('');

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isBlockerComment, setIsBlockerComment] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Activity history state
  const [activities, setActivities] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Initialize data when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setAssigneeId(task.assignee_id || '');
      setPriority(task.priority || 'Medium');
      setStatus(task.status || 'To Do');
      setStoryPoints(task.story_points || 1.0);
      setStartDate(task.start_date || '');
      setDueDate(task.due_date || '');
      setLabels(task.labels || '');
      setBlockerReason(task.blocker_reason || '');
      setIsEditing(false);
      loadComments();
      loadHistory();
    }
  }, [task]);

  const loadComments = async () => {
    if (!task || !teamId) return;
    try {
      const res = await apiService.getTaskComments(teamId, task.id);
      setComments(res.data || []);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    if (!task || !teamId) return;
    setHistoryLoading(true);
    try {
      const res = await apiService.getTeamActivities(teamId, task.id);
      setActivities(res.data || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await apiService.updateTask(teamId, task.id, {
        title: title.trim(),
        description: description.trim(),
        assignee_id: assigneeId || '',
        priority,
        status,
        story_points: parseFloat(storyPoints) || 1.0,
        start_date: startDate || '',
        due_date: dueDate || '',
        labels: labels.trim(),
        blocker_reason: status === 'Blocked' ? blockerReason.trim() : ''
      });
      addToast('Task updated successfully!', 'success');
      setIsEditing(false);
      if (onTaskUpdated) onTaskUpdated(updated.data);
      loadHistory();
    } catch (err) {
      addToast(`Failed to update task: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    try {
      await apiService.updateTaskStatus(teamId, task.id, newStatus);
      setStatus(newStatus);
      addToast(`Moved to ${newStatus}`, 'success');
      if (onTaskUpdated) onTaskUpdated({ ...task, status: newStatus });
      loadHistory();
    } catch (err) {
      addToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      await apiService.addTaskComment(teamId, task.id, {
        comment: newComment.trim(),
        is_blocker: isBlockerComment
      });
      setNewComment('');
      setIsBlockerComment(false);
      addToast(isBlockerComment ? 'Blocker reported on task!' : 'Comment posted!', 'success');
      await loadComments();
      if (isBlockerComment && status !== 'Blocked') {
        setStatus('Blocked');
        if (onTaskUpdated) onTaskUpdated({ ...task, status: 'Blocked', blocker_reason: newComment.trim() });
      }
      loadHistory();
    } catch (err) {
      addToast(`Failed to post comment: ${err.message}`, 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  const getPriorityBadgeVariant = (pri) => {
    switch (pri) {
      case 'Critical': return 'rose';
      case 'High': return 'rose';
      case 'Medium': return 'amber';
      case 'Low': return 'slate';
      default: return 'slate';
    }
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'Completed': return 'emerald';
      case 'In Progress': return 'indigo';
      case 'In Review': return 'purple';
      case 'Blocked': return 'rose';
      default: return 'slate';
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              {task.task_key}
            </span>
            <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
            <Badge variant={getPriorityBadgeVariant(priority)}>{priority}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Edit task details"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-xs font-bold text-slate-500">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'details'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Task Details</span>
          </button>
          <button
            onClick={() => setActiveTab('discussion')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'discussion'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussion & Blockers ({comments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Activity Audit Log ({activities.length})</span>
          </button>
        </div>

        {/* Tab 1: Task Details (View or Edit mode) */}
        {activeTab === 'details' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Blocker Alert Banner if task is blocked */}
            {status === 'Blocked' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Task is Currently Blocked
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium leading-relaxed">
                    {blockerReason || task.blocker_reason || 'No explanation provided.'}
                  </p>
                </div>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Acceptance Criteria
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assignee
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name} ({m.role}) {m.github_username ? `· @${m.github_username}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    >
                      <option value="Critical">Critical Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Story Points
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={storyPoints}
                      onChange={(e) => setStoryPoints(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Labels / Tags
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. backend, database, sprint-1"
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  />
                </div>

                {status === 'Blocked' && (
                  <div>
                    <label className="block text-xs font-bold text-rose-800 mb-1">
                      Blocker Reason *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-rose-50 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-900 resize-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={loading} icon={Save}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {task.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
                    {task.description || <span className="italic text-slate-400">No description provided.</span>}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Assignee</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {task.assignee_name || (task.assignee_github_username ? `@${task.assignee_github_username}` : 'Unassigned')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Story Points</span>
                    <span className="font-bold text-purple-700 flex items-center gap-1.5 mt-0.5">
                      <Award className="w-3.5 h-3.5" />
                      {task.story_points} pts
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Due Date</span>
                    <span className={`font-bold flex items-center gap-1.5 mt-0.5 ${task.overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.due_date ? formatDate(task.due_date) : 'No deadline'}
                      {task.overdue && '(Overdue)'}
                    </span>
                  </div>

                  {task.start_date && (
                    <div>
                      <span className="text-slate-400 block font-medium">Start Date</span>
                      <span className="font-medium text-slate-700 mt-0.5 block">
                        {formatDate(task.start_date)}
                      </span>
                    </div>
                  )}

                  {task.labels && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-medium">Labels</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.labels.split(',').map((l, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px]">
                            {l.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Status Update Selector */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Quick Move Status:</span>
                  <div className="flex items-center gap-1.5">
                    {['To Do', 'In Progress', 'In Review', 'Completed', 'Blocked'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleQuickStatusChange(st)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          status === st
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Discussion & Blockers */}
        {activeTab === 'discussion' && (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No comments or blockers recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Team members can discuss technical details, leave updates, or report blockers here.
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      c.is_blocker
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.author_name}</span>
                        {c.is_blocker && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" />
                            Blocker Reported
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatTs(c.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {c.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Comment / Blocker Input */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-100 space-y-2">
              <textarea
                rows={2}
                placeholder={isBlockerComment ? "Describe the blocking issue in detail..." : "Add a technical note, PR link, or status update..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 resize-none ${
                  isBlockerComment
                    ? 'bg-rose-50/50 border-rose-300 focus:ring-rose-500 text-rose-900'
                    : 'bg-slate-50 border-slate-200 focus:ring-purple-500 text-slate-800'
                }`}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isBlockerComment}
                    onChange={(e) => setIsBlockerComment(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span className={isBlockerComment ? 'text-rose-600 font-bold' : ''}>
                    Report as Blocker
                  </span>
                </label>

                <Button
                  type="submit"
                  variant={isBlockerComment ? 'danger' : 'primary'}
                  size="sm"
                  loading={commentLoading}
                  icon={Send}
                >
                  {isBlockerComment ? 'Report Blocker' : 'Post Comment'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Activity Audit Log */}
        {activeTab === 'history' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {historyLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No activity events recorded yet</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="relative text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 absolute -left-[31px] top-1 border-2 border-white"></span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{act.user_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatTs(act.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">
                        {act.details || act.action}
                      </p>
                      {(act.previous_value || act.new_value) && (
                        <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                          {act.previous_value && <span className="line-through text-slate-400">{act.previous_value}</span>}
                          {act.previous_value && act.new_value && <span>→</span>}
                          {act.new_value && <span className="font-bold text-purple-700">{act.new_value}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
