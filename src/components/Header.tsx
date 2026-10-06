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
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white/95 backdrop-blur border-b border-[#DDE5DF]">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('overview');
        }}
        className="text-lg font-bold tracking-tight text-[#0B0F0D] hover:text-[#15803D] transition-colors whitespace-nowrap"
      >
        ContribLens
      </a>

      {/* Zone 2: Navigation links */}
      <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-[#64748B]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
                isActive
                  ? 'text-[#15803D] font-semibold border-[#15803D]'
                  : 'text-[#64748B] border-transparent hover:text-[#111827] hover:border-[#DDE5DF]'
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
              ? 'bg-[#15803D] text-white border-[#15803D]'
              : 'text-[#15803D] bg-white border-[#DDE5DF] hover:bg-[#F1F5F3] hover:border-[#15803D]'
          }`}
        >
          <UserSearch className="w-3.5 h-3.5" />
          <span>Browse Profile</span>
        </button>

        <button
          type="button"
          onClick={onExportRoadmap}
          className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-[#111827] bg-white border border-[#DDE5DF] rounded-lg hover:bg-[#F1F5F3] hover:border-[#15803D]/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                  ? 'bg-[#15803D] text-white border-[#15803D]'
                  : 'text-[#166534] bg-[#F8FAF9] border-[#15803D]/40 hover:border-[#15803D]'
              }`}
              title="Open your authenticated GitHub account & repositories"
            >
              {authenticatedUser.avatarUrl && !imgError ? (
                <img
                  src={authenticatedUser.avatarUrl}
                  alt={authenticatedUser.login}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-5 h-5 rounded-full object-cover border border-[#DDE5DF]"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-[#15803D]/15 text-[#15803D] flex items-center justify-center text-[10px] font-bold">
                  {authenticatedUser.login.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>My GitHub (@{authenticatedUser.login})</span>
            </button>
            <a
              href={authenticatedUser.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#64748B] hover:text-[#15803D] bg-white border border-[#DDE5DF] hover:border-[#15803D] rounded-lg transition-colors"
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
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
