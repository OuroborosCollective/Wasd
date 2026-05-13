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
  public fixWorkflow = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Workflow content is required and must be a string.',
        });
      }

      // Die GitHubWorkflowService Logik anwenden
      // Der Service gibt nun ein Objekt mit fixedContent und report zurück
      const result = await this.workflowService.fixWorkflow(content);

      return res.status(200).json({
        success: true,
        fixedContent: result.fixedContent,
        report: result.report,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'An internal error occurred while processing the workflow.',
      });
    }
  };
}

export default new WorkflowFixController();