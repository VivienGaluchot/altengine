"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';
import * as Basics from './basics.js';


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


type CollidingMass = number | null;

abstract class MassPointComponent extends Engine.Component {
    readonly mCmp: Basics.TransformComponent;

    abstract mass: CollidingMass;
    speed: Maths.Vector;
    acc: Maths.Vector;

    constructor(obj: Engine.Entity) {
        super(obj);

        this.mCmp = this.getComponent<Basics.TransformComponent>(Basics.TransformComponent);

        this.pos = new Maths.Vector(0, 0);
        this.speed = new Maths.Vector(0, 0);
        this.acc = new Maths.Vector(0, 0);
    }

    set pos(value: Maths.Vector) {
        this.mCmp.translate = value;
    }

    get pos(): Maths.Vector {
        return this.mCmp.translate;
    }

    override update(ctx: Engine.FrameContext) {
        this.speed.addInPlace(this.acc.scale(ctx.dt));
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.acc = new Maths.Vector(0, 0);
    }

    applyForce(force: Maths.Vector) {
        if (this.mass) {
            this.acc.addInPlace(force.scale(1 / this.mass));
        } else {
            console.warn("Try to apply force on static object", this);
        }
    }
}


// Public

class StaticComponent extends MassPointComponent {
    mass: null;

    constructor(obj: Engine.Entity) {
        super(obj);
        this.mass = null;
    }
}

class DynamicComponent extends MassPointComponent {
    mass: number;

    constructor(obj: Engine.Entity, mass: number) {
        super(obj);
        this.mass = mass;
    }
}

abstract class ColliderComponent extends Engine.Component {
    readonly mCmp: MassPointComponent;
    readonly relBoundingBox: Maths.Rect;

    constructor(ent: Engine.Entity, relBoundingBox: Maths.Rect) {
        super(ent);
        this.relBoundingBox = relBoundingBox;
        this.mCmp = this.getComponent<MassPointComponent>(MassPointComponent);
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

class RigidBody extends Engine.GlobalComponent {
    readonly rebound: number;
    readonly mCol: ColliderComponent;
    readonly mCmp: MassPointComponent;
    collisions: Array<Collision>;;

    constructor(ent: Engine.Entity, rebound: number) {
        super(ent);
        this.rebound = rebound;
        this.mCol = this.getComponent<ColliderComponent>(ColliderComponent);
        this.mCmp = this.getComponent<MassPointComponent>(MassPointComponent);
        this.collisions = [];
    }

    override update(ctx: Engine.FrameContext) {
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
            if (a.mCmp.mass != null) {
                let speedRatio = massRatio(a.mCmp.mass, b.mCmp.mass) * deltaSpeed.dotProduct(contactA.contactNormal);
                a.mCmp.speed.subtractInPlace(contactA.contactNormal.scale(speedRatio));
            }
            deltaSpeed.scaleInPlace(-1);
            if (b.mCmp.mass != null) {
                let speedRatio = massRatio(b.mCmp.mass, a.mCmp.mass) * deltaSpeed.dotProduct(contactB.contactNormal);
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
            if (a.mCmp.mass != null) {
                a.mCmp.pos.subtractInPlace(deltaPos.scale(posRatio(a.mCmp.mass, b.mCmp.mass)));
            }
            deltaPos.scaleInPlace(-1);
            if (b.mCmp.mass != null) {
                b.mCmp.pos.subtractInPlace(deltaPos.scale(posRatio(b.mCmp.mass, a.mCmp.mass)));
            }
        }
    }
}

export { DynamicComponent, StaticComponent, RigidBody, DiscCollider, BoxCollider }