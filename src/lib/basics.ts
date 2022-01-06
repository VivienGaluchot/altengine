"use strict"

import * as Svg from './svg.js';
import * as Engine from './engine.js';
import * as Physics from './physics.js';


// Public

abstract class SvgComponent extends Engine.Component {
    abstract readonly svgEl: Svg.SvgNode;

    addToNode(node: Svg.SvgNode) {
        node.appendChild(this.svgEl);
    }

    remove() {
        this.svgEl.domEl.remove();
    }
}

class SvgCircleComponent extends SvgComponent {
    readonly svgEl: Svg.Circle;
    mCmp: Physics.MovingComponent;

    constructor(ent: Engine.Entity, radius: number, style: Svg.SvgStyle) {
        super(ent);
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
        super(ent);
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


export { SvgComponent, Circle, Rect, SvgRectComponent, SvgCircleComponent }