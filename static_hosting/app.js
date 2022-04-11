"use strict";
import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';
import * as Maths from './lib/maths.js';
import * as Basics from './lib/basics.js';
function getExpectedElement(id) {
    let el = document.getElementById(id);
    if (!el)
        throw new Error("element with id not found: " + id);
    return el;
}
// Components
class Falling extends Engine.Component {
    constructor(obj) {
        super(obj);
        this.getComponent(Physics.MovingComponent).acc.y = -9.81;
    }
}
class FallingToCenter extends Engine.Component {
    constructor(obj) {
        super(obj);
        this.mCmp = this.getComponent(Physics.MovingComponent);
    }
    move(ctx) {
        // TODO force management (to be executed before moving ?)
        if (this.mCmp.pos.norm() > 0) {
            this.mCmp.acc = this.mCmp.pos.normalize().scaleInPlace(-9.81);
        }
        else {
            this.mCmp.acc.set(0, 0);
        }
    }
}
class CollideBlink extends Engine.Component {
    constructor(obj, noCollidingFill, collidingFill) {
        super(obj);
        this.collidingFill = collidingFill;
        this.noCollidingFill = noCollidingFill;
        this.collCmp = this.getComponent(Physics.RigidBody);
        this.svgCmp = this.getComponent(Basics.SvgComponent);
    }
    draw(ctx) {
        if (this.collCmp.collisions.length > 0) {
            this.svgCmp.svgEl.style = { fill: this.collidingFill };
        }
        else {
            this.svgCmp.svgEl.style = { fill: this.noCollidingFill };
        }
    }
}
// Entities
class Ball extends Basics.Circle {
    constructor(ent, radius, isFallingToCenter) {
        super(ent, radius, { fill: "#8AF" });
        this.registerComponent(new Physics.DiscCollider(this, radius));
        this.registerComponent(new Physics.RigidBody(this, radius * radius, .9));
        if (isFallingToCenter) {
            this.registerComponent(new FallingToCenter(this));
        }
        else {
            this.registerComponent(new Falling(this));
        }
        // this.registerComponent(new CollideBlink(this, "#8AF", "#0F0"));
    }
}
class Bloc extends Basics.Rect {
    constructor(ent, w, h, isFallingToCenter) {
        super(ent, w, h, { fill: "#8AF" });
        this.registerComponent(new Physics.BoxCollider(this, new Maths.Rect(new Maths.Vector(-w / 2, -h / 2), new Maths.Vector(w, h))));
        this.registerComponent(new Physics.RigidBody(this, w * h, .9));
        if (isFallingToCenter) {
            this.registerComponent(new FallingToCenter(this));
        }
        else {
            this.registerComponent(new Falling(this));
        }
        // this.registerComponent(new CollideBlink(this, "#8AF", "#0F0"));
    }
}
class CenterFloor extends Basics.Circle {
    constructor(ent, radius) {
        super(ent, radius - (CenterFloor.strokeW / 2), { fill: "transparent", stroke: "#8AF8", strokeW: CenterFloor.strokeW });
        this.registerComponent(new Physics.DiscCollider(this, radius));
        this.registerComponent(new Physics.StaticRigidBody(this, .9));
        // this.registerComponent(new CollideBlink(this, "#8AF", "#0F0"));
    }
}
CenterFloor.strokeW = .1;
class Floor extends Basics.Rect {
    constructor(ent) {
        super(ent, Floor.width, Floor.height, { fill: "#8AF8" });
        this.registerComponent(new Physics.BoxCollider(this, new Maths.Rect(new Maths.Vector(-Floor.width / 2, -Floor.height / 2), new Maths.Vector(Floor.width, Floor.height))));
        this.registerComponent(new Physics.StaticRigidBody(this, .9));
        let cmp = this.getComponent(Physics.MovingComponent);
        cmp.pos.y = -5 - Floor.height / 2;
    }
}
Floor.width = 20;
Floor.height = .1;
// Settings
const checkboxGrid = getExpectedElement("checkbox-grid");
function updateGridVisibility() {
    let isShowed = checkboxGrid.checked;
    if (frame.scene) {
        let grid = frame.scene.root.getComponent(Basics.SvgGridComponent);
        grid.setVisibility(isShowed);
    }
}
checkboxGrid.onclick = () => {
    updateGridVisibility();
};
// Scenes
let el = getExpectedElement("frame");
const frame = new Altgn.SvgFrame(el);
window.onresize = () => {
    frame.resize();
};
class SceneA extends Altgn.Scene {
    constructor() {
        super();
        new Floor(this.root);
        this.root.getComponent(Basics.SvgBackgroundComponent).setColor("#012");
    }
    onclick(event) {
        if (event.button == 0 && frame.scene) {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            let p;
            if (!event.ctrlKey) {
                p = new Ball(frame.scene.root, .2, frame.scene.constructor == SceneD);
            }
            else {
                p = new Bloc(frame.scene.root, .6, .4, frame.scene.constructor == SceneD);
            }
            p.getComponent(Physics.MovingComponent).pos = worldPos;
        }
    }
}
class SceneB extends SceneA {
    constructor() {
        super();
        this.root.getComponent(Basics.SvgBackgroundComponent).setColor("#013");
        for (let i = -9; i <= 9; i += .5) {
            let p = new Ball(this.root, .2, false);
            let cmp = p.getComponent(Physics.MovingComponent);
            cmp.pos.x = i;
            cmp.pos.y = Math.abs(i);
        }
    }
}
class SceneC extends SceneA {
    constructor() {
        super();
        this.root.getComponent(Basics.SvgBackgroundComponent).setColor("#022");
        for (let j = 0; j < 3; j++) {
            for (let i = -9; i <= 9; i += .5) {
                let p = new Ball(this.root, .2, false);
                let cmp = p.getComponent(Physics.MovingComponent);
                cmp.pos.x = i;
                cmp.pos.y = Math.abs(i) + j;
            }
        }
    }
}
class SceneD extends Altgn.Scene {
    constructor() {
        super();
        this.root.getComponent(Basics.SvgBackgroundComponent).setColor("#112");
        new CenterFloor(this.root, 2);
    }
    onclick(event) {
        if (event.button == 0 && frame.scene) {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            let p;
            if (!event.ctrlKey) {
                p = new Ball(frame.scene.root, .2, frame.scene.constructor == SceneD);
            }
            else {
                p = new Bloc(frame.scene.root, .6, .4, frame.scene.constructor == SceneD);
            }
            p.getComponent(Physics.MovingComponent).pos = worldPos;
        }
    }
}
getExpectedElement("btn-scene-a").onclick = () => {
    frame.showScene(new SceneA());
    updateGridVisibility();
};
getExpectedElement("btn-scene-b").onclick = () => {
    frame.showScene(new SceneB());
    updateGridVisibility();
};
getExpectedElement("btn-scene-c").onclick = () => {
    frame.showScene(new SceneC());
    updateGridVisibility();
};
getExpectedElement("btn-scene-d").onclick = () => {
    frame.showScene(new SceneD());
    updateGridVisibility();
};
frame.showScene(new SceneA());
updateGridVisibility();
