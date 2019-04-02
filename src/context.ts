import unique from "@tleef/unique-js";
import {EventEmitter} from "events";

const CANCELLED = "cancelled";

interface IValues { [key: string]: any; }

export default class Context extends EventEmitter {
  private readonly _id: string;
  private _cancelled: boolean;
  private _deadline?: Date;
  private _values: IValues;

  constructor(parent?: Context) {
    super();

    if (!(this instanceof Context)) {
      throw new Error("Cannot call a class as a function");
    }

    if (parent && !(parent instanceof Context)) {
      throw new Error("parent must be a Context");
    }

    this._id = parent ? parent.id : unique();
    this._cancelled = parent ? parent.cancelled : false;
    this._deadline = parent ? parent.deadline : undefined;
    this._values = parent ? Object.assign({}, parent.values) : {};
    if (parent) {
      parent.on(CANCELLED, this.cancel.bind(this));
    }
  }

  get id() {
    return this._id;
  }

  get cancelled() {
    return this._cancelled;
  }

  get deadline() {
    return this._deadline;
  }

  get values() {
    return this._values;
  }

  public withDeadline(deadline: Date) {
    if (!(deadline instanceof Date)) {
      throw new Error("deadline must be a Date");
    }

    const ctx = new Context(this);
    if (!ctx.deadline || deadline < ctx.deadline) {
      ctx._deadline = deadline;
      const deadlineTime = (ctx.deadline && ctx.deadline.getTime()) || 0;
      const timeout = Math.max(deadlineTime - Date.now(), 0);
      setTimeout(this.cancel.bind(this), timeout);
    }
    return ctx;
  }

  public withTimeout(ms: number) {
    if (!Number.isInteger(ms)) {
      throw new Error("ms must be an Integer");
    }

    return this.withDeadline(new Date(Date.now() + ms));
  }

  public withValues(values: IValues) {
    if (values !== Object(values)) {
      throw new Error("values must be an Object");
    }

    const ctx = new Context(this);
    ctx._values = Object.assign({}, ctx.values, values);
    return ctx;
  }

  public cancel() {
    this._cancelled = true;
    this.emit(CANCELLED);
  }
}
