import React, { useState } from 'react';
import { X, Users, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function CreateTeamModal({ isOpen, onClose, onTeamCreated }) {
  const { addToast, refreshTeams, setSelectedTeamId } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a team workspace name.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiService.createTeam({
        name: name.trim(),
        description: description.trim()
      });
      addToast(`Team '${name.trim()}' created successfully!`, 'success');
      await refreshTeams();
      if (res && res.data && res.data.id) {
        setSelectedTeamId(res.data.id);
      }
      if (onTeamCreated) {
        onTeamCreated(res.data);
      }
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create team workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span>Create Team Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Team / Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Core Engine Team, Capstone Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Objectives (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the project deliverables or semester goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} icon={Sparkles}>
              Create Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
