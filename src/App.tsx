/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { RepoCommandBar } from './components/RepoCommandBar';
import { OverviewSection } from './components/OverviewSection';
import { RecommendedIssuesSection } from './components/RecommendedIssuesSection';
import { ContributionPlanSection } from './components/ContributionPlanSection';
import { MaintenanceRisksSection } from './components/MaintenanceRisksSection';
import { IssueExplorerSection } from './components/IssueExplorerSection';
import { PersonalContributionsSection } from './components/PersonalContributionsSection';
import { exportRoadmapToPdf } from './utils/exportRoadmapPdf';
import { signInWithGitHubFirebasePopup, signOutFirebase } from './firebase';
import {
  analyzeRepoDirectFromGitHub,
  buildContributionPlanClientFallback,
  fetchUserProfileDirectFromGitHub,
} from './utils/clientGitHubDirect';
import {
  INITIAL_ANALYSIS_REPORT,
  INITIAL_CONTRIBUTION_PLAN,
} from './data/presetShowcase';
import {
  ContribLensAnalysisResponse,
  ContributionPlan,
  GitHubIssueItem,
  RecommendedIssue,
  SkillLevel,
  UserContributionProfile,
} from './types';

const SESSION_STORAGE_KEY = 'contriblens_gh_session_id';
const ACCESS_TOKEN_STORAGE_KEY = 'contriblens_gh_access_token';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Beginner');
  const [report, setReport] = useState<ContribLensAnalysisResponse>(INITIAL_ANALYSIS_REPORT);
  const [activePlan, setActivePlan] = useState<ContributionPlan>(INITIAL_CONTRIBUTION_PLAN);
  const [planCache, setPlanCache] = useState<Record<string, ContributionPlan>>({
    'pallets/click#184': INITIAL_CONTRIBUTION_PLAN,
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRoadmap, setCopiedRoadmap] = useState<boolean>(false);
  const [recentRepos, setRecentRepos] = useState<string[]>(['pallets/click']);

  // GitHub OAuth & Personal Contribution Profile state
  const [userProfile, setUserProfile] = useState<UserContributionProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState<boolean>(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      headers.Authorization = `Bearer ${storedSession}`;
    }
    return headers;
  }, []);

  const fetchUserProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const res = await fetch('/api/auth/github/profile', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.authenticated) {
            setUserProfile(data as UserContributionProfile);
            return;
          }
        }
      }
      // Fallback for static Vercel deployment using stored Firebase GitHub access token
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (storedAccessToken) {
        const directProfile = await fetchUserProfileDirectFromGitHub(storedAccessToken);
        setUserProfile(directProfile);
      } else {
        setUserProfile(null);
      }
    } catch {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (storedAccessToken) {
        try {
          const directProfile = await fetchUserProfileDirectFromGitHub(storedAccessToken);
          setUserProfile(directProfile);
          return;
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [getAuthHeaders]);

  // Listen for OAuth popup postMessage completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data?.sessionId) {
          localStorage.setItem(SESSION_STORAGE_KEY, event.data.sessionId);
        }
        setIsConnectingGitHub(false);
        fetchUserProfile();
        setActiveTab('profile');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchUserProfile]);

  // Check existing session on mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleConnectGitHub = async () => {
    setIsConnectingGitHub(true);
    setErrorMessage(null);
    try {
      // 1. Primary flow: Firebase Auth GithubAuthProvider popup (contriblens.firebaseapp.com/__/auth/handler)
      const { accessToken } = await signInWithGitHubFirebasePopup();
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);

      try {
        const tokenRes = await fetch('/api/auth/github/token-session', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ accessToken }),
        });
        const contentType = tokenRes.headers.get('content-type') || '';
        if (tokenRes.ok && contentType.includes('application/json')) {
          const tokenData = await tokenRes.json();
          if (tokenData.sessionId) {
            localStorage.setItem(SESSION_STORAGE_KEY, tokenData.sessionId);
          }
        }
      } catch {
        // Static Vercel deployment without /api backend — direct GitHub API mode will use ACCESS_TOKEN_STORAGE_KEY
      }

      await fetchUserProfile();
      setActiveTab('profile');
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code || '';
      const msg = firebaseErr?.message || '';

      if (code === 'auth/popup-closed-by-user') {
        setIsConnectingGitHub(false);
        return;
      }

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setErrorMessage(
          `Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setErrorMessage(msg || 'GitHub Firebase authentication failed.');
      }

      // Fallback: if server has GITHUB_TOKEN configured, still link session so user isn't blocked
      try {
        const linkRes = await fetch('/api/auth/github/link-session', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          if (linkData.sessionId) {
            localStorage.setItem(SESSION_STORAGE_KEY, linkData.sessionId);
          }
          await fetchUserProfile();
          setActiveTab('profile');
        }
      } catch {
        // Ignore fallback error
      }
    } finally {
      setIsConnectingGitHub(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await signOutFirebase();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      }).catch(() => {});
    } finally {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      setUserProfile(null);
    }
  };

  const fetchOrLoadContributionPlan = async (
    currentReport: ContribLensAnalysisResponse,
    issueNumber: number,
    issueTitle: string,
    issueBody: string,
    issueUrl: string,
    switchToPlanTab: boolean
  ) => {
    if (switchToPlanTab) {
      setActiveTab('plan');
    }

    const cacheKey = `${currentReport.repo.fullName}#${issueNumber}`;
    if (planCache[cacheKey]) {
      setActivePlan(planCache[cacheKey]);
      return;
    }

    setIsGeneratingPlan(true);
    setErrorMessage(null);

    try {
      let generatedPlan: ContributionPlan | null = null;
      try {
        const response = await fetch('/api/contribution-plan', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            repoFullName: currentReport.repo.fullName,
            issueNumber,
            issueTitle,
            issueBody,
            issueUrl,
            language: currentReport.repo.language,
            fileTree: currentReport.fileTree.map((f) => f.path),
            skillLevel: currentReport.targetSkillLevel || skillLevel,
          }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          generatedPlan = (await response.json()) as ContributionPlan;
        }
      } catch {
        // Fallback below for static Vercel deployments
      }

      if (!generatedPlan) {
        generatedPlan = buildContributionPlanClientFallback(
          currentReport.repo.fullName,
          issueNumber,
          issueTitle,
          issueBody,
          issueUrl,
          currentReport.repo.language,
          currentReport.fileTree.map((f) => f.path),
          currentReport.targetSkillLevel || skillLevel
        );
      }

      setActivePlan(generatedPlan);
      setPlanCache((prev) => ({ ...prev, [cacheKey]: generatedPlan! }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not generate contribution plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAnalyzeRepo = async (
    repoInput: string,
    targetLevel: SkillLevel,
    focusArea: string
  ) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let newReport: ContribLensAnalysisResponse | null = null;
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            repoInput,
            skillLevel: targetLevel,
            focusArea,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          newReport = (await response.json()) as ContribLensAnalysisResponse;
        } else if (response.status === 400 || response.status === 404) {
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            throw new Error(errJson?.error || 'Repository not found.');
          }
        }
      } catch (serverErr: any) {
        // If static Vercel deployment (no /api server), analyze directly via GitHub REST API
        const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        newReport = await analyzeRepoDirectFromGitHub(repoInput, targetLevel, storedToken);
      }

      if (!newReport) {
        const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        newReport = await analyzeRepoDirectFromGitHub(repoInput, targetLevel, storedToken);
      }

      setReport(newReport);
      if (activeTab === 'profile') {
        setActiveTab('overview');
      }

      setRecentRepos((prev) => {
        const next = [
          newReport.repo.fullName,
          ...prev.filter((r) => r.toLowerCase() !== newReport.repo.fullName.toLowerCase()),
        ];
        return next.slice(0, 6);
      });

      // Automatically prepare the contribution plan for the top recommended issue
      if (newReport.recommendedIssues && newReport.recommendedIssues.length > 0) {
        const firstIssue = newReport.recommendedIssues[0];
        await fetchOrLoadContributionPlan(
          newReport,
          firstIssue.issueNumber,
          firstIssue.title,
          firstIssue.plainExplanation.summary,
          firstIssue.htmlUrl,
          false
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to analyze repository at this time.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectRecommendedIssue = (issue: RecommendedIssue) => {
    fetchOrLoadContributionPlan(
      report,
      issue.issueNumber,
      issue.title,
      `${issue.plainExplanation.summary}\n${issue.plainExplanation.technicalContext}`,
      issue.htmlUrl,
      true
    );
  };

  const handleSelectRawIssue = (issue: GitHubIssueItem) => {
    fetchOrLoadContributionPlan(
      report,
      issue.number,
      issue.title,
      issue.body,
      issue.htmlUrl,
      true
    );
  };

  const handleGenerateCustomPlan = (
    issueNumber: number,
    issueTitle: string,
    issueBody: string
  ) => {
    fetchOrLoadContributionPlan(
      report,
      issueNumber,
      issueTitle,
      issueBody,
      `https://github.com/${report.repo.fullName}/issues/${issueNumber}`,
      true
    );
  };

  const handleExportRoadmap = () => {
    exportRoadmapToPdf(report, activePlan);
    setCopiedRoadmap(true);
    setTimeout(() => setCopiedRoadmap(false), 2200);
  };

  const mobileTabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'recommendations', label: 'Recommended' },
    { id: 'plan', label: 'Contribution Plan' },
    { id: 'risks', label: 'Risks' },
    { id: 'issues', label: 'Issues' },
    { id: 'profile', label: 'My Contributions' },
  ];

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* 3-Zone Top Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportRoadmap={handleExportRoadmap}
        copiedRoadmap={copiedRoadmap}
        linkedUser={userProfile?.user || null}
        onConnectGitHub={handleConnectGitHub}
        isConnectingGitHub={isConnectingGitHub}
      />

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 bg-slate-950 border-b border-slate-800 overflow-x-auto">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-sky-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Repository Input & Skill Targeting Command Bar */}
      <RepoCommandBar
        repo={report.repo}
        skillLevel={skillLevel}
        onSkillLevelChange={(newLevel) => {
          setSkillLevel(newLevel);
        }}
        onAnalyzeRepo={handleAnalyzeRepo}
        isAnalyzing={isAnalyzing}
        errorMessage={errorMessage}
        recentRepos={recentRepos}
        userRepos={userProfile?.accessibleRepos || []}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewSection
            report={report}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            onNavigateTab={setActiveTab}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendedIssuesSection
            recommendedIssues={report.recommendedIssues}
            activePlanIssueNumber={activePlan.issueNumber}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'plan' && (
          <ContributionPlanSection
            plan={activePlan}
            recommendedIssues={report.recommendedIssues}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            onGenerateCustomPlan={handleGenerateCustomPlan}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'risks' && (
          <MaintenanceRisksSection
            risks={report.maintenanceRisks}
            stats={report.stats}
            onNavigateToRecommendations={() => setActiveTab('recommendations')}
          />
        )}

        {activeTab === 'issues' && (
          <IssueExplorerSection
            openIssues={report.openIssues}
            fileTree={report.fileTree}
            onGeneratePlanFromRawIssue={handleSelectRawIssue}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'profile' && (
          <PersonalContributionsSection
            profile={userProfile}
            isLoadingProfile={isLoadingProfile}
            onConnectGitHub={handleConnectGitHub}
            onDisconnectGitHub={handleDisconnectGitHub}
            onRefreshProfile={fetchUserProfile}
            onAnalyzeRepoByName={(fullName) =>
              handleAnalyzeRepo(fullName, skillLevel, 'All Areas')
            }
            isAnalyzingRepo={isAnalyzing}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>ContribLens — Open-Source Contribution Intelligence</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Health Score
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Recommended Issues
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Contribution Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              My Contributions
            </button>
            <a
              href={report.repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
