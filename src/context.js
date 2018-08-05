import EventEmitter from 'events'
import type from '@tleef/type-js'
import unique from '@tleef/unique-js'

const CANCELLED = 'cancelled'

export default class Context extends EventEmitter {
  constructor (parent) {
    super()

    if (parent && !(parent instanceof Context)) {
      throw new Error('parent must be a Context')
    }

    this.id = parent ? parent.id : unique()
    this.cancelled = parent ? parent.cancelled : false
    this.deadline = parent ? parent.deadline : null
    this.values = parent ? Object.assign({}, parent.values) : {}
    if (parent) {
      parent.on(CANCELLED, this.cancel.bind(this))
    }
  }

  set (key, value) {
    if (key === 'id' && !type.isString(value)) {
      throw new Error('id must be a String')
    }

    this[key] = value

    return this
  }

  withDeadline (deadline) {
    if (!(deadline instanceof Date)) {
      throw new Error('deadline must be a Date')
    }

    const ctx = new Context(this)
    if (!ctx.deadline || deadline < ctx.deadline) {
      ctx.set('deadline', deadline)
      const timeout = Math.max(ctx.deadline.getTime() - Date.now(), 0)
      setTimeout(this.cancel.bind(this), timeout)
    }
    return ctx
  }

  withTimeout (ms) {
    if (!Number.isInteger(ms)) {
      throw new Error('ms must be an Integer')
    }

    return this.withDeadline(new Date(Date.now() + ms))
  }

  withValues (values) {
    if (values !== Object(values)) {
      throw new Error('values must be an Object')
    }

    const ctx = new Context(this)
    ctx.set('values', Object.assign({}, ctx.values, values))
    return ctx
  }

  cancel () {
    this.set('cancelled', true)
    this.emit(CANCELLED)
  }
}
