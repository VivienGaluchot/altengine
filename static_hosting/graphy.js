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
class MouseController extends Engine.Component {
    constructor(ent) {
        super(ent);
        this.mouseTarget = null;
    }
    update(ctx) {
        // spawn
        if (this.mouseTarget == null) {
            let input = ctx.mouseClick;
            if (input && input.event.button == 0 && !input.event.ctrlKey) {
                let p = new Node(this.ent, this);
                p.getComponent(Physics.DynamicComponent).pos = input.worldPos;
            }
        }
    }
}
class MouseControlled extends Engine.GlobalComponent {
    constructor(ent, mng, radius) {
        super(ent);
        this.radius = radius;
        this.mng = mng;
        this.startDrag = null;
        this.pCmp = this.getComponent(Physics.DynamicComponent);
    }
    isTarget() {
        return this.mng.mouseTarget == this;
    }
    static globalUpdate(ctx, components) {
        // find a single mouseTarget per MouseControlled and set isHover
        if (ctx.mouseMove) {
            MouseControlled.lastMouseMove = ctx.mouseMove;
        }
        for (let cmp of components) {
            // lock the mouseTarget if target is dragged
            if (cmp.mng.mouseTarget && !cmp.mng.mouseTarget.startDrag) {
                cmp.mng.mouseTarget = null;
            }
        }
        for (let cmp of components) {
            if (cmp.mng.mouseTarget == null && MouseControlled.lastMouseMove) {
                if (MouseControlled.lastMouseMove.worldPos.squareDist(cmp.pCmp.pos) < (cmp.radius * cmp.radius)) {
                    cmp.mng.mouseTarget = cmp;
                }
            }
        }
    }
    update(ctx) {
        // drag
        if (ctx.mouseDown && !ctx.mouseDown.event.ctrlKey) {
            if (this.isTarget()) {
                this.startDrag = ctx.mouseDown.worldPos;
            }
        }
        if (this.startDrag && ctx.mouseMove) {
            let deltaPos = ctx.mouseMove.worldPos.subtract(this.startDrag);
            this.startDrag = ctx.mouseMove.worldPos;
            this.pCmp.pos.addInPlace(deltaPos);
        }
        if (ctx.mouseUp) {
            this.startDrag = null;
        }
        // delete
        if (this.isTarget()) {
            if (ctx.mouseClick && ctx.mouseClick.event.button == 0 && ctx.mouseClick.event.ctrlKey) {
                this.ent.remove();
            }
        }
    }
}
// Entities
class Manager extends Engine.Entity {
    constructor(ent) {
        super(ent);
        this.registerComponent(new MouseController(this));
    }
}
class Node extends Basics.Circle {
    constructor(ent, mng) {
        super(ent, 0.25, Node.defaultStyle);
        this.registerComponent(new MouseControlled(this, mng, .25));
    }
    draw(ctx) {
        let mCmp = this.getComponent(MouseControlled);
        let svgCmp = this.getComponent(Basics.SvgComponent);
        if (mCmp.isTarget()) {
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
