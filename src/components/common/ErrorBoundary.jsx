import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronRight } from 'lucide-react';
import Button from './Button';

/**
 * SquadSync ErrorBoundary component.
 * Catches unhandled JavaScript exceptions in child component trees,
 * logs technical diagnostics, and displays a graceful fallback screen
 * in the SquadSync purple theme instead of crashing the entire application.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught unhandled rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      const isPageLevel = this.props.level === 'page';

      return (
        <div className={`flex flex-col items-center justify-center p-6 text-center ${isPageLevel ? 'py-16' : 'min-h-[360px]'}`}>
          <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-sm mb-4">
            <AlertTriangle className="w-7 h-7 text-purple-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {this.props.title || 'Something went wrong in this section'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
            {this.props.message ||
              'A rendering issue occurred while displaying this section of SquadSync. Your data has not been lost.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={this.handleReset}
            >
              Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={this.handleReload}
            >
              Reload Page
            </Button>
            <Button
              variant="ghost"
              icon={Home}
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Technical Diagnostics (Collapsible) */}
          {this.state.error && (
            <div className="w-full max-w-xl mx-auto text-left border border-slate-200 rounded-xl bg-slate-50 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="w-full px-4 py-2.5 flex items-center justify-between text-slate-600 hover:text-slate-900 font-semibold transition-colors"
              >
                <span>Technical Diagnostics</span>
                {this.state.showDetails ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {this.state.showDetails && (
                <div className="p-4 border-t border-slate-200 bg-white font-mono text-[11px] text-slate-800 overflow-x-auto space-y-2">
                  <p className="text-rose-600 font-bold">{String(this.state.error?.message || this.state.error)}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slate-500 whitespace-pre-wrap text-[10px] max-h-48 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
