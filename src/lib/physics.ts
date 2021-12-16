"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';


// Public

class MovingComponent extends Engine.Component {
    pos: Maths.Vector;
    speed: Maths.Vector;
    acc: Maths.Vector;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.pos = new Maths.Vector(0, 0);
        this.speed = new Maths.Vector(0, 0);
        this.acc = new Maths.Vector(0, 0);
    }

    update(step: Engine.RenderStep, ctx: Engine.FrameContext) {
        if (step == Engine.RenderStep.Move) {
            this.pos.addInPlace(this.speed.scale(ctx.dt));
            this.speed.addInPlace(this.acc.scale(ctx.dt));
        }
    }
}


interface Collision {
    target: CollidingComponent;
    // pos: Maths.Vector;
    // normal: Maths.Vector;
}

class CollidingComponent extends Engine.GlobalComponent {
    collisions: Array<Collision>;
    // bounding box relative to the object position
    boundingBox: Maths.Rect;

    mCmp: MovingComponent;

    constructor(ent: Engine.Entity, boundingBox: Maths.Rect) {
        super(ent);
        this.collisions = [];
        this.boundingBox = boundingBox;
        this.mCmp = this.getComponent<MovingComponent>(MovingComponent);
    }

    isMaybeColliding(other: CollidingComponent) {
        return this.boundingBox.translate(this.mCmp.pos).intersect(other.boundingBox.translate(other.mCmp.pos));
    }

    static override globalUpdate(step: Engine.RenderStep, ctx: Engine.FrameContext, components: Array<CollidingComponent>) {
        // TODO compute an efficient colliding memory structure
        // https://en.wikipedia.org/wiki/Quadtree
        // and add it to the context
        if (step == Engine.RenderStep.Collide) {
            for (let i = 0; i < components.length; i++) {
                for (let j = i + 1; j < components.length; j++) {
                    if (components[i].isMaybeColliding(components[j])) {
                        components[i].collisions.push({ target: components[j] });
                        components[j].collisions.push({ target: components[i] });
                    }
                }
            }
        }
    }

    override update(step: Engine.RenderStep, ctx: Engine.FrameContext) {
        if (step == Engine.RenderStep.Move) {
            this.collisions = [];
        }
    }
}


export { MovingComponent, CollidingComponent }