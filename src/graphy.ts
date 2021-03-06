"use strict"

import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';
import * as Maths from './lib/maths.js';
import * as Basics from './lib/basics.js';
import { SvgStyle } from './lib/svg.js';


function getExpectedElement(id: string) {
    let el = document.getElementById(id)
    if (!el)
        throw new Error("element with id not found: " + id);
    return el;
}


// Components

class NodeManager extends Engine.Component {
    override update(ctx: Engine.FrameContext): void {
        let input = ctx.mouseClick;
        if (input && input.event.button == 0 && !input.event.ctrlKey) {
            let hasMovedTooMuch = false;
            if (input.relatedMouseDown) {
                let start = new Maths.Vector(input.relatedMouseDown.event.clientX, input.relatedMouseDown.event.clientY);
                let end = new Maths.Vector(input.event.clientX, input.event.clientY);
                hasMovedTooMuch = end.dist(start) > 20;
            }
            if (!hasMovedTooMuch) {
                let p = new Node(this.ent);
                p.getComponent<Physics.MovingComponent>(Physics.MovingComponent).pos = input.worldPos;
            }
        }
    }
}

class MoveMouse extends Engine.Component {
    startDrag?: Maths.Vector;
    isHover: boolean;
    radius: number;

    constructor(ent: Engine.Entity, radius: number) {
        super(ent);
        this.isHover = false;
        this.radius = radius;
    }

    override update(ctx: Engine.FrameContext): void {
        let mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        if (ctx.mouseUp) {
            this.startDrag = undefined;

        } else if (ctx.mouseDown) {
            if (ctx.mouseDown.worldPos.squareDist(mCmp.pos) < (this.radius * this.radius)) {
                this.startDrag = ctx.mouseDown.worldPos;
            }

        } else if (this.startDrag && ctx.mouseMove) {
            let deltaPos = ctx.mouseMove.worldPos.subtract(this.startDrag);
            this.startDrag = ctx.mouseMove.worldPos;
            mCmp.pos.addInPlace(deltaPos);
        }

        if (ctx.mouseMove) {
            this.isHover = ctx.mouseMove.worldPos.squareDist(mCmp.pos) < (this.radius * this.radius);
        }

        if (this.isHover) {
            let input = ctx.mouseClick;
            if (input && input.event.button == 0 && input.event.ctrlKey) {
                this.ent.remove();
            }
        }
    }
}


// Entities

class Manager extends Engine.Entity {
    constructor(ent: Engine.Entity) {
        super(ent);
        this.registerComponent(new NodeManager(this));
    }
}

class Node extends Basics.Circle {
    static readonly defaultStyle: SvgStyle = { fill: "#8AF4", strokeW: 0.06, stroke: "#8AF" };
    static readonly hoverStyle: SvgStyle = { fill: "#8AF8", strokeW: 0.08, stroke: "#8AF" };

    constructor(ent: Engine.Entity) {
        super(ent, 0.25, Node.defaultStyle);
        this.registerComponent(new MoveMouse(this, .25));
    }

    override draw(ctx: Engine.FrameContext): void {
        let mCmp = this.getComponent<MoveMouse>(MoveMouse);
        let svgCmp = this.getComponent<Basics.SvgComponent>(Basics.SvgComponent);
        if (mCmp.isHover) {
            svgCmp.svgEl.style = Node.hoverStyle;
        } else {
            svgCmp.svgEl.style = Node.defaultStyle;
        }
        super.draw(ctx);
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
};

class SceneA extends Altgn.Scene {
    constructor() {
        super();
        this.root.getComponent<Basics.SvgBackgroundComponent>(Basics.SvgBackgroundComponent).setColor("#012");
        new Manager(this.root);
    }
}

getExpectedElement("btn-reset").onclick = () => {
    frame.showScene(new SceneA());
    updateGridVisibility();
};

frame.showScene(new SceneA());
updateGridVisibility();
