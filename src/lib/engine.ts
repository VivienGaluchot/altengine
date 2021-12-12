"use strict"


// Public

interface FrameContext {
    dt: number,
    dtInMs: number,
}

class Component {
    ent: Entity;

    constructor(ent: Entity) {
        this.ent = ent;
    }

    getComponent<Type extends Component>(cmpClass: typeof Component): Type {
        return this.ent.getComponent(cmpClass);
    }

    update(ctx: FrameContext) {
        // to implement
    }

    collide(ctx: FrameContext) {
        // to implement
    }

    draw(ctx: FrameContext) {
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
        for (let ent of this.children) {
            ent.update(ctx);
        }
    }

    collide(ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.collide(ctx);
        }
        for (let ent of this.children) {
            ent.collide(ctx);
        }
    }

    draw(ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.draw(ctx);
        }
        for (let ent of this.children) {
            ent.draw(ctx);
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
    root: Entity;
    lastLoopTime: number | null;
    reqFrame: number | null;

    constructor() {
        this.lastLoopTime = null;
        this.reqFrame = null;
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
        // enum RenderStep {
        //     Move,
        //     Collide,
        //     Draw
        // }
        // use a single callback for every steps
        // pass the step as arg

        // 1. move
        this.root.update(ctx);

        // 2. collide
        // TODO compute an efficient colliding memory structure
        // https://en.wikipedia.org/wiki/Quadtree
        // and add it to the context
        this.root.collide(ctx);

        // 3. draw
        this.root.draw(ctx);

        this.lastLoopTime = loopTime;
    }
}

export { FrameContext, RenderLoop, Entity, Component }