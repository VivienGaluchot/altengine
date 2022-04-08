"use strict";
import * as Maths from './maths.js';
import * as Engine from './engine.js';
function solveContactDiscDisc(a, b) {
    let aPos = a.mCmp.pos;
    let bPos = b.mCmp.pos;
    let dist = aPos.dist(bPos);
    if (dist != 0 && dist < (a.radius + b.radius)) {
        let contactNormal = bPos.subtract(aPos).normalizeInPlace();
        let contactPoint = contactNormal.scale(a.radius).add(aPos);
        return { contactPoint: contactPoint, contactNormal: contactNormal };
    }
    else {
        return null;
    }
}
function solveContactDiscBox(a, b) {
    return solveContactBoxBox(a, b);
}
function solveContactBoxDisc(a, b) {
    return solveContactBoxBox(a, b);
}
function solveContactBoxBox(a, b) {
    let aPos = a.mCmp.pos;
    let bPos = b.mCmp.pos;
    let inter = a.relBoundingBox.translate(aPos).intersection(b.relBoundingBox.translate(bPos));
    if (!inter)
        return null;
    let contactPoint;
    let contactNormal;
    if (inter.size.y >= inter.size.x) {
        if (aPos.x >= bPos.x) {
            contactNormal = new Maths.Vector(-1, 0);
            contactPoint = inter.left();
        }
        else {
            contactNormal = new Maths.Vector(1, 0);
            contactPoint = inter.right();
        }
    }
    else {
        if (aPos.y >= bPos.y) {
            contactNormal = new Maths.Vector(0, -1);
            contactPoint = inter.bottom();
        }
        else {
            contactNormal = new Maths.Vector(0, 1);
            contactPoint = inter.top();
        }
    }
    return { contactPoint: contactPoint, contactNormal: contactNormal };
}
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
    constructor(ent, relBoundingBox) {
        super(ent);
        this.relBoundingBox = relBoundingBox;
        this.mCmp = this.getComponent(MovingComponent);
    }
    // called in globalCollide state
    isMaybeColliding(other) {
        return this.relBoundingBox.translate(this.mCmp.pos).isIntersecting(other.relBoundingBox.translate(other.mCmp.pos));
    }
}
class DiscCollider extends ColliderComponent {
    constructor(ent, radius) {
        super(ent, new Maths.Rect(new Maths.Vector(-radius, -radius), new Maths.Vector(radius * 2, radius * 2)));
        this.radius = radius;
    }
    // called in globalCollide state by colliding component
    getContact(other) {
        if (other instanceof DiscCollider) {
            return solveContactDiscDisc(this, other);
        }
        else if (other instanceof BoxCollider) {
            return solveContactDiscBox(this, other);
        }
        else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}
class BoxCollider extends ColliderComponent {
    constructor(ent, relBoundingBox) {
        super(ent, relBoundingBox);
    }
    // called in globalCollide state by colliding component
    getContact(other) {
        if (other instanceof DiscCollider) {
            return solveContactBoxDisc(this, other);
        }
        else if (other instanceof BoxCollider) {
            return solveContactBoxBox(this, other);
        }
        else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}
class RigidBody extends Engine.GlobalComponent {
    constructor(ent, mass, rebound) {
        super(ent);
        this.mass = mass;
        this.rebound = rebound;
        this.mCol = this.getComponent(ColliderComponent);
        this.mCmp = this.getComponent(MovingComponent);
        this.collisions = [];
    }
    ;
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
class StaticRigidBody extends RigidBody {
    constructor(ent, rebound) {
        super(ent, null, rebound);
    }
}
export { MovingComponent, RigidBody, StaticRigidBody, DiscCollider, BoxCollider };
