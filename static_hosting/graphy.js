"use strict";
import * as Altgn from './lib/altng.js';
import * as Engine from './lib/engine.js';
import * as Physics from './lib/physics.js';
import * as Basics from './lib/basics.js';
function getExpectedElement(id) {
    let el = document.getElementById(id);
    if (!el)
        throw new Error("element with id not found: " + id);
    return el;
}
// Components
// TODO find a cleaner way, maybe with an event list in the ctx
let preventNextSpawn = false;
class NodeSpawner extends Engine.Component {
    update(ctx) {
        if (ctx.mouseClick) {
            if (preventNextSpawn) {
                preventNextSpawn = false;
            }
            else {
                if (ctx.mouseClick.event.button == 0) {
                    console.log(ctx.mouseClick.event);
                    if (!ctx.mouseClick.event.ctrlKey) {
                        let p = new Node(this.ent);
                        p.getComponent(Physics.MovingComponent).pos = ctx.mouseClick.worldPos;
                    }
                }
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
            if (ctx.mouseDown.worldPos.dist(mCmp.pos) < this.radius) {
                this.startDrag = ctx.mouseDown.worldPos;
            }
        }
        else if (this.startDrag && ctx.mouseMove) {
            let deltaPos = ctx.mouseMove.worldPos.subtract(this.startDrag);
            this.startDrag = ctx.mouseMove.worldPos;
            mCmp.pos.addInPlace(deltaPos);
            preventNextSpawn = true;
        }
        if (ctx.mouseMove) {
            this.isHover = ctx.mouseMove.worldPos.dist(mCmp.pos) < this.radius;
        }
    }
}
// Entities
class Manager extends Engine.Entity {
    constructor(ent) {
        super(ent);
        this.registerComponent(new NodeSpawner(this));
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
        new Node(this.root);
    }
}
getExpectedElement("btn-reset").onclick = () => {
    frame.showScene(new SceneA());
    updateGridVisibility();
};
frame.showScene(new SceneA());
updateGridVisibility();
