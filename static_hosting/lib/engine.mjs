"use strict"


// Private

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    addInPlace(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    add(v) {
        return this.clone().addInPlace(v);
    }

    scaleInPlace(a) {
        this.x *= a;
        this.y *= a;
        return this;
    }

    scale(a) {
        return this.clone().scaleInPlace(a);
    }
}


// Public

class LoopObject {
    constructor(loop) {
        loop.subscribe(this);
        this.loop = loop;
    }

    update(ctx) {
        // not implemented, to override
    }

    redraw(ctx) {
        // not implemented, to override
    }
}

class MovingObject extends LoopObject {
    constructor(loop) {
        super(loop);
        this.pos = new Vector(0, 0);
        this.speed = new Vector(0, 0);
        this.acc = new Vector(0, 0);
    }

    update(ctx) {
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.speed.addInPlace(this.acc.scale(ctx.dt));
    }
}

class FreqObserver extends LoopObject {
    constructor(loop) {
        super(loop);
        this.noLogInMs = 0;
        this.ctr = 0;
    }

    update(ctx) {
        this.noLogInMs += ctx.dtInMs;
        this.ctr += 1;
        if (this.noLogInMs > 1000) {
            this.noLogInMs -= 1000;
            for (let el of document.querySelectorAll(".altgn-fps-ctr")) {
                el.innerText = this.ctr;
            }
            this.ctr = 0;
        }
    }
}

class RenderLoop {
    constructor() {
        this.objects = new Set();
        this.lastLoopTime = null;
        this.reqFrame = null;
        new FreqObserver(this);
    }

    subscribe(object) {
        if (!object instanceof LoopObject) {
            throw new Error("invalid object");
        }
        this.objects.add(object);
    }

    start() {
        this.lastLoopTime = null;
        let loop = () => {
            this.execLoop();
            this.reqFrame = window.requestAnimationFrame(loop);
        };
        loop();
    }

    stop() {
        window.cancelAnimationFrame(this.reqFrame);
    }

    execLoop() {
        let dtInMs = 0;
        let loopTime = Date.now();
        if (this.lastLoopTime) {
            dtInMs = loopTime - this.lastLoopTime;
        }
        if (dtInMs > 100) {
            console.warn(`render too slow, cap render period from ${dtInMs}ms to 100ms`);
            dtInMs = 100;
        }
        const ctx = {
            dt: dtInMs / 1000,
            dtInMs: dtInMs
        };
        for (let o of this.objects) {
            o.update(ctx);
        }
        for (let o of this.objects) {
            o.redraw(ctx);
        }
        this.lastLoopTime = loopTime;
    }
}

export { RenderLoop, LoopObject, MovingObject }