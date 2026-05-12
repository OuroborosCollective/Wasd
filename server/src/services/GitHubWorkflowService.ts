export class GitHubWorkflowService {
    public async fixWorkflow(_content: string): Promise<any> {
        return { fixedContent: _content, report: {} };
    }
}
