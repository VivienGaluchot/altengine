"use strict"

import * as Altgn from './lib/altng.mjs';
import * as Engine from './lib/engine.mjs';


const frame = new Altgn.SvgFrame(document.getElementById("frame"));
window.onresize = () => {
    frame.resize();
}

class Part extends Altgn.Circle {
    constructor(loop) {
        super(loop, frame.el, .2, { fill: "#8AF" });
        this.acc.y = -9;
    }

    update(ctx) {
        super.update(ctx);
        if (this.pos.y < (-5 + .2)) {
            this.pos.y = (-5 + .2);
            if (this.speed.y < 0) {
                // TODO prevent energy gain on -1
                this.speed.y *= -.9;
            }
        }
    }
}

const loop = new Engine.RenderLoop();
loop.start();
for (let i = -9; i <= 9; i += .5) {
    let p = new Part(loop);
    p.pos.x = i;
    p.pos.y = Math.abs(i);
}