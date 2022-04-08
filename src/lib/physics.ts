"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';


// Private

interface CollisionContact {
    contactNormal: Maths.Vector;
    contactPoint: Maths.Vector;
}

interface Collision {
    contactNormal: Maths.Vector;
    contactPoint: Maths.Vector;
    other: RigidBody;
}

function solveContactDiscDisc(a: DiscCollider, b: DiscCollider): CollisionContact | null {
    let aPos = a.mCmp.pos;
    let bPos = b.mCmp.pos;
    let dist = aPos.dist(bPos);
    if (dist != 0 && dist < (a.radius + b.radius)) {
        let contactNormal = bPos.subtract(aPos).normalizeInPlace();
        let contactPoint = contactNormal.scale(a.radius).add(aPos);
        return { contactPoint: contactPoint, contactNormal: contactNormal };
    } else {
        return null;
    }
}

function solveContactDiscBox(a: DiscCollider, b: BoxCollider): CollisionContact | null {
    return solveContactBoxBox(<BoxCollider>a, b);
}

function solveContactBoxDisc(a: BoxCollider, b: DiscCollider): CollisionContact | null {
    return solveContactBoxBox(a, <BoxCollider>b);
}

function solveContactBoxBox(a: BoxCollider, b: BoxCollider): CollisionContact | null {
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
        } else {
            contactNormal = new Maths.Vector(1, 0);
            contactPoint = inter.right();
        }
    } else {
        if (aPos.y >= bPos.y) {
            contactNormal = new Maths.Vector(0, -1);
            contactPoint = inter.bottom();
        } else {
            contactNormal = new Maths.Vector(0, 1);
            contactPoint = inter.top();
        }
    }
    return { contactPoint: contactPoint, contactNormal: contactNormal };
}


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
        this.speed.addInPlace(this.acc.scale(ctx.dt));
        this.pos.addInPlace(this.speed.scale(ctx.dt));
    }
}

abstract class ColliderComponent extends Engine.Component {
    readonly mCmp: MovingComponent;
    readonly relBoundingBox: Maths.Rect;

    constructor(ent: Engine.Entity, relBoundingBox: Maths.Rect) {
        super(ent);
        this.relBoundingBox = relBoundingBox;
        this.mCmp = this.getComponent<MovingComponent>(MovingComponent);
    }

    // called in globalCollide state
    isMaybeColliding(other: ColliderComponent): boolean {
        return this.relBoundingBox.translate(this.mCmp.pos).isIntersecting(other.relBoundingBox.translate(other.mCmp.pos));
    }

    // called in globalCollide state by colliding component
    abstract getContact(other: ColliderComponent): CollisionContact | null;

}

class DiscCollider extends ColliderComponent {
    readonly radius: number;

    constructor(ent: Engine.Entity, radius: number) {
        super(ent, new Maths.Rect(new Maths.Vector(-radius, -radius), new Maths.Vector(radius * 2, radius * 2)));
        this.radius = radius;
    }

    // called in globalCollide state by colliding component
    override getContact(other: ColliderComponent): CollisionContact | null {
        if (other instanceof DiscCollider) {
            return solveContactDiscDisc(this, other);
        } else if (other instanceof BoxCollider) {
            return solveContactDiscBox(this, other);
        } else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}

class BoxCollider extends ColliderComponent {
    constructor(ent: Engine.Entity, relBoundingBox: Maths.Rect) {
        super(ent, relBoundingBox);
    }

    // called in globalCollide state by colliding component
    override getContact(other: ColliderComponent): CollisionContact | null {
        if (other instanceof DiscCollider) {
            return solveContactBoxDisc(this, other);
        } else if (other instanceof BoxCollider) {
            return solveContactBoxBox(this, other);
        } else {
            console.error("unsupported collision", { target: this, other: other });
            throw new Error("unsupported collision");
        }
    }
}


// Body

type CollidingMass = number | null;

class RigidBody extends Engine.GlobalComponent {
    readonly mass: CollidingMass;
    readonly rebound: number;
    readonly mCol: ColliderComponent;
    readonly mCmp: MovingComponent;
    collisions: Array<Collision>;;

    constructor(ent: Engine.Entity, mass: CollidingMass, rebound: number) {
        super(ent);
        this.mass = mass;
        this.rebound = rebound;
        this.mCol = this.getComponent<ColliderComponent>(ColliderComponent);
        this.mCmp = this.getComponent<MovingComponent>(MovingComponent);
        this.collisions = [];
    }

    override move(ctx: Engine.FrameContext) {
        this.collisions = [];
    }

    addCollision(other: RigidBody, selfContact: CollisionContact) {
        this.collisions.push({
            other: other,
            ...selfContact
        });
    }

    static override globalCollide(ctx: Engine.FrameContext, components: Array<RigidBody>) {
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

    static solveCollision(a: RigidBody, b: RigidBody) {
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
            let massRatio = (massA: CollidingMass, massB: CollidingMass) => {
                if (massA != null && massB != null) {
                    return (1 + rebound) * massB / (massA + massB);
                } else {
                    return 1 + rebound;
                }
            }
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
            let posRatio = (massA: CollidingMass, massB: CollidingMass) => {
                if (massA != null && massB != null) {
                    return .5;
                } else {
                    return 1;
                }
            }
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
    constructor(ent: Engine.Entity, rebound: number) {
        super(ent, null, rebound);
    }
}

export { MovingComponent, RigidBody, StaticRigidBody, DiscCollider, BoxCollider }