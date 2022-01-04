"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';
import { Rect } from './svg.js';


// Public

class MovingComponent extends Engine.Component {
    pos: Maths.Vector;
    speed: Maths.Vector;
    acc: Maths.Vector;

    prevPos: Maths.Vector;
    prevSpeed: Maths.Vector;
    prevAcc: Maths.Vector;
    prevDt: number;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.pos = new Maths.Vector(0, 0);
        this.speed = new Maths.Vector(0, 0);
        this.acc = new Maths.Vector(0, 0);
        this.prevPos = new Maths.Vector(0, 0);
        this.prevSpeed = new Maths.Vector(0, 0);
        this.prevAcc = new Maths.Vector(0, 0);
        this.prevDt = 0;
    }

    override move(ctx: Engine.FrameContext) {
        this.prevPos = this.pos.clone();
        this.prevSpeed = this.speed.clone();
        this.prevAcc = this.acc.clone();
        this.prevDt = ctx.dt;
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.speed.addInPlace(this.acc.scale(ctx.dt));
    }
}


interface CollisionContact {
    contactNormal: Maths.Vector;
    contactPoint: Maths.Vector;
}

interface PosSpeed {
    pos: Maths.Vector;
    speed: Maths.Vector;
}

interface Collision {
    self: {
        before: PosSpeed;
        after: PosSpeed;
    }
    other: {
        cmp: CollidingComponent;
        before: PosSpeed;
        after: PosSpeed;
    }
    timeSpan: number;
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
                let contactNormal = oPos.subtract(tPos).normalizeInPlace();
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

    addCollision(other: CollidingComponent, contact: CollisionContact) {
        this.collisions.push({
            self: {
                before: {
                    pos: this.mCmp.prevPos,
                    speed: this.mCmp.prevSpeed
                },
                after: {
                    pos: this.mCmp.pos.clone(),
                    speed: this.mCmp.speed.clone()
                },
            },
            other: {
                cmp: other,
                before: {
                    pos: other.mCmp.prevPos,
                    speed: other.mCmp.prevSpeed
                },
                after: {
                    pos: other.mCmp.pos.clone(),
                    speed: other.mCmp.speed.clone()
                },
            },
            timeSpan: this.mCmp.prevDt,
            ...contact
        });
    }

    static override globalCollide(ctx: Engine.FrameContext, components: Array<CollidingComponent>) {
        // TODO compute thanks to an efficient colliding memory structure
        // https://en.wikipedia.org/wiki/Quadtree
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                if (components[i].collider.isMaybeColliding(components[j].collider)) {
                    let first = components[i].collider.getContact(components[j].collider);
                    if (first) {
                        components[i].addCollision(components[j], first);
                    }
                    let second = components[j].collider.getContact(components[i].collider);
                    if (second) {
                        components[j].addCollision(components[i], second);
                    }
                }
            }
        }
    }

    override collide(ctx: Engine.FrameContext) {
        // adjust pos / speed according to collisions
        // elastic collision from https://en.wikipedia.org/wiki/Elastic_collision

        // TODO
        // - take discrete frame computation into account (compute exact contact point / back in time ?)

        let deltaSpeed = new Maths.Vector(0, 0);
        for (let col of this.collisions) {
            let contactDeltaSpeed = col.self.after.speed.subtract(col.other.after.speed);
            let massRatio = (2 * col.other.cmp.mass) / (this.mass + col.other.cmp.mass);
            let speedRatio = massRatio * contactDeltaSpeed.dotProduct(col.contactNormal);
            deltaSpeed.addInPlace(col.contactNormal.scale(speedRatio));
        }
        this.mCmp.speed.subtractInPlace(deltaSpeed);
    }
}


export { MovingComponent, CollidingComponent, DiscColliderComponent }