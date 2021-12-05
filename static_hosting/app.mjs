"use strict"

import * as Altgn from './lib/altng.mjs';

const frame = new Altgn.SvgFrame(document.getElementById("frame"));
window.onresize = () => {
    frame.resize();
}