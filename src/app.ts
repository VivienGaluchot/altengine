"use strict"

import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';
import * as Maths from './lib/maths.js';
import * as Basics from './lib/basics.js';


function getExpectedElement(id: string) {
    let el = document.getElementById(id)
    if (!el)
        throw new Error("element with id not found: " + id);
    return el;
}


// Components

class ConstrainedFloor extends Engine.Component {
    readonly radius: number;
    readonly mCmp: Physics.MovingComponent;
    readonly ranges: Maths.Rect;

    constructor(obj: Engine.Entity, radius: number, ranges: Maths.Rect) {
        super(obj);
        this.radius = radius;
        this.ranges = ranges;
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    }

    override move(ctx: Engine.FrameContext) {
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        // walls and floor
        if (cmp.pos.x > (this.ranges.maxX() - this.radius)) {
            cmp.pos.x = (this.ranges.maxX() - this.radius);
            if (cmp.speed.x > 0) {
                cmp.speed.x = Math.min(0, cmp.prevSpeed.x * -.9);
            }
        }
        if (cmp.pos.x < (this.ranges.minX() + this.radius)) {
            cmp.pos.x = (this.ranges.minX() + this.radius);
            if (cmp.speed.x < 0) {
                cmp.speed.x = Math.max(0, cmp.prevSpeed.x * -.9);
            }
        }
        if (cmp.pos.y < (this.ranges.minY() + this.radius)) {
            cmp.pos.y = (this.ranges.minY() + this.radius);
            if (cmp.speed.y < 0) {
                cmp.speed.y = Math.max(0, cmp.prevSpeed.y * -.9);
            }
        }
        if (cmp.pos.y > (this.ranges.maxY() - this.radius)) {
            cmp.pos.y = (this.ranges.maxY() - this.radius);
            cmp.speed.y = 0;
        }
    }
}

class Falling extends Engine.Component {
    constructor(obj: Engine.Entity) {
        super(obj);
        this.getComponent<Physics.MovingComponent>(Physics.MovingComponent).acc.y = -9.81;
    }
}

class FallingToCenter extends Engine.Component {
    readonly mCmp: Physics.MovingComponent;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    }

    override move(ctx: Engine.FrameContext) {
        // TODO force management (to be executed before moving ?)
        if (this.mCmp.pos.norm() > 0) {
            this.mCmp.acc = this.mCmp.pos.normalize().scaleInPlace(-9.81);
        } else {
            this.mCmp.acc.set(0, 0);
        }
    }
}

class CollideBlink extends Engine.Component {
    collidingFill: string;
    noCollidingFill: string;
    collCmp: Physics.CollidingComponent;
    svgCmp: Basics.SvgCircleComponent;

    constructor(obj: Engine.Entity, noCollidingFill: string, collidingFill: string) {
        super(obj);
        this.collidingFill = collidingFill;
        this.noCollidingFill = noCollidingFill;
        this.collCmp = this.getComponent<Physics.CollidingComponent>(Physics.CollidingComponent);
        this.svgCmp = this.getComponent<Basics.SvgCircleComponent>(Basics.SvgCircleComponent);
    }

    override draw(ctx: Engine.FrameContext) {
        if (this.collCmp.collisions.length > 0) {
            this.svgCmp.svgEl.style = { fill: this.collidingFill };
        } else {
            this.svgCmp.svgEl.style = { fill: this.noCollidingFill };
        }
    }
}


// Entities

class Ball extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number, mass: number, isFallingToCenter: boolean) {
        super(ent, radius, { fill: "#8AF" });
        this.registerComponent(new Physics.DiscColliderComponent(this, radius));
        this.registerComponent(new Physics.CollidingComponent(this, mass, .9));
        if (isFallingToCenter) {
            this.registerComponent(new FallingToCenter(this));
            this.registerComponent(new ConstrainedFloor(this, radius, new Maths.Rect(new Maths.Vector(-10, -10), new Maths.Vector(20, 20))));
        } else {
            this.registerComponent(new Falling(this));
            this.registerComponent(new ConstrainedFloor(this, radius, new Maths.Rect(new Maths.Vector(-10, -5), new Maths.Vector(20, 15))));
        }
        // this.registerComponent(new CollideBlink(this, "#8AF", "#0F0"));
    }
}

class BallB extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number, mass: number, isFallingToCenter: boolean) {
        super(ent, radius, { fill: "#A8F" });
        this.registerComponent(new Physics.DiscColliderComponent(this, radius));
        this.registerComponent(new Physics.CollidingComponent(this, mass, .9));
        if (isFallingToCenter) {
            this.registerComponent(new FallingToCenter(this));
            this.registerComponent(new ConstrainedFloor(this, radius, new Maths.Rect(new Maths.Vector(-10, -10), new Maths.Vector(20, 20))));
        } else {
            this.registerComponent(new Falling(this));
            this.registerComponent(new ConstrainedFloor(this, radius, new Maths.Rect(new Maths.Vector(-10, -5), new Maths.Vector(20, 15))));
        }
        // this.registerComponent(new CollideBlink(this, "#A8F", "#0F0"));
    }
}

class CenterFloor extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number) {
        super(ent, radius, { fill: "#8AF" });
        this.registerComponent(new Physics.DiscColliderComponent(this, radius));
        this.registerComponent(new Physics.StaticCollidingComponent(this, .9));
        // this.registerComponent(new CollideBlink(this, "#8AF", "#0F0"));
    }
}

class Floor extends Basics.Rect {
    constructor(ent: Engine.Entity) {
        super(ent, 20, .1, { fill: "#8AF" });
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        cmp.pos.y = -5.05;
    }
}


// Scenes

let el = getExpectedElement("frame");
const frame = new Altgn.SvgFrame(el);
window.onresize = () => {
    frame.resize();
}

class SceneA extends Altgn.Scene {
    constructor() {
        super();
        new Floor(this.root);
    }
}

class SceneB extends SceneA {
    constructor() {
        super();
        for (let i = -9; i <= 9; i += .5) {
            let p = new Ball(this.root, .2, .2 * .2, false);
            let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
            cmp.pos.x = i;
            cmp.pos.y = Math.abs(i);
        }
    }
}

class SceneC extends SceneA {
    constructor() {
        super();
        for (let j = 0; j < 3; j++) {
            for (let i = -9; i <= 9; i += .5) {
                let p = new Ball(this.root, .2, .2 * .2, false);
                let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
                cmp.pos.x = i;
                cmp.pos.y = Math.abs(i) + j;
            }
        }
    }
}

class SceneD extends Altgn.Scene {
    constructor() {
        super();
        new CenterFloor(this.root, 2);
    }
}

getExpectedElement("btn-scene-a").onclick = () => {
    frame.showScene(new SceneA());
};
getExpectedElement("btn-scene-b").onclick = () => {
    frame.showScene(new SceneB());
};
getExpectedElement("btn-scene-c").onclick = () => {
    frame.showScene(new SceneC());
};
getExpectedElement("btn-scene-d").onclick = () => {
    frame.showScene(new SceneD());
};

frame.showScene(new SceneA());


el.onclick = (event: MouseEvent) => {
    if (event.button == 0 && frame.scene) {
        let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
        if (frame.safeView.contains(worldPos)) {
            let r = event.ctrlKey ? .4 : .2;
            let p = new BallB(frame.scene.root, r, r * r, frame.scene.constructor == SceneD);
            let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
            cmp.pos = worldPos;
        }
    }
};
