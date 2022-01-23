"use strict";
import * as Maths from './maths.js';
import * as Engine from './engine.js';
// Public
class MovingComponent extends Engine.Component {
    constructor(obj) {
        super(obj);
        this.pos = new Maths.Vector(0, 0);
        this.speed = new Maths.Vector(0, 0);
        this.acc = new Maths.Vector(0, 0);
        this.prevPos = new Maths.Vector(0, 0);
        this.prevSpeed = new Maths.Vector(0, 0);
        this.prevAcc = new Maths.Vector(0, 0);
        this.prevDt = 0;
    }
    move(ctx) {
        this.prevPos = this.pos.clone();
        this.prevSpeed = this.speed.clone();
        this.prevAcc = this.acc.clone();
        this.prevDt = ctx.dt;
        this.speed.addInPlace(this.acc.scale(ctx.dt));
        this.pos.addInPlace(this.speed.scale(ctx.dt));
    }
}
class ColliderComponent extends Engine.Component {
}
// TODO add other types of colliders
class DiscColliderComponent extends ColliderComponent {
    constructor(ent, radius) {
        super(ent);
        this.radius = radius;
        this.mCmp = this.getComponent(MovingComponent);
        this.absBoundingBox = new Maths.Rect(new Maths.Vector(0, 0), new Maths.Vector(radius * 2, radius * 2));
    }
    move(ctx) {
        this.absBoundingBox.pos = this.mCmp.pos.add(new Maths.Vector(-1 * this.radius, -1 * this.radius));
    }
    // called in globalCollide state
    isMaybeColliding(other) {
        if (other instanceof DiscColliderComponent) {
            return this.absBoundingBox.isIntersecting(other.absBoundingBox);
        }
        else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
    // called in globalCollide state by colliding component
    getContact(other) {
        if (other instanceof DiscColliderComponent) {
            let tPos = this.mCmp.pos;
            let oPos = other.mCmp.pos;
            let dist = tPos.dist(oPos);
            if (dist != 0 && dist < (this.radius + other.radius)) {
                let contactNormal = oPos.subtract(tPos).normalizeInPlace();
                let contactPoint = contactNormal.scale(this.radius).add(tPos);
                return { contactPoint: contactPoint, contactNormal: contactNormal };
            }
            else {
                return null;
            }
        }
        else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}
class RootCollidingComponent extends Engine.GlobalComponent {
    constructor(ent, mass, rebound) {
        super(ent);
        this.mass = mass;
        this.rebound = rebound;
        this.mCol = this.getComponent(ColliderComponent);
        this.mCmp = this.getComponent(MovingComponent);
        this.collisions = [];
    }
    move(ctx) {
        this.collisions = [];
    }
    addCollision(other, selfContact) {
        this.collisions.push(Object.assign({ other: other }, selfContact));
    }
    static globalCollide(ctx, components) {
        // TODO compute thanks to an efficient colliding memory structure
        // https://en.wikipedia.org/wiki/Quadtree
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                if (components[i].mCol.isMaybeColliding(components[j].mCol)) {
                    this.solveCollision(components[i], components[j]);
                }
            }
        }
    }
    static solveCollision(a, b) {
        // adjust pos / speed according to collisions
        // elastic collision from https://en.wikipedia.org/wiki/Elastic_collision
        // TODO
        // - take discrete frame computation into account (compute exact contact point / back in time ?)
        // - infinite (static) mass collider
        let contactA = a.mCol.getContact(b.mCol);
        let contactB = b.mCol.getContact(a.mCol);
        if (contactA && contactB) {
            a.addCollision(b, contactA);
            b.addCollision(a, contactB);
            // speed correction
            let rebound = a.rebound * b.rebound;
            let massRatio = (massA, massB) => {
                if (massA != null && massB != null) {
                    return (1 + rebound) * massB / (massA + massB);
                }
                else {
                    return 1 + rebound;
                }
            };
            let deltaSpeed = a.mCmp.speed.subtract(b.mCmp.speed);
            if (a.mass != null) {
                let speedRatio = massRatio(a.mass, b.mass) * deltaSpeed.dotProduct(contactA.contactNormal);
                a.mCmp.speed.subtractInPlace(contactA.contactNormal.scale(speedRatio));
            }
            deltaSpeed.scaleInPlace(-1);
            if (b.mass != null) {
                let speedRatio = massRatio(b.mass, a.mass) * deltaSpeed.dotProduct(contactB.contactNormal);
                b.mCmp.speed.subtractInPlace(contactB.contactNormal.scale(speedRatio));
            }
            // pos correction
            // TODO replace by a force ?
            let posRatio = (massA, massB) => {
                if (massA != null && massB != null) {
                    return .5;
                }
                else {
                    return 1;
                }
            };
            let deltaPos = contactA.contactPoint.subtract(contactB.contactPoint);
            if (a.mass != null) {
                a.mCmp.pos.subtractInPlace(deltaPos.scale(posRatio(a.mass, b.mass)));
            }
            deltaPos.scaleInPlace(-1);
            if (b.mass != null) {
                b.mCmp.pos.subtractInPlace(deltaPos.scale(posRatio(b.mass, a.mass)));
            }
        }
    }
}
class CollidingComponent extends RootCollidingComponent {
    constructor(ent, mass, rebound) {
        super(ent, mass, rebound);
    }
}
class StaticCollidingComponent extends RootCollidingComponent {
    constructor(ent, rebound) {
        super(ent, null, rebound);
    }
}
export { MovingComponent, CollidingComponent, StaticCollidingComponent, DiscColliderComponent };
