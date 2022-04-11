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

// Entities

class Node extends Basics.Circle {
    constructor(ent: Engine.Entity) {
        super(ent, 0.25, { fill: "transparent", strokeW: 0.06, stroke: "#8AF" });
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
    }

    onclick(event: MouseEvent) {
        if (event.button == 0 && frame.scene) {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            if (!event.ctrlKey) {
                let p = new Node(frame.scene.root);
                p.getComponent<Physics.MovingComponent>(Physics.MovingComponent).pos = worldPos;
            } else {
            }
        }
    }
}

getExpectedElement("btn-reset").onclick = () => {
    frame.showScene(new SceneA());
    updateGridVisibility();
};

frame.showScene(new SceneA());
updateGridVisibility();
