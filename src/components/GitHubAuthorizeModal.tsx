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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F0D]/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-auth-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#DDE5DF] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 bg-[#F8FAF9] border-b border-[#DDE5DF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-[#0B0F0D]" />
            <h2 id="github-auth-modal-title" className="text-sm font-bold text-[#0B0F0D]">
              Authorize ContribLens with GitHub
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#64748B] hover:text-[#0B0F0D] rounded-lg transition-colors cursor-pointer"
            aria-label="Close authorization dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isLoading && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-[#15803D] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#0B0F0D]">
                Connecting to GitHub &amp; verifying account credentials...
              </p>
              <p className="text-xs text-[#64748B]">
                Please complete any open GitHub popup window.
              </p>
            </div>
          )}

          {showConsentScreen && pendingProfile && (
            <>
              <div className="text-center space-y-2">
                <div className="text-xs font-mono text-[#15803D] font-semibold">
                  GitHub Account Authorization Request
                </div>
                <h3 className="text-lg font-bold text-[#0B0F0D]">
                  Do you want to authorize @{pendingProfile.user.login}?
                </h3>
                <p className="text-xs text-[#64748B]">
                  ContribLens is requesting permission to access your GitHub profile and repositories.
                </p>
              </div>

              {/* Account Preview Card */}
              <div className="p-4 bg-[#F8FAF9] border border-[#DDE5DF] rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {pendingProfile.user.avatarUrl && !avatarFailed ? (
                    <img
                      src={pendingProfile.user.avatarUrl}
                      alt={pendingProfile.user.login}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-12 h-12 rounded-full border border-[#15803D]/50 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F3] border border-[#15803D]/50 flex items-center justify-center text-sm font-bold font-mono text-[#15803D] shrink-0">
                      {pendingProfile.user.login.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0B0F0D] truncate">
                      {pendingProfile.user.name}
                    </div>
                    <div className="text-xs font-mono text-[#15803D] truncate">
                      @{pendingProfile.user.login}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] mt-0.5">
                      {pendingProfile.stats.publicReposCount} public ·{' '}
                      {pendingProfile.stats.privateReposCount} private repos
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSwitchAccount(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:text-[#15803D] bg-white border border-[#DDE5DF] rounded-lg shrink-0 cursor-pointer"
                >
                  Switch Account
                </button>
              </div>

              {/* Requested Scopes / Permissions */}
              <div className="space-y-2.5 bg-[#F8FAF9] border border-[#DDE5DF] rounded-xl p-4">
                <div className="text-xs font-semibold text-[#0B0F0D] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                  <span>Permissions requested by ContribLens:</span>
                </div>
                <ul className="space-y-2 text-xs text-[#111827]">
                  <li className="flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#0B0F0D]">Repositories (`repo`):</strong> Read access to your public and private repositories, open issues, pull requests, and commit history.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#0B0F0D]">Profile &amp; Activity (`read:user`, `user:email`):</strong> Read your profile bio, preferred languages, and authored contributions.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Explicit Authorize / Cancel Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-1/3 px-4 py-2.5 text-xs font-semibold text-[#111827] bg-[#F1F5F3] hover:bg-[#DDE5DF] border border-[#DDE5DF] rounded-lg transition-colors cursor-pointer"
                >
                  Deny / Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmAuthorize}
                  className="w-full sm:w-2/3 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                <h3 className="text-base font-bold text-[#0B0F0D]">
                  Connect &amp; Authorize Your GitHub Account
                </h3>
                <p className="text-xs text-[#64748B]">
                  Choose how you want to authenticate with GitHub. You will be asked to confirm authorization before linking your account.
                </p>
              </div>

              {diagnosticMessage && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <div className="font-semibold text-amber-800">OAuth Notice:</div>
                  <p>{diagnosticMessage}</p>
                </div>
              )}

              {/* Method 1: Launch GitHub OAuth Popup */}
              <div className="p-4 bg-[#F8FAF9] border border-[#DDE5DF] rounded-xl space-y-3">
                <div className="text-xs font-semibold text-[#0B0F0D]">
                  Option 1: GitHub OAuth Popup Window
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={loginHint}
                    onChange={(e) => setLoginHint(e.target.value)}
                    placeholder="Optional: GitHub @username to pre-select"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D]"
                  />
                  <button
                    type="button"
                    onClick={() => onLaunchOAuthPopup(loginHint)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Open GitHub OAuth Popup</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Note: Once you authorize an OAuth App on GitHub, GitHub remembers your choice. To see GitHub.com&apos;s own &ldquo;Authorize App&rdquo; screen again, revoke the app under{' '}
                  <a
                    href="https://github.com/settings/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#15803D] underline inline-flex items-center gap-0.5"
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
                className="p-4 bg-[#F8FAF9] border border-[#DDE5DF] rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0B0F0D]">
                    Option 2: GitHub Personal Access Token
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=ContribLens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[#15803D] hover:underline inline-flex items-center gap-1"
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
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D]"
                  />
                  <button
                    type="submit"
                    disabled={!tokenInput.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Verify &amp; Review Permissions
                  </button>
                </div>
                {tokenError && <div className="text-xs text-red-700 font-mono">{tokenError}</div>}
              </form>

              {pendingProfile && showSwitchAccount && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSwitchAccount(false)}
                    className="text-xs text-[#64748B] hover:text-[#0B0F0D] underline cursor-pointer"
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
