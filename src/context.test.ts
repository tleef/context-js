/* eslint-env mocha */

import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import Context from "./context";

const expect = chai.expect;

chai.use(sinonChai);

describe("Context", () => {
  describe("#constructor()", () => {
    it("should be instantiable without arguments", () => {
      const ctx = new Context();

      expect(ctx).to.be.an.instanceof(Context);
    });

    it("should be instantiable with a parent", () => {
      const parent = new Context();
      const ctx = new Context(parent);

      expect(ctx).to.be.an.instanceof(Context);
    });

    it("should assign a unique id", () => {
      const ctx1 = new Context();
      const ctx2 = new Context();

      expect(ctx1.id).to.be.a("string");
      expect(ctx2.id).to.be.a("string");
      expect(ctx1.id).to.not.equal(ctx2.id);
    });

    it("should inherit parent's id", () => {
      const parent = new Context();
      const ctx = new Context(parent);

      expect(ctx.id).to.equal(parent.id);
    });

    it("should not be cancelled", () => {
      const ctx = new Context();

      expect(ctx.cancelled).to.equal(false);
    });

    it("should inherit parent's cancelled state", () => {
      const parent = new Context();
      parent.cancel();
      const ctx = new Context(parent);

      expect(parent.cancelled).to.equal(true);
      expect(ctx.cancelled).to.equal(parent.cancelled);
    });

    it("should not have a deadline", () => {
      const ctx = new Context();

      expect(ctx.deadline).to.equal(undefined);
    });

    it("should inherit parent's deadline", () => {
      const now = new Date();
      const parent = new Context().withDeadline(now);
      const ctx = new Context(parent);

      expect(parent.deadline).to.equal(now);
      expect(ctx.deadline).to.equal(parent.deadline);
    });

    it("should have empty values", () => {
      const ctx = new Context();

      expect(ctx.values).to.deep.equal({});
    });

    it("should inherit clone of parent's values", () => {
      const values = {one: 1};
      const parent = new Context();
      // @ts-ignore
      parent._values = values;
      const ctx = new Context(parent);

      expect(parent.values).to.equal(values);
      expect(ctx.values).to.not.equal(parent.values);
      expect(ctx.values).to.deep.equal(parent.values);
    });

    it("should cancel if parent is cancelled", () => {
      const parent = new Context();
      const ctx = new Context(parent);

      expect(parent.cancelled).to.equal(false);
      expect(ctx.cancelled).to.equal(false);

      parent.cancel();

      expect(parent.cancelled).to.equal(true);
      expect(ctx.cancelled).to.equal(true);
    });

    it("should throw if instantiated without new", () => {
      // @ts-ignore
      expect(() => Context()).to.throw("Cannot call a class as a function");
    });

    it("should throw if parent is not a Context", () => {
      const parent = {
        on: () => {},
      };
      // @ts-ignore
      expect(() => new Context(parent)).to.throw("parent must be a Context");
    });
  });

  describe("#withValues()", () => {
    it("should return new context", () => {
      const original = new Context();
      const ctx = original.withValues({});

      expect(ctx).to.be.an.instanceof(Context);
      expect(ctx).to.not.equal(original);
    });

    it("should clone given values", () => {
      const values = {key: "test"};
      const ctx = new Context().withValues(values);

      expect(ctx.values).to.not.equal(values);
      expect(ctx.values).to.deep.equal(values);
    });

    it("should extend current values", () => {
      const ctx = new Context().withValues({one: 1}).withValues({two: 2});

      expect(ctx.values).to.deep.equal({one: 1, two: 2});
    });

    it("should override existing values", () => {
      const ctx = new Context().withValues({one: 1, two: 2}).withValues({two: "a", three: "b"});

      expect(ctx.values).to.deep.equal({one: 1, two: "a", three: "b"});
    });

    it("should throw if values is not an object", () => {
      // @ts-ignore
      expect(() => new Context().withValues()).to.throw("values must be an Object");
    });
  });

  describe("#cancel()", () => {
    it("should set cancelled to true", () => {
      const ctx = new Context();
      ctx.cancel();

      expect(ctx.cancelled).to.equal(true);
    });

    it("should emit 'cancelled'", () => {
      const ctx = new Context();
      const spy = sinon.spy();
      ctx.on("cancelled", spy);
      ctx.cancel();

      expect(spy).to.have.callCount(1);
    });
  });

  describe("#withDeadline()", () => {
    let clock: any;

    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => { clock.restore(); });

    it("should return new context", () => {
      const original = new Context();
      const ctx = original.withDeadline(new Date());

      expect(ctx).to.be.an.instanceof(Context);
      expect(ctx).to.not.equal(original);
    });

    it("should set deadline to given date", () => {
      const date = new Date();
      const ctx = new Context().withDeadline(date);

      expect(ctx.deadline).to.equal(date);
    });

    it("should ignore given date if current deadline is sooner", () => {
      const originalDate = new Date(0);
      const date = new Date(1);
      const ctx = new Context().withDeadline(originalDate).withDeadline(date);

      expect(ctx.deadline).to.equal(originalDate);
    });

    it("should cancel when deadline is reached", () => {
      const now = Date.now();
      const date = new Date(now + 100);
      const ctx = new Context().withDeadline(date);
      const spy = sinon.spy();
      ctx.on("cancelled", spy);

      clock.tick(99);

      expect(ctx.cancelled).to.equal(false);
      expect(spy).to.have.callCount(0);

      clock.tick(1);

      expect(ctx.cancelled).to.equal(true);
      expect(spy).to.have.callCount(1);
    });

    it("should throw if deadline is not a date", () => {
      // @ts-ignore
      expect(() => new Context().withDeadline(1)).to.throw("deadline must be a Date");
    });
  });

  describe("#withTimeout()", () => {
    let clock: any;

    beforeEach(() => { clock = sinon.useFakeTimers(); });
    afterEach(() => { clock.restore(); });

    it("should return new context", () => {
      const original = new Context();
      const ctx = original.withTimeout(100);

      expect(ctx).to.be.an.instanceof(Context);
      expect(ctx).to.not.equal(original);
    });

    it("should call #withDeadline() with correct date", () => {
      const ctx = new Context();
      const spy = sinon.spy();
      ctx.withDeadline = spy;
      ctx.withTimeout(100);

      expect(spy).to.have.callCount(1);
      expect(spy).to.have.been.calledWith(new Date(100));
    });

    it("should throw if ms is not an integer", () => {
      expect(() => new Context().withTimeout(1.1)).to.throw("ms must be an Integer");
    });
  });
});
