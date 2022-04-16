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

class MouseController extends Engine.Component {
    // flag set by the MouseControlled in globalUpdate
    mouseTarget: MouseControlled | null;

    constructor(ent: Engine.Entity) {
        super(ent);
        this.mouseTarget = null;
    }

    override update(ctx: Engine.FrameContext): void {
        // spawn
        if (this.mouseTarget == null) {
            let input = ctx.mouseClick;
            if (input && input.event.button == 0 && !input.event.ctrlKey) {
                let p = new Node(this.ent, this);
                p.getComponent<Physics.MovingComponent>(Physics.MovingComponent).pos = input.worldPos;
            }
        }
    }
}

class MouseControlled extends Engine.GlobalComponent {
    static lastMouseMove: Engine.WorldMouseEvent | null;

    startDrag: Maths.Vector | null;
    radius: number;
    mng: MouseController;
    pCmp: Physics.MovingComponent;

    constructor(ent: Engine.Entity, mng: MouseController, radius: number) {
        super(ent);
        this.radius = radius;
        this.mng = mng;
        this.startDrag = null;
        this.pCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);
    }

    isTarget() {
        return this.mng.mouseTarget == this;
    }

    static override globalUpdate(ctx: Engine.FrameContext, components: Array<MouseControlled>) {
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

    override update(ctx: Engine.FrameContext): void {
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
    constructor(ent: Engine.Entity) {
        super(ent);
        this.registerComponent(new MouseController(this));
    }
}

class Node extends Basics.Circle {
    static readonly defaultStyle: SvgStyle = { fill: "#8AF4", strokeW: 0.06, stroke: "#8AF" };
    static readonly hoverStyle: SvgStyle = { fill: "#8AF8", strokeW: 0.08, stroke: "#8AF" };

    constructor(ent: Engine.Entity, mng: MouseController) {
        super(ent, 0.25, Node.defaultStyle);
        this.registerComponent(new MouseControlled(this, mng, .25));
    }

    override draw(ctx: Engine.FrameContext): void {
        let mCmp = this.getComponent<MouseControlled>(MouseControlled);
        let svgCmp = this.getComponent<Basics.SvgComponent>(Basics.SvgComponent);
        if (mCmp.isTarget()) {
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
