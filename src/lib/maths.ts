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

class Rect {
    pos: Vector;
    size: Vector;

    constructor(pos: Vector, size: Vector) {
        this.pos = pos;
        this.size = size;
    }

    clone() {
        return new Rect(this.pos.clone(), this.size.clone());
    }

    minX() {
        return this.pos.x;
    }

    maxX() {
        return this.pos.x + this.size.x;
    }

    minY() {
        return this.pos.y;
    }

    maxY() {
        return this.pos.y + this.size.y;
    }

    translateInPlace(v: Vector) {
        this.pos.addInPlace(v);
        return this;
    }

    translate(v: Vector) {
        return this.clone().translateInPlace(v);
    }

    contains(p: Vector) {
        return p.x >= this.minX() && p.x <= this.maxX() && p.y >= this.minY() && p.y <= this.maxY();
    }

    intersect(r: Rect) {
        let interX = (this.minX() <= r.maxX()) && (r.minX() <= this.maxX());
        let interY = (this.minY() <= r.maxY()) && (r.minY() <= this.maxY());
        return interX && interY;
    }
}

function swipe(x: number, a: number, b: number, va: number, vb: number): number {
    let r = (vb - va) / (b - a);
    let v0 = va - (r * a);
    return v0 + r * x;
}

export { Vector, Rect, swipe }