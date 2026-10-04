import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, RefreshCw, ExternalLink, Lock } from 'lucide-react';
import { RepoMetadata, SkillLevel, UserAccessibleRepo } from '../types';
import { PRESET_REPOSITORIES } from '../data/presetShowcase';

interface RepoCommandBarProps {
  repo: RepoMetadata;
  skillLevel: SkillLevel;
  onSkillLevelChange: (level: SkillLevel) => void;
  onAnalyzeRepo: (repoInput: string, skillLevel: SkillLevel, focusArea: string) => void;
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
  isAnalyzing,
  errorMessage,
  recentRepos,
  userRepos,
}) => {
  const [repoInput, setRepoInput] = useState<string>(`github.com/${repo.fullName}`);
  const [focusArea, setFocusArea] = useState<string>('All Areas');

  useEffect(() => {
    setRepoInput(`github.com/${repo.fullName}`);
  }, [repo.fullName]);

  const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  const focusAreas = ['All Areas', 'Bug Fixes', 'Core Logic & Parsing', 'Testing & QA', 'Documentation'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim() || isAnalyzing) return;
    onAnalyzeRepo(repoInput.trim(), skillLevel, focusArea);
  };

  const handlePresetClick = (fullName: string) => {
    setRepoInput(`github.com/${fullName}`);
    onAnalyzeRepo(fullName, skillLevel, focusArea);
  };

  return (
    <section className="border-b border-slate-800/90 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Top Row: Title + Quick Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono text-sky-400 mb-1.5">
              Open-Source &amp; Private Repository Contribution Intelligence · Powered by GitHub &amp; Gemini
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
              Find the right open-source problem to solve and how to contribute.
            </h1>
          </div>

          {/* Skill Level Interactive Segmented Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
            <span className="text-xs text-slate-400">Contributor Skill Level:</span>
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

        {/* Repository Input Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="Enter public or private GitHub repository (e.g. github.com/owner/project)"
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

        {/* Preset & Personal Repositories Bar */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span className="text-slate-500">Quick-load repository:</span>
          {PRESET_REPOSITORIES.map((preset) => {
            const isCurrent = repo.fullName.toLowerCase() === preset.fullName.toLowerCase();
            return (
              <button
                key={preset.fullName}
                type="button"
                disabled={isAnalyzing}
                onClick={() => handlePresetClick(preset.fullName)}
                className={`font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'text-sky-400 font-semibold underline underline-offset-4'
                    : 'text-slate-400 hover:text-slate-200 hover:underline underline-offset-4'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {userRepos.slice(0, 4).map((uRepo) => {
            const isCurrent = repo.fullName.toLowerCase() === uRepo.fullName.toLowerCase();
            return (
              <button
                key={uRepo.fullName}
                type="button"
                disabled={isAnalyzing}
                onClick={() => handlePresetClick(uRepo.fullName)}
                className={`font-mono transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'text-emerald-400 font-semibold underline underline-offset-4'
                    : 'text-emerald-400/80 hover:text-emerald-300 hover:underline underline-offset-4'
                }`}
              >
                {uRepo.isPrivate && <Lock className="w-3 h-3" />}
                <span>{uRepo.fullName}</span>
              </button>
            );
          })}

          {recentRepos
            .filter(
              (r) =>
                !PRESET_REPOSITORIES.some((p) => p.fullName.toLowerCase() === r.toLowerCase()) &&
                !userRepos.slice(0, 4).some((u) => u.fullName.toLowerCase() === r.toLowerCase())
            )
            .slice(0, 2)
            .map((recent) => (
              <button
                key={recent}
                type="button"
                disabled={isAnalyzing}
                onClick={() => handlePresetClick(recent)}
                className="font-mono text-slate-400 hover:text-slate-200 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {recent}
              </button>
            ))}
        </div>

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
