import { ContribLensAnalysisResponse, ContributionPlan } from '../types';

export const PRESET_REPOSITORIES = [
  {
    fullName: 'tiangolo/fastapi',
    label: 'tiangolo/fastapi',
    language: 'Python',
    tagline: 'High-performance async web framework for building APIs'
  },
  {
    fullName: 'pydantic/pydantic',
    label: 'pydantic/pydantic',
    language: 'Python',
    tagline: 'Data validation and settings management using Python type hints'
  },
  {
    fullName: 'excalidraw/excalidraw',
    label: 'excalidraw/excalidraw',
    language: 'TypeScript',
    tagline: 'Virtual whiteboard for sketching hand-drawn like diagrams'
  },
  {
    fullName: 'withastro/astro',
    label: 'withastro/astro',
    language: 'TypeScript',
    tagline: 'Content-focused web framework built for speed'
  }
];

export const INITIAL_ANALYSIS_REPORT: ContribLensAnalysisResponse = {
  repo: {
    owner: '',
    name: '',
    fullName: '',
    description: '',
    htmlUrl: 'https://github.com',
    stars: 16140,
    forks: 1920,
    openIssuesCount: 142,
    watchers: 310,
    language: 'Python',
    license: 'BSD-3-Clause',
    defaultBranch: 'main',
    createdAt: '2014-05-03T11:20:00Z',
    updatedAt: '2026-10-03T18:40:00Z',
    pushedAt: '2026-10-02T21:15:00Z',
    topics: ['python', 'cli', 'command-line', 'argument-parser', 'terminal'],
    hasContributingGuide: true,
    hasCodeOfConduct: true
  },
  stats: {
    recentCommitsCount: 25,
    daysSinceLastCommit: 2,
    uniqueRecentAuthors: 9,
    openPrsSampled: 18,
    mergedOrClosedPrsSampled: 32,
    prMergeRatioPercent: 64,
    avgIssueComments: 4.2,
    staleIssuesSampledCount: 11,
    beginnerFriendlyIssuesCount: 7,
    topContributorSharePercent: 48,
    top3ContributorsSharePercent: 74
  },
  contributors: [
    {
      login: 'davidism',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1242887?v=4',
      htmlUrl: 'https://github.com/davidism',
      contributions: 942,
      sharePercentage: 48
    },
    {
      login: 'mitsuhiko',
      avatarUrl: 'https://avatars.githubusercontent.com/u/7396?v=4',
      htmlUrl: 'https://github.com/mitsuhiko',
      contributions: 380,
      sharePercentage: 19
    },
    {
      login: 'untitaker',
      avatarUrl: 'https://avatars.githubusercontent.com/u/837573?v=4',
      htmlUrl: 'https://github.com/untitaker',
      contributions: 145,
      sharePercentage: 7
    },
    {
      login: 'pgjones',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1391482?v=4',
      htmlUrl: 'https://github.com/pgjones',
      contributions: 89,
      sharePercentage: 5
    },
    {
      login: 'greyli',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12967000?v=4',
      htmlUrl: 'https://github.com/greyli',
      contributions: 64,
      sharePercentage: 3
    }
  ],
  fileTree: [
    { path: 'src/click/__init__.py', type: 'file' },
    { path: 'src/click/core.py', type: 'file' },
    { path: 'src/click/decorators.py', type: 'file' },
    { path: 'src/click/parser.py', type: 'file' },
    { path: 'src/click/types.py', type: 'file' },
    { path: 'src/click/formatting.py', type: 'file' },
    { path: 'src/click/testing.py', type: 'file' },
    { path: 'src/click/shell_completion.py', type: 'file' },
    { path: 'src/click/termui.py', type: 'file' },
    { path: 'tests/test_parser.py', type: 'file' },
    { path: 'tests/test_options.py', type: 'file' },
    { path: 'tests/test_arguments.py', type: 'file' },
    { path: 'tests/test_formatting.py', type: 'file' },
    { path: 'docs/index.rst', type: 'file' },
    { path: 'pyproject.toml', type: 'file' }
  ],
  openIssues: [
    {
      number: 184,
      title: 'Improve CSV and delimited option value parser when quoted strings contain escaped commas',
      body: 'When passing comma-separated option values or custom delimited tuples via Click option callbacks or split_arg_string in src/click/parser.py, quoted fields containing escaped commas are split prematurely instead of preserving the inner literal value. Reproduction: passing `--columns "id,name,\\"last, first\\",role"` splits into 5 items instead of 4.',
      htmlUrl: 'https://github.com/pallets/click/issues',
      state: 'open',
      comments: 4,
      createdAt: '2026-09-18T14:20:00Z',
      updatedAt: '2026-10-01T09:15:00Z',
      author: 'kyle-dev-oss',
      labels: ['bug', 'parser', 'good first issue']
    },
    {
      number: 2741,
      title: 'CliRunner.invoke does not reset terminal width override when env contains COLUMNS',
      body: 'In src/click/testing.py, CliRunner.invoke sets terminal_width on Context, but if COLUMNS is passed inside the env dictionary parameter, HelpFormatter still falls back to the default 80-char width unless terminal_width is explicitly passed.',
      htmlUrl: 'https://github.com/pallets/click/issues/2741',
      state: 'open',
      comments: 3,
      createdAt: '2026-09-22T10:12:00Z',
      updatedAt: '2026-10-02T16:40:00Z',
      author: 'mert-cli',
      labels: ['testing', 'enhancement']
    },
    {
      number: 2719,
      title: 'Shell completion for Fish fails to escape subcommand descriptions containing single quotes',
      body: 'In src/click/shell_completion.py, FishComplete formats completion items using single quotes around help strings. If a command short_help contains an apostrophe, the generated fish completion script raises a syntax error.',
      htmlUrl: 'https://github.com/pallets/click/issues/2719',
      state: 'open',
      comments: 6,
      createdAt: '2026-09-05T08:00:00Z',
      updatedAt: '2026-09-29T19:05:00Z',
      author: 'fish-shell-user',
      labels: ['shell-completion', 'bug', 'good first issue']
    },
    {
      number: 2688,
      title: 'Type annotation mismatch for ParamType.convert when param or ctx is None',
      body: 'In src/click/types.py, ParamType.convert allows param: Parameter | None and ctx: Context | None at runtime, but strict mypy checks on custom subclasses report incompatible override signatures when Optional is omitted in doc examples.',
      htmlUrl: 'https://github.com/pallets/click/issues/2688',
      state: 'open',
      comments: 2,
      createdAt: '2026-08-19T12:30:00Z',
      updatedAt: '2026-09-25T11:20:00Z',
      author: 'typing-enthusiast',
      labels: ['typing', 'documentation']
    },
    {
      number: 2654,
      title: 'HelpFormatter.write_dl miscalculates column wrapping when ANSI color codes are embedded in term',
      body: 'When ANSI escape sequences are included in definition list left-hand terms, len(term) counts invisible escape bytes, causing excessive right-hand column indentation in src/click/formatting.py.',
      htmlUrl: 'https://github.com/pallets/click/issues/2654',
      state: 'open',
      comments: 8,
      createdAt: '2026-08-02T15:45:00Z',
      updatedAt: '2026-09-20T14:10:00Z',
      author: 'term-stylist',
      labels: ['formatting', 'bug']
    }
  ],
  healthScore: {
    overall: 86,
    statusLabel: 'Healthy & Active',
    summary: 'Mature, well-tested Python package with clean modular boundaries, comprehensive pytest coverage, and active maintainer review cycles, though core review authority is concentrated among two primary maintainers.',
    dimensions: {
      commitVelocity: {
        label: 'Commit Velocity',
        score: 88,
        status: 'Nominal',
        detail: '25 commits across 9 authors in recent window; last commit 2 days ago.'
      },
      issueResponsiveness: {
        label: 'Issue Responsiveness',
        score: 81,
        status: 'Nominal',
        detail: 'Well-scoped bug reports receive maintainer triage within 3–5 days.'
      },
      prMergeFlow: {
        label: 'PR Merge Flow',
        score: 84,
        status: 'Nominal',
        detail: '64% merge ratio on sampled PRs with automated CI enforcement.'
      },
      documentationQuality: {
        label: 'Documentation & Setup',
        score: 96,
        status: 'Nominal',
        detail: 'Includes CONTRIBUTING.md, rst docs, type annotations, and isolated pytest suite.'
      },
      contributorDiversity: {
        label: 'Contributor Balance',
        score: 72,
        status: 'Warning',
        detail: 'Top 2 contributors account for 67% of historical commits (moderate bus factor).'
      }
    }
  },
  insights: {
    architectureOverview: 'Single-package Python library organized under src/click/ with zero heavyweight runtime dependencies. Command execution flows from decorators.py -> core.py (Command, Group, Context, Option) -> parser.py (OptionParser) -> types.py (ParamType conversions).',
    codebaseStructureSummary: 'Flat, highly readable module layout where each subsystem (parsing, types, terminal UI, formatting, shell completion, testing) lives in a dedicated single-file module with a matching test file under tests/.',
    contributorDynamics: 'Maintained under the Pallets organization. Community PRs are welcomed when accompanied by focused regression tests in tests/ and adherence to pre-commit typing/formatting hooks.',
    prAndIssueVelocity: '142 open issues and 18 open PRs. Issues with minimal reproducible examples and isolated module impact merge fastest.',
    onboardingReadiness: 'High onboarding readiness: standard pyproject.toml editable install (`pip install -e .`) and fast local execution (`pytest`) running in under 4 seconds.',
    keyDirectories: [
      { path: 'src/click/parser.py', purpose: 'Low-level tokenizing, option/argument splitting, and delimited string parsing.' },
      { path: 'src/click/core.py', purpose: 'Core abstractions: Context, BaseCommand, Command, Group, Parameter, Option, Argument.' },
      { path: 'src/click/types.py', purpose: 'Built-in parameter type converters, validation, and shell completion hooks.' },
      { path: 'src/click/testing.py', purpose: 'CliRunner isolated filesystem and stdio capture harness for testing CLI apps.' },
      { path: 'tests/', purpose: 'Pytest suite mirroring every module in src/click/ with high branch coverage.' }
    ]
  },
  maintenanceRisks: [
    {
      id: 'risk-1',
      title: 'Reviewer Concentration on Core Parser & Context Changes',
      category: 'Bus Factor',
      severity: 'Medium',
      metricEvidence: 'Top 2 contributors author 67% of commits; 48% single-maintainer share',
      description: 'Pull requests that alter core Context lifecycle or stateful OptionParser internals require review from a small group of core Pallets maintainers, leading to longer review queues.',
      contributorOpportunity: 'Target self-contained edge cases in parser utilities, shell completion, or HelpFormatter with comprehensive unit tests so maintainers can verify behavior in under 5 minutes.'
    },
    {
      id: 'risk-2',
      title: 'Stale Edge-Case Issues in Shell Completion & Windows Console Escaping',
      category: 'Stale Triage',
      severity: 'Medium',
      metricEvidence: '11 sampled open issues older than 30 days awaiting reproduction',
      description: 'Platform-specific or shell-specific issues (Fish, Zsh, PowerShell quoting) often sit open because maintainers lack quick cross-shell reproduction test cases.',
      contributorOpportunity: 'Writing unit tests in tests/test_shell_completion.py that assert exact generated completion strings removes the reproduction bottleneck.'
    },
    {
      id: 'risk-3',
      title: 'Strict Static Typing Drift in Subclass Overrides',
      category: 'Documentation Gap',
      severity: 'Low',
      metricEvidence: 'Multiple open issues regarding mypy/pyright strictness on custom ParamType subclasses',
      description: 'Documentation snippets occasionally omit Optional type annotations required when users run mypy --strict against custom Click extensions.',
      contributorOpportunity: 'High-acceptance beginner contribution: align docstrings and type annotations in src/click/types.py and docs/.'
    }
  ],
  recommendedIssues: [
    {
      issueNumber: 184,
      title: 'Improve CSV and delimited option value parser when quoted strings contain escaped commas',
      htmlUrl: 'https://github.com/pallets/click/issues',
      difficulty: 'Beginner–Intermediate',
      estimatedEffort: '2–4 hours',
      impactScore: 92,
      impactLevel: 'High Impact',
      skills: ['Python', 'parsing', 'unit testing'],
      whyThisIssue: 'It is actively relevant, has a clearly defined scope inside src/click/parser.py, has zero external system dependencies, and can be verified purely with unit tests.',
      plainExplanation: {
        summary: 'When developers pass a comma-separated string containing quoted values with commas inside (like "last, first"), the parser splits on every comma blindly instead of respecting quotes and escape characters.',
        technicalContext: 'The tokenizing logic in src/click/parser.py processes delimiter boundaries without tracking an active quote state or backslash escape sequence across CSV-style option segments.',
        expectedOutcome: 'Update the parser helper so quoted substrings and escaped delimiters remain intact as a single parsed token, and add regression tests in tests/test_parser.py.'
      },
      likelyFiles: ['src/click/parser.py', 'src/click/types.py', 'tests/test_parser.py']
    },
    {
      issueNumber: 2719,
      title: 'Shell completion for Fish fails to escape subcommand descriptions containing single quotes',
      htmlUrl: 'https://github.com/pallets/click/issues/2719',
      difficulty: 'Beginner',
      estimatedEffort: '1–2 hours',
      impactScore: 84,
      impactLevel: 'Quick Win',
      skills: ['Python', 'string escaping', 'pytest'],
      whyThisIssue: 'Isolated to a single method (`FishComplete.format_completion`) in `src/click/shell_completion.py` with clear input/output string expectations.',
      plainExplanation: {
        summary: 'Fish shell completion scripts wrap command help descriptions in single quotes. If a help text contains an apostrophe (e.g., "Don\'t overwrite"), the generated shell script breaks.',
        technicalContext: 'In `src/click/shell_completion.py`, `FishComplete.format_completion` interpolates `item.help` directly without escaping single quotes (`\'` -> `\\\'`) or backslashes.',
        expectedOutcome: 'Sanitize and escape single quotes in Fish completion descriptions and add a test case in `tests/test_shell_completion.py`.'
      },
      likelyFiles: ['src/click/shell_completion.py', 'tests/test_shell_completion.py']
    },
    {
      issueNumber: 2654,
      title: 'HelpFormatter.write_dl miscalculates column wrapping when ANSI color codes are embedded in term',
      htmlUrl: 'https://github.com/pallets/click/issues/2654',
      difficulty: 'Intermediate',
      estimatedEffort: '3–5 hours',
      impactScore: 88,
      impactLevel: 'High Impact',
      skills: ['Python', 'ANSI terminal formatting', 'text layout'],
      whyThisIssue: 'The codebase already includes an internal `strip_ansi()` helper in `src/click/_compat.py`, making this a cohesive fix inside `src/click/formatting.py`.',
      plainExplanation: {
        summary: 'Colored option names in `--help` output look misaligned because the formatter counts invisible ANSI color characters as part of the visible word width.',
        technicalContext: '`HelpFormatter.write_dl` uses `len(term)` instead of measuring printable width via `term_len(term)` (which strips ANSI escape codes) when computing column spacing.',
        expectedOutcome: 'Replace raw `len()` checks in `HelpFormatter.write_dl` with `term_len()` and verify alignment with styled terms in `tests/test_formatting.py`.'
      },
      likelyFiles: ['src/click/formatting.py', 'src/click/_compat.py', 'tests/test_formatting.py']
    },
    {
      issueNumber: 2741,
      title: 'CliRunner.invoke does not reset terminal width override when env contains COLUMNS',
      htmlUrl: 'https://github.com/pallets/click/issues/2741',
      difficulty: 'Intermediate',
      estimatedEffort: '2–4 hours',
      impactScore: 79,
      impactLevel: 'Medium Impact',
      skills: ['Python', 'CLI testing', 'environment state'],
      whyThisIssue: 'Directly improves developer ergonomics when testing responsive CLI help output using Click’s built-in `CliRunner`.',
      plainExplanation: {
        summary: 'Tests passing `env={"COLUMNS": "120"}` to `CliRunner.invoke()` still render help output wrapped at 80 columns.',
        technicalContext: '`CliRunner.isolation()` sets environment variables after or separately from how `Context.terminal_width` is resolved during test invocation.',
        expectedOutcome: 'Ensure `COLUMNS` in `CliRunner` environment overrides propagates cleanly to context formatting width unless `terminal_width` is explicitly passed.'
      },
      likelyFiles: ['src/click/testing.py', 'src/click/core.py', 'tests/test_testing.py']
    }
  ],
  analyzedAt: '2026-10-04T07:45:00Z',
  targetSkillLevel: 'Beginner',
  dataSource: 'github_live'
};

