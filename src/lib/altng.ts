"use strict"

import * as Svg from './svg.js';
import * as Engine from './engine.js';
import * as Physics from './physics.js';


// Private

function worldGrid(groupId:string, minX: number, minY: number, maxX: number, maxY: number) {
    const styleMajor = {
        stroke: "#8888",
        strokeW: "1px",
        vectorEffect: "non-scaling-stroke"
    };
    const styleMinor = {
        stroke: "#4448",
        strokeW: "1px",
        vectorEffect: "non-scaling-stroke"
    };
    const styleX = {
        stroke: "#F008",
        strokeW: "1px",
        vectorEffect: "non-scaling-stroke"
    };
    const styleY = {
        stroke: "#0F08",
        strokeW: "1px",
        vectorEffect: "non-scaling-stroke"
    };

    let grid = new Svg.Group(groupId);
    for (let x = minX; x <= maxX; x++) {
        grid.appendChild(new Svg.Line(x, minY, x, maxY, (x % 5 == 0) ? styleMajor : styleMinor));
    }
    for (let y = minY; y <= maxY; y++) {
        grid.appendChild(new Svg.Line(minX, y, maxX, y, (y % 5 == 0) ? styleMajor : styleMinor));
    }
    grid.appendChild(new Svg.Line(0, 0, 1, 0, styleX));
    grid.appendChild(new Svg.Line(0, 0, 0, 1, styleY));
    return grid;
}


// Public

class SvgFrame {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    el: Svg.SvgNode;
    viewRect: Svg.Rect;

    constructor(el: Element) {
        // safe area size, always drawn
        this.minX = -10;
        this.minY = -10;
        this.maxX = 10;
        this.maxY = 10;

        // svg element settings
        this.el = new Svg.SvgNode(el);
        this.el.domEl.setAttribute("viewBox", `${this.minX} ${this.minY} ${this.maxX - this.minX} ${this.maxY - this.minY}`);
        this.el.domEl.setAttribute("preserveAspectRatio", "xMidYMid");
        this.el.domEl.setAttribute("transform", "scale(1,-1)");

        // world grid
        this.el.appendChild(worldGrid("grid", this.minX, this.minY, this.maxX, this.maxY));

        // view box
        this.viewRect = new Svg.Rect(-2, -2, 4, 4, {
            fill: "#0482",
            stroke: "#048",
            strokeW: "2px",
            vectorEffect: "non-scaling-stroke"
        });
        this.el.appendChild(this.viewRect);
        this.resize();
    }

    // must be called when the element has been resized
    resize() {
        let screenSpanX = this.el.domEl.clientWidth;
        let screenSpanY = this.el.domEl.clientHeight;
        let screenRatio = screenSpanX / screenSpanY;
        let elSpanX = this.maxX - this.minX;
        let elSpanY = this.maxY - this.minY;
        let elRatio = elSpanX / elSpanY;

        let viewSpanX = 0;
        let viewSpanY = 0;
        if (elRatio < screenRatio) {
            viewSpanX = elSpanY * screenRatio;
            viewSpanY = elSpanY;
        } else if (elRatio > screenRatio) {
            viewSpanX = elSpanX;
            viewSpanY = elSpanX / screenRatio;
        } else {
            viewSpanX = elSpanX;
            viewSpanY = elSpanY;
        }

        let margin = .5;
        this.viewRect.x = (-1 * viewSpanX / 2) + margin;
        this.viewRect.w = viewSpanX - 2 * margin;
        this.viewRect.y = (-1 * viewSpanY / 2) + margin;
        this.viewRect.h = viewSpanY - 2 * margin;
    }
}

class SvgCircleComponent extends Engine.Component {
    svgEl: Svg.Circle;
    mCmp : Physics.MovingComponent;

    constructor(obj: Engine.Entity, parent: Svg.SvgNode, radius: number, style: Svg.SvgStyle) {
        super(obj);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Circle(this.mCmp.pos.x, this.mCmp.pos.y, radius, style);
        parent.appendChild(this.svgEl);
    }

    draw() {
        this.svgEl.x = this.mCmp.pos.x;
        this.svgEl.y = this.mCmp.pos.y;
    }
}

class Circle extends Engine.Entity {
    constructor(loop: Engine.RenderLoop, parent: Svg.SvgNode, radius: number, style: Svg.SvgStyle) {
        super(loop);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgCircleComponent(this, parent, radius, style));
    }
}

class SvgRectComponent extends Engine.Component {
    svgEl: Svg.Rect;
    mCmp : Physics.MovingComponent;
    w: number;
    h: number;

    constructor(obj: Engine.Entity, parent: Svg.SvgNode, w: number, h: number, style: Svg.SvgStyle) {
        super(obj);
        this.w = w;
        this.h = h;
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Rect(this.mCmp.pos.x - (this.w / 2), this.mCmp.pos.y - (this.h / 2), w, h, style);
        parent.appendChild(this.svgEl);
    }

    draw() {
        this.svgEl.x = this.mCmp.pos.x - (this.w / 2);
        this.svgEl.y = this.mCmp.pos.y - (this.h / 2);
    }
}

class Rect extends Engine.Entity {
    constructor(loop: Engine.RenderLoop, parent: Svg.SvgNode, w: number, h: number, style: Svg.SvgStyle) {
        super(loop);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgRectComponent(this, parent, w, h, style));
    }
}


export { SvgFrame, Circle, Rect }