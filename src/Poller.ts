import EventEmitter from 'events';


export default class Poller extends EventEmitter {
  private readonly req: () => void;
  private readonly interval: number;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(req: ()=>void, interval = 5000) {
    super();

    this.req = req;
    this.interval = interval;
    this.intervalId = undefined;
  }

  start(): void {
    this.req();
    this.intervalId = setInterval(() => this.req(), this.interval);
  }

  stop(): void {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
  }
}
