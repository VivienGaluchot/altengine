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

class Constrained extends Engine.Component {
    readonly mCmp: Physics.MovingComponent;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    }

    override collide(ctx: Engine.FrameContext) {
        if (this.mCmp.pos.norm() > 5) {
            this.mCmp.pos.normalizeInPlace().scaleInPlace(5);
        }
    }
}

class Falling extends Engine.Component {
    readonly mCmp: Physics.MovingComponent;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    }

    override update(ctx: Engine.FrameContext) {
        this.mCmp.accelerate(new Maths.Vector(0, -9.81));
    }
}

class CollideBlink extends Engine.Component {
    collidingFill: string;
    noCollidingFill: string;
    collCmp: Physics.RigidBody;
    svgCmp: Basics.SvgComponent;

    constructor(obj: Engine.Entity, noCollidingFill: string, collidingFill: string) {
        super(obj);
        this.collidingFill = collidingFill;
        this.noCollidingFill = noCollidingFill;
        this.collCmp = this.getComponent<Physics.RigidBody>(Physics.RigidBody);
        this.svgCmp = this.getComponent<Basics.SvgComponent>(Basics.SvgComponent);
    }

    override draw(ctx: Engine.FrameContext) {
        if (this.collCmp.collisions.length > 0) {
            this.svgCmp.svgEl.style = { fill: this.collidingFill };
        } else {
            this.svgCmp.svgEl.style = { fill: this.noCollidingFill };
        }
    }
}

class Spawner extends Engine.Component {
    override update(ctx: Engine.FrameContext) {
        if (ctx.mouseClick) {
            if (ctx.mouseClick.event.button == 0 && frame.scene) {
                let p;
                if (!ctx.mouseClick.event.ctrlKey) {
                    p = new Ball(frame.scene.root, .2, frame.scene.constructor == SceneD);
                } else {
                    p = new Ball(frame.scene.root, .5, frame.scene.constructor == SceneD);
                }
                p.getComponent<Physics.MovingComponent>(Physics.MovingComponent).pos = ctx.mouseClick.worldPos;
                p.getComponent<Physics.MovingComponent>(Physics.MovingComponent).prevPos = ctx.mouseClick.worldPos;
            }
        }
    }
}


// Entities

class Ball extends Basics.Circle {
    constructor(ent: Engine.Entity, radius: number, isFallingToCenter: boolean) {
        super(ent, radius, { fill: "#8AF" });
        this.registerComponent(new Constrained(this));
        this.registerComponent(new Falling(this));
        this.registerComponent(new Physics.DiscCollider(this, radius));
        this.registerComponent(new Physics.RigidBody(this, radius * radius, 1));
    }
}


// Settings

const checkboxGrid = getExpectedElement("checkbox-grid");

function updateGridVisibility() {
    let isShowed = (<any>checkboxGrid).checked;
    if (frame.scene) {
        let grid = frame.scene.root.getComponent<Basics.SvgGridComponent>(Basics.SvgGridComponent);
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
}

class SceneA extends Altgn.Scene {
    constructor() {
        super();
        this.root.registerComponent(new Spawner(this.root));
        this.root.getComponent<Basics.SvgBackgroundComponent>(Basics.SvgBackgroundComponent).setColor("#012");
    }
}

class SceneB extends SceneA {
    constructor() {
        super();
        this.root.getComponent<Basics.SvgBackgroundComponent>(Basics.SvgBackgroundComponent).setColor("#013");
        for (let i = -9; i <= 9; i += .5) {
            let p = new Ball(this.root, .2, false);
            let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
            cmp.pos.x = i;
            cmp.pos.y = Math.abs(i);
        }
    }
}

class SceneC extends SceneA {
    constructor() {
        super();
        this.root.getComponent<Basics.SvgBackgroundComponent>(Basics.SvgBackgroundComponent).setColor("#022");
        for (let j = 0; j < 3; j++) {
            for (let i = -9; i <= 9; i += .5) {
                let p = new Ball(this.root, .2, false);
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
        this.root.registerComponent(new Spawner(this.root));
        this.root.getComponent<Basics.SvgBackgroundComponent>(Basics.SvgBackgroundComponent).setColor("#112");
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