export const INITIAL_CONTRIBUTION_PLAN: ContributionPlan = {
  repoFullName: 'Active Workspace',
  issueNumber: 184,
  issueTitle: 'Improve CSV and delimited option value parser when quoted strings contain escaped commas',
  issueUrl: 'https://github.com',
  difficulty: 'Beginner–Intermediate',
  estimatedEffort: '2–4 hours',
  skills: ['Python', 'parsing', 'unit testing'],
  problemBreakdown: {
    whatIsHappening: 'Delimited option values and argument strings containing quoted segments with inner commas (e.g., `--columns "id,name,\\"last, first\\",role"`) are split naively on every comma or mishandled during quote unescaping.',
    rootCauseHypothesis: 'In `src/click/parser.py`, the state machine inside `split_arg_string` and delimited value parsing transitions out of quote state or splits tokens without preserving escaped delimiters inside active quote boundaries.',
    acceptanceCriteria: '1. Quoted values containing commas or escaped quotes are parsed as a single atomic token. 2. Unclosed quotes raise a clear BadParameter/UsageError or follow documented fallback behavior. 3. Existing parser tests pass with zero regressions.'
  },
  filesToExamine: [
    {
      path: 'src/click/parser.py',
      role: 'Core argument and option stream tokenizer',
      whatToInspect: 'Inspect `split_arg_string()` and token accumulation loop handling quote characters (`"` and `\'`), escape sequences (`\\`), and delimiter boundaries.'
    },
    {
      path: 'src/click/types.py',
      role: 'Parameter value conversion and composite types',
      whatToInspect: 'Review how composite/delimited option values invoke parser utilities and convert raw string inputs into typed tuples/lists.'
    },
    {
      path: 'tests/test_parser.py',
      role: 'Unit test suite for parser behavior',
      whatToInspect: 'Examine parameterized `@pytest.mark.parametrize` test tables covering `split_arg_string` and option value parsing.'
    }
  ],
  steps: [
    {
      stepNumber: 1,
      title: 'Examine src/click/parser.py',
      description: 'Clone the repository, set up a local virtual environment, and trace how `src/click/parser.py` tokenizes quoted strings and escaped characters.',
      codeOrCommandHint: 'git clone https://github.com/pallets/click.git\ncd click && python -m venv .venv && source .venv/bin/activate\npip install -e ".[dev]"',
      verificationCheck: 'Confirm you can locate `split_arg_string` in `src/click/parser.py` and run existing parser tests.'
    },
    {
      stepNumber: 2,
      title: 'Reproduce the reported behaviour',
      description: 'Add a failing test case in `tests/test_parser.py` that passes a CSV/delimited string with quoted inner commas and escaped quotes to verify the exact failure output.',
      codeOrCommandHint: 'pytest tests/test_parser.py -k "test_split_arg_string"',
      verificationCheck: 'Observe the test fail where the quoted comma-separated field splits into two separate tokens.'
    },
    {
      stepNumber: 3,
      title: 'Modify parser state machine in src/click/parser.py',
      description: 'Update the parser logic (`parse_csv` / `split_arg_string` token buffer) so delimiter characters are ignored while `in_quote` is active, and backslash-escaped quotes inside quoted segments append the literal character without closing the quote state.',
      codeOrCommandHint: '# In src/click/parser.py:\n# Track active quote char and escape flag before splitting on delimiter\nif char == delimiter and quote_char is None:\n    tokens.append("".join(current))\n    current.clear()',
      verificationCheck: 'Ensure single quotes, double quotes, and escaped delimiters (`\\,`, `\\"`) resolve deterministically.'
    },
    {
      stepNumber: 4,
      title: 'Add regression tests in tests/test_parser.py',
      description: 'Write parameterized unit tests covering nested commas in quotes, escaped quotes, empty fields (`a,,b`), trailing delimiters, and unicode characters.',
      codeOrCommandHint: '@pytest.mark.parametrize(("value", "expected"), [\n    (\'id,"last, first",role\', ["id", "last, first", "role"]),\n    (\'a,"b\\\\"c,d",e\', ["a", \'b"c,d\', "e"]),\n])',
      verificationCheck: 'All new parameterized cases cover both happy path and malformed quote edge cases.'
    },
    {
      stepNumber: 5,
      title: 'Run the full test suite and type checker',
      description: 'Execute the complete pytest suite and static type checks (`mypy` / `pyright`) to ensure no regressions were introduced across options, arguments, or shell completion.',
      codeOrCommandHint: 'pytest -v\nmypy src/click/parser.py tests/test_parser.py',
      verificationCheck: '100% of pytest tests pass and mypy reports 0 errors.'
    },
    {
      stepNumber: 6,
      title: 'Prepare the changes for a pull request',
      description: 'Create a descriptive feature branch, add a concise changelog entry in `CHANGES.rst` referencing Issue #184, and commit your changes following Pallets contribution guidelines.',
      codeOrCommandHint: 'git checkout -b fix/issue-184-csv-parser\ngit add src/click/parser.py tests/test_parser.py CHANGES.rst\ngit commit -m "Fix quoted delimiter handling in parser (#184)"',
      verificationCheck: '`git status` and `git diff` show clean, minimal changes restricted to the parser, tests, and changelog.'
    }
  ],
  testingStrategy: {
    testRunnerCommand: 'pytest tests/test_parser.py -v',
    testFileLocations: ['tests/test_parser.py', 'tests/test_options.py'],
    regressionScenarios: [
      'Quoted string containing comma and whitespace: `"last, first"` -> single token',
      'Escaped double quote inside double-quoted field: `"a \\"quoted, value\\" here"`',
      'Adjacent empty CSV fields: `alpha,,gamma` -> `["alpha", "", "gamma"]`',
      'Unterminated quote string at end of input raises expected parser error'
    ]
  },
  conceptsToUnderstand: [
    {
      concept: 'Lexical State Machine Parsing',
      explanation: 'Tracking character stream state (`NORMAL`, `IN_SINGLE_QUOTE`, `IN_DOUBLE_QUOTE`, `ESCAPED`) so delimiters are only treated as separators in the `NORMAL` state.'
    },
    {
      concept: 'POSIX vs Windows Argument Splitting',
      explanation: 'Click normalizes command-line tokens across POSIX shells and Windows CMD where backslash escaping rules differ.'
    },
    {
      concept: 'Parameterized Pytest Fixtures',
      explanation: 'Pallets projects rely on `@pytest.mark.parametrize` tables rather than repetitive individual test functions.'
    }
  ],
  prPreparationChecklist: [
    'Fork repository and branch from `main` (or `stable` if bugfix targets current release series)',
    'Verify new tests fail before your fix in `src/click/parser.py` and pass after',
    'Run `pytest` across the entire test suite with zero warnings',
    'Run `pre-commit run --all-files` to validate Ruff formatting and mypy typing',
    'Add a one-line bullet under the unreleased bugfix section in `CHANGES.rst` referencing `#184`'
  ]
};
