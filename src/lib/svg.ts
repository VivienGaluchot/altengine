"use strict"


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
        el.setAttribute("stroke-width", style.strokeW);
    }
    if (style.vectorEffect) {
        el.setAttribute("vector-effect", style.vectorEffect);
    }
}

function rect(x, y, w, h, style) {
    let el = document.createElementNS(svgNS, "rect");
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("width", w);
    el.setAttribute("height", h);
    el.setAttribute("stroke-linejoin", "round");
    setStyle(el, style);
    return el;
}

function circle(x, y, r, style) {
    let el = document.createElementNS(svgNS, "circle");
    el.setAttribute("cx", x);
    el.setAttribute("cy", y);
    el.setAttribute("r", r);
    setStyle(el, style);
    return el;
}


// Public

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
        } else {
            this.domEl.appendChild(el);
        }
    }
}

class SvgTag extends SvgNode {
    constructor(tag) {
        const svgNS = "http://www.w3.org/2000/svg";
        super(document.createElementNS(svgNS, tag));
    }
}

class Group extends SvgTag {
    constructor(id) {
        super("g");
        this.id = id;
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
        this.setAttribute("x1", value);
    }

    set y1(value) {
        this.setAttribute("y1", value);
    }

    set x2(value) {
        this.setAttribute("x2", value);
    }

    set y2(value) {
        this.setAttribute("y2", value);
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
        this.setAttribute("x", value);
    }

    set y(value) {
        this.setAttribute("y", value);
    }

    set w(value) {
        this.setAttribute("width", value);
    }

    set h(value) {
        this.setAttribute("height", value);
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
        this.setAttribute("cx", value);
    }

    set y(value) {
        this.setAttribute("cy", value);
    }

    set r(value) {
        this.setAttribute("r", value);
    }
}


export {
    SvgNode,
    SvgTag,
    Group,
    Line,
    Rect,
    Circle
}