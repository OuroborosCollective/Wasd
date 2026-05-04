// @ts-nocheck
export const GIT_COMMAND_TEMPLATES = {
  CONFIG_EMAIL: 'git config --local user.email "action@github.com"',
  CONFIG_NAME: 'git config --local user.name "GitHub Action"',
  ADD_ALL: 'git add -A',
  COMMIT_AUTOMATED_FIX: 'git commit -m "chore: automated fix"',
  PUSH: 'git push'
} as const;

export type GitCommandTemplate = keyof typeof GIT_COMMAND_TEMPLATES;

export const getGitSetupCommands = (): string[] => [
  GIT_COMMAND_TEMPLATES.CONFIG_EMAIL,
  GIT_COMMAND_TEMPLATES.CONFIG_NAME
];

export const getGitCommitAndPushCommands = (): string[] => [
  GIT_COMMAND_TEMPLATES.ADD_ALL,
  GIT_COMMAND_TEMPLATES.COMMIT_AUTOMATED_FIX,
  GIT_COMMAND_TEMPLATES.PUSH
];