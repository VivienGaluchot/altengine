"use strict"


// Public

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    addInPlace(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    add(v) {
        return this.clone().addInPlace(v);
    }

    scaleInPlace(a) {
        this.x *= a;
        this.y *= a;
        return this;
    }

    scale(a) {
        return this.clone().scaleInPlace(a);
    }
}


export { Vector }