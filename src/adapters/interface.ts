export interface IAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  run(prompt: string): Promise<string>;
}
