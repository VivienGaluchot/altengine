"use strict"


// Public

class Component {
    constructor(obj) {
        this.obj = obj;
    }

    getComponent(cmpClass) {
        return this.obj.getComponent(cmpClass);
    }

    // ctx: { dt: Number,  dtInMs: Number }
    update(ctx) {
        // not implemented, to override
    }

    // ctx: { dt: Number,  dtInMs: Number }
    draw(ctx) {
        // not implemented, to override
    }
}

class Entity {
    constructor(loop) {
        loop.subscribe(this);
        this.loop = loop;
        this.components = [];
        this.componentsByClass = new Map();
    }

    registerComponent(cmpClass, args) {
        let cmp = new cmpClass(this, args);
        this.components.push(cmp);
        if (this.componentsByClass.has(cmpClass)) {
            throw new Error("component already registered for class", cmpClass);
        }
        this.componentsByClass.set(cmpClass, cmp);
    }

    getComponent(cmpClass) {
        return this.componentsByClass.get(cmpClass);
    }

    update(ctx) {
        for (let cmp of this.components) {
            cmp.update(ctx);
        }
    }

    draw(ctx) {
        for (let cmp of this.components) {
            cmp.draw(ctx);
        }
    }
}

class FreqObserverComponent extends Component {
    constructor(obj) {
        super(obj);
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
        new Entity(this).registerComponent(FreqObserverComponent);
    }

    subscribe(object) {
        if (!object instanceof Entity) {
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
            o.draw(ctx);
        }
        this.lastLoopTime = loopTime;
    }
}

export { RenderLoop, Entity, Component }