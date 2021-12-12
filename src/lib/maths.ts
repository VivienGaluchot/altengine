"use strict"


// Public

class Vector {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    addInPlace(v: Vector) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    add(v: Vector) {
        return this.clone().addInPlace(v);
    }

    scaleInPlace(a: number) {
        this.x *= a;
        this.y *= a;
        return this;
    }

    scale(a: number) {
        return this.clone().scaleInPlace(a);
    }
}


export { Vector }