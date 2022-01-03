"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';
import { Rect } from './svg.js';


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

    override move(ctx: Engine.FrameContext) {
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.speed.addInPlace(this.acc.scale(ctx.dt));
    }
}


interface CollisionContact {
    contactNormal: Maths.Vector;
    contactPoint: Maths.Vector;
}

interface Collision {
    target: CollidingComponent;
    contactNormal: Maths.Vector;
    contactPoint: Maths.Vector;
}

abstract class ColliderComponent extends Engine.Component {

    // called in globalCollide state by colliding component
    abstract isMaybeColliding(other: ColliderComponent): boolean;

    // called in globalCollide state by colliding component
    abstract getContact(other: ColliderComponent): CollisionContact | null;

}


// TODO add other types of colliders
class DiscColliderComponent extends ColliderComponent {
    readonly mCmp: MovingComponent;
    readonly radius: number;
    private absBoundingBox: Maths.Rect;

    constructor(ent: Engine.Entity, radius: number) {
        super(ent);
        this.radius = radius;
        this.mCmp = this.getComponent<MovingComponent>(MovingComponent);
        this.absBoundingBox = new Maths.Rect(new Maths.Vector(0, 0), new Maths.Vector(radius * 2, radius * 2));
    }

    override move(ctx: Engine.FrameContext) {
        this.absBoundingBox.pos = this.mCmp.pos.add(new Maths.Vector(-1 * this.radius, -1 * this.radius));
    }

    // called in globalCollide state
    override isMaybeColliding(other: ColliderComponent): boolean {
        if (other instanceof DiscColliderComponent) {
            return this.absBoundingBox.isIntersecting(other.absBoundingBox);
        } else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }

    override getContact(other: ColliderComponent): CollisionContact | null {
        if (other instanceof DiscColliderComponent) {
            let tPos = this.mCmp.pos;
            let oPos = other.mCmp.pos;
            let dist = tPos.dist(oPos);
            if (dist < (this.radius + other.radius)) {
                let contactNormal = oPos.minus(tPos).normalizeInPlace();
                let contactPoint = contactNormal.scale(this.radius).add(tPos);
                return { contactPoint: contactPoint, contactNormal: contactNormal };
            } else {
                return null;
            }
        } else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}

class CollidingComponent extends Engine.GlobalComponent {
    readonly mass: number;
    readonly collider: ColliderComponent;
    readonly mCmp: MovingComponent;
    collisions: Array<Collision>;

    constructor(ent: Engine.Entity, mass: number, collider: ColliderComponent) {
        super(ent);
        this.mass = mass;
        this.collider = collider;
        this.collisions = [];
        this.mCmp = this.getComponent<MovingComponent>(MovingComponent);
    }

    override move(ctx: Engine.FrameContext) {
        this.collisions = [];
    }

    static override globalCollide(ctx: Engine.FrameContext, components: Array<CollidingComponent>) {
        // TODO compute thanks to an efficient colliding memory structure
        // https://en.wikipedia.org/wiki/Quadtree
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                if (components[i].collider.isMaybeColliding(components[j].collider)) {
                    let first = components[i].collider.getContact(components[j].collider);
                    if (first) {
                        components[i].collisions.push({ target: components[j], ...first });
                    }
                    let second = components[j].collider.getContact(components[i].collider);
                    if (second) {
                        components[j].collisions.push({ target: components[i], ...second });
                    }
                }
            }
        }
    }

    override collide(ctx: Engine.FrameContext) {
        // adjust pos / speed according to collisions

        // TODO
        // - take mass into account, solve collisions accurately in order to conserve energy
        // - take discrete frame computation into account (compute exact contact point / back in time ?)
        let speedCorrection = new Maths.Vector(0, 0);
        for (let col of this.collisions) {
            speedCorrection.addInPlace(col.contactNormal);
        }
        if (speedCorrection.x != 0 || speedCorrection.y != 0) {
            // reverse
            speedCorrection.scaleInPlace(-1);
            // set the norm to the speed norm
            speedCorrection.normalizeInPlace().scaleInPlace(this.mCmp.speed.norm());
            // add the correction to the speed
            this.mCmp.speed.addInPlace(speedCorrection);
        }
    }
}


export { MovingComponent, CollidingComponent, DiscColliderComponent }