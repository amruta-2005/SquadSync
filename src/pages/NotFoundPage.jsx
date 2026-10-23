import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center p-6">
      <div className="max-w-md space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto font-bold text-2xl">
          404
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested SquadSync analytics view does not exist or may have been moved.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" icon={Home}>
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" icon={ArrowLeft}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
