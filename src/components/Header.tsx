import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Compass,
  ExternalLink,
  FileSpreadsheet,
  GitPullRequest,
  Github,
  Home,
  LayoutGrid,
  MessageSquare,
  Moon,
  ShieldAlert,
  Sparkles,
  Sun,
  UserCheck,
  UserSearch,
} from 'lucide-react';
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
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const DASHBOARD_DIRECTORY: Array<{
  id: ActiveTab;
  label: string;
  shortLabel: string;
  description: string;
  badgeText: string;
}> = [
  {
    id: 'overview',
    label: 'Overview (Home)',
    shortLabel: 'Overview',
    description: 'Repository health score, 30-day activity sparkline & architecture summary',
    badgeText: 'Home',
  },
  {
    id: 'recommendations',
    label: 'Recommended Issues',
    shortLabel: 'Recommended',
    description: 'Curated open-source issues matched to your skill level & impact score',
    badgeText: 'Matcher',
  },
  {
    id: 'plan',
    label: 'Contribution Plan',
    shortLabel: 'Contribution Plan',
    description: 'Step-by-step PR execution roadmap, setup commands & ContribSim verification',
    badgeText: 'Roadmap',
  },
  {
    id: 'risks',
    label: 'Maintenance Risks',
    shortLabel: 'Risks Audit',
    description: 'Maintainer bus factor, review bottlenecks & repository risk telemetry',
    badgeText: 'Audit',
  },
  {
    id: 'issues',
    label: 'Issue Explorer',
    shortLabel: 'Issue Explorer',
    description: 'Filterable open GitHub issues paired with repository codebase tree',
    badgeText: 'Explorer',
  },
  {
    id: 'discussion',
    label: 'General Discussion',
    shortLabel: 'Discussion',
    description: 'Contributor discussion threads, onboarding Q&A & maintainer notes',
    badgeText: 'Community',
  },
  {
    id: 'browse',
    label: 'Browse Profile',
    shortLabel: 'Browse Profile',
    description: 'Inspect any public GitHub developer profile & open-source footprint',
    badgeText: 'Lookup',
  },
  {
    id: 'profile',
    label: 'My GitHub & Repos',
    shortLabel: 'My GitHub',
    description: 'Your authenticated GitHub account, repositories & personal contributions',
    badgeText: 'Account',
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onExportRoadmap,
  copiedRoadmap,
  authenticatedUser,
  onConnectGitHub,
  isConnectingGitHub,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [authenticatedUser?.avatarUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentDashboard =
    DASHBOARD_DIRECTORY.find((d) => d.id === activeTab) || DASHBOARD_DIRECTORY[0];

  const getDashboardIcon = (id: ActiveTab) => {
    switch (id) {
      case 'overview':
        return <Home className="w-4 h-4 text-[#15803D]" />;
      case 'recommendations':
        return <Sparkles className="w-4 h-4 text-[#15803D]" />;
      case 'plan':
        return <GitPullRequest className="w-4 h-4 text-[#15803D]" />;
      case 'risks':
        return <ShieldAlert className="w-4 h-4 text-[#15803D]" />;
      case 'issues':
        return <Compass className="w-4 h-4 text-[#15803D]" />;
      case 'discussion':
        return <MessageSquare className="w-4 h-4 text-[#15803D]" />;
      case 'browse':
        return <UserSearch className="w-4 h-4 text-[#15803D]" />;
      case 'profile':
        return <UserCheck className="w-4 h-4 text-[#15803D]" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur border-b border-[#DDE5DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark + Home (Overview) + Dashboards Redirect Launcher */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <a
            href="#/overview"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('overview');
              setIsMenuOpen(false);
            }}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0B0F0D] hover:text-[#15803D] transition-colors whitespace-nowrap shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] shrink-0" />
            <span>ContribLens</span>
          </a>

          <div className="h-5 w-[1px] bg-[#DDE5DF] shrink-0" aria-hidden="true" />

          {/* Primary Home / Overview Button (Only Overview shown directly in Home header) */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('overview');
              setIsMenuOpen(false);
            }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#15803D] text-white shadow-2xs'
                : 'text-[#111827] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          {/* Dashboards Selector Dropdown (Redirects to desired dashboard on click) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab !== 'overview'
                  ? 'bg-[#F8FAF9] text-[#15803D] border-[#15803D]'
                  : 'bg-white text-[#111827] border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D]'
              }`}
              aria-expanded={isMenuOpen}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#15803D]" />
              <span>
                {activeTab === 'overview'
                  ? 'Dashboards'
                  : `Dashboard: ${currentDashboard.shortLabel}`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-[#166534]/40 shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-[#DDE5DF] flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#15803D]">
                    Select Workspace Dashboard
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Click to redirect
                  </span>
                </div>
                <div className="divide-y divide-[#DDE5DF]/60 max-h-[70vh] overflow-y-auto">
                  {DASHBOARD_DIRECTORY.map((item) => {
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-[#F1F5F3] text-[#0B0F0D]'
                            : 'hover:bg-[#F8FAF9] text-[#111827]'
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-[#F8FAF9] border border-[#DDE5DF] shrink-0">
                          {getDashboardIcon(item.id)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isSelected ? 'text-[#15803D]' : 'text-[#0B0F0D]'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F3] text-[#166534] border border-[#DDE5DF] shrink-0">
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone 2: Right Utility & Auth Controls (Always Visible, Never Pushed Off-Screen) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-2.5 sm:px-3 py-2 text-xs font-semibold text-[#111827] bg-white border border-[#DDE5DF] hover:border-[#15803D] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#15803D]" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectTab('browse')}
            className={`hidden sm:inline-flex px-3 py-2 text-xs font-semibold rounded-lg border transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
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
            className="hidden lg:inline-flex px-3 py-2 text-xs font-semibold text-[#111827] bg-white border border-[#DDE5DF] rounded-lg hover:bg-[#F1F5F3] hover:border-[#15803D]/50 transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
            <span>{copiedRoadmap ? 'Downloaded PDF' : 'Export PDF'}</span>
          </button>

          {/* Dedicated Connect GitHub Authentication Button (Always prominently visible) */}
          {authenticatedUser ? (
            <div className="flex items-center gap-1.5 shrink-0">
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
                <span>@{authenticatedUser.login}</span>
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
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              <Github className="w-3.5 h-3.5" />
              <span>{isConnectingGitHub ? 'Connecting...' : 'Connect GitHub'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

