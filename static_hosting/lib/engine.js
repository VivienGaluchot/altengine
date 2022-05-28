"use strict";
;
function getClassAncestorsChildToParent(fromClass, upToClass) {
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
function getObjectClassAncestorsChildToParent(object, upToClass) {
    if (object instanceof upToClass) {
        let from = Object.getPrototypeOf(object).constructor;
        return getClassAncestorsChildToParent(from, upToClass);
    }
    else {
        console.error(object, "object is not an instance of", upToClass);
        throw new Error(`${object.constructor.name} object is not an instance of ${upToClass.name}`);
    }
}
class Classifier {
    constructor(rootType) {
        this.rootType = rootType;
        this.rootTypeNode = { children: new Set(), instances: [] };
        this.nodeByType = new Map();
        this.nodeByType.set(rootType, this.rootTypeNode);
    }
    static *objClassParents(object, upToClass) {
        if (object instanceof upToClass) {
            let from = Object.getPrototypeOf(object).constructor;
            return getClassAncestorsChildToParent(from, upToClass);
        }
        else {
            console.error(object, "object is not an instance of", upToClass);
            throw new Error(`${object.constructor.name} object is not an instance of ${upToClass.name}`);
        }
    }
    hasClass(cls) {
        return this.nodeByType.has(cls);
    }
    add(obj) {
        var _a;
        // enrich node tree
        let prevCls = null;
        for (let cls of getObjectClassAncestorsChildToParent(obj, this.rootType)) {
            if (!this.nodeByType.has(cls)) {
                this.nodeByType.set(cls, { children: new Set(), instances: [] });
            }
            let node = this.nodeByType.get(cls);
            if (prevCls) {
                node.children.add(prevCls);
            }
            prevCls = cls;
        }
        // add the actual instance in the obj type node
        (_a = this.nodeByType.get(obj.constructor)) === null || _a === void 0 ? void 0 : _a.instances.push(obj);
    }
    *getAllInstances(classType) {
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
    *getExactInstances(classType) {
        let rootNode = this.nodeByType.get(classType);
        if (rootNode) {
            for (let obj of rootNode.instances) {
                yield obj;
            }
        }
    }
    *getAllChildClass(classType) {
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
    getUniqueInstanceOrNull(classType) {
        let instance = null;
        for (let obj of this.getAllInstances(classType)) {
            if (instance == null) {
                instance = obj;
            }
            else {
                console.error("multiple child class registered for", { class: classType, classifier: this });
                throw new Error(`multiple child class registered for ${classType.name}`);
            }
        }
        return instance;
    }
    getUniqueInstance(classType) {
        let instance = this.getUniqueInstanceOrNull(classType);
        if (instance == null) {
            console.error("no child class registered for", { class: classType, classifier: this });
            throw new Error(`no child class registered for ${classType.name}`);
        }
        return instance;
    }
}
class Component {
    constructor(ent) {
        this.cmpId = Component.nextId;
        Component.nextId++;
        this.ent = ent;
    }
    getComponent(cmpClass) {
        return this.ent.getComponent(cmpClass);
    }
    getComponentOrNull(cmpClass) {
        return this.ent.getComponentOrNull(cmpClass);
    }
    *getComponents(cmpClass) {
        return this.ent.getComponents(cmpClass);
    }
    // callbacks
    initialize() {
        // to implement
    }
    update(ctx) {
        // to implement
    }
    collide(ctx) {
        // to implement
    }
    draw(ctx) {
        // to implement
    }
    terminate() {
        // to implement
    }
}
Component.nextId = 0;
class GlobalComponent extends Component {
    constructor(ent) {
        super(ent);
    }
    static globalUpdate(ctx, components) {
        // to implement
    }
    static globalCollide(ctx, components) {
        // to implement
    }
}
class Entity {
    constructor(parent) {
        this.entId = Entity.nextId;
        Entity.nextId++;
        if (parent instanceof Entity) {
            this.loop = parent.loop;
            this.parentEnt = parent;
        }
        else {
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
    addChild(ent) {
        this.children.add(ent);
        if (this.isInitialized) {
            ent.initialize();
        }
    }
    removeChild(ent) {
        this.children.delete(ent);
        if (this.isInitialized) {
            ent.terminate();
        }
    }
    remove() {
        if (this.parentEnt) {
            this.parentEnt.removeChild(this);
        }
        else {
            throw new Error(`root entity not removable`);
        }
    }
    registerComponent(cmp) {
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
    getComponent(cmpClass) {
        return this.classifier.getUniqueInstance(cmpClass);
    }
    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    getComponentOrNull(cmpClass) {
        return this.classifier.getUniqueInstanceOrNull(cmpClass);
    }
    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    *getComponents(cmpClass) {
        return this.classifier.getAllInstances(cmpClass);
    }
    *enumerate() {
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
    update(ctx) {
        for (let el of this.enumerate()) {
            el.update(ctx);
        }
    }
    collide(ctx) {
        for (let el of this.enumerate()) {
            el.collide(ctx);
        }
    }
    draw(ctx) {
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
Entity.nextId = 0;
class FreqObserverComponent extends Component {
    constructor(obj) {
        super(obj);
        this.noLogInMs = 0;
        this.ctr = 0;
    }
    draw(ctx) {
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
    constructor() {
        this.glbComponents = new Classifier(GlobalComponent);
        this.root = new Entity(this);
        this.root.registerComponent(new FreqObserverComponent(this.root));
        this.frameInput = {};
    }
    start(viewProvider) {
        this.viewProvider = viewProvider;
        this.lastLoopTime = undefined;
        this.root.initialize();
        let loop = (time) => {
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
    registerGlobalComponent(cmp) {
        this.glbComponents.add(cmp);
    }
    globalUpdate(ctx) {
        // keep track of globalUpdate functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set();
        for (let targetCls of this.glbComponents.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = cls.globalUpdate;
                if (!called.has(cbk)) {
                    let glbComponents = [];
                    for (let obj of this.glbComponents.getAllInstances(cls)) {
                        glbComponents.push(obj);
                    }
                    cls.globalUpdate(ctx, glbComponents);
                    called.add(cbk);
                }
            }
        }
    }
    globalCollide(ctx) {
        // keep track of globalCollide functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set();
        for (let targetCls of this.glbComponents.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = cls.globalCollide;
                if (!called.has(cbk)) {
                    let glbComponents = [];
                    for (let obj of this.glbComponents.getAllInstances(cls)) {
                        glbComponents.push(obj);
                    }
                    cls.globalCollide(ctx, glbComponents);
                    called.add(cbk);
                }
            }
        }
    }
    execLoop(timeInMs) {
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
        const ctx = Object.assign({ dt: dtInMs / 1000, dtInMs: dtInMs, safeView: this.viewProvider.safeView.clone(), fullView: this.viewProvider.fullView.clone() }, this.frameInput);
        this.frameInput = {};
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
export { RenderLoop, Entity, Component, GlobalComponent };
