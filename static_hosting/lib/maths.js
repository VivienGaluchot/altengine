"use strict";
// Public
class Vector {
    constructor(x, y) {
        checkIsFinite(x);
        checkIsFinite(y);
        this.x = x;
        this.y = y;
    }
    static center(a, b) {
        return b.subtract(a).scaleInPlace(1 / 2).addInPlace(a);
    }
    set(x, y) {
        checkIsFinite(x);
        checkIsFinite(y);
        this.x = x;
        this.y = y;
    }
    equal(other) {
        return this.x == other.x && this.y == other.y;
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
    subtractInPlace(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    subtract(v) {
        return this.clone().subtractInPlace(v);
    }
    scaleInPlace(a) {
        this.x *= a;
        this.y *= a;
        return this;
    }
    scale(a) {
        return this.clone().scaleInPlace(a);
    }
    norm() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        return this.clone().normalizeInPlace();
    }
    normalizeInPlace() {
        let r = 1 / this.norm();
        checkIsFinite(r);
        return this.scaleInPlace(r);
    }
    dist(v) {
        let dx = this.x - v.x;
        let dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    dotProduct(v) {
        return this.x * v.x + this.y * v.y;
    }
    crossProduct(v) {
        return this.x * v.y - this.y * v.x;
    }
    angleWith(v) {
        let x = Math.atan2(this.crossProduct(v), this.dotProduct(v));
        checkIsFinite(x);
        return x;
    }
    rotateInPlace(a) {
        let c = Math.cos(a);
        let s = Math.sin(a);
        let x2 = c * this.x - s * this.y;
        let y2 = s * this.x + c * this.y;
        this.set(x2, y2);
        return this;
    }
    rotate(a) {
        return this.clone().rotateInPlace(a);
    }
}
class Rect {
    constructor(pos, size) {
        this.pos = pos;
        this.size = size;
    }
    equal(other) {
        return this.pos.equal(other.pos) && this.size.equal(other.size);
    }
    clone() {
        return new Rect(this.pos.clone(), this.size.clone());
    }
    center() {
        return this.size.scale(0.5).addInPlace(this.pos);
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
    topLeft() {
        return new Vector(0, this.size.y).addInPlace(this.pos);
    }
    topRight() {
        return this.size.add(this.pos);
    }
    bottomLeft() {
        return this.pos;
    }
    bottomRight() {
        return new Vector(this.size.x, 0).addInPlace(this.pos);
    }
    top() {
        return Vector.center(this.topLeft(), this.topRight());
    }
    right() {
        return Vector.center(this.bottomRight(), this.topRight());
    }
    bottom() {
        return Vector.center(this.bottomLeft(), this.bottomRight());
    }
    left() {
        return Vector.center(this.topLeft(), this.topLeft());
    }
    translateInPlace(v) {
        this.pos.addInPlace(v);
        return this;
    }
    translate(v) {
        return this.clone().translateInPlace(v);
    }
    contains(p) {
        return p.x >= this.minX() && p.x <= this.maxX() && p.y >= this.minY() && p.y <= this.maxY();
    }
    isIntersecting(r) {
        let interX = (this.minX() <= r.maxX()) && (r.minX() <= this.maxX());
        let interY = (this.minY() <= r.maxY()) && (r.minY() <= this.maxY());
        return interX && interY;
    }
    intersection(r) {
        if (this.isIntersecting(r)) {
            let minX = Math.max(this.minX(), r.minX());
            let minY = Math.max(this.minY(), r.minY());
            let maxX = Math.min(this.maxX(), r.maxX());
            let maxY = Math.min(this.maxY(), r.maxY());
            return new Rect(new Vector(minX, minY), new Vector(maxX - minX, maxY - minY));
        }
        else {
            return null;
        }
    }
}
function swipe(x, a, b, va, vb) {
    let r = (vb - va) / (b - a);
    let v0 = va - (r * a);
    return v0 + r * x;
}
function checkIsFinite(n) {
    if (!Number.isFinite(n)) {
        throw new Error("invalid number");
    }
}
export { Vector, Rect, swipe, checkIsFinite };
