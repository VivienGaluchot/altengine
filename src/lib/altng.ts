"use strict"

import * as Svg from './svg.js';
import * as Engine from './engine.js';
import * as Physics from './physics.js';
import * as Maths from './maths.js';


// Private

function worldGrid(groupId: string, area: Maths.Rect) {
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
    for (let x = area.minX(); x <= area.maxX(); x++) {
        grid.appendChild(new Svg.Line(x, area.minY(), x, area.maxY(), (x % 5 == 0) ? styleMajor : styleMinor));
    }
    for (let y = area.minY(); y <= area.maxY(); y++) {
        grid.appendChild(new Svg.Line(area.minX(), y, area.maxX(), y, (y % 5 == 0) ? styleMajor : styleMinor));
    }
    grid.appendChild(new Svg.Line(0, 0, 1, 0, styleX));
    grid.appendChild(new Svg.Line(0, 0, 0, 1, styleY));
    return grid;
}


// Public

class SvgFrame {
    // safe area, always drawn for all aspect ratios
    safeView: Maths.Rect;
    // full area, actuel area drawn
    fullView: Maths.Rect;

    el: Svg.SvgNode;

    viewRect: Svg.Rect;

    constructor(el: Element) {
        this.safeView = new Maths.Rect(new Maths.Vector(-10, -10), new Maths.Vector(20, 20));
        this.fullView = new Maths.Rect(new Maths.Vector(0, 0), new Maths.Vector(0, 0));

        // svg element settings
        this.el = new Svg.SvgNode(el);
        this.el.domEl.setAttribute("viewBox", `${this.safeView.pos.x} ${this.safeView.pos.x} ${this.safeView.size.x} ${this.safeView.size.y}`);
        this.el.domEl.setAttribute("preserveAspectRatio", "xMidYMid");
        this.el.domEl.setAttribute("transform", "scale(1,-1)");

        // world grid
        this.el.appendChild(worldGrid("grid", this.safeView));

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

    domToWorld(v: Maths.Vector) {
        let screenSpanX = this.el.domEl.clientWidth;
        let screenSpanY = this.el.domEl.clientHeight;
        let transformed = new Maths.Vector(
            Maths.swipe(v.x, 0, screenSpanX, this.fullView.minX(), this.fullView.maxX()),
            Maths.swipe(v.y, screenSpanY, 0, this.fullView.minY(), this.fullView.maxY())
        );
        return transformed;
    }

    // must be called when the element has been resized
    resize() {
        let screenSpanX = this.el.domEl.clientWidth;
        let screenSpanY = this.el.domEl.clientHeight;
        let screenRatio = screenSpanX / screenSpanY;
        let elSpanX = this.safeView.size.x;
        let elSpanY = this.safeView.size.y;
        let elRatio = elSpanX / elSpanY;

        let viewSpanX = 0;
        let viewSpanY = 0;
        if (elRatio <= screenRatio) {
            viewSpanX = elSpanY * screenRatio;
            viewSpanY = elSpanY;
        } else {
            viewSpanX = elSpanX;
            viewSpanY = elSpanX / screenRatio;
        }

        this.fullView.pos.x = -1 * viewSpanX / 2;
        this.fullView.size.x = viewSpanX;
        this.fullView.pos.y = -1 * viewSpanY / 2;
        this.fullView.size.y = viewSpanY;

        let margin = .5;
        this.viewRect.x = (-1 * viewSpanX / 2) + margin;
        this.viewRect.w = viewSpanX - 2 * margin;
        this.viewRect.y = (-1 * viewSpanY / 2) + margin;
        this.viewRect.h = viewSpanY - 2 * margin;
    }
}

class SvgCircleComponent extends Engine.Component {
    svgEl: Svg.Circle;
    mCmp: Physics.MovingComponent;

    constructor(obj: Engine.Entity, frame: SvgFrame, radius: number, style: Svg.SvgStyle) {
        super(obj);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Circle(this.mCmp.pos.x, this.mCmp.pos.y, radius, style);
        frame.el.appendChild(this.svgEl);
    }

    override draw(ctx: Engine.FrameContext) {
        this.svgEl.x = this.mCmp.pos.x;
        this.svgEl.y = this.mCmp.pos.y;
    }
}

class Circle extends Engine.Entity {
    constructor(parent: Engine.Entity, frame: SvgFrame, radius: number, style: Svg.SvgStyle) {
        super(parent);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgCircleComponent(this, frame, radius, style));
    }
}

class SvgRectComponent extends Engine.Component {
    svgEl: Svg.Rect;
    mCmp: Physics.MovingComponent;
    w: number;
    h: number;

    constructor(ent: Engine.Entity, frame: SvgFrame, w: number, h: number, style: Svg.SvgStyle) {
        super(ent);
        this.w = w;
        this.h = h;
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Rect(this.mCmp.pos.x - (this.w / 2), this.mCmp.pos.y - (this.h / 2), w, h, style);
        frame.el.appendChild(this.svgEl);
    }

    override draw(ctx: Engine.FrameContext) {
        this.svgEl.x = this.mCmp.pos.x - (this.w / 2);
        this.svgEl.y = this.mCmp.pos.y - (this.h / 2);
    }
}

class Rect extends Engine.Entity {
    constructor(ent: Engine.Entity, frame: SvgFrame, w: number, h: number, style: Svg.SvgStyle) {
        super(ent);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgRectComponent(this, frame, w, h, style));
    }
}


export { SvgFrame, Circle, Rect, SvgRectComponent, SvgCircleComponent }