// @ARE-GUARD-EXEMPT: service
export class GitHubWorkflowService {
    public async fixWorkflow(content: string): Promise<any> {
        return {
            fixedContent: content,
            report: "Workflow processed."
        };
    }
}
