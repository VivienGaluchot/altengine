"use strict"

import * as Maths from './maths.js';
import * as Engine from './engine.js';


// Public

class MovingComponent extends Engine.Component {
    constructor(obj) {
        super(obj);
        this.pos = new Maths.Vector(0, 0);
        this.speed = new Maths.Vector(0, 0);
        this.acc = new Maths.Vector(0, 0);
    }

    update(ctx) {
        this.pos.addInPlace(this.speed.scale(ctx.dt));
        this.speed.addInPlace(this.acc.scale(ctx.dt));
    }
}


export { MovingComponent }