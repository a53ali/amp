export type Session = {
  id: string;
  timestamp: number;
  prompt: string;
  compiledPrompt: string;
  response: string;
  backend: string;
  branch: string;
  filesChanged: string[];
};
