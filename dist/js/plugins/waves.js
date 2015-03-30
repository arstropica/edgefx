/*!
* waves.js edgeFX effects plugin
* Original author: @arstropica
* Licensed under the MIT license
*/
if (typeof edgeFx == 'object') {
    edgeFx.plugins['waves'] = function(options) {
        var plugin = this;
        var defaults = {
            duration    : 10000,
            fps         : 2,
            resolution  : 5,
            amplitude   : 1,
            interval    : 500,
            bubbles     : {
                amount      : 5,
                speed       : 'auto',
                tint        : 'auto',
            },
            mode        : 'mask',
        };
        options = (Object.prototype.toString.call(options) == '[object Object]') ? edgeFx.helpers.extend({}, defaults, options) : defaults;

        this.events = {
            ready     : null,
            init      : null,
            onload    : null,
            create    : null,
            queue     : function(draft, queue) {
                var path, svg, async, delay, selection;
                path = draft._path.element;
                selection = draft.selection;
                selection.style({
                    'clip-path' : 'polygon(5% 5%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
                    // 'clip-path'     : 'url(#' + plugin._clipid + ')',
                });
                async = path.attr("data-edgefx-anim-async") || true;
                delay = path.attr("data-edgefx-anim-delay");
                var t = function(callback) {
                    callback = callback || false;
                    var duration = path.attr("data-edgefx-anim-duration") || 0,
                    box = path.node().getBoundingClientRect();
                    plugin._mspf = 1000 / options.fps,
                    plugin._t = 0;
                    plugin._w = 0;
                    plugin._b = [];
                    plugin._amplitude = options.amplitude;
                    plugin._iterations = Math.max(Math.ceil(options.duration / (plugin.moment(path, options.resolution) * plugin._mspf)), 1);
                    plugin._data = [],
                    plugin._svg = draft._svg.element;
                    plugin._selection = draft.selection;
                    plugin._id = path.attr("id");
                    plugin._clipid = path.attr("id") + "_clippath";

                    plugin.transition = d3.select({})
                    .transition()
                    .duration(plugin._mspf)
                    .ease("linear");

                    switch (edgeFx.opts.presentation.mode) {
                        case 'showcase' :
                        case 'fadein' :
                        case 'solo' :
                        case 'inline' :
                        default:
                        switch (options.mode) {
                            case 'overlay' :
                                plugin._svg.attr("clip-path", "url(#" + plugin._clipid + ")");
                                path.style({
                                    'visibility'    : 'visible',
                                    'opacity'       : '1',
                                    'fill'          : '#00f',
                                });
                                break;

                            case 'mask' :
                                default :
                                    plugin._selection.style({
                                        'visibility' : 'visible',
                                        'opacity' : '1',
                                        // 'mask' : 'url(#' + plugin._clipid + ')',
                                        'clip-path' : 'url(#' + plugin._clipid + ')',
                                        '-webkit-clip-path' : 'url(#' + plugin._clipid + ')',
                                    });
                                    path.style({
                                        'visibility'    : 'hidden',
                                        'fill'          : 'none',
                                    });
                                    break;
                            }
                            break;
                        case 'hidden' :
                            break;
                    }
                    plugin.waveGen(path, options.resolution, callback);
                };
                queue.add(t, async, delay);
            },
            animate   : null,
            complete  : null,
        };

        this.waveGen = function(path, resolution, callback) {
            resolution = resolution || 5;
            var interpolation = "basis",
            box = path.node().getBoundingClientRect(),
            pbox = edgeFx.helpers.getOffset(plugin._svg.node()),
            sw = path.style('stroke-width'),
            w = sw ? Number(sw.replace(/[^0-9\.]/g, '')) : 0,
            offset = plugin.poffset(path),
            width = box['width'],
            _width = width + 2 + w,
            height = box['height'],
            _height = height + 2 + w,
            nbubbles = typeof options.bubbles == 'object' ? options.bubbles.amount : false,
            bubbles = false,
            moment = plugin.moment(path, resolution),
            step = moment / plugin._amplitude;
            plugin._data = d3.range(0, moment, plugin._amplitude).map(function(n){return plugin.random(Math.sin(n * (Math.random() * (plugin._amplitude * 0.05))), plugin._amplitude * 0.1); }),
            periods = plugin._data.length,
            domain = [0, periods -1],
            x = d3.scale.linear()
            .domain(domain)
            .range([1, _width]),
            y = d3.scale.linear()
            .domain([-1, 1])
            .range([_height, (height * 0.75)]),
            wave = d3.svg.line()
            .interpolate(interpolation)
            .x(function (d, i) {
                if (i <= 2) {
                    return 1;
                }
                if (i >= (periods - 3)) {
                    return _width;
                }
                return x(i);
            })
            .y(function (d, i) {
                var h = i+1,
                tw = plugin._iterations * periods,
                rise = (((h + (plugin._w * periods)) / (tw * periods))) * _height;
                // console.log('i: ' + i, 'w: ' + plugin._w, 't: ' + plugin._t, 'rise: ' + rise);
                if (h == periods || h == 1 || plugin._w == tw)
                    return _height;

                return y(d * plugin._amplitude) - rise;
            });

            if (plugin._svg.select("defs").empty()) {
                plugin._svg.append("defs");
            }

            var clip = plugin._svg.select("defs")
            .append("path")
            .datum(plugin._data)
            .classed({
                "wavemask": true,
            })
            .attr('id', plugin._id + '_clip')
            .attr("transform", "translate(" + Object.keys(offset).map(function(d) { return offset[d]; }).join(',') + ")")
            .attr("d", wave)
            .attr("fill", "white")
            .attr("fill-rule", "evenodd");

            var mask = plugin._svg.append("svg:mask")
            .attr("id", plugin._id + '_mask');
            // .attr("transform", "translate(" + pbox['left'] + "," + pbox['top'] + ")");

            mask.append('svg:use')
            .attr('xlink:xlink:href', '#' + plugin._id + '_clip');

            var clippath = plugin._svg.append("svg:clipPath")
            .attr("id", plugin._clipid)
            .attr("transform", "translate(" + pbox['left'] + "," + pbox['top'] + ")");

            clippath.append('svg:use')
            .attr('xlink:xlink:href', '#' + plugin._id + '_clip');

            if (nbubbles) {
                bubbles = plugin.bubbleGen(path, nbubbles, true);
            }

            plugin._w ++;
            plugin._t ++;

            plugin.wavestep(step, clip, wave, bubbles, callback, path);

        };

        this.wavestep = function (step, clip, wave, bubbles, callback, path) {

            if (plugin._t > plugin._iterations) {
                var interval = path.attr("data-edgefx-anim-interval") || 0;
                interval = edgeFx.helpers.isNumeric(interval) ? interval : edgeFx.helpers.randomIntFromInterval(100, 900);
                if (bubbles) {
                    bubbles.transition()
                    .attr("opacity", 0).remove();
                }
                /*path.style({
                'visibility'    : 'hidden',
                'opacity'       : '0',
                });*/

                if (callback) {
                    setTimeout(callback, interval); 
                }
                return false;
            }

            plugin.transition = plugin.transition.each(function () {

                // push a new data point onto the back
                plugin._data.push(plugin._amplitude * 0.2 * Math.sin(plugin.transition.id * step));

                // pop the old data point off the front
                plugin._data.shift();

                // transition the line
                clip.transition()
                .attr("d", wave);

                if (bubbles) {
                    bubbles.selectAll('.bubble')
                    .each(function(d, i){
                        var _bubble = d3.select(this),
                        bubble = _bubble.transition(),
                        y = Math.abs(plugin.bubbley(_bubble)),
                        up = d['edgefxBubbleUp'],
                        s = d['edgefxBubbleSpeed'],
                        nrise = s * plugin._b[i],
                        rise = nrise + d['edgefxBubbleRand'] * nrise;

                        /*if (i == 1) {
                            console.log('bubble speed: ', s, ' px / s');
                            // console.log('nrise: ', nrise, ' px');
                            // console.log('rise: ', rise, ' px');
                            // console.log('up: ', up, ' px');
                            // console.log('b[' + i + ']: ', plugin._b[i], ' ');
                            console.log('y: ', y, ' px');
                            // console.log('total travel time: ', (plugin._mspf / 1000) * (plugin._w), ' secs');
                        }*/

                        if (y >= up) {
                            // bubbles = plugin.bubbleGen(path, options.bubbles.amount, true, i);
                            plugin._b[i] = 0;
                            _bubble.transition();
                            _bubble.attr("transform", null);
                        } else if (plugin._b[i] == 1){
                            var _delay = d['edgeFxBubbleDelay'];
                            _bubble.transition()
                            .delay(_delay)
                            .attr("transform", "translate(0,-" + (rise) + ")");
                        } else {
                            _bubble.transition()
                            .attr("transform", "translate(0,-" + (rise) + ")");
                        }
                        plugin._b[i] ++;
                    });
                }

                plugin._w ++;

                if (plugin._w % plugin._data.length == 0) {
                    plugin._t ++;
                    /*d3.select('#' + plugin._id + '_bubbles')
                    .selectAll('.bubble').each(function(d, i){
                    var up = d['edgefxBubbleUp'];
                    d3.select(this)
                    .attr("transform", "translate(0,-" + up + ")");
                    });*/
                }

            }).transition()
            .each("start", function () {
                plugin.wavestep(step, clip, wave, bubbles, callback, path);
            });
        };

        this.translatepath = function(path, x, y, tstring) {
            diff = {};
            tstring = tstring || false;
            x = x || 0;
            y = y || 0;
            var currentTransform = tstring ? tstring : path.attr("transform");
            var tfO = edgeFx.helpers.parseTString(currentTransform);

            var tfS = "";

            ['translate', 'scale', 'rotate', 'skewX', 'skewY'].forEach(function(t){
                switch (t) {
                    case 'translate' :
                        if (typeof tfO[t] != 'object') {
                            tfO[t] = [0,0];
                        };
                        tfO[t][0] = Number(tfO[t][0]) + x;
                        tfO[t][1] = Number(tfO[t][1]) + y;
                        tfS += t + '(' + tfO[t].join(',') + ') ';
                        break;
                    default:
                        if (typeof tfO[t] == 'object') 
                            tfS += t + '(' + tfO[t].join(',') + ') ';
                        else if (typeof tfO[t] != 'undefined')
                            tfS += t + '(' + tfO[t] + ') ';
                        break;
                }
            });
            return tfS.trim();
        };

        this.moment = function(path, resolution) {
            var moment = Math.round(Math.max(resolution * 5, 6), 0);
            return moment;
        };

        this.poffset = function(path) {
            var parent = d3.select(path.node().parentNode),
            box = path.node().getBoundingClientRect(),
            pbox = parent.node().getBoundingClientRect(),
            sw = path.style('stroke-width'),
            w = sw ? sw.replace(/[^0-9\.]/g, '') : 0,
            offset = {};

            ['left', 'top'].forEach(function(d){
                offset[d] = box[d] - pbox[d] - w;
            });

            return offset;            
        }

        this.circle2pathd = function(cx, cy, r) {
            return "M " + cx + ", " + cy + " m -" + r + ", 0 a " + r + "," + r + " 0 1,0 " + (r * 2) + ",0 a " + r + "," + r + " 0 1,0 -" + (r * 2) + ",0 Z";  
        };

        this.invertpath = function(path, include){
            include = include || true;
            var d = path.attr('d'),
            p = d.split(/[,]/g),
            l = p.length,
            h = p[l - 1].match(/^\d+/).toString(),
            re = new RegExp("," + h, "g"),
            r = d.replace(re, ",0"),
            ret;
            console.dir(d.match(re));
            if (include) {
                ret = path.attr("d", r + d);
            } else {
                ret = path.node().cloneNode(true);
                ret.attr("d", r);
            }

            return ret;                
        };

        this.random = function(n, d){d=d||n*0.1; return d3.random.normal(n, d)();};

        this.bubbley = function(bubble) {
            var t = bubble.attr("transform") || "translate(0,0)";
            var tfO = edgeFx.helpers.parseTString(t);
            // console.log(bubble.attr("transform"));
            // console.log(tfO);
            return tfO['translate'][1];
        };

        this.calcBSpeed = function(box) {
            var auto = ! edgeFx.helpers.isNumeric(options.bubbles.speed),
            speed = options.bubbles.speed,
            width = box['width'],
            height = box['height'],
            rmax = Math.min(width, height) * 0.25,
            up = height + (2 * rmax),
            sc = 50 * (up / 500),
            etd = sc * plugin._data.length * options.duration / 1000;

            if (auto) {
                if (etd <= up) {
                    sc = up / (options.duration / 1000 / plugin._data.length);
                }
            } else {
                sc = Math.max(Math.min(options.bubbles.speed, 10), 1) * 20;
            }

            return sc;
        }

        this.bubbleGen = function(path, bubbles, clip, iremove) {
            if (! bubbles) return;
            clip = (typeof clip == 'undefined') ? false : clip;
            iremove = (typeof iremove == 'undefined') ? false : iremove;

            var svg = d3.select(path.node().parentNode),
            box = path.node().getBoundingClientRect(),
            start = 0,
            offset = plugin.poffset(path),
            left = offset['left'],
            width = box['width'],
            top = offset['top'],
            height = box['height'],
            right = left + width,
            rmax = Math.min(width, height) * 0.25,
            xstep = width / bubbles,
            xrange = d3.range(left, right, xstep).map(function(n){return Math.min(Math.max(plugin.random(n, xstep * 0.1), left + rmax), right - rmax); }),
            id = plugin._id, 
            gid = id + '_bubbles',
            sc = plugin.calcBSpeed(box),
            tint = options.bubbles.tint == 'auto' ? '#BBBBBB' : options.bubbles.tint,
            gbubble,
            shading;

            shading = svg.select("defs")
            .append("svg:radialGradient")
            .attr("id", id + "_bgrad")
            .attr({
                "gradientUnits": "objectBoundingBox",
                "cx" : "0%",
                "cy" : "0%",
                "r"  : "75%"
            });

            shading.append("stop")
            .attr({
                "stop-color": tint, 
                "offset" : "0"
            });

            shading.append("stop")
            .attr({
                "stop-color": "#FFFFFF", 
                "offset" : "1"
            });


            if (iremove !== false) {
                d3.select('#' + id + '_bubble_' + iremove).remove();
                bubbles = iremove + 1;
                start = iremove;
                gbubble = svg.select('#' + gid);
            } else {
                gbubble = svg.append("g")
                .attr('id', gid)
                .classed({'gbubble' : true});

                if (clip) {
                    gbubble.attr("mask", 'url(#' + id + '_mask' + ')');
                }
            }

            for (var i = start; i < bubbles; i ++) {
                var bubble,
                r = Math.random() * rmax, 
                cx = xrange[i], 
                cy = top + plugin.random(((height * 1.05) + (2 * r)), height * 0.1),
                up = (cy - top + (2 * r) + plugin.random(height * 0.5, height * 0.05));

                bubble = gbubble.append("path")
                .attr({
                    'id': id + '_bubble_' + i,
                    'd' : plugin.circle2pathd(cx, cy, r),
                    'fill': 'url(#' + id + '_bgrad' + ')',
                    'opacity' : Math.min(Math.max(plugin.random(0.2, 0.2), 0.1), 0.45),
                    'stroke' : '#000',
                    'stroke-opacity' : plugin.random(0.5, 0.3),
                    'stroke-width' : plugin.random(1.5, 0.5),
                })
                .appendData({
                    'edgefx-bubble-origin'  : cy,
                    'edgefx-bubble-rand'    : plugin.random(0, 0.2),
                    'edgefx-bubble-delay'   : sc * plugin.random(0, 0.5),
                    'edgefx-bubble-speed'   : sc,
                    'edgefx-bubble-up'      : up,
                })
                .classed({'bubble': true});
                plugin._b[i] = 0;
            }

            return gbubble;
        };

    };
};	