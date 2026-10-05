import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Github,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { UserContributionProfile } from '../types';

interface GitHubAuthorizeModalProps {
  isOpen: boolean;
  pendingProfile: UserContributionProfile | null;
  isLoading: boolean;
  diagnosticMessage: string | null;
  onConfirmAuthorize: () => void;
  onCancel: () => void;
  onLaunchOAuthPopup: (loginHint?: string) => void;
  onVerifyTokenForPreview: (token: string) => Promise<void>;
}

export const GitHubAuthorizeModal: React.FC<GitHubAuthorizeModalProps> = ({
  isOpen,
  pendingProfile,
  isLoading,
  diagnosticMessage,
  onConfirmAuthorize,
  onCancel,
  onLaunchOAuthPopup,
  onVerifyTokenForPreview,
}) => {
  const [showSwitchAccount, setShowSwitchAccount] = useState<boolean>(false);
  const [loginHint, setLoginHint] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTokenPreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setTokenError(null);
    try {
      await onVerifyTokenForPreview(tokenInput.trim());
      setShowSwitchAccount(false);
      setTokenInput('');
    } catch (err: any) {
      setTokenError(err?.message || 'Invalid GitHub token. Please check your token.');
    }
  };

  const showConsentScreen = pendingProfile && !showSwitchAccount && !isLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-auth-modal-title"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-slate-100" />
            <h2 id="github-auth-modal-title" className="text-sm font-bold text-slate-100">
              Authorize ContribLens with GitHub
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Close authorization dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isLoading && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-sky-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-200">
                Connecting to GitHub &amp; verifying account credentials...
              </p>
              <p className="text-xs text-slate-400">
                Please complete any open GitHub popup window.
              </p>
            </div>
          )}

          {showConsentScreen && pendingProfile && (
            <>
              <div className="text-center space-y-2">
                <div className="text-xs font-mono text-emerald-400">
                  GitHub Account Authorization Request
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  Do you want to authorize @{pendingProfile.user.login}?
                </h3>
                <p className="text-xs text-slate-400">
                  ContribLens is requesting permission to access your GitHub profile and repositories.
                </p>
              </div>

              {/* Account Preview Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {pendingProfile.user.avatarUrl && !avatarFailed ? (
                    <img
                      src={pendingProfile.user.avatarUrl}
                      alt={pendingProfile.user.login}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-12 h-12 rounded-full border border-sky-400/60 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-sky-400/60 flex items-center justify-center text-sm font-bold font-mono text-sky-400 shrink-0">
                      {pendingProfile.user.login.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-100 truncate">
                      {pendingProfile.user.name}
                    </div>
                    <div className="text-xs font-mono text-sky-400 truncate">
                      @{pendingProfile.user.login}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {pendingProfile.stats.publicReposCount} public ·{' '}
                      {pendingProfile.stats.privateReposCount} private repos
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSwitchAccount(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-sky-400 bg-slate-900 border border-slate-700 rounded-lg shrink-0 cursor-pointer"
                >
                  Switch Account
                </button>
              </div>

              {/* Requested Scopes / Permissions */}
              <div className="space-y-2.5 bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Permissions requested by ContribLens:</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-100">Repositories (`repo`):</strong> Read access to your public and private repositories, open issues, pull requests, and commit history.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-100">Profile &amp; Activity (`read:user`, `user:email`):</strong> Read your profile bio, preferred languages, and authored contributions.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Explicit Authorize / Cancel Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-1/3 px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Deny / Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmAuthorize}
                  className="w-full sm:w-2/3 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize @{pendingProfile.user.login}</span>
                </button>
              </div>
            </>
          )}

          {/* Sign-In / Switch Account View */}
          {!isLoading && (!pendingProfile || showSwitchAccount) && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  Connect &amp; Authorize Your GitHub Account
                </h3>
                <p className="text-xs text-slate-400">
                  Choose how you want to authenticate with GitHub. You will be asked to confirm authorization before linking your account.
                </p>
              </div>

              {diagnosticMessage && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-xl text-xs text-amber-200 space-y-1.5">
                  <div className="font-semibold text-amber-300">OAuth Notice:</div>
                  <p>{diagnosticMessage}</p>
                </div>
              )}

              {/* Method 1: Launch GitHub OAuth Popup */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-200">
                  Option 1: GitHub OAuth Popup Window
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={loginHint}
                    onChange={(e) => setLoginHint(e.target.value)}
                    placeholder="Optional: GitHub @username to pre-select"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => onLaunchOAuthPopup(loginHint)}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Open GitHub OAuth Popup</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: Once you authorize an OAuth App on GitHub, GitHub remembers your choice. To see GitHub.com&apos;s own &ldquo;Authorize App&rdquo; screen again, revoke the app under{' '}
                  <a
                    href="https://github.com/settings/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline inline-flex items-center gap-0.5"
                  >
                    <span>github.com/settings/applications</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  .
                </p>
              </div>

              {/* Method 2: Personal Access Token */}
              <form
                onSubmit={handleTokenPreviewSubmit}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Option 2: GitHub Personal Access Token
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=ContribLens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Generate Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste ghp_... or github_pat_..."
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={!tokenInput.trim()}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Verify &amp; Review Permissions
                  </button>
                </div>
                {tokenError && <div className="text-xs text-rose-400 font-mono">{tokenError}</div>}
              </form>

              {pendingProfile && showSwitchAccount && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSwitchAccount(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Back to @{pendingProfile.user.login} authorization
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
