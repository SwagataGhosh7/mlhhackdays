import React, { useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { ContributionPlan, RecommendedIssue } from '../types';

interface ContributionPlanSectionProps {
  plan: ContributionPlan;
  recommendedIssues: RecommendedIssue[];
  onSelectIssueForPlan: (issue: RecommendedIssue) => void;
  onGenerateCustomPlan: (issueNumber: number, issueTitle: string, issueBody: string) => void;
  isGeneratingPlan: boolean;
}

export const ContributionPlanSection: React.FC<ContributionPlanSectionProps> = ({
  plan,
  recommendedIssues,
  onSelectIssueForPlan,
  onGenerateCustomPlan,
  isGeneratingPlan,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [checkedPrItems, setCheckedPrItems] = useState<Record<number, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customIssueNum, setCustomIssueNum] = useState('');
  const [customIssueTitle, setCustomIssueTitle] = useState('');
  const [customIssueBody, setCustomIssueBody] = useState('');

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const togglePrItem = (idx: number) => {
    setCheckedPrItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const copyCommand = (stepNumber: number, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 1800);
  };

  const handleCustomPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(customIssueNum) || 999;
    if (!customIssueTitle.trim()) return;
    onGenerateCustomPlan(num, customIssueTitle.trim(), customIssueBody.trim());
    setShowCustomForm(false);
  };

  const completedCount = plan.steps.filter((s) => completedSteps[s.stepNumber]).length;

  return (
    <div className="space-y-8">
      {/* Top Issue Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="text-xs font-mono text-sky-400">
            Active Contribution Plan · {plan.repoFullName}
          </div>
          <h2 className="text-xl font-bold text-slate-100 [text-wrap:balance]">
            Issue #{plan.issueNumber} — {plan.issueTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-slate-400">
            <span>Difficulty: {plan.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>Estimated effort: {plan.estimatedEffort}</span>
            <span aria-hidden="true">·</span>
            <span>Skills: {plan.skills.join(' · ')}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">
              Progress: {completedCount}/{plan.steps.length} steps completed
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {showCustomForm ? 'Close Custom Issue' : 'Plan Custom Issue #'}
          </button>

          <a
            href={plan.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Open Issue on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Switcher Between Recommended Issues */}
      {recommendedIssues.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 mr-1">Switch target issue:</span>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {recommendedIssues.map((rec) => {
              const active = rec.issueNumber === plan.issueNumber;
              return (
                <button
                  key={rec.issueNumber}
                  type="button"
                  disabled={isGeneratingPlan}
                  onClick={() => onSelectIssueForPlan(rec)}
                  className={`px-3 py-1.5 rounded-md font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  #{rec.issueNumber} {rec.title.slice(0, 32)}
                  {rec.title.length > 32 ? '...' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Custom Issue Input Form */}
      {showCustomForm && (
        <form
          onSubmit={handleCustomPlanSubmit}
          className="border border-slate-700 bg-slate-900/70 rounded-xl p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-100">
            Generate Contribution Plan for Any Issue in {plan.repoFullName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Issue Number</label>
              <input
                type="number"
                value={customIssueNum}
                onChange={(e) => setCustomIssueNum(e.target.value)}
                placeholder="e.g. 184"
                required
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Issue Title</label>
              <input
                type="text"
                value={customIssueTitle}
                onChange={(e) => setCustomIssueTitle(e.target.value)}
                placeholder="e.g. Improve CSV parser when handling quoted delimiters"
                required
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Additional Issue Description or Stack Trace (Optional)
            </label>
            <textarea
              rows={2}
              value={customIssueBody}
              onChange={(e) => setCustomIssueBody(e.target.value)}
              placeholder="Paste issue description or reproduction steps..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGeneratingPlan}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors cursor-pointer"
            >
              Generate AI Roadmap
            </button>
          </div>
        </form>
      )}

      {/* Loading State When Generating a New Plan */}
      {isGeneratingPlan ? (
        <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-200">
            Synthesizing Step-by-Step Contribution Plan with Gemini...
          </p>
          <p className="text-xs text-slate-400">
            Mapping issue requirements against {plan.repoFullName} directory structure and test suite.
          </p>
        </div>
      ) : (
        <>
          {/* Problem Breakdown Trio */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-800 grid grid-cols-1 lg:grid-cols-3">
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">01. Reported Problem</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {plan.problemBreakdown.whatIsHappening}
              </p>
            </div>
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">02. Root Cause Hypothesis</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {plan.problemBreakdown.rootCauseHypothesis}
              </p>
            </div>
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">03. Acceptance Criteria</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {plan.problemBreakdown.acceptanceCriteria}
              </p>
            </div>
          </div>

          {/* Target Files to Examine */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-slate-100">
              Target Files to Examine &amp; Modify
            </h3>
            <div className="border border-slate-800 bg-slate-900/40 rounded-xl divide-y divide-slate-800">
              {plan.filesToExamine.map((file) => (
                <div
                  key={file.path}
                  className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-baseline"
                >
                  <div className="lg:col-span-4 font-mono text-xs font-semibold text-sky-400">
                    {file.path}
                  </div>
                  <div className="lg:col-span-3 text-xs font-medium text-slate-200">
                    {file.role}
                  </div>
                  <div className="lg:col-span-5 text-xs text-slate-400">{file.whatToInspect}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 6-Step Execution Roadmap */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                Step-by-Step Contribution Execution Plan
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Click any step to mark complete
              </span>
            </div>

            <div className="border border-slate-800 bg-slate-900/40 rounded-xl divide-y divide-slate-800">
              {plan.steps.map((step) => {
                const isDone = Boolean(completedSteps[step.stepNumber]);
                return (
                  <div key={step.stepNumber} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => toggleStep(step.stepNumber)}
                        className="flex items-start gap-3 text-left cursor-pointer group"
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs font-mono shrink-0 border transition-colors ${
                            isDone
                              ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-bold'
                              : 'bg-slate-950 border-slate-700 text-slate-400 group-hover:border-sky-400'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                        </span>
                        <div>
                          <div
                            className={`text-sm font-semibold transition-colors ${
                              isDone ? 'line-through text-slate-500' : 'text-slate-100'
                            }`}
                          >
                            {step.stepNumber}. {step.title}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </button>

                      {step.codeOrCommandHint && (
                        <button
                          type="button"
                          onClick={() => copyCommand(step.stepNumber, step.codeOrCommandHint)}
                          className="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>
                            {copiedStep === step.stepNumber ? 'Copied' : 'Copy Snippet'}
                          </span>
                        </button>
                      )}
                    </div>

                    {step.codeOrCommandHint && (
                      <div className="pl-8">
                        <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs font-mono text-slate-200 overflow-x-auto">
                          <code>{step.codeOrCommandHint}</code>
                        </pre>
                      </div>
                    )}

                    <div className="pl-8 text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">Verification: </span>
                      {step.verificationCheck}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Grid: Testing Strategy + Concepts + PR Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Testing Strategy */}
            <div className="lg:col-span-6 border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Testing Strategy &amp; Regression Cases
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Run Command:{' '}
                  <code className="text-sky-400 font-mono">
                    {plan.testingStrategy.testRunnerCommand}
                  </code>
                </p>
              </div>

              <div className="text-xs font-mono text-slate-400">
                <span className="text-slate-300">Test Files: </span>
                {plan.testingStrategy.testFileLocations.join(' · ')}
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="text-xs font-medium text-slate-300">
                  Required Regression Scenarios:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                  {plan.testingStrategy.regressionScenarios.map((scenario, idx) => (
                    <li key={idx}>{scenario}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Concepts & PR Checklist */}
            <div className="lg:col-span-6 border border-slate-800 bg-slate-900/40 rounded-xl divide-y divide-slate-800">
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Core Concepts Needed for This Issue
                </h3>
                <div className="space-y-2.5">
                  {plan.conceptsToUnderstand.map((item) => (
                    <div key={item.concept} className="text-xs">
                      <span className="font-semibold text-slate-200">{item.concept}: </span>
                      <span className="text-slate-400">{item.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Pull Request Readiness Checklist
                </h3>
                <div className="space-y-2">
                  {plan.prPreparationChecklist.map((item, idx) => {
                    const checked = Boolean(checkedPrItems[idx]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => togglePrItem(idx)}
                        className="w-full flex items-start gap-2.5 text-left text-xs cursor-pointer"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-emerald-400 border-emerald-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className={checked ? 'line-through text-slate-500' : 'text-slate-300'}>
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
