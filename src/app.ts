"use strict"

import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';
import * as Maths from './lib/maths.js';


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
        this.getComponent<Physics.MovingComponent>(Physics.MovingComponent).acc.y = -9.81;
    }

    override update(step: Engine.RenderStep, ctx: Engine.FrameContext) {
        if (step == Engine.RenderStep.Move) {
            this.move(ctx);
        } else if (step == Engine.RenderStep.Draw) {
            this.draw(ctx);
        }
    }

    move(ctx: Engine.FrameContext) {
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        if (cmp.pos.y < (-5 + .2)) {
            cmp.pos.y = (-5 + .2);
            if (cmp.speed.y < 0) {
                // TODO prevent energy gain when -1
                cmp.speed.y *= -.9;
            }
        }
    }

    draw(ctx: Engine.FrameContext) {
        let collCmp = this.getComponent<Physics.CollidingComponent>(Physics.CollidingComponent);
        let svgCmp = this.getComponent<Altgn.SvgCircleComponent>(Altgn.SvgCircleComponent);
        if (collCmp.collisions.length > 0) {
            svgCmp.svgEl.style = { fill: "#2F2" };
        } else {
            svgCmp.svgEl.style = { fill: "#8AF" };
        }
    }
}

class Ball extends Altgn.Circle {
    constructor(ent: Engine.Entity) {
        super(ent, frame, .2, { fill: "#8AF" });
        let boundingBox = new Maths.Rect(new Maths.Vector(-.2, -.2), new Maths.Vector(.2 * 2, .2 * 2));
        this.registerComponent(new Physics.CollidingComponent(this, boundingBox));
        this.registerComponent(new FallingBouncing(this));
    }
}

class Floor extends Altgn.Rect {
    constructor(ent: Engine.Entity) {
        super(ent, frame, 20, .1, { fill: "#8AF" });
        let cmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
        cmp.pos.y = -5.05;
    }
}

const loop = new Engine.RenderLoop();
loop.start();
new Floor(loop.root);
for (let i = -9; i <= 9; i += .5) {
    let p = new Ball(loop.root);
    let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    cmp.pos.x = i;
    cmp.pos.y = Math.abs(i);
}

el.onclick = (event: MouseEvent) => {
    if (event.button == 0) {
        let domPos = new Maths.Vector(event.clientX, event.clientY);
        let worldPos = frame.domToWorld(domPos);
        if (frame.safeView.contains(worldPos)) {
            let p = new Ball(loop.root);
            let cmp = p.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
            cmp.pos = worldPos;
        }
    }
};