export class EventEmitter {
  private callbacks: any;

  constructor() {
    this.callbacks = {};
  }

  public on(name: EventType, callback: (e) => void) {
    const that = this;

    if (typeof name === 'undefined') {
      console.warn('wrong names');
      return false;
    }

    if (typeof callback === 'undefined') {
      console.warn('wrong callback');
      return false;
    }

    (that.callbacks[name] || (that.callbacks[name] = [])).push(callback);

    return this;
  }

  public off(name: EventType) {
    if (typeof name === 'undefined') {
      console.warn('wrong name');
      return false;
    }

    if (this.callbacks[name] instanceof Array) {
      delete this.callbacks[name];
    }

    return this;
  }

  public trigger(name: EventType, _args: any[]) {
    if (typeof name === 'undefined') {
      console.warn('wrong name');
      return false;
    }
    const args = !(_args instanceof Array) ? [] : _args;

    if (!this.callbacks[name]) return;
    this.callbacks[name].forEach((callback) => {
      callback.apply(this, args);
    });
  }
}

export enum EventType {
  SVG_DATA_CHANGING,
}
