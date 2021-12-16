"use strict"


// Public

enum RenderStep {
    Move,
    Collide,
    Draw
}

interface FrameContext {
    dt: number,
    dtInMs: number,
}

class Component {
    ent: Entity;

    constructor(ent: Entity) {
        this.ent = ent;
    }

    getComponent<Type extends Component>(cmpClass: Function): Type {
        return this.ent.getComponent(cmpClass);
    }

    update(step: RenderStep, ctx: FrameContext) {
        // to implement
    }
}

class GlobalComponent extends Component {
    constructor(ent: Entity) {
        super(ent);
    }

    static globalUpdate(step: RenderStep, ctx: FrameContext, components: Array<Component>) {
        // to implement
    }
}

class Entity {
    loop: RenderLoop;
    parentEnt: Entity | null;
    components: Array<Component>;
    componentsByClass: Map<Function, Component>;
    children: Set<Entity>;

    constructor(parent: RenderLoop | Entity) {
        if (parent instanceof Entity) {
            this.loop = parent.loop;
            this.parentEnt = parent;
        } else {
            this.loop = parent;
            this.parentEnt = null;
        }
        this.components = [];
        this.componentsByClass = new Map();
        this.children = new Set();
        if (this.parentEnt) {
            this.parentEnt.addChild(this);
        }
    }

    addChild(ent: Entity) {
        this.children.add(ent);
    }

    registerComponent(cmp: Component) {
        if (cmp instanceof GlobalComponent) {
            this.loop.registerGlobalComponent(cmp);
        }
        let cmpClass = cmp.constructor;
        this.components.push(cmp);
        if (this.componentsByClass.has(cmpClass)) {
            throw new Error(`component already registered for class ${cmpClass}`);
        }
        this.componentsByClass.set(cmpClass, cmp);
    }

    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    getComponent<Type extends Component>(cmpClass: Function): Type {
        let cmp = this.componentsByClass.get(cmpClass);
        if (cmp) {
            return <Type>cmp;
        } else {
            throw new Error(`no component registered for class ${cmpClass}`);
        }
    }

    update(step: RenderStep, ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.update(step, ctx);
        }
        for (let ent of this.children) {
            ent.update(step, ctx);
        }
    }
}

class FreqObserverComponent extends Component {
    noLogInMs: number;
    ctr: number;

    constructor(obj: Entity) {
        super(obj);
        this.noLogInMs = 0;
        this.ctr = 0;
    }

    override update(step: RenderStep, ctx: FrameContext) {
        if (step == RenderStep.Draw) {
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
}

class RenderLoop {
    root: Entity;
    lastLoopTime: number | null;
    reqFrame: number | null;
    componentsByClass: Map<Function, Array<GlobalComponent>>;

    constructor() {
        this.lastLoopTime = null;
        this.reqFrame = null;
        this.componentsByClass = new Map();
        this.root = new Entity(this);
        this.root.registerComponent(new FreqObserverComponent(this.root));
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

    registerGlobalComponent(cmp: GlobalComponent) {
        let cmpClass = cmp.constructor;
        if (!this.componentsByClass.has(cmpClass)) {
            this.componentsByClass.set(cmpClass, []);
        }
        this.componentsByClass.get(cmpClass)?.push(cmp);
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

        // TODO register the component at a specific render step
        // use a single callback for every steps
        // pass the step as arg

        // 1. move
        this.root.update(RenderStep.Move, ctx);

        // 2. collide
        for (let [cmpClass, components] of this.componentsByClass) {
            (<any>cmpClass).globalUpdate(RenderStep.Collide, ctx, components);
        }
        this.root.update(RenderStep.Collide, ctx);

        // 3. draw
        this.root.update(RenderStep.Draw, ctx);

        this.lastLoopTime = loopTime;
    }
}

export { RenderStep, FrameContext, RenderLoop, Entity, Component, GlobalComponent }