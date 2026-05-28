interface TaskPayload {
    eventType: string;
    payload: any;
    priority: number; // e.g. P1 = 1 (highest), P3 = 3 (lowest)
}

interface RepolessPollState {
    sessionId: string;
    fallbackFn: () => any;
    wakeupTick: number;
    deadlineTick: number;
    resolve: (value: any) => void;
    inFlight: boolean;
}

/**
 * AIOrchestrator manages task queuing and execution for external AI services.
 * Uses global fetch API (Node 18+) or requires 'node-fetch' types/polyfill.
 */
export class AIOrchestrator {
   private static readonly GITHUB_DISPATCH_URL = "https://api.github.com/repos/OuroborosCollective/Areloria/dispatches";
   private static readonly JULES_API_URL = "https://jules.googleapis.com/v1alpha";

   private static readonly REPOLLESS_TIMEOUT_TICKS = 5 * 60 * 10;
   private static readonly POLL_ERROR_SLEEP_TICKS = 100;
   private static readonly POLL_SLEEP_TICKS = 150;

   // Limits for AI Pro (100 tasks/day)
   private static readonly MAX_DAILY_TASKS = 100;
   private static taskCount = 0;
   private static lastTaskReset = 0;
   private static logicalClock = 0;

   private static taskQueue: TaskPayload[] = [];
   private static isProcessingQueue = false;
   private static repolessPolls: RepolessPollState[] = [];

   private static now(): number {
       this.logicalClock += 1;
       return this.logicalClock;
   }

   /**
    * Drives pending AI polling from the deterministic world tick.
    */
   public static update(currentWorldTick: number): void {
       const tick = Math.trunc(currentWorldTick);

       for (const poll of [...this.repolessPolls]) {
           if (tick >= poll.deadlineTick) {
               this.resolveRepolessPoll(poll, poll.fallbackFn());
               continue;
           }

           if (poll.inFlight || tick < poll.wakeupTick) continue;

           poll.inFlight = true;
           void this.pollRepolessSession(poll, tick);
       }
   }

   private static resolveRepolessPoll(poll: RepolessPollState, value: any): void {
       const index = this.repolessPolls.indexOf(poll);
       if (index < 0) return;

       this.repolessPolls.splice(index, 1);
       poll.resolve(value);
   }

   private static async pollRepolessSession(poll: RepolessPollState, currentWorldTick: number): Promise<void> {
       try {
           const pollRes = await fetch(`${this.JULES_API_URL}/sessions/${poll.sessionId}/activities?pageSize=50`, {
               headers: {
                   "x-goog-api-key": process.env.JULES_API_KEY || ''
               }
           });

           if (this.repolessPolls.indexOf(poll) < 0) return;

           if (!pollRes.ok) {
               poll.wakeupTick = currentWorldTick + this.POLL_ERROR_SLEEP_TICKS;
               return;
           }

           const data = await pollRes.json() as any;
           const activities = data.activities || [];

           for (const activity of activities) {
               if (activity.artifacts) {
                   for (const artifact of activity.artifacts) {
                       if (artifact.bashOutput) {
                           try {
                               this.resolveRepolessPoll(poll, JSON.parse(artifact.bashOutput.output));
                           } catch (e) {
                               this.resolveRepolessPoll(poll, artifact.bashOutput.output);
                           }
                           return;
                       }
                   }
               }
               if (activity.status === 'ERROR') {
                   console.error("[AI-Orchestrator] Repoless Session failed.");
                   this.resolveRepolessPoll(poll, poll.fallbackFn());
                   return;
               }
           }

           poll.wakeupTick = currentWorldTick + this.POLL_SLEEP_TICKS;
       } catch (err) {
           console.error("[AI-Orchestrator] Repoless polling error.", err);
           if (this.repolessPolls.indexOf(poll) >= 0) {
               poll.wakeupTick = currentWorldTick + this.POLL_ERROR_SLEEP_TICKS;
           }
       } finally {
           poll.inFlight = false;
       }
   }

   /**
    * Triggers world expansion, adding to the queue.
    */
   public static triggerWorldExpansion(eventType: string, payload: any, priority: number = 2): void {
       this.taskQueue.push({ eventType, payload, priority });
       this.taskQueue.sort((a, b) => a.priority - b.priority);
       this.processQueue();
   }

   private static resetTaskCountIfNeeded() {
       const ONE_DAY_TICKS = 24 * 60 * 60 * 10;
       const now = this.now();
       if (now - this.lastTaskReset > ONE_DAY_TICKS) {
           this.taskCount = 0;
           this.lastTaskReset = now;
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
    * Executes a Repoless session for data generation and waits for the result via tick-driven polling.
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

            const startTick = Math.trunc(this.now());

            return new Promise((resolve) => {
                this.repolessPolls.push({
                    sessionId,
                    fallbackFn,
                    wakeupTick: startTick,
                    deadlineTick: startTick + this.REPOLLESS_TIMEOUT_TICKS,
                    resolve,
                    inFlight: false,
                });
            });
        } catch (err) {
            console.error("[AI-Orchestrator] Repoless Session Error.", err);
            return fallbackFn();
        }
   }
}
