import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Award,
  Trash2,
  Edit2,
  Kanban,
  List,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  MessageSquare,
  Activity,
  Tag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthProvider';
import apiService from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import ActivityFeed from '../components/common/ActivityFeed';
import { formatDate } from '../utils/formatters';

export default function TasksPage() {
  const { selectedTeam, selectedTeamId, isDemoMode, addToast } = useApp();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [repositoryPeople, setRepositoryPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState('All'); // 'All' | 'Overdue' | 'Upcoming'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  const normalizeStatus = (st) => {
    if (!st) return 'To Do';
    const s = st.toLowerCase().trim();
    if (s === 'todo' || s === 'to do') return 'To Do';
    if (s === 'in progress') return 'In Progress';
    if (s === 'review' || s === 'in review') return 'In Review';
    if (s === 'completed' || s === 'done') return 'Completed';
    if (s === 'blocked') return 'Blocked';
    return st;
  };

  // Load tasks and team members from backend
  const loadData = useCallback(async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      const [tasksRes, membersRes, mappingRes] = await Promise.all([
        apiService.getTasks(selectedTeamId, {
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
          assignee_id: assigneeFilter !== 'All' ? assigneeFilter : undefined
        }),
        apiService.getTeamMembers(selectedTeamId).catch(() => ({ data: [] })),
        apiService.getContributorMapping(selectedTeamId).catch((err) => {
          addToast(`Unable to load repository assignees: ${err.message}`, 'amber');
          return { data: {} };
        })
      ]);

      const loadedTasks = (tasksRes.data || []).map(t => ({
        ...t,
        status: normalizeStatus(t.status)
      }));
      setTasks(loadedTasks);
      setMembers(membersRes.data || []);
      const mapping = mappingRes.data || {};
      const peopleByLogin = new Map();
      (mapping.github_contributors || []).forEach(person => {
        if (person.login) peopleByLogin.set(person.login.toLowerCase(), {
          login: person.login,
          name: person.name || person.login,
          status: 'Contributor'
        });
      });
      (mapping.github_collaborators || []).forEach(person => {
        if (person.login) peopleByLogin.set(person.login.toLowerCase(), {
          login: person.login,
          name: person.name || person.login,
          status: person.source === 'user_provided' ? 'Collaborator · manual' : 'Collaborator'
        });
      });
      (mapping.github_invitations || []).forEach(person => {
        if (person.invitee_login) peopleByLogin.set(person.invitee_login.toLowerCase(), {
          login: person.invitee_login,
          name: person.invitee_name || person.invitee_login,
          status: 'Pending invitation'
        });
      });
      setRepositoryPeople(Array.from(peopleByLogin.values()));
    } catch (err) {
      addToast(`Error loading tasks: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, statusFilter, priorityFilter, assigneeFilter, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await apiService.updateTaskStatus(selectedTeamId, taskId, newStatus);
      addToast(`Task moved to ${newStatus}`, 'success');
      loadData();
    } catch (err) {
      addToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleDeleteTask = async (taskId, taskTitle, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete task "${taskTitle}"?`)) return;
    try {
      await apiService.deleteTask(selectedTeamId, taskId);
      addToast('Task deleted successfully', 'info');
      if (selectedTask?.id === taskId) setSelectedTask(null);
      loadData();
    } catch (err) {
      addToast(`Failed to delete task: ${err.message}`, 'error');
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCsv(true);
    try {
      const res = await apiService.importTasksCsv(selectedTeamId, file, isDemoMode);
      if (res.rejected_count > 0) {
        const rejectionReasons = (res.rejected_rows || [])
          .slice(0, 2)
          .map(r => `Row ${r.row}: ${r.reason}`)
          .join('; ');
        addToast(
          `Imported ${res.imported_count} task(s). ${res.rejected_count} row(s) rejected (${rejectionReasons}${res.rejected_count > 2 ? '...' : ''}).`,
          'amber'
        );
      } else {
        addToast(res.message || `Successfully imported ${res.imported_count} tasks!`, 'success');
      }
      loadData();
    } catch (err) {
      addToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsUploadingCsv(false);
      e.target.value = '';
    }
  };

  // Filter tasks locally by search query and deadline
  const filteredTasks = tasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        task.title?.toLowerCase().includes(q) ||
        task.task_key?.toLowerCase().includes(q) ||
        task.assignee_name?.toLowerCase().includes(q) ||
        task.assignee_github_username?.toLowerCase().includes(q) ||
        task.labels?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (deadlineFilter === 'Overdue') {
      return !!task.overdue;
    }
    if (deadlineFilter === 'Upcoming') {
      return !task.overdue && task.due_date && task.status !== 'Completed';
    }
    return true;
  });

  // Calculate summary metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const inReviewTasks = tasks.filter(t => t.status === 'In Review').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const blockedTasks = tasks.filter(t => t.status === 'Blocked').length;
  const overdueTasks = tasks.filter(t => t.overdue).length;
  const totalPoints = tasks.reduce((sum, t) => sum + (parseFloat(t.story_points) || 0), 0);

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'Critical': return 'rose';
      case 'High': return 'rose';
      case 'Medium': return 'amber';
      case 'Low': return 'slate';
      default: return 'slate';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Completed': return 'emerald';
      case 'In Progress': return 'indigo';
      case 'In Review': return 'purple';
      case 'Blocked': return 'rose';
      case 'To Do': return 'slate';
      default: return 'slate';
    }
  };

  const columns = ['To Do', 'In Progress', 'In Review', 'Completed', 'Blocked'];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Tasks & Assignments</h1>
            <Badge variant="purple">SQLite Backed</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Managing tasks for <span className="font-semibold text-slate-800">{selectedTeam?.name || 'Current Team'}</span> • Dynamic assignment, notifications & blocker detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Import */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
              disabled={isUploadingCsv}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              {isUploadingCsv ? 'Importing...' : 'Import CSV'}
            </span>
          </label>

          <Button
            size="sm"
            variant="secondary"
            icon={Activity}
            onClick={() => setShowActivityDrawer(!showActivityDrawer)}
            className={showActivityDrawer ? 'bg-purple-50 text-purple-700 border-purple-300' : ''}
          >
            {showActivityDrawer ? 'Hide Activity' : 'Activity Log'}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={loadData}
            title="Refresh tasks from SQLite"
          >
            Refresh
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalTasks}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">In Progress</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">{inProgressTasks}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">In Review</p>
          <p className="text-xl font-bold text-purple-700 mt-1">{inReviewTasks}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{completedTasks}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Blocked</p>
          <p className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1.5">
            {blockedTasks}
            {blockedTasks > 0 && <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Overdue</p>
          <p className="text-xl font-bold text-amber-700 mt-1 flex items-center gap-1.5">
            {overdueTasks}
            {overdueTasks > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          </p>
        </div>
      </div>

      {/* Activity Feed Drawer if toggled */}
      {showActivityDrawer && (
        <div className="animate-in fade-in duration-200">
          <ActivityFeed teamId={selectedTeamId} limit={8} title="Live Task Activity Audit Log" />
        </div>
      )}

      {/* Filters & View Mode Bar */}
      <Card className="p-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search title, key, label, assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-medium"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-medium"
            >
              <option value="All">All Assignees</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} ({m.role || 'Member'})
                </option>
              ))}
            </select>

            {/* Deadline Filter */}
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-medium"
            >
              <option value="All">All Deadlines</option>
              <option value="Overdue">Overdue Only</option>
              <option value="Upcoming">Upcoming Only</option>
            </select>
          </div>

          {/* Board / List View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-end md:self-auto">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSkeleton type="cards" count={3} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks match criteria"
          description={
            tasks.length === 0
              ? 'Get started by creating your first team task or importing a task board CSV.'
              : 'No tasks found for the current search/filter combination.'
          }
          actionLabel="Create Task"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : viewMode === 'board' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          {columns.map((colStatus) => {
            const colTasks = filteredTasks.filter(t => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className={`rounded-xl p-3 border transition-colors ${
                  colStatus === 'Blocked'
                    ? 'bg-rose-50/40 border-rose-200'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      colStatus === 'Blocked' ? 'text-rose-700' : 'text-slate-800'
                    }`}>
                      {colStatus}
                    </span>
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      colStatus === 'Blocked'
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-white rounded-xl p-3.5 border shadow-xs hover:border-purple-400 cursor-pointer transition-all space-y-2.5 group relative ${
                        task.status === 'Blocked' ? 'border-rose-300' : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-purple-700">
                          {task.task_key}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                          <button
                            onClick={(e) => handleDeleteTask(task.id, task.title, e)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Blocker reason banner if blocked */}
                      {task.status === 'Blocked' && task.blocker_reason && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 font-medium">{task.blocker_reason}</span>
                        </div>
                      )}

                      {/* Labels */}
                      {task.labels && (
                        <div className="flex flex-wrap gap-1">
                          {task.labels.split(',').slice(0, 3).map((lbl, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[9px]">
                              {lbl.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">
                            {task.assignee_name || (task.assignee_github_username ? `@${task.assignee_github_username}` : 'Unassigned')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-700 font-bold">
                          <Award className="w-3 h-3" />
                          <span>{task.story_points} pt</span>
                        </div>
                      </div>

                      {task.due_date && (
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${
                          task.overdue ? 'text-rose-600 font-bold' : 'text-slate-400'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>Due {formatDate(task.due_date)}</span>
                          {task.overdue && <span>(Overdue)</span>}
                        </div>
                      )}

                      {/* Quick Move Status Selector */}
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value, e)}
                          className="w-full text-[10px] font-semibold py-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 focus:outline-none"
                        >
                          <option value="To Do">Move to: To Do</option>
                          <option value="In Progress">Move to: In Progress</option>
                          <option value="In Review">Move to: In Review</option>
                          <option value="Completed">Move to: Completed</option>
                          <option value="Blocked">Move to: Blocked</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No tasks in {colStatus}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-purple-700 whitespace-nowrap">
                      {task.task_key}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      <div>
                        <span>{task.title}</span>
                        {task.status === 'Blocked' && task.blocker_reason && (
                          <p className="text-[10px] text-rose-600 font-normal truncate mt-0.5">
                            ⛔ {task.blocker_reason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {task.assignee_name || (task.assignee_github_username ? `@${task.assignee_github_username}` : 'Unassigned')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value, e)}
                        className="text-xs font-semibold py-1 px-2 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="In Review">In Review</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-700 whitespace-nowrap">
                      {task.story_points} pt
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {task.due_date ? (
                        <span className={task.overdue ? 'text-rose-600 font-bold' : ''}>
                          {formatDate(task.due_date)} {task.overdue && '⚠️'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeleteTask(task.id, task.title, e)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamId={selectedTeamId}
        members={members}
        repositoryPeople={repositoryPeople}
        onTaskCreated={() => loadData()}
      />

      {/* Task Details / Edit / Discussion Modal */}
      {selectedTask && (
        <TaskDetailsModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          teamId={selectedTeamId}
          members={members}
          repositoryPeople={repositoryPeople}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            loadData();
          }}
          onTaskDeleted={() => {
            setSelectedTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
