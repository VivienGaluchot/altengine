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

    update(ctx: Engine.FrameContext) {
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.speed.addInPlace(this.acc.scale(ctx.dt));
    }
}


interface Collision {
    target: CollidingComponent;
    // pos: Maths.Vector;
    // normal: Maths.Vector;
}

class CollidingComponent extends Engine.Component {
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

    collide(ctx: Engine.FrameContext) {
        // TODO compute collisions set
        this.collisions = [];
        let allColliders: Array<CollidingComponent> = [];
        for (let other of allColliders) {
            if (other != this && this.isMaybeColliding(other)) {
                this.collisions.push({ target: other });
            }
        }
    }
}


export { MovingComponent, CollidingComponent }