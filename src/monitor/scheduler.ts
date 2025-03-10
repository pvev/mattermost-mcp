import * as cron from 'node-cron';

export class MonitoringScheduler {
  private schedule: string;
  private task: cron.ScheduledTask | null = null;
  private callback: () => Promise<void>;
  private isRunning: boolean = false;

  constructor(schedule: string, callback: () => Promise<void>) {
    this.schedule = schedule;
    this.callback = callback;
  }

  // Start the scheduler
  public start(): boolean {
    if (this.task) {
      console.error('Scheduler is already running');
      return false;
    }

    try {
      // Validate the cron schedule
      if (!cron.validate(this.schedule)) {
        console.error(`Invalid cron schedule: ${this.schedule}`);
        return false;
      }

      // Create and schedule the task
      this.task = cron.schedule(this.schedule, async () => {
        if (this.isRunning) {
          console.error('Previous monitoring task is still running, skipping this run');
          return;
        }

        this.isRunning = true;
        console.error(`Running scheduled monitoring task at ${new Date().toISOString()}`);
        
        try {
          await this.callback();
          console.error('Scheduled monitoring task completed successfully');
        } catch (error) {
          console.error('Error in scheduled monitoring task:', error);
        } finally {
          this.isRunning = false;
        }
      });

      console.error(`Monitoring scheduler started with schedule: ${this.schedule}`);
      return true;
    } catch (error) {
      console.error('Error starting scheduler:', error);
      return false;
    }
  }

  // Stop the scheduler
  public stop(): boolean {
    if (!this.task) {
      console.error('Scheduler is not running');
      return false;
    }

    try {
      this.task.stop();
      this.task = null;
      console.error('Monitoring scheduler stopped');
      return true;
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      return false;
    }
  }

  // Check if the scheduler is running
  public isSchedulerRunning(): boolean {
    return this.task !== null;
  }

  // Check if a monitoring task is currently running
  public isTaskRunning(): boolean {
    return this.isRunning;
  }

  // Run the monitoring task immediately
  public async runNow(): Promise<void> {
    if (this.isRunning) {
      console.error('Previous monitoring task is still running, cannot run now');
      return;
    }

    this.isRunning = true;
    console.error(`Running monitoring process immediately...`);
    
    try {
      await this.callback();
      console.error('Immediate monitoring process completed.');
    } catch (error) {
      console.error('Error in immediate monitoring process:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Update the schedule
  public updateSchedule(schedule: string): boolean {
    if (!cron.validate(schedule)) {
      console.error(`Invalid cron schedule: ${schedule}`);
      return false;
    }

    this.schedule = schedule;
    
    // Restart the scheduler if it's running
    if (this.task) {
      this.stop();
      return this.start();
    }
    
    return true;
  }
}
