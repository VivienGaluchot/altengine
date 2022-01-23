"use strict"

import * as Maths from './maths.js';


// private

interface ClassifierTypeNode {
    children: Set<Function>;
    instances: Array<any>
};

function getClassAncestorsChildToParent(fromClass: Function, upToClass: Function): Array<Function> {
    let ancestors = [];
    let cls = fromClass;
    ancestors.push(cls);
    while (cls && cls != upToClass) {
        cls = Object.getPrototypeOf(cls);
        ancestors.push(cls);
    }
    if (cls != upToClass) {
        console.error(fromClass, "is not a descendent from", upToClass);
        throw new Error(`${fromClass.name} is not a descendent from ${upToClass.name}`);
    }
    return ancestors;
}

function getObjectClassAncestorsChildToParent(object: any, upToClass: Function): Array<Function> {
    if (object instanceof upToClass) {
        let from = Object.getPrototypeOf(object).constructor;
        return getClassAncestorsChildToParent(from, upToClass);
    } else {
        console.error(object, "object is not an instance of", upToClass);
        throw new Error(`${object.constructor.name} object is not an instance of ${upToClass.name}`);
    }
}

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
            return getClassAncestorsChildToParent(from, upToClass);
        } else {
            console.error(object, "object is not an instance of", upToClass);
            throw new Error(`${object.constructor.name} object is not an instance of ${upToClass.name}`);
        }
    }

    add(obj: any) {
        // enrich node tree
        let prevCls = null;
        for (let cls of getObjectClassAncestorsChildToParent(obj, this.rootType)) {
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

    getUniqueInstance(classType: Function): any {
        let instance = null;
        for (let obj of this.getAllInstances(classType)) {
            if (instance == null) {
                instance = obj;
            } else {
                console.error("multiple child class registered for", { class: classType, classifier: this });
                throw new Error(`multiple child class registered for ${classType.name}`);
            }
        }
        if (instance == null) {
            console.error("no child class registered for", { class: classType, classifier: this });
            throw new Error(`no child class registered for ${classType.name}`);
        }
        return instance;
    }
}


// Public

interface FrameContext {
    dt: number,
    dtInMs: number,
    safeView: Maths.Rect,
    fullView: Maths.Rect,
}

class Component {
    ent: Entity;

    constructor(ent: Entity) {
        this.ent = ent;
    }

    getComponent<Type extends Component>(cmpClass: Function): Type {
        return this.ent.getComponent(cmpClass);
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

    static globalCollide(ctx: FrameContext, components: Array<Component>) {
        // to implement
    }
}

class Entity {
    loop: RenderLoop;
    parentEnt?: Entity;
    components: Array<Component>;
    classifier: Classifier;
    componentsByClass: Map<Function, Component>;
    children: Set<Entity>;

    constructor(parent: RenderLoop | Entity) {
        if (parent instanceof Entity) {
            this.loop = parent.loop;
            this.parentEnt = parent;
        } else {
            this.loop = parent;
        }
        this.components = [];
        this.classifier = new Classifier(Component);
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
        if (this.componentsByClass.has(cmpClass)) {
            throw new Error(`component already registered for class ${cmpClass}`);
        }
        this.componentsByClass.set(cmpClass, cmp);
        this.loop.registerComponent(cmp);
        this.classifier.add(cmp);
        this.components.push(cmp);
    }

    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    getComponent<Type extends Component>(cmpClass: Function): Type {
        return <Type>this.classifier.getUniqueInstance(cmpClass);
    }

    move(ctx: FrameContext) {
        for (let cmp of this.components) {
            cmp.move(ctx);
        }
        for (let ent of this.children) {
            ent.move(ctx);
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

interface ViewProvider {
    // safe area, always drawn for all aspect ratios
    safeView: Maths.Rect;
    // full area, actuel area drawn
    fullView: Maths.Rect;
}

abstract class RenderLoop {
    readonly root: Entity;

    lastLoopTime?: number;
    reqFrame?: number;
    components: Classifier;
    // Map callback -> Class Object
    globalUpdates: Map<Function, Function>;

    viewProvider?: ViewProvider;

    constructor() {
        this.components = new Classifier(Component);
        this.globalUpdates = new Map();
        this.root = new Entity(this);
        this.root.registerComponent(new FreqObserverComponent(this.root));
    }

    start(viewProvider: ViewProvider) {
        this.viewProvider = viewProvider;
        this.lastLoopTime = undefined;
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

    private globalCollide(ctx: FrameContext) {
        // keep track of globalCollide functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set<Function>();
        for (let targetCls of this.components.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = (<any>cls).globalCollide;
                if (!called.has(cbk)) {
                    let components = [];
                    for (let obj of this.components.getAllInstances(cls)) {
                        components.push(obj);
                    }
                    // console.debug("run callback from ", cls.name, components.length);
                    (<any>cls).globalCollide(ctx, components);
                    called.add(cbk);
                }
            }
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
        if (!this.viewProvider) {
            throw new Error("view provider not defined");
        }
        const ctx: FrameContext = {
            dt: dtInMs / 1000,
            dtInMs: dtInMs,
            safeView: this.viewProvider.safeView.clone(),
            fullView: this.viewProvider.fullView.clone(),
        };

        // TODO register the component at a specific render step
        // use a single callback for every steps
        // pass the step as arg

        // 1. move
        this.root.move(ctx);

        // 2. collide
        this.globalCollide(ctx);
        this.root.collide(ctx);

        // 3. draw
        this.root.draw(ctx);

        this.lastLoopTime = loopTime;
    }
}

export { FrameContext, RenderLoop, Entity, Component, GlobalComponent }