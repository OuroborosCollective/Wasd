/**
 * MiniMaxClient.ts
 * Client for MiniMax-M2.7 autonomous AI agent.
 * 
 * Used for:
 * - System health monitoring
 * - Bug detection and fixing
 * - ARELogic determinism verification
 * - NPC civilization optimization
 * - UI/UX improvements
 */

import {
  type MiniMaxConfig,
  type MiniMaxReport,
  type MiniMaxResponse,
  type MiniMaxHealthStatus,
  type MiniMaxNPCReport,
  type MiniMaxUISReport,
  type MiniMaxSubsystem,
  type MiniMaxSystemContext,
  MINIMAX_DEFAULTS,
} from "./MiniMax.types.js";

/**
 * MiniMax API Error
 */
export class MiniMaxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "MiniMaxError";
  }
}

/**
 * MiniMaxClient
 * Communicates with MiniMax-M2.7 for autonomous system health and bug fixing.
 */
export class MiniMaxClient {
  private readonly config: MiniMaxConfig;

  constructor(config: Partial<MiniMaxConfig> = {}) {
    this.config = {
      ...MINIMAX_DEFAULTS,
      ...config,
    };
  }

  get isEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.apiKey);
  }

  /**
   * Sends a health report to MiniMax for analysis.
   */
  public async reportHealth(status: MiniMaxHealthStatus): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport({
      type: "bug",
      severity: status.overall === "critical" ? "critical" : status.overall === "degraded" ? "error" : "info",
      code: "SYSTEM_HEALTH_REPORT",
      message: `System health: ${status.overall}`,
      context: {
        service: "MiniMaxClient",
        mode: "health_monitor",
        agentId: "minimax-agent",
        traceId: `health_${Date.now()}`,
        logicalIndex: 0,
        kappa: 1000,
        resonance: status.autonomousHealth,
        timestamp: Date.now(),
        subsystem: "unknown",
        areDeterminismLevel: Math.round(status.determinismScore * 4),
      },
      data: status,
      affectedComponents: Object.entries(status.subsystems)
        .filter(([, s]) => s.status !== "ok")
        .map(([name]) => name),
    });
  }

  /**
   * Sends an error report to MiniMax for analysis and potential fix.
   */
  public async reportError(error: MiniMaxReport): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport(error);
  }

  /**
   * Sends NPC behavior report for anomaly detection.
   */
  public async reportNPCHealth(report: MiniMaxNPCReport): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport({
      type: report.behaviorAnomalies.length > 0 ? "npc_behavior_anomaly" : "bug",
      severity: report.behaviorAnomalies.length > 3 ? "warn" : "info",
      code: "NPC_HEALTH_REPORT",
      message: `NPC ${report.npcId} health check - ${report.behaviorAnomalies.length} anomalies`,
      context: {
        service: "MiniMaxClient",
        mode: "npc_monitor",
        agentId: report.npcId,
        traceId: `npc_${report.npcId}_${Date.now()}`,
        logicalIndex: 0,
        kappa: 1000,
        resonance: report.performanceMetrics.actionSuccessRate,
        timestamp: Date.now(),
        subsystem: "npc_brain",
        areDeterminismLevel: 2,
      },
      data: report,
      affectedComponents: [`npc:${report.npcId}`, `civ:${report.civilizationId}`],
      suggestedFix: report.suggestedFixes.join("; "),
    });
  }

  /**
   * Sends UI/UX report for usability analysis.
   */
  public async reportUIHealth(report: MiniMaxUISReport): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport({
      type: "ui_issue",
      severity: report.usabilityScore < 0.6 ? "warn" : "info",
      code: "UI_HEALTH_REPORT",
      message: `UI component ${report.component} usability: ${Math.round(report.usabilityScore * 100)}%`,
      context: {
        service: "MiniMaxClient",
        mode: "ui_monitor",
        agentId: report.component,
        traceId: `ui_${report.component}_${Date.now()}`,
        logicalIndex: 0,
        kappa: 1000,
        resonance: report.usabilityScore,
        timestamp: Date.now(),
        subsystem: "ui_rendering",
        areDeterminismLevel: 3,
      },
      data: report,
      affectedComponents: [report.component],
      suggestedFix: report.suggestedOptimizations.join("; "),
    });
  }

  /**
   * Sends a determinism violation report.
   */
  public async reportDeterminismViolation(
    subsystem: MiniMaxSubsystem,
    violation: string,
    details: Record<string, unknown>
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport({
      type: "determinism_violation",
      severity: "critical",
      code: "ARE_DETERMINISM_VIOLATION",
      message: violation,
      context: {
        service: "MiniMaxClient",
        mode: "determinism_monitor",
        agentId: subsystem,
        traceId: `det_${subsystem}_${Date.now()}`,
        logicalIndex: 0,
        kappa: 1000,
        resonance: 0,
        timestamp: Date.now(),
        subsystem,
        areDeterminismLevel: 1,
      },
      data: details,
      affectedComponents: [subsystem],
      suggestedFix: "Verify ARE invariants and rollback to last stable state",
    });
  }

  /**
   * Sends a general bug report.
   */
  public async reportBug(
    code: string,
    message: string,
    subsystem: MiniMaxSubsystem,
    details: Record<string, unknown>,
    stackTrace?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.sendReport({
      type: "bug",
      severity: "error",
      code,
      message,
      context: this.createContext(subsystem),
      data: details,
      stackTrace,
      affectedComponents: [subsystem],
    });
  }

  /**
   * Requests autonomous analysis and fix from MiniMax.
   */
  public async requestAutonomousFix(
    subsystem: MiniMaxSubsystem,
    issue: string,
    details: Record<string, unknown>
  ): Promise<MiniMaxResponse | null> {
    if (!this.isEnabled) {
      console.log(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "AUTONOMOUS_FIX_REQUESTED_BUT_DISABLED",
          subsystem,
          issue,
          createdAt: Date.now(),
        })
      );
      return null;
    }

    const prompt = this.buildFixPrompt(subsystem, issue, details);

    try {
      const response = await this.callAPI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "AUTONOMOUS_FIX_FAILED",
          error: error instanceof Error ? error.message : String(error),
          subsystem,
          issue,
          createdAt: Date.now(),
        })
      );
      return null;
    }
  }

  /**
   * Requests autonomous NPC civilization health check.
   */
  public async requestNPCHealthCheck(civilizationId: string): Promise<MiniMaxResponse | null> {
    if (!this.isEnabled) return null;

    const prompt = `
Analyze NPC civilization ${civilizationId} health:

1. Check for behavior anomalies in NPC decision-making
2. Verify ARELogic determinism in NPC reasoning
3. Identify performance bottlenecks
4. Detect player interaction issues
5. Suggest optimizations for NPC autonomy

Focus on:
- NPC decision consistency (determinism)
- Memory integrity
- Action success rates
- Civilizational emergent behavior anomalies

Report format:
- Root cause of any issues
- Affected NPC IDs
- Suggested fixes with priority
- Risk assessment
`.trim();

    try {
      const response = await this.callAPI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "NPC_HEALTH_CHECK_FAILED",
          error: error instanceof Error ? error.message : String(error),
          civilizationId,
          createdAt: Date.now(),
        })
      );
      return null;
    }
  }

  /**
   * Requests autonomous UI/UX analysis and optimization.
   */
  public async requestUIOptimization(): Promise<MiniMaxResponse | null> {
    if (!this.isEnabled) return null;

    const prompt = `
Analyze Areloria MMORPG UI/UX health:

1. Check all UI components for usability issues
2. Identify navigation bottlenecks
3. Verify responsive design
4. Check accessibility compliance
5. Analyze user interaction flow

Focus on:
- Menu system clarity and consistency
- Inventory UI usability
- Quest log accessibility
- Combat UI feedback
- NPC dialogue interface

Report format:
- Components with low usability scores
- Specific optimization suggestions
- Priority for each fix
- Risk of breaking existing functionality
`.trim();

    try {
      const response = await this.callAPI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "UI_OPTIMIZATION_FAILED",
          error: error instanceof Error ? error.message : String(error),
          createdAt: Date.now(),
        })
      );
      return null;
    }
  }

  /**
   * Requests full system health analysis.
   */
  public async requestSystemAnalysis(): Promise<MiniMaxResponse | null> {
    if (!this.isEnabled) return null;

    const prompt = `
Perform comprehensive system health analysis for Areloria MMORPG:

1. ARELogic Determinism Check
   - Verify kappa invariant (always 1000)
   - Check for unseeded random usage
   - Verify world state mutation safety
   - Check tick bypass attempts

2. NPC Civilization Health
   - Analyze autonomous NPC behavior
   - Verify deterministic decision making
   - Check memory integrity
   - Identify emergent issues

3. System Performance
   - Identify bottlenecks
   - Check for memory leaks
   - Verify async operation safety
   - Check database consistency

4. Security
   - Verify safety filters
   - Check for injection vulnerabilities
   - Verify authentication integrity

5. UI/UX
   - Menu system health
   - User interaction flow
   - Visual feedback quality

Priority: Critical > High > Medium > Low
Report all issues with suggested fixes.
`.trim();

    try {
      const response = await this.callAPI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "SYSTEM_ANALYSIS_FAILED",
          error: error instanceof Error ? error.message : String(error),
          createdAt: Date.now(),
        })
      );
      return null;
    }
  }

  private async sendReport(report: MiniMaxReport): Promise<void> {
    if (!this.isEnabled) return;

    const prompt = `
Analyze the following system report and provide guidance:

Type: ${report.type}
Severity: ${report.severity}
Code: ${report.code}
Message: ${report.message}

Subsystem: ${report.context.subsystem}
Agent: ${report.context.agentId}
Trace: ${report.context.traceId}
ARE Determinism Level: ${report.context.areDeterminismLevel}/4

Affected Components: ${report.affectedComponents.join(", ") || "None"}

Data:
${JSON.stringify(report.data, null, 2)}

${report.stackTrace ? `Stack Trace:\n${report.stackTrace}` : ""}

${report.suggestedFix ? `Previous Fix Attempt: ${report.suggestedFix}` : ""}

Your task:
1. Identify the root cause
2. Assess risk level
3. Suggest specific fixes
4. If critical, create a fix plan

Respond in JSON format:
{
  "ok": boolean,
  "action": "fix_bug|analyze|monitor",
  "result": "analysis summary",
  "commands": [{"action": "...", "target": "...", "payload": {...}, "priority": "...", "reason": "..."}],
  "analysis": {
    "rootCause": "...",
    "affectedFiles": ["..."],
    "effort": "low|medium|high",
    "risk": "low|medium|high",
    "confidence": 0.0-1.0,
    "similarIssues": ["..."]
  }
}
`.trim();

    try {
      await this.callAPI(prompt);
      console.log(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "REPORT_SENT",
          code: report.code,
          severity: report.severity,
          createdAt: Date.now(),
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          service: "MiniMaxClient",
          event: "REPORT_FAILED",
          error: error instanceof Error ? error.message : String(error),
          code: report.code,
          createdAt: Date.now(),
        })
      );
    }
  }

  private async callAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: `You are MiniMax-M2.7, the autonomous AI agent for Areloria MMORPG.

Your mission:
- Maintain 100% system health
- Fix bugs autonomously
- Verify ARELogic determinism
- Optimize NPC civilization behavior
- Improve UI/UX
- Never let the system crash

ARELogic Rules (MUST enforce):
- Kappa always = 1000
- No direct world state mutation
- No tick bypass
- No unseeded random
- Every failure returns structured envelope
- AutoHeal on all failures

When you detect issues:
1. Analyze root cause
2. Create fix plan
3. If safe, implement directly via PR
4. If risky, create detailed issue
5. Monitor results

You have full GitHub access. Create PRs for fixes.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      throw new MiniMaxError(
        `MiniMax API error: ${response.statusText}`,
        "API_ERROR",
        response.status
      );
    }

    const data = await response.json() as { choices?: Array<{ messages?: Array<{ content?: string }> }> };
    
    if (!data.choices || data.choices.length === 0) {
      throw new MiniMaxError("No response from MiniMax API", "NO_RESPONSE");
    }

    return data.choices[0]?.messages?.[0]?.content ?? "";
  }

  private parseResponse(content: string): MiniMaxResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as MiniMaxResponse;
      }
    } catch {
      // If JSON parsing fails, create a basic response
    }

    return {
      ok: true,
      action: "analyze",
      result: content.slice(0, 500),
      commands: [],
      analysis: {
        rootCause: "Analysis completed",
        affectedFiles: [],
        effort: "medium",
        risk: "low",
        confidence: 0.7,
        similarIssues: [],
      },
      createdAt: Date.now(),
    };
  }

  private createContext(subsystem: MiniMaxSubsystem): MiniMaxSystemContext {
    return {
      service: "MiniMaxClient",
      mode: "error_report",
      agentId: subsystem,
      traceId: `err_${subsystem}_${Date.now()}`,
      logicalIndex: 0,
      kappa: 1000,
      resonance: 1,
      timestamp: Date.now(),
      subsystem,
      areDeterminismLevel: 2,
    };
  }

  private buildFixPrompt(
    subsystem: MiniMaxSubsystem,
    issue: string,
    details: Record<string, unknown>
  ): string {
    return `
URGENT: System Issue Detected

Subsystem: ${subsystem}
Issue: ${issue}

Details:
${JSON.stringify(details, null, 2)}

ARELogic Context:
- Kappa must be 1000
- No direct world mutation
- All failures must return envelope
- AutoHeal on errors

Your task:
1. Analyze the issue
2. Identify root cause
3. Create a fix
4. If fix is safe (< 10 lines, low risk), implement it directly
5. If fix is complex, create a detailed PR with:
   - Root cause analysis
   - Affected files
   - Risk assessment
   - Test plan

Respond with:
{
  "ok": boolean,
  "action": "fix_bug|create_pr|create_issue|analyze",
  "result": "summary",
  "commands": [{"action": "...", "target": "...", "payload": {...}, "priority": "...", "reason": "..."}],
  "analysis": {...}
}
`.trim();
  }
}