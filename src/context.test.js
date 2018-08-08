/* eslint-env mocha */

import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

import Context from './context'

const expect = chai.expect

chai.use(sinonChai)

describe('Context', () => {
  describe('#constructor()', () => {
    it('should be instantiable without arguments', () => {
      let ctx = new Context()

      expect(ctx).to.be.an.instanceof(Context)
    })

    it('should be instantiable with a parent', () => {
      let parent = new Context()
      let ctx = new Context(parent)

      expect(ctx).to.be.an.instanceof(Context)
    })

    it('should assign a unique id', () => {
      let ctx1 = new Context()
      let ctx2 = new Context()

      expect(ctx1.id).to.be.a('string')
      expect(ctx2.id).to.be.a('string')
      expect(ctx1.id).to.not.equal(ctx2.id)
    })

    it('should inherit parent\'s id', () => {
      let parent = new Context()
      let ctx = new Context(parent)

      expect(ctx.id).to.equal(parent.id)
    })

    it('should not be cancelled', () => {
      let ctx = new Context()

      expect(ctx.cancelled).to.equal(false)
    })

    it('should inherit parent\'s cancelled state', () => {
      let parent = new Context()
      parent.cancel()
      let ctx = new Context(parent)

      expect(parent.cancelled).to.equal(true)
      expect(ctx.cancelled).to.equal(parent.cancelled)
    })

    it('should not have a deadline', () => {
      let ctx = new Context()

      expect(ctx.deadline).to.equal(null)
    })

    it('should inherit parent\'s deadline', () => {
      let now = new Date()
      let parent = new Context().withDeadline(now)
      let ctx = new Context(parent)

      expect(parent.deadline).to.equal(now)
      expect(ctx.deadline).to.equal(parent.deadline)
    })

    it('should have empty values', () => {
      let ctx = new Context()

      expect(ctx.values).to.deep.equal({})
    })

    it('should inherit clone of parent\'s values', () => {
      let values = {one: 1}
      let parent = new Context().set('values', values)
      let ctx = new Context(parent)

      expect(parent.values).to.equal(values)
      expect(ctx.values).to.not.equal(parent.values)
      expect(ctx.values).to.deep.equal(parent.values)
    })

    it('should cancel if parent is cancelled', () => {
      let parent = new Context()
      let ctx = new Context(parent)

      expect(parent.cancelled).to.equal(false)
      expect(ctx.cancelled).to.equal(false)

      parent.cancel()

      expect(parent.cancelled).to.equal(true)
      expect(ctx.cancelled).to.equal(true)
    })

    it('should throw if instantiated without new', () => {
      expect(() => Context()).to.throw('Cannot call a class as a function')
    })

    it('should throw if parent is not a Context', () => {
      let parent = {
        on: () => {
        }
      }

      expect(() => new Context(parent)).to.throw('parent must be a Context')
    })
  })

  describe('#set()', () => {
    it('should set key to value', () => {
      let ctx = new Context()
      ctx.set('key', 'test')

      expect(ctx.key).to.equal('test')
    })

    it('should return same context', () => {
      let ctx = new Context()

      expect(ctx.set('key', 'test')).to.equal(ctx)
    })

    it('should throw if id is not a string', () => {
      let ctx = new Context()

      expect(() => ctx.set('id', 123)).to.throw('id must be a String')
    })
  })

  describe('#withValues()', () => {
    it('should return new context', () => {
      let original = new Context()
      let ctx = original.withValues({})

      expect(ctx).to.be.an.instanceof(Context)
      expect(ctx).to.not.equal(original)
    })

    it('should clone given values', () => {
      let values = {key: 'test'}
      let ctx = new Context().withValues(values)

      expect(ctx.values).to.not.equal(values)
      expect(ctx.values).to.deep.equal(values)
    })

    it('should extend current values', () => {
      let ctx = new Context().withValues({one: 1}).withValues({two: 2})

      expect(ctx.values).to.deep.equal({one: 1, two: 2})
    })

    it('should override existing values', () => {
      let ctx = new Context().withValues({one: 1, two: 2}).withValues({two: 'a', three: 'b'})

      expect(ctx.values).to.deep.equal({one: 1, two: 'a', three: 'b'})
    })

    it('should throw if values is not an object', () => {
      expect(() => new Context().withValues()).to.throw('values must be an Object')
    })
  })

  describe('#cancel()', () => {
    it('should set cancelled to true', () => {
      let ctx = new Context()
      ctx.cancel()

      expect(ctx.cancelled).to.equal(true)
    })

    it('should emit \'cancelled\'', () => {
      let ctx = new Context()
      let spy = sinon.spy()
      ctx.on('cancelled', spy)
      ctx.cancel()

      expect(spy).to.have.callCount(1)
    })
  })

  describe('#withDeadline()', () => {
    let clock

    beforeEach(() => { clock = sinon.useFakeTimers() })
    afterEach(() => { clock.restore() })

    it('should return new context', () => {
      let original = new Context()
      let ctx = original.withDeadline(new Date())

      expect(ctx).to.be.an.instanceof(Context)
      expect(ctx).to.not.equal(original)
    })

    it('should set deadline to given date', () => {
      let date = new Date()
      let ctx = new Context().withDeadline(date)

      expect(ctx.deadline).to.equal(date)
    })

    it('should ignore given date if current deadline is sooner', () => {
      let originalDate = new Date(0)
      let date = new Date(1)
      let ctx = new Context().withDeadline(originalDate).withDeadline(date)

      expect(ctx.deadline).to.equal(originalDate)
    })

    it('should cancel when deadline is reached', () => {
      let now = Date.now()
      let date = new Date(now + 100)
      let ctx = new Context().withDeadline(date)
      let spy = sinon.spy()
      ctx.on('cancelled', spy)

      clock.tick(99)

      expect(ctx.cancelled).to.equal(false)
      expect(spy).to.have.callCount(0)

      clock.tick(1)

      expect(ctx.cancelled).to.equal(true)
      expect(spy).to.have.callCount(1)
    })

    it('should throw if deadline is not a date', () => {
      expect(() => new Context().withDeadline(1)).to.throw('deadline must be a Date')
    })
  })

  describe('#withTimeout()', () => {
    let clock

    beforeEach(() => { clock = sinon.useFakeTimers() })
    afterEach(() => { clock.restore() })

    it('should return new context', () => {
      let original = new Context()
      let ctx = original.withTimeout(100)

      expect(ctx).to.be.an.instanceof(Context)
      expect(ctx).to.not.equal(original)
    })

    it('should call #withDeadline() with correct date', () => {
      let ctx = new Context()
      let spy = sinon.spy()
      ctx.withDeadline = spy
      ctx.withTimeout(100)

      expect(spy).to.have.callCount(1)
      expect(spy).to.have.been.calledWith(new Date(100))
    })

    it('should throw if ms is not an integer', () => {
      expect(() => new Context().withTimeout(1.1)).to.throw('ms must be an Integer')
    })
  })
})
