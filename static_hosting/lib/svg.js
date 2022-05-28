"use strict";
import * as Maths from './maths.js';
// Private
function setStyle(el, style) {
    if (style.className) {
        el.setAttribute("class", style.className);
    }
    if (style.fill) {
        el.setAttribute("fill", style.fill);
    }
    if (style.stroke) {
        el.setAttribute("stroke", style.stroke);
    }
    if (style.strokeW) {
        el.setAttribute("stroke-width", `${style.strokeW}`);
    }
    if (style.vectorEffect) {
        el.setAttribute("vector-effect", style.vectorEffect);
    }
}
class SvgNode {
    constructor(el) {
        this.domEl = el;
    }
    set style(value) {
        setStyle(this.domEl, value);
    }
    setAttribute(name, value) {
        this.domEl.setAttribute(name, value);
    }
    appendChild(el) {
        if (el instanceof SvgNode) {
            this.domEl.appendChild(el.domEl);
        }
        else {
            this.domEl.appendChild(el);
        }
    }
    removeChildren() {
        while (this.domEl.firstChild) {
            this.domEl.firstChild.remove();
        }
    }
}
class SvgTag extends SvgNode {
    constructor(tag) {
        const svgNS = "http://www.w3.org/2000/svg";
        super(document.createElementNS(svgNS, tag));
        this.rotate = 0;
    }
    set rotate(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("transform", `rotate(${value.toString()})`);
    }
}
class Group extends SvgTag {
    constructor() {
        super("g");
    }
    set id(value) {
        this.domEl.setAttribute("id", value);
    }
}
class Line extends SvgTag {
    constructor(x1, y1, x2, y2, style) {
        super("line");
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.style = style;
    }
    set x1(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("x1", value.toString());
    }
    set y1(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("y1", value.toString());
    }
    set x2(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("x2", value.toString());
    }
    set y2(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("y2", value.toString());
    }
}
class Rect extends SvgTag {
    constructor(x, y, w, h, style) {
        super("rect");
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.style = style;
    }
    set x(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("x", value.toString());
    }
    set y(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("y", value.toString());
    }
    set w(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("width", value.toString());
    }
    set h(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("height", value.toString());
    }
}
class Circle extends SvgTag {
    constructor(x, y, r, style) {
        super("circle");
        this.x = x;
        this.x = y;
        this.r = r;
        this.style = style;
    }
    set x(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("cx", value.toString());
    }
    set y(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("cy", value.toString());
    }
    set r(value) {
        Maths.checkIsFinite(value);
        this.setAttribute("r", value.toString());
    }
}
export { SvgNode, SvgTag, Group, Line, Rect, Circle };
