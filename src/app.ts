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

class FallingBouncing extends Engine.Component {
    readonly radius: number;
    collidingFill: string;
    noCollidingFill: string;

    constructor(obj: Engine.Entity, radius: number, noCollidingFill: string, collidingFill: string) {
        super(obj);
        this.radius = radius;
        this.collidingFill = collidingFill;
        this.noCollidingFill = noCollidingFill;
        this.getComponent<Physics.MovingComponent>(Physics.MovingComponent).acc.y = -9.81;
    }

    override move(ctx: Engine.FrameContext) {
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        // walls and floor
        if (cmp.pos.x > (10 - this.radius)) {
            cmp.pos.x = (10 - this.radius);
            if (cmp.speed.x > 0) {
                // TODO prevent energy gain when -1
                cmp.speed.x *= -.9;
            }
        }
        if (cmp.pos.x < (-10 + this.radius)) {
            cmp.pos.x = (-10 + this.radius);
            if (cmp.speed.x < 0) {
                // TODO prevent energy gain when -1
                cmp.speed.x *= -.9;
            }
        }
        if (cmp.pos.y < (-5 + this.radius)) {
            cmp.pos.y = (-5 + this.radius);
            if (cmp.speed.y < 0) {
                // TODO prevent energy gain when -1
                cmp.speed.y *= -.9;
            }
        }
    }

    override draw(ctx: Engine.FrameContext) {
        let collCmp = this.getComponent<Physics.CollidingComponent>(Physics.CollidingComponent);
        let svgCmp = this.getComponent<Basics.SvgCircleComponent>(Basics.SvgCircleComponent);
        if (collCmp.collisions.length > 0) {
            svgCmp.svgEl.style = { fill: this.collidingFill };
        } else {
            svgCmp.svgEl.style = { fill: this.noCollidingFill };
        }
    }
}


// Entities

class Ball extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number, mass: number) {
        super(ent, radius, { fill: "#8AF" });
        let collider = new Physics.DiscColliderComponent(this, radius);
        this.registerComponent(new Physics.CollidingComponent(this, mass, collider));
        this.registerComponent(new FallingBouncing(this, radius, "#8AF", "#0F0"));
    }
}

class BallB extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number, mass: number) {
        super(ent, radius, { fill: "#A8F" });
        let collider = new Physics.DiscColliderComponent(this, radius);
        this.registerComponent(new Physics.CollidingComponent(this, mass, collider));
        this.registerComponent(new FallingBouncing(this, radius, "#A8F", "#0F0"));
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
            let p = new Ball(this.root, .2, .2 * .2);
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
                let p = new Ball(this.root, .2, .2 * .2);
                let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
                cmp.pos.x = i;
                cmp.pos.y = Math.abs(i) + j;
            }
        }
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

frame.showScene(new SceneA());


el.onclick = (event: MouseEvent) => {
    if (event.button == 0 && frame.scene) {
        let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
        if (frame.safeView.contains(worldPos)) {
            let r = event.ctrlKey ? .4 : .2;
            let p = new BallB(frame.scene.root, r, r * r);
            let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
            cmp.pos = worldPos;
        }
    }
};