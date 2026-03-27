import { RepoContext } from './collector';

export function compilePrompt(userPrompt: string, context: RepoContext): string {
  const agents = context.agentsMd ? `Project context:\n${context.agentsMd}\n` : '';
  const commits = (context.recentCommits || []).join(', ');
  return `You are an AI coding assistant working in a real developer repository.\n\n${agents}\nCurrent state:\n- Branch: ${context.branch}\n- Recent commits: ${commits}\n- Recently changed: ${context.recentDiff}\n\nRepository files (sample):\n${context.fileTree}\n\nTask: ${userPrompt}\n\nRules:\n- Follow all conventions in the project context above\n- Write or update tests for any logic you add or change\n- Do not modify files unrelated to the task\n- Be concise — only output what changed and why`.trim();
}
