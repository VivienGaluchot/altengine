"use strict"

import * as Svg from './svg.js';
import * as Engine from './engine.js';
import * as Physics from './physics.js';
import * as Maths from './maths.js';


// Public

abstract class SvgComponent extends Engine.Component {
    abstract readonly svgEl: Svg.SvgNode;
    readonly layer: number;

    constructor(ent: Engine.Entity, layer: number) {
        super(ent);
        this.layer = layer;
    }

    addToNode(node: Svg.SvgNode) {
        node.appendChild(this.svgEl);
    }

    remove() {
        this.svgEl.domEl.remove();
    }

    setVisibility(isVisible: boolean) {
        if (isVisible) {
            this.svgEl.setAttribute("visibility", "visible");
        } else {
            this.svgEl.setAttribute("visibility", "hidden");
        }
    }
}

class SvgGridComponent extends SvgComponent {
    readonly svgEl: Svg.Group;
    readonly styleSafe: Svg.SvgStyle;
    readonly styleMajor: Svg.SvgStyle;
    readonly styleMinor: Svg.SvgStyle;
    readonly styleX: Svg.SvgStyle;
    readonly styleY: Svg.SvgStyle;

    private prevFullView?: Maths.Rect;
    private prevSafeView?: Maths.Rect;
    readonly fullViewGroup: Svg.Group;
    readonly safeViewGroup: Svg.Group;

    constructor(ent: Engine.Entity) {
        super(ent, - 1);

        this.styleSafe = {
            fill: "transparent",
            stroke: "#FFF8",
            strokeW: "1px",
            vectorEffect: "non-scaling-stroke"
        };
        this.styleMajor = {
            stroke: "#8888",
            strokeW: "1px",
            vectorEffect: "non-scaling-stroke"
        };
        this.styleMinor = {
            stroke: "#4448",
            strokeW: "1px",
            vectorEffect: "non-scaling-stroke"
        };
        this.styleX = {
            stroke: "#F008",
            strokeW: "1px",
            vectorEffect: "non-scaling-stroke"
        };
        this.styleY = {
            stroke: "#0F08",
            strokeW: "1px",
            vectorEffect: "non-scaling-stroke"
        };

        this.svgEl = new Svg.Group();
        this.fullViewGroup = new Svg.Group();
        this.svgEl.appendChild(this.fullViewGroup);
        this.safeViewGroup = new Svg.Group();
        this.svgEl.appendChild(this.safeViewGroup);
    }

    drawFullView(area: Maths.Rect) {
        if (!this.prevFullView || !area.equal(this.prevFullView)) {
            let grid = this.fullViewGroup;
            grid.removeChildren();
            for (let x = 0; x <= area.maxX(); x++) {
                grid.appendChild(new Svg.Line(x, area.minY(), x, area.maxY(), (x % 5 == 0) ? this.styleMajor : this.styleMinor));
            }
            for (let x = -1; x >= area.minX(); x--) {
                grid.appendChild(new Svg.Line(x, area.minY(), x, area.maxY(), (x % 5 == 0) ? this.styleMajor : this.styleMinor));
            }
            for (let y = 0; y <= area.maxY(); y++) {
                grid.appendChild(new Svg.Line(area.minX(), y, area.maxX(), y, (y % 5 == 0) ? this.styleMajor : this.styleMinor));
            }
            for (let y = -1; y >= area.minY(); y--) {
                grid.appendChild(new Svg.Line(area.minX(), y, area.maxX(), y, (y % 5 == 0) ? this.styleMajor : this.styleMinor));
            }
            grid.appendChild(new Svg.Line(0, 0, 1, 0, this.styleX));
            grid.appendChild(new Svg.Line(0, 0, 0, 1, this.styleY));
        }
        this.prevFullView = area;
    }

    drawSafeView(area: Maths.Rect) {
        if (!this.prevSafeView || !area.equal(this.prevSafeView)) {
            let grid = this.safeViewGroup;
            grid.removeChildren();
            grid.appendChild(new Svg.Rect(area.pos.x, area.pos.y, area.size.x, area.size.y, this.styleSafe));
        }
        this.prevSafeView = area;
    }

    draw(ctx: Engine.FrameContext) {
        this.drawFullView(ctx.fullView);
        this.drawSafeView(ctx.safeView);
    }
}

class SvgBackgroundComponent extends SvgComponent {
    readonly svgEl: Svg.Rect;

    private prevArea?: Maths.Rect;

    constructor(ent: Engine.Entity, color: string) {
        super(ent, - 2);
        this.svgEl = new Svg.Rect(0, 0, 0, 0, { fill: color });
    }

    setColor(color: string) {
        this.svgEl.style = { fill: color };
    }

    draw(ctx: Engine.FrameContext) {
        let area = ctx.fullView;
        if (!this.prevArea || !area.equal(this.prevArea)) {
            this.svgEl.x = area.pos.x;
            this.svgEl.y = area.pos.y;
            this.svgEl.w = area.size.x;
            this.svgEl.h = area.size.y;
        }
        this.prevArea = area;
    }
}

class SvgCircleComponent extends SvgComponent {
    readonly svgEl: Svg.Circle;
    mCmp: Physics.MovingComponent;

    constructor(ent: Engine.Entity, radius: number, style: Svg.SvgStyle) {
        super(ent, 0);
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Circle(this.mCmp.pos.x, this.mCmp.pos.y, radius, style);
    }

    override draw(ctx: Engine.FrameContext) {
        this.svgEl.x = this.mCmp.pos.x;
        this.svgEl.y = this.mCmp.pos.y;
    }
}

class Circle extends Engine.Entity {
    constructor(parent: Engine.Entity, radius: number, style: Svg.SvgStyle) {
        super(parent);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgCircleComponent(this, radius, style));
    }
}

class SvgRectComponent extends SvgComponent {
    svgEl: Svg.Rect;
    mCmp: Physics.MovingComponent;
    w: number;
    h: number;

    constructor(ent: Engine.Entity, w: number, h: number, style: Svg.SvgStyle) {
        super(ent, 0);
        this.w = w;
        this.h = h;
        this.mCmp = this.getComponent<Physics.MovingComponent>(Physics.MovingComponent);

        this.svgEl = new Svg.Rect(this.mCmp.pos.x - (this.w / 2), this.mCmp.pos.y - (this.h / 2), w, h, style);
    }

    override draw(ctx: Engine.FrameContext) {
        this.svgEl.x = this.mCmp.pos.x - (this.w / 2);
        this.svgEl.y = this.mCmp.pos.y - (this.h / 2);
    }
}

class Rect extends Engine.Entity {
    constructor(ent: Engine.Entity, w: number, h: number, style: Svg.SvgStyle) {
        super(ent);
        this.registerComponent(new Physics.MovingComponent(this));
        this.registerComponent(new SvgRectComponent(this, w, h, style));
    }
}


export { SvgComponent, SvgGridComponent, SvgBackgroundComponent, Circle, Rect, SvgRectComponent, SvgCircleComponent }