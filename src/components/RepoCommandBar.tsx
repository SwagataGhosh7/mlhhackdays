import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, RefreshCw, ExternalLink, UserSearch } from 'lucide-react';
import { RepoMetadata, SkillLevel, UserAccessibleRepo } from '../types';

interface RepoCommandBarProps {
  repo: RepoMetadata;
  skillLevel: SkillLevel;
  onSkillLevelChange: (level: SkillLevel) => void;
  onAnalyzeRepo: (repoInput: string, skillLevel: SkillLevel, focusArea: string) => void;
  onBrowseUser: (username: string) => void;
  onOpenBrowseProfileTab: () => void;
  isAnalyzing: boolean;
  errorMessage: string | null;
  recentRepos: string[];
  userRepos: UserAccessibleRepo[];
}

export const RepoCommandBar: React.FC<RepoCommandBarProps> = ({
  repo,
  skillLevel,
  onSkillLevelChange,
  onAnalyzeRepo,
  onBrowseUser,
  onOpenBrowseProfileTab,
  isAnalyzing,
  errorMessage,
}) => {
  const [repoInput, setRepoInput] = useState<string>(`github.com/${repo.fullName}`);
  const [focusArea, setFocusArea] = useState<string>('All Areas');
  const [showProfileUrlBar, setShowProfileUrlBar] = useState<boolean>(false);
  const [profileUrlInput, setProfileUrlInput] = useState<string>('');

  useEffect(() => {
    setRepoInput(`github.com/${repo.fullName}`);
  }, [repo.fullName]);

  const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  const focusAreas = ['All Areas', 'Bug Fixes', 'Core Logic & Parsing', 'Testing & QA', 'Documentation'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = repoInput.trim();
    if (!raw || isAnalyzing) return;

    // Detect if the user entered a GitHub username or profile URL (e.g. https://github.com/username without /repo)
    const cleaned = raw.replace(/^@+/, '').replace(/\/+$/, '');
    const userUrlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)$/i);
    const singleUserMatch = cleaned.match(/^([a-zA-Z0-9-]+)$/);
    if (raw.startsWith('@') || userUrlMatch || singleUserMatch) {
      const targetUsername = userUrlMatch ? userUrlMatch[1] : cleaned;
      onBrowseUser(targetUsername);
      return;
    }

    onAnalyzeRepo(raw, skillLevel, focusArea);
  };

  const handleProfileUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = profileUrlInput.trim();
    if (!raw) {
      onOpenBrowseProfileTab();
      return;
    }
    const cleaned = raw.replace(/^@+/, '').replace(/\/+$/, '');
    const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)/i);
    const targetUsername = urlMatch ? urlMatch[1] : cleaned;
    onBrowseUser(targetUsername);
  };

  return (
    <section className="border-b border-slate-800/90 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Top Row: Title + Quick Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono text-sky-400 mb-1.5">
              Open-Source &amp; Private Repository Contribution Intelligence · Powered by GitHub &amp; Gemma 4
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
              Find the right open-source problem to solve and how to contribute.
            </h1>
          </div>

          {/* Skill Level Interactive Segmented Control + Separate Browse Profile Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowProfileUrlBar((prev) => !prev);
                onOpenBrowseProfileTab();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-sky-300 bg-slate-950 border border-sky-500/50 hover:border-sky-400 hover:bg-slate-900 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <UserSearch className="w-4 h-4 text-sky-400" />
              <span>Browse Profile</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Skill Level:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                {skillLevels.map((level) => {
                  const active = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onSkillLevelChange(level)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-sky-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Repository Input Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="Enter GitHub repository URL (e.g. github.com/owner/project)"
              aria-label="GitHub repository URL or owner/project"
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              aria-label="Contribution focus area"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-400 transition-colors"
            >
              {focusAreas.map((area) => (
                <option key={area} value={area}>
                  Focus: {area}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full h-full px-4 py-2.5 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze Repo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Expandable Browse Profile by GitHub User URL Bar */}
        {showProfileUrlBar && (
          <form
            onSubmit={handleProfileUrlSubmit}
            className="mt-3 p-3.5 bg-slate-950/90 border border-sky-500/40 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
          >
            <div className="lg:col-span-9 relative flex items-center">
              <UserSearch className="w-4 h-4 text-sky-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={profileUrlInput}
                onChange={(e) => setProfileUrlInput(e.target.value)}
                placeholder="Paste GitHub user profile URL (e.g. https://github.com/torvalds or https://github.com/tiangolo)"
                aria-label="Paste GitHub user profile URL"
                className="w-full pl-10 pr-4 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
            <div className="lg:col-span-3">
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Load GitHub Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mt-4 px-4 py-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center justify-between">
            <span>Error: {errorMessage}</span>
          </div>
        )}

        {/* Active Repository Summary Strip (Unboxed Zero-Pill Metadata) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold font-mono text-slate-100">{repo.fullName}</h2>
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-sky-400 transition-colors"
                title="Open repository on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl">{repo.description}</p>
          </div>

          {/* Unboxed Metadata with Typographic Separators */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-slate-400 shrink-0">
            <span className={repo.isPrivate ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
              {repo.isPrivate ? 'Private Repo' : 'Public Repo'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200 font-semibold">{repo.language}</span>
            <span aria-hidden="true">·</span>
            <span>{repo.license}</span>
            <span aria-hidden="true">·</span>
            <span>{repo.stars.toLocaleString()} stars</span>
            <span aria-hidden="true">·</span>
            <span>{repo.forks.toLocaleString()} forks</span>
            <span aria-hidden="true">·</span>
            <span>{repo.openIssuesCount.toLocaleString()} open issues</span>
            <span aria-hidden="true">·</span>
            <span>branch: {repo.defaultBranch}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
