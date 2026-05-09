import * as yaml from 'js-yaml';

export class GitHubWorkflowService {
  public modifyWorkflow(yamlContent: string): string {
    return yamlContent;
  }
  public async fixWorkflow(id: string): Promise<{ fixedContent: string; report: string }> {
    return { fixedContent: "", report: "fixed" };
  }
}
