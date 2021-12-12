"use strict"

import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';


let el = document.getElementById("frame")
if (!el)
    throw new Error("frame element not found");
const frame = new Altgn.SvgFrame(el);
window.onresize = () => {
    frame.resize();
}

class FallingBouncing extends Engine.Component {
    constructor(obj: Engine.Entity) {
        super(obj);
        this.getComponent<Physics.MovingComponent>(Physics.MovingComponent).acc.y = -9;
    }

    update(ctx: Engine.FrameContext) {
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        if (cmp.pos.y < (-5 + .2)) {
            cmp.pos.y = (-5 + .2);
            if (cmp.speed.y < 0) {
                // TODO prevent energy gain on -1
                cmp.speed.y *= -.9;
            }
        }
    }
}

class Ball extends Altgn.Circle {
    constructor(loop: Engine.RenderLoop) {
        super(loop, frame.el, .2, { fill: "#8AF" });
        this.registerComponent(new FallingBouncing(this));
    }
}

class Floor extends Altgn.Rect {
    constructor(loop: Engine.RenderLoop) {
        super(loop, frame.el, 20, 5, { fill: "#8AF" });
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        cmp.pos.y = -7.5;
    }
}

const loop = new Engine.RenderLoop();
loop.start();
let f = new Floor(loop);
for (let i = -9; i <= 9; i += .5) {
    let p = new Ball(loop);
    let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    cmp.pos.x = i;
    cmp.pos.y = Math.abs(i);
}