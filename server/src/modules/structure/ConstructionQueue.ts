export class ConstructionQueue {
  private jobs: any[] = [];

  enqueue(job: any) {
    this.jobs.push({ ...job, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */, progress: 0 });
  }

  tick() {
    for (const job of this.jobs) {
      job.progress += job.workRate || 1;
      if (job.progress >= 100) job.completed = true;
    }
    this.jobs = this.jobs.filter(job => !job.completed);
  }

  all() {
    return this.jobs;
  }
}