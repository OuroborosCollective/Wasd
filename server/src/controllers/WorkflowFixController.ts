import { Request, Response } from 'express';
import { GitHubWorkflowService } from '../services/GitHubWorkflowService';

export class WorkflowFixController {
  private workflowService: GitHubWorkflowService;

  constructor() {
    this.workflowService = new GitHubWorkflowService();
  }

  /**
   * POST /api/workflow/fix
   * Body: { content: string }
   */
  public fixWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Workflow content is required and must be a string.',
        });
        return;
      }

      // Die GitHubWorkflowService Logik anwenden
      // Annahme: fixWorkflow gibt { fixedContent: string, report: any } zurück
      const result = await this.workflowService.fixWorkflow(content);

      res.status(200).json({
        success: true,
        fixedContent: result.fixedContent,
        report: result.report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'An internal error occurred while processing the workflow.',
      });
    }
  };
}

export default new WorkflowFixController();