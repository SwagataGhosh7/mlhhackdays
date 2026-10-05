import React, { useState, useEffect } from 'react';
import { ExternalLink, Github, UserSearch } from 'lucide-react';
import { GitHubUserProfile } from '../types';

export type ActiveTab =
  | 'overview'
  | 'recommendations'
  | 'plan'
  | 'risks'
  | 'issues'
  | 'discussion'
  | 'browse'
  | 'profile';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onExportRoadmap: () => void;
  copiedRoadmap: boolean;
  authenticatedUser: GitHubUserProfile | null;
  onConnectGitHub: () => void;
  isConnectingGitHub: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onExportRoadmap,
  copiedRoadmap,
  authenticatedUser,
  onConnectGitHub,
  isConnectingGitHub,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [authenticatedUser?.avatarUrl]);

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'recommendations', label: 'Recommended Issues' },
    { id: 'plan', label: 'Contribution Plan' },
    { id: 'risks', label: 'Maintenance Risks' },
    { id: 'issues', label: 'Issue Explorer' },
    { id: 'discussion', label: 'General Discussion' },
    { id: 'profile', label: 'My GitHub & Repos' },
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

      {/* Zone 2: Navigation links */}
      <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-400">
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

      {/* Zone 3: Separate Browse Profile Button + Export PDF + Dedicated Connect GitHub Auth Button */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onSelectTab('browse')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'browse'
              ? 'bg-sky-400 text-slate-950 border-sky-400'
              : 'text-sky-400 bg-slate-900 border-sky-500/40 hover:bg-slate-800 hover:border-sky-400'
          }`}
        >
          <UserSearch className="w-3.5 h-3.5" />
          <span>Browse Profile</span>
        </button>

        <button
          type="button"
          onClick={onExportRoadmap}
          className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copiedRoadmap ? 'Downloaded PDF' : 'Export Roadmap PDF'}
        </button>

        {/* Dedicated Connect GitHub Authentication Option (never overwritten by Browse Profile) */}
        {authenticatedUser ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                  : 'text-emerald-300 bg-slate-900 border-emerald-500/50 hover:border-emerald-400'
              }`}
              title="Open your authenticated GitHub account & repositories"
            >
              {authenticatedUser.avatarUrl && !imgError ? (
                <img
                  src={authenticatedUser.avatarUrl}
                  alt={authenticatedUser.login}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                  {authenticatedUser.login.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>My GitHub (@{authenticatedUser.login})</span>
            </button>
            <a
              href={authenticatedUser.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-sky-400 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
              title={`Open @${authenticatedUser.login} on GitHub`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <button
            type="button"
            disabled={isConnectingGitHub}
            onClick={onConnectGitHub}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
