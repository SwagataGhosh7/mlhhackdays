import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, RefreshCw, ExternalLink, UserSearch } from 'lucide-react';
import { RepoMetadata, SkillLevel, UserAccessibleRepo } from '../types';

interface RepoCommandBarProps {
  repo: RepoMetadata;
  hasAnalyzedRepo?: boolean;
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
  hasAnalyzedRepo = false,
  skillLevel,
  onSkillLevelChange,
  onAnalyzeRepo,
  onBrowseUser,
  onOpenBrowseProfileTab,
  isAnalyzing,
  errorMessage,
}) => {
  const [repoInput, setRepoInput] = useState<string>('');
  const [focusArea, setFocusArea] = useState<string>('All Areas');
  const [showProfileUrlBar, setShowProfileUrlBar] = useState<boolean>(false);
  const [profileUrlInput, setProfileUrlInput] = useState<string>('');

  useEffect(() => {
    if (hasAnalyzedRepo && repo.fullName) {
      setRepoInput(`github.com/${repo.fullName}`);
    }
  }, [hasAnalyzedRepo, repo.fullName]);

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
    <section className="border-b-2 border-[#15803D] bg-green-grid-surface">
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Top Row: Title + Quick Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div className="max-w-3xl">
            <p className="text-xs font-mono text-[#15803D] font-semibold mb-1.5">
              ContribLens · Open-Source Repository &amp; Contribution Platform
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F0D] [text-wrap:balance]">
              Find the right open-source problem to solve and know how to contribute.
            </h1>
            <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
              ContribLens analyzes real GitHub repositories, matches contribution opportunities to your skills, explains unfamiliar issues, and guides you toward a safe contribution.
            </p>
          </div>

          {/* Skill Level Interactive Segmented Control + Separate Browse Profile Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowProfileUrlBar((prev) => !prev);
                onOpenBrowseProfileTab();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-[#15803D] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] hover:bg-[#F1F5F3] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <UserSearch className="w-4 h-4 text-[#15803D]" />
              <span>Browse Profile</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] hidden sm:inline">Skill Level:</span>
              <div className="flex items-center gap-1 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg">
                {skillLevels.map((level) => {
                  const active = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onSkillLevelChange(level)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#15803D] text-white font-semibold'
                          : 'text-[#64748B] hover:text-[#111827]'
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

        {/* Green Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#15803D] via-[#22C55E] to-[#DDE5DF] mb-5 rounded-full" />

        {/* Repository Input Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 relative flex items-center">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="Enter GitHub repository URL (e.g. github.com/owner/project)"
              aria-label="GitHub repository URL or owner/project"
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D] transition-colors"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              aria-label="Contribution focus area"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#111827] focus:outline-none focus:border-[#15803D] transition-colors"
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
              className="w-full h-full px-4 py-2.5 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
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
            className="mt-3 p-3.5 bg-[#F8FAF9] border border-[#15803D]/30 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
          >
            <div className="lg:col-span-9 relative flex items-center">
              <UserSearch className="w-4 h-4 text-[#15803D] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={profileUrlInput}
                onChange={(e) => setProfileUrlInput(e.target.value)}
                placeholder="Paste GitHub user profile URL (e.g. https://github.com/torvalds or https://github.com/tiangolo)"
                aria-label="Paste GitHub user profile URL"
                className="w-full pl-10 pr-4 py-2 text-sm font-mono bg-white border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D] transition-colors"
              />
            </div>
            <div className="lg:col-span-3">
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Load GitHub Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
            <span>Error: {errorMessage}</span>
          </div>
        )}

        {/* Active Repository Summary Strip (Only shown after a repository is analyzed) */}
        {hasAnalyzedRepo && repo.fullName && (
          <div className="mt-6 pt-5 border-t border-[#15803D]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold font-mono text-[#0B0F0D]">{repo.fullName}</h2>
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#64748B] hover:text-[#15803D] transition-colors"
                  title="Open repository on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-sm text-[#111827] max-w-3xl">{repo.description}</p>
            </div>

            {/* Unboxed Metadata with Typographic Separators */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#64748B] shrink-0">
              <span className={repo.isPrivate ? 'text-amber-700 font-semibold' : 'text-[#111827]'}>
                {repo.isPrivate ? 'Private Repo' : 'Public Repo'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#15803D] font-semibold">{repo.language}</span>
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
        )}
      </div>
    </section>
  );
};
