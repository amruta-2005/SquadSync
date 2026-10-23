import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Layers, UserPlus } from 'lucide-react';
import apiService from '../services/api';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToast, refreshTeams, setSelectedTeamId } = useApp();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInv() {
      if (!token) {
        setError('No invitation token was provided in the link.');
        setLoading(false);
        return;
      }
      try {
        const res = await apiService.getInvitationByToken(token);
        setInvitation(res.data);
      } catch (err) {
        setError(err.message || 'Invitation is invalid, expired, or already accepted.');
      } finally {
        setLoading(false);
      }
    }
    fetchInv();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await apiService.acceptInvitationByToken(token);
      setSuccess(true);
      addToast(res.message || 'Invitation accepted successfully!', 'success');
      await refreshTeams();
      if (invitation?.team_id) {
        setSelectedTeamId(invitation.team_id);
      }
      setTimeout(() => {
        navigate('/tasks');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SquadSync Invitation</h1>
          <p className="text-xs text-slate-500 mt-1">Workload Imbalance & Risk Detection Platform</p>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Validating invitation token...
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Invitation Invalid or Expired</h2>
              <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="secondary" size="sm" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Welcome to the Team!</h2>
              <p className="text-xs text-slate-500">
                You have joined <strong>{invitation?.team_name}</strong>. Redirecting you to your team tasks...
              </p>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <UserPlus className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  You're invited to join <span className="text-purple-700">{invitation?.team_name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Invited email: <strong>{invitation?.email}</strong>
                  <br />
                  Assigned role: <span className="capitalize font-semibold text-slate-800">{invitation?.role}</span>
                </p>
              </div>

              {isAuthenticated ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    Logged in as <strong>{user?.name}</strong> ({user?.email})
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    loading={accepting}
                    onClick={handleAccept}
                    icon={CheckCircle2}
                  >
                    Accept Invitation & Join Team
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-500">
                    Sign in or create an account to accept this team invitation.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link to={`/login?invite_token=${token}`}>
                      <Button variant="secondary" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to={`/register?invite_token=${token}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        Register
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
