import React, { useState } from 'react';
import { X, CheckSquare, Plus, AlertCircle, Calendar, User, Clock, Award, Tag, AlertOctagon } from 'lucide-react';
import Button from '../common/Button';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function CreateTaskModal({ isOpen, onClose, teamId, members = [], repositoryPeople = [], onTaskCreated }) {
  const { addToast } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [githubAssignee, setGithubAssignee] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('To Do');
  const [storyPoints, setStoryPoints] = useState(3.0);
  const [estimatedHours, setEstimatedHours] = useState(6.0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');
  const [blockerReason, setBlockerReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (status === 'Blocked' && !blockerReason.trim()) {
      setError('Please provide a reason why this task is blocked.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedGithubAssignee = repositoryPeople.find(person => person.login === githubAssignee);
      const res = await apiService.createTask(teamId, {
        title: title.trim(),
        description: description.trim(),
        assignee_id: assigneeId || undefined,
        assignee_github_username: selectedGithubAssignee?.login,
        assignee_name: selectedGithubAssignee?.name,
        priority,
        status,
        story_points: parseFloat(storyPoints) || 1.0,
        estimated_hours: parseFloat(estimatedHours) || 0.0,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        labels: labels.trim() || undefined,
        blocker_reason: status === 'Blocked' ? blockerReason.trim() : undefined
      });
      addToast(`Task '${res.data?.task_key || 'Task'}' created successfully!`, 'success');
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setGithubAssignee('');
      setPriority('Medium');
      setStatus('To Do');
      setStoryPoints(3.0);
      setEstimatedHours(6.0);
      setStartDate('');
      setDueDate('');
      setLabels('');
      setBlockerReason('');
      if (onTaskCreated) {
        onTaskCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span>Create Team Task</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement OAuth JWT verification middleware"
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
              placeholder="Provide technical requirements, pull request links, or branch dependencies..."
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
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={githubAssignee ? `github:${githubAssignee}` : assigneeId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('github:')) {
                      setGithubAssignee(value.slice('github:'.length));
                      setAssigneeId('');
                    } else {
                      setGithubAssignee('');
                      setAssigneeId(value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                >
                  <option value="">Unassigned</option>
                  <optgroup label="SquadSync Team Members">
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name} ({m.role || 'Member'}) {m.github_username ? `· @${m.github_username}` : ''}
                      </option>
                    ))}
                  </optgroup>
                  {repositoryPeople.length > 0 && (
                    <optgroup label="Discovered GitHub Contributors">
                      {repositoryPeople.map(person => (
                        <option key={`github-${person.login}`} value={`github:${person.login}`}>
                          {person.name} (@{person.login}) · {person.status}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-medium"
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
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-medium"
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
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Start Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Labels / Tags (Optional)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. backend, auth, database, frontend"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Blocker Reason if Blocked */}
          {status === 'Blocked' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Blocker Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Explain what is blocking this task (e.g. waiting for GitHub PR review, backend API endpoint not ready)..."
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-900 resize-none"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} icon={Plus}>
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
