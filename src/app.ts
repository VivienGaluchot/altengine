"use strict"

import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';


const frame = new Altgn.SvgFrame(document.getElementById("frame"));
window.onresize = () => {
    frame.resize();
}

class FallingBouncing extends Engine.Component {
    constructor(obj) {
        super(obj);
        this.getComponent(Physics.MovingComponent).acc.y = -9;
    }

    update(ctx) {
        let cmp = this.getComponent(Physics.MovingComponent);
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
    constructor(loop) {
        super(loop, frame.el, .2, { fill: "#8AF" });
        this.registerComponent(FallingBouncing);
    }
}

const loop = new Engine.RenderLoop();
loop.start();
for (let i = -9; i <= 9; i += .5) {
    let p = new Ball(loop);
    let cmp = p.getComponent(Physics.MovingComponent);
    cmp.pos.x = i;
    cmp.pos.y = Math.abs(i);
}