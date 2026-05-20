interface TaskPayload {
    eventType: string;
    payload: any;
    priority: number; // e.g. P1 = 1 (highest), P3 = 3 (lowest)
}

/**
 * AIOrchestrator manages task queuing and execution for external AI services.
 * Uses global fetch API (Node 18+) or requires 'node-fetch' types/polyfill.
 */
export class AIOrchestrator {
   private static readonly GITHUB_DISPATCH_URL = "https://api.github.com/repos/OuroborosCollective/Areloria/dispatches";
   private static readonly JULES_API_URL = "https://jules.googleapis.com/v1alpha";

   // Limits for AI Pro (100 tasks/day)
   private static readonly MAX_DAILY_TASKS = 100;
   private static taskCount = 0;
   private static lastTaskReset = Date.now();  // ARE-DETERMINISM-ALLOW

   private static taskQueue: TaskPayload[] = [];
   private static isProcessingQueue = false;

   /**
    * Triggers world expansion, adding to the queue.
    */
   public static triggerWorldExpansion(eventType: string, payload: any, priority: number = 2): void {
       this.taskQueue.push({ eventType, payload, priority });
       this.taskQueue.sort((a, b) => a.priority - b.priority);
       this.processQueue();
   }

   private static resetTaskCountIfNeeded() {
       const ONE_DAY = 24 * 60 * 60 * 1000;
       if (Date.now() /* ARE-DETERMINISM-ALLOW */ - this.lastTaskReset > ONE_DAY) {
           this.taskCount = 0;
           this.lastTaskReset = Date.now();  // ARE-DETERMINISM-ALLOW
       }
   }

   private static async processQueue(): Promise<void> {
       if (this.isProcessingQueue) return;
       this.isProcessingQueue = true;

       this.resetTaskCountIfNeeded();

       while (this.taskQueue.length > 0) {
           if (this.taskCount >= this.MAX_DAILY_TASKS) {
               console.warn("[AI-Orchestrator] Daily task limit reached. Stopping queue processing.");
               break;
           }

           const task = this.taskQueue.shift();
           if (!task) continue;

           this.taskCount++;

           try {
               const res = await fetch(this.GITHUB_DISPATCH_URL, {
                   method: "POST",
                   headers: {
                       "Accept": "application/vnd.github.v3+json",
                       "Authorization": `token ${process.env.GITHUB_PAT || ''}`,
                       "Content-Type": "application/json"
                   },
                   body: JSON.stringify({
                       event_type: task.eventType,
                       client_payload: task.payload
                   })
               });

               if (!res.ok) {
                   console.warn(`[AI-Orchestrator] Dispatch Warnung: ${res.status}`);
                   if (res.status === 429) {
                       console.error("[AI-Orchestrator] RESOURCE_EXHAUSTED (429) detected. Throttling...");
                       this.taskQueue.unshift(task);
                       this.taskCount = this.MAX_DAILY_TASKS;
                       break;
                   }
               }
           } catch (err) {
               console.error("[AI-Orchestrator] Fataler Dispatch-Fehler. Spielablauf unbeeinträchtigt.", err);
           }
       }

       this.isProcessingQueue = false;
   }

   /**
    * Executes a Repoless session for data generation and waits for the result via polling.
    */
   public static async runRepolessSession(prompt: string, title: string, fallbackFn: () => any): Promise<any> {
        this.resetTaskCountIfNeeded();
        if (this.taskCount >= this.MAX_DAILY_TASKS) {
             console.warn("[AI-Orchestrator] Daily task limit reached. Returning fallback.");
             return fallbackFn();
        }

        this.taskCount++;

        try {
            const initRes = await fetch(`${this.JULES_API_URL}/sessions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.JULES_API_KEY || ''
                },
                body: JSON.stringify({ prompt, title })
            });

            if (!initRes.ok) {
                console.warn(`[AI-Orchestrator] Init Session Error: ${initRes.status}`);
                return fallbackFn();
            }

            const initData = await initRes.json() as { name: string };
            const sessionId = initData.name.split('/').pop();

            if (!sessionId) {
                 return fallbackFn();
            }

            const startTime = Date.now();  // ARE-DETERMINISM-ALLOW
            const TIMEOUT_MS = 5 * 60 * 1000;

            while (Date.now() /* ARE-DETERMINISM-ALLOW */ - startTime < TIMEOUT_MS) {
                const pollRes = await fetch(`${this.JULES_API_URL}/sessions/${sessionId}/activities?pageSize=50`, {
                    headers: {
                        "x-goog-api-key": process.env.JULES_API_KEY || ''
                    }
                });

                if (!pollRes.ok) {
                     await new Promise(resolve => setTimeout(resolve, 10000));
                     continue;
                }

                const data = await pollRes.json() as any;
                const activities = data.activities || [];

                for (const activity of activities) {
                    if (activity.artifacts) {
                        for (const artifact of activity.artifacts) {
                            if (artifact.bashOutput) {
                                try {
                                    return JSON.parse(artifact.bashOutput.output);
                                } catch (e) {
                                    return artifact.bashOutput.output;
                                }
                            }
                        }
                    }
                    if (activity.status === 'ERROR') {
                         console.error("[AI-Orchestrator] Repoless Session failed.");
                         return fallbackFn();
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 15000));
            }

            console.warn("[AI-Orchestrator] Repoless session timed out. Returning fallback.");
            return fallbackFn();

        } catch (err) {
            console.error("[AI-Orchestrator] Repoless Session Error.", err);
            return fallbackFn();
        }
   }
}