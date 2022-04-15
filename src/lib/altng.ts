"use strict"

import * as Svg from './svg.js';
import * as Engine from './engine.js';
import * as Maths from './maths.js';
import * as Basics from './basics.js';


class Scene extends Engine.RenderLoop {
    frame?: SvgFrame;
    lastMouseDown?: Engine.WorldMouseEvent;

    constructor() {
        super();
        this.root.registerComponent(new Basics.SvgBackgroundComponent(this.root, "#000"));
        this.root.registerComponent(new Basics.SvgGridComponent(this.root));
    }

    play(frame: SvgFrame) {
        this.frame = frame;
        let el = frame.el.domEl;
        el.onmousedown = (event: MouseEvent) => {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            this.frameInput.mouseDown = {
                worldPos: worldPos,
                event: event
            };
            this.lastMouseDown = this.frameInput.mouseDown;
        };
        el.onmousemove = (event: MouseEvent) => {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            this.frameInput.mouseMove = {
                worldPos: worldPos,
                event: event,
                relatedMouseDown: this.lastMouseDown
            };
        };
        el.onclick = (event: MouseEvent) => {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            this.frameInput.mouseClick = {
                worldPos: worldPos,
                event: event,
                relatedMouseDown: this.lastMouseDown
            };
        };
        el.onmouseup = (event: MouseEvent) => {
            let worldPos = frame.domToWorld(new Maths.Vector(event.clientX, event.clientY));
            this.frameInput.mouseUp = {
                worldPos: worldPos,
                event: event,
                relatedMouseDown: this.lastMouseDown
            };
        };
        this.start(frame);
    }

    pause() {
        if (this.frame) {
            this.frame.el.domEl.onclick = null;
            this.frame.el.domEl.onmousemove = null;
        }
        this.stop();
    }

    showSvgNode(el: Svg.SvgNode, layer: number) {
        if (!this.frame) {
            throw new Error("frame not defined");
        }
        let layerEl = this.frame.layers.get(layer);
        if (layerEl) {
            layerEl.appendChild(el);
        } else {
            console.error("layer not defined in frame", { el, frame: this.frame });
            throw new Error(`layer ${layer} not defined in frame`);
        }
    }
}

class SvgFrame {
    // safe area, always drawn for all aspect ratios
    readonly safeView: Maths.Rect;
    // full area, actuel area drawn
    readonly fullView: Maths.Rect;

    readonly el: Svg.SvgNode;

    layers: Map<number, Svg.SvgNode>;
    scene?: Scene;

    constructor(el: HTMLElement) {
        this.safeView = new Maths.Rect(new Maths.Vector(-10, -10), new Maths.Vector(20, 20));
        this.fullView = new Maths.Rect(new Maths.Vector(0, 0), new Maths.Vector(0, 0));

        // svg element settings
        this.el = new Svg.SvgNode(el);
        this.el.removeChildren();
        this.el.domEl.setAttribute("viewBox", `${this.safeView.pos.x} ${this.safeView.pos.x} ${this.safeView.size.x} ${this.safeView.size.y}`);
        this.el.domEl.setAttribute("preserveAspectRatio", "xMidYMid");
        this.el.domEl.setAttribute("transform", "scale(1,-1)");

        // TOTO create layers dynamically when needed
        this.layers = new Map();
        this.addLayer(-2);
        this.addLayer(-1);
        this.addLayer(0);
        this.addLayer(1);
        this.addLayer(2);

        this.resize();
    }

    showScene(scene: Scene) {
        if (this.scene) {
            this.scene.pause();
        }
        this.scene = scene;
        this.scene.play(this);
    }

    domToWorld(v: Maths.Vector) {
        let screenSpanX = this.el.domEl.clientWidth;
        let screenSpanY = this.el.domEl.clientHeight;
        let transformed = new Maths.Vector(
            Maths.swipe(v.x, 0, screenSpanX, this.fullView.minX(), this.fullView.maxX()),
            Maths.swipe(v.y, screenSpanY, 0, this.fullView.minY(), this.fullView.maxY())
        );
        return transformed;
    }

    // must be called when the element has been resized
    resize() {
        let screenSpanX = this.el.domEl.clientWidth;
        let screenSpanY = this.el.domEl.clientHeight;
        let screenRatio = screenSpanX / screenSpanY;
        let elSpanX = this.safeView.size.x;
        let elSpanY = this.safeView.size.y;
        let elRatio = elSpanX / elSpanY;

        let viewSpanX = 0;
        let viewSpanY = 0;
        if (elRatio <= screenRatio) {
            viewSpanX = elSpanY * screenRatio;
            viewSpanY = elSpanY;
        } else {
            viewSpanX = elSpanX;
            viewSpanY = elSpanX / screenRatio;
        }

        this.fullView.pos.x = -1 * viewSpanX / 2;
        this.fullView.size.x = viewSpanX;
        this.fullView.pos.y = -1 * viewSpanY / 2;
        this.fullView.size.y = viewSpanY;
    }

    // layers

    addLayer(index: number) {
        let group = new Svg.Group();
        this.layers.set(index, group);
        this.el.appendChild(group);
    }
}


export { SvgFrame, Scene }