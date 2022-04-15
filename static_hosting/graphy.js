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
class NodeManager extends Engine.Component {
    update(ctx) {
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
                p.getComponent(Physics.MovingComponent).pos = input.worldPos;
            }
        }
    }
}
class MoveMouse extends Engine.Component {
    constructor(ent, radius) {
        super(ent);
        this.isHover = false;
        this.radius = radius;
    }
    update(ctx) {
        let mCmp = this.getComponent(Physics.MovingComponent);
        if (ctx.mouseUp) {
            this.startDrag = undefined;
        }
        else if (ctx.mouseDown) {
            if (ctx.mouseDown.worldPos.squareDist(mCmp.pos) < (this.radius * this.radius)) {
                this.startDrag = ctx.mouseDown.worldPos;
            }
        }
        else if (this.startDrag && ctx.mouseMove) {
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
    constructor(ent) {
        super(ent);
        this.registerComponent(new NodeManager(this));
    }
}
class Node extends Basics.Circle {
    constructor(ent) {
        super(ent, 0.25, Node.defaultStyle);
        this.registerComponent(new MoveMouse(this, .25));
    }
    draw(ctx) {
        let mCmp = this.getComponent(MoveMouse);
        let svgCmp = this.getComponent(Basics.SvgComponent);
        if (mCmp.isHover) {
            svgCmp.svgEl.style = Node.hoverStyle;
        }
        else {
            svgCmp.svgEl.style = Node.defaultStyle;
        }
        super.draw(ctx);
    }
}
Node.defaultStyle = { fill: "#8AF4", strokeW: 0.06, stroke: "#8AF" };
Node.hoverStyle = { fill: "#8AF8", strokeW: 0.08, stroke: "#8AF" };
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
        this.root.getComponent(Basics.SvgBackgroundComponent).setColor("#012");
        new Manager(this.root);
    }
}
getExpectedElement("btn-reset").onclick = () => {
    frame.showScene(new SceneA());
    updateGridVisibility();
};
frame.showScene(new SceneA());
updateGridVisibility();
