"use strict"

// private

interface ClassifierTypeNode {
    children: Set<Function>;
    instances: Array<any>
};

class Classifier {
    readonly rootType: Function;
    readonly rootTypeNode: ClassifierTypeNode;
    readonly nodeByType: Map<Function, ClassifierTypeNode>;

    constructor(rootType: Function) {
        this.rootType = rootType;
        this.rootTypeNode = { children: new Set(), instances: [] };
        this.nodeByType = new Map();
        this.nodeByType.set(rootType, this.rootTypeNode);
    }

    static * objClassParents(object: any, upToClass: Function) {
        if (object instanceof upToClass) {
            let from = Object.getPrototypeOf(object).constructor;
            for (let cls of this.classParents(from, upToClass)) {
                yield cls;
            }
        }
    }

    static * classParents(fromClass: Function, upToClass: Function) {
        let cls = fromClass;
        yield cls;
        while (cls && cls != upToClass) {
            cls = Object.getPrototypeOf(cls);
            yield cls;
        }
        if (cls == null) {
            console.error("classParents error", fromClass, upToClass);
        }
    }

    add(obj: any) {
        // enrich node tree
        let prevCls = null;
        for (let cls of Classifier.objClassParents(obj, this.rootType)) {
            if (!this.nodeByType.has(cls)) {
                this.nodeByType.set(cls, { children: new Set(), instances: [] });
            }
            let node = <ClassifierTypeNode>this.nodeByType.get(cls);
            if (prevCls) {
                node.children.add(prevCls);
            }
            prevCls = cls;
        }

        // add the actual instance in the obj type node
        this.nodeByType.get(obj.constructor)?.instances.push(obj);
    }

    * getAllInstances(classType: Function): any {
        let rootNode = this.nodeByType.get(classType);
        if (rootNode) {
            for (let obj of rootNode.instances) {
                yield obj;
            }
            for (let cls of rootNode.children) {
                for (let obj of this.getAllInstances(cls)) {
                    yield obj;
                }
            }
        }
    }

    * getExactInstances(classType: Function): any {
        let rootNode = this.nodeByType.get(classType);
        if (rootNode) {
            for (let obj of rootNode.instances) {
                yield obj;
            }
        }
    }

    * getAllChildClass(classType: Function): any {
        let rootNode = this.nodeByType.get(classType);
        if (rootNode) {
            for (let cls of rootNode.children) {
                yield cls;
                for (let subCls of this.getAllChildClass(cls)) {
                    yield subCls;
                }
            }
        }
    }
}


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
        if (step == RenderStep.Move) {
            this.move(ctx);
        } else if (step == RenderStep.Collide) {
            this.collide(ctx);
        } else if (step == RenderStep.Draw) {
            this.draw(ctx);
        }
    }

    move(ctx: FrameContext) {
        // to implement
    }

    collide(ctx: FrameContext) {
        // to implement
    }

    draw(ctx: FrameContext) {
        // to implement
    }
}

class GlobalComponent extends Component {
    constructor(ent: Entity) {
        super(ent);
    }

    static globalUpdate(step: RenderStep, ctx: FrameContext, components: Array<Component>) {
        if (step == RenderStep.Move) {
            this.globalMove(ctx, components);
        } else if (step == RenderStep.Collide) {
            this.globalCollide(ctx, components);
        } else if (step == RenderStep.Draw) {
            this.globalDraw(ctx, components);
        }
    }

    static globalMove(ctx: FrameContext, components: Array<Component>) {
        // to implement
    }

    static globalCollide(ctx: FrameContext, components: Array<Component>) {
        // to implement
    }

    static globalDraw(ctx: FrameContext, components: Array<Component>) {
        // to implement
    }
}

class Entity {
    loop: RenderLoop;
    parentEnt: Entity | null;
    // TODO use Classifier
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
        this.loop.registerComponent(cmp);
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
            console.error("no component registered for class", { class: cmpClass, entity: this });
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

    override draw(ctx: FrameContext) {
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
    readonly root: Entity;
    lastLoopTime: number | null;
    reqFrame: number | null;
    components: Classifier;

    constructor() {
        this.lastLoopTime = null;
        this.reqFrame = null;
        this.components = new Classifier(Component);
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

    registerComponent(cmp: Component) {
        this.components.add(cmp);
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
        for (let cls of this.components.getAllChildClass(GlobalComponent)) {
            let components = [];
            for (let obj of this.components.getAllInstances(cls)) {
                components.push(obj);
            }
            (<any>cls).globalUpdate(RenderStep.Collide, ctx, components);
        }
        this.root.update(RenderStep.Collide, ctx);

        // 3. draw
        this.root.update(RenderStep.Draw, ctx);

        this.lastLoopTime = loopTime;
    }
}

export { RenderStep, FrameContext, RenderLoop, Entity, Component, GlobalComponent }