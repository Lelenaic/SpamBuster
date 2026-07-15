export interface RuleGeneratorResult {
  rule: { name: string; text: string };
}
export class RuleGeneratorService {
  async generateRule(): Promise<RuleGeneratorResult> {
    return { rule: { name: '', text: '' } };
  }

  // Web shim: matches v1 component signature so imports resolve.
  async generateRuleText(_description: string): Promise<string> {
    return '';
  }
}
export function getRuleGeneratorService(): RuleGeneratorService {
  return new RuleGeneratorService();
}
