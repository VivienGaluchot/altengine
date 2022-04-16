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

    hasClass(cls: Function) {
        return this.nodeByType.has(cls);
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

    * getAllInstances<Type>(classType: Function): Generator<Type> {
        let rootNode = this.nodeByType.get(classType);
        if (rootNode) {
            for (let obj of rootNode.instances) {
                yield <Type>obj;
            }
            for (let cls of rootNode.children) {
                for (let obj of this.getAllInstances<Type>(cls)) {
                    yield <Type>obj;
                }
            }
        }
    }

    * getExactInstances<Type>(classType: Function): Generator<Type> {
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

    getUniqueInstance<Type>(classType: Function): Type {
        let instance = null;
        for (let obj of this.getAllInstances<Type>(classType)) {
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

interface WorldMouseEvent {
    worldPos: Maths.Vector;
    event: MouseEvent;
}

interface WorldMousePressedEvent extends WorldMouseEvent {
    relatedMouseDown?: WorldMouseEvent;
}

interface FrameInput {
    mouseDown?: WorldMouseEvent;
    mouseClick?: WorldMousePressedEvent;
    mouseMove?: WorldMousePressedEvent;
    mouseUp?: WorldMousePressedEvent;
}

interface FrameContext extends FrameInput {
    dt: number;
    dtInMs: number;
    safeView: Maths.Rect;
    fullView: Maths.Rect;
}

class Component {
    static nextId: number = 0;
    cmpId: number;

    ent: Entity;

    constructor(ent: Entity) {
        this.cmpId = Component.nextId;
        Component.nextId++;

        this.ent = ent;
    }

    getComponent<Type extends Component>(cmpClass: Function): Type {
        return this.ent.getComponent(cmpClass);
    }

    * getComponents<Type extends Component>(cmpClass: Function): Generator<Type> {
        return this.ent.getComponents(cmpClass);
    }

    // callbacks

    initialize() {
        // to implement
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

    terminate() {
        // to implement
    }
}

class GlobalComponent extends Component {
    constructor(ent: Entity) {
        super(ent);
    }

    static globalUpdate(ctx: FrameContext, components: Array<GlobalComponent>) {
        // to implement
    }

    static globalCollide(ctx: FrameContext, components: Array<GlobalComponent>) {
        // to implement
    }
}

class Entity {
    static nextId: number = 0;
    entId: number;

    loop: RenderLoop;
    parentEnt?: Entity;
    components: Array<Component>;
    classifier: Classifier;
    children: Set<Entity>;
    isInitialized: boolean;

    constructor(parent: RenderLoop | Entity) {
        this.entId = Entity.nextId;
        Entity.nextId++;

        if (parent instanceof Entity) {
            this.loop = parent.loop;
            this.parentEnt = parent;
        } else {
            this.loop = parent;
        }
        this.components = [];
        this.classifier = new Classifier(Component);
        this.children = new Set();
        this.isInitialized = false;

        if (this.parentEnt) {
            this.parentEnt.addChild(this);
        }
    }

    addChild(ent: Entity) {
        this.children.add(ent);
        if (this.isInitialized) {
            ent.initialize();
        }
    }

    removeChild(ent: Entity) {
        this.children.delete(ent);
        if (this.isInitialized) {
            ent.terminate();
        }
    }

    remove() {
        if (this.parentEnt) {
            this.parentEnt.removeChild(this);
        } else {
            throw new Error(`root entity not removable`);
        }
    }

    registerComponent(cmp: Component) {
        if (this.classifier.hasClass(cmp.constructor)) {
            throw new Error(`component already registered for class ${cmp.constructor}`);
        }
        this.classifier.add(cmp);
        if (cmp instanceof GlobalComponent) {
            this.loop.registerGlobalComponent(cmp);
        }
        this.components.push(cmp);
        if (this.isInitialized) {
            cmp.initialize();
        }
    }

    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    getComponent<Type extends Component>(cmpClass: Function): Type {
        return <Type>this.classifier.getUniqueInstance(cmpClass);
    }

    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    * getComponents<Type extends Component>(cmpClass: Function): Generator<Type> {
        return this.classifier.getAllInstances(cmpClass);
    }


    private * enumerate(): Generator<Component | Entity> {
        for (let cmp of this.components) {
            yield cmp;
        }
        for (let ent of this.children) {
            yield ent;
        }
    }

    initialize() {
        for (let el of this.enumerate()) {
            el.initialize();
        }
        this.isInitialized = true;
    }

    update(ctx: FrameContext) {
        for (let el of this.enumerate()) {
            el.update(ctx);
        }
    }

    collide(ctx: FrameContext) {
        for (let el of this.enumerate()) {
            el.collide(ctx);
        }
    }

    draw(ctx: FrameContext) {
        for (let el of this.enumerate()) {
            el.draw(ctx);
        }
    }

    terminate() {
        for (let el of this.enumerate()) {
            el.terminate();
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
    glbComponents: Classifier;

    viewProvider?: ViewProvider;

    frameInput: FrameInput;

    constructor() {
        this.glbComponents = new Classifier(GlobalComponent);
        this.root = new Entity(this);
        this.root.registerComponent(new FreqObserverComponent(this.root));
        this.frameInput = {};
    }

    start(viewProvider: ViewProvider) {
        this.viewProvider = viewProvider;
        this.lastLoopTime = undefined;
        this.root.initialize();

        let loop = (time: DOMHighResTimeStamp) => {
            this.execLoop(time);
            this.reqFrame = window.requestAnimationFrame(loop);
        };
        loop(0);
    }

    stop() {
        if (this.reqFrame) {
            window.cancelAnimationFrame(this.reqFrame);
        }
        this.root.terminate();
    }

    registerGlobalComponent(cmp: GlobalComponent) {
        this.glbComponents.add(cmp);
    }

    private globalUpdate(ctx: FrameContext) {
        // keep track of globalUpdate functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set<Function>();
        for (let targetCls of this.glbComponents.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = (<any>cls).globalUpdate;
                if (!called.has(cbk)) {
                    let glbComponents = [];
                    for (let obj of this.glbComponents.getAllInstances(cls)) {
                        glbComponents.push(obj);
                    }
                    (<any>cls).globalUpdate(ctx, glbComponents);
                    called.add(cbk);
                }
            }
        }
    }

    private globalCollide(ctx: FrameContext) {
        // keep track of globalCollide functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set<Function>();
        for (let targetCls of this.glbComponents.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = (<any>cls).globalCollide;
                if (!called.has(cbk)) {
                    let glbComponents = [];
                    for (let obj of this.glbComponents.getAllInstances(cls)) {
                        glbComponents.push(obj);
                    }
                    (<any>cls).globalCollide(ctx, glbComponents);
                    called.add(cbk);
                }
            }
        }
    }

    execLoop(timeInMs: DOMHighResTimeStamp) {
        let dtInMs = 0;
        if (this.lastLoopTime) {
            dtInMs = timeInMs - this.lastLoopTime;
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
            ...this.frameInput
        };
        this.frameInput = {}

        // TODO register the component at a specific render step
        // use a single callback for every steps
        // pass the step as arg

        // 1. update
        this.globalUpdate(ctx);
        this.root.update(ctx);

        // 2. collide
        this.globalCollide(ctx);
        this.root.collide(ctx);

        // 3. draw
        this.root.draw(ctx);

        this.lastLoopTime = timeInMs;
    }
}

export { FrameContext, RenderLoop, Entity, Component, GlobalComponent, WorldMouseEvent }