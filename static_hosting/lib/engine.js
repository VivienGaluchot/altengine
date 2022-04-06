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
    getUniqueInstance(classType) {
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
        if (instance == null) {
            console.error("no child class registered for", { class: classType, classifier: this });
            throw new Error(`no child class registered for ${classType.name}`);
        }
        return instance;
    }
}
class Component {
    constructor(ent) {
        this.ent = ent;
    }
    getComponent(cmpClass) {
        return this.ent.getComponent(cmpClass);
    }
    *getComponents(cmpClass) {
        return this.ent.getComponents(cmpClass);
    }
    move(ctx) {
        // to implement
    }
    collide(ctx) {
        // to implement
    }
    draw(ctx) {
        // to implement
    }
}
class GlobalComponent extends Component {
    constructor(ent) {
        super(ent);
    }
    static globalCollide(ctx, components) {
        // to implement
    }
}
class Entity {
    constructor(parent) {
        if (parent instanceof Entity) {
            this.loop = parent.loop;
            this.parentEnt = parent;
        }
        else {
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
    addChild(ent) {
        this.children.add(ent);
    }
    registerComponent(cmp) {
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
    getComponent(cmpClass) {
        return this.classifier.getUniqueInstance(cmpClass);
    }
    // TODO improve writing to don't need to specify the class in the generic and argument if possible
    *getComponents(cmpClass) {
        return this.classifier.getAllInstances(cmpClass);
    }
    move(ctx) {
        for (let cmp of this.components) {
            cmp.move(ctx);
        }
        for (let ent of this.children) {
            ent.move(ctx);
        }
    }
    collide(ctx) {
        for (let cmp of this.components) {
            cmp.collide(ctx);
        }
        for (let ent of this.children) {
            ent.collide(ctx);
        }
    }
    draw(ctx) {
        for (let cmp of this.components) {
            cmp.draw(ctx);
        }
        for (let ent of this.children) {
            ent.draw(ctx);
        }
    }
}
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
        this.components = new Classifier(Component);
        this.globalUpdates = new Map();
        this.root = new Entity(this);
        new FreqObserverComponent(this.root);
    }
    start(viewProvider) {
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
    registerComponent(cmp) {
        this.components.add(cmp);
    }
    globalCollide(ctx) {
        // keep track of globalCollide functions already called
        // prevent to call it multiple times when inherited but not overridden
        let called = new Set();
        for (let targetCls of this.components.getAllChildClass(GlobalComponent)) {
            for (let cls of getClassAncestorsChildToParent(targetCls, GlobalComponent).reverse()) {
                let cbk = cls.globalCollide;
                if (!called.has(cbk)) {
                    let components = [];
                    for (let obj of this.components.getAllInstances(cls)) {
                        components.push(obj);
                    }
                    // console.debug("run callback from ", cls.name, components.length);
                    cls.globalCollide(ctx, components);
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
        const ctx = {
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
export { RenderLoop, Entity, Component, GlobalComponent };
