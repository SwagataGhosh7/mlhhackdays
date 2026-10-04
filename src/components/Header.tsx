import React from 'react';
import { GitHubUserProfile } from '../types';

export type ActiveTab =
  | 'overview'
  | 'recommendations'
  | 'plan'
  | 'risks'
  | 'issues'
  | 'profile';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onExportRoadmap: () => void;
  copiedRoadmap: boolean;
  linkedUser: GitHubUserProfile | null;
  onConnectGitHub: () => void;
  isConnectingGitHub: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onExportRoadmap,
  copiedRoadmap,
  linkedUser,
  onConnectGitHub,
  isConnectingGitHub,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'recommendations', label: 'Recommended Issues' },
    { id: 'plan', label: 'Contribution Plan' },
    { id: 'risks', label: 'Maintenance Risks' },
    { id: 'issues', label: 'Issue Explorer' },
    { id: 'profile', label: 'My Contributions' },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-slate-950/95 backdrop-blur border-b border-slate-800/90">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('overview');
        }}
        className="text-lg font-bold tracking-tight text-slate-100 hover:text-sky-400 transition-colors whitespace-nowrap"
      >
        ContribLens
      </a>

      {/* Zone 2: 6 clean single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
                isActive
                  ? 'text-slate-100 border-sky-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExportRoadmap}
          className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copiedRoadmap ? 'Downloaded PDF' : 'Export Roadmap PDF'}
        </button>

        {linkedUser ? (
          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            className="px-3.5 py-2 text-xs font-mono font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            @{linkedUser.login}
          </button>
        ) : (
          <button
            type="button"
            disabled={isConnectingGitHub}
            onClick={onConnectGitHub}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}
          </button>
        )}
      </div>
    </header>
  );
};
