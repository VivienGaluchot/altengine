"use strict"


// Public

interface FrameContext {
    dt: number,
    dtInMs: number
}

class Component {
    obj: Entity;

    constructor(obj: Entity, args: any = null) {
        this.obj = obj;
    }

    getComponent<Type extends Component>(cmpClass: typeof Component): Type {
        return this.obj.getComponent(cmpClass);
    }

    update(ctx: FrameContext) {
        // to implement
    }

    draw(ctx: FrameContext) {
        // to implement
    }
}

class Entity {
    loop: RenderLoop;
    components: Array<Component>;
    componentsByClass: Map<Function, Component>

    constructor(loop: RenderLoop) {
        loop.subscribe(this);
        this.loop = loop;
        this.components = [];
        this.componentsByClass = new Map();
    }

    registerComponent(cmp: Component) {
        let cmpClass = cmp.constructor;
        this.components.push(cmp);
        if (this.componentsByClass.has(cmpClass)) {
            throw new Error(`component already registered for class ${cmpClass}`);
        }
        this.componentsByClass.set(cmpClass, cmp);
    }

    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    getComponent<Type extends Component>(cmpClass: typeof Component): Type {
        let cmp = this.componentsByClass.get(cmpClass);
        if (cmp) {
            return <Type>cmp;
        } else {
            throw new Error(`no component registered for class ${cmpClass}`);
        }
    }

    update(ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.update(ctx);
        }
    }

    draw(ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.draw(ctx);
        }
    }
}

class FreqObserverComponent extends Component {
    noLogInMs : number;
    ctr : number;

    constructor(obj: Entity) {
        super(obj);
        this.noLogInMs = 0;
        this.ctr = 0;
    }

    override update(ctx: FrameContext) {
        this.noLogInMs += ctx.dtInMs;
        this.ctr += 1;
        if (this.noLogInMs > 1000) {
            this.noLogInMs -= 1000;
            for (let el of document.querySelectorAll(".altgn-fps-ctr")) {
                el.innerHTML = `${this.ctr}`;
            }
            this.ctr = 0;
        }
    }
}

class RenderLoop {
    objects : Set<Entity>;
    lastLoopTime : number | null;
    reqFrame : number | null;

    constructor() {
        this.objects = new Set<Entity>();
        this.lastLoopTime = null;
        this.reqFrame = null;
        let obs = new Entity(this);
        obs.registerComponent(new FreqObserverComponent(obs));
    }

    subscribe(object : Entity) {
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
        if (this.reqFrame) {
            window.cancelAnimationFrame(this.reqFrame);
        }
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

export { FrameContext, RenderLoop, Entity, Component }