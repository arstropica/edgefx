/*!
* ripple.js edgeFX effects plugin
* Original author: @arstropica
* Licensed under the MIT license
*/
if (typeof edgeFx == 'object') {
    edgeFx.plugins['ripple'] = function(options) {
        var plugin = this;
        var defaults = {
            waves       : 5,
            pixels      : 10,
            duration    : 1000,
            interval    : 500,
            stroke      : {
                color   : '#000',
                width   : 2,
            },
        };
        options = (Object.prototype.toString.call(options) == '[object Object]') ? edgeFx.helpers.extend({}, defaults, options) : defaults;
        
        this.events = {
            ready     : null,
            init      : null,
            onload    : null,
            create    : null,
            queue     : function(draft, queue) {
                var path, async, delay, selection, svg, box, scale, pixels, waves;
                pixels = Number(options.pixels.replace(/[^0-9\.]/g, '')) * 2 || 20;
                options.scale = plugin.px2scale(draft._path.element, pixels, false);
                options.scalar = plugin.px2scale(draft._path.element, pixels, true);
                adraft = plugin.adjust(draft, options);
                svg = adraft._svg.element;
                path = adraft._path.element;
                selection = adraft.selection;
                path.appendData({
                    'edgefx-path-scale'     : options.scale,
                    'edgefx-path-scalar'    : options.scalar,
                });

                waves = Number(options.waves) || 5;

                var group = plugin.gclone(path, waves, true);

                async = path.attr("data-edgefx-anim-async") || true;
                delay = path.attr("data-edgefx-anim-delay");

                if (group && edgeFx.helpers.isQuery(group) && ! group.empty()) {
                    group.attr("data-edgefxEffect", "ripple");
                    var rpaths = group.selectAll("path");
                    var opacity = edgeFx.helpers.getStyle(path.node(), "opacity");
                    var o = function(i){var o, s; o = edgeFx.helpers.getStyle(path.node(), "opacity"); s = ((o * 0.75) / waves); return o - (s * (1 + i)); };
                    var s = function(i) {var g, t, f; g = Math.pow(2, waves); t = options.scalar - 1; f = pixels * 0.5 / g; return plugin.px2scale(path, Math.pow(2, i) * f, false);};
                    rpaths.each(function(d, i){
                        d3.select(this)
                        .attr("opacity", o(i))
                        .style("opacity", o(i))
                        .attr('stroke', options.stroke.color)
                        .attr('stroke-width', options.stroke.width)
                        .style('stroke', options.stroke.color)
                        .style('stroke-width', options.stroke.width)
                        .attr("transform", plugin.resizepath(d3.select(this), s(i)));
                    });

                    var t = function(callback) {
                        var q = window.queue(1);
                        callback = callback || false;
                        var interval = path.attr("data-edgefx-anim-interval") || 0;
                        interval = edgeFx.helpers.isNumeric(interval) ? interval : edgeFx.helpers.randomIntFromInterval(100, 900);

                        var rtasks = [];
                        var rduration = options.duration * 0.33 / waves;
                        plugin.w = 0;
                        rpaths.each(function(){
                            var rpath = this;
                            var r = function(_callback){                    
                                switch (edgeFx.opts.presentation.mode) {
                                    case 'showcase' :
                                    case 'fadein' :
                                    case 'solo' :
                                    case 'inline' :
                                    default:
                                        d3.select(rpath).style({
                                            'visibility'    : 'visible',
                                        });
                                        break;
                                    case 'hidden' :
                                        break;
                                }
                                d3.select(rpath)
                                .transition()
                                .duration(rduration * 2)
                                .ease("linear")
                                .styleTween("stroke-dashoffset", plugin.zerotween)
                                .attrTween("transform", plugin.scaletween)

                                .each("end", function() {
                                    d3.select(this)
                                    .transition()
                                    .duration(rduration * 7)
                                    .ease('linear')
                                    .styleTween("opacity", plugin.zerotween);
                                    if (_callback) {
                                        setTimeout(_callback, options.interval); 
                                    }
                                });
                            };
                            rtasks.push(r);
                        });
                        rtasks.forEach(function(r) { q.defer(r); });
                        q.awaitAll(function(error, results) {
                            switch (edgeFx.opts.presentation.mode) {
                                case 'showcase' :
                                case 'inline' :
                                    selection.style({
                                        'opacity'    : '1.0', 
                                        'visibility': 'visible',
                                    });
                                    break;
                                case 'fadein' :
                                    selection.style({
                                        'opacity'    : '0', 
                                        'visibility': 'visible',
                                    })
                                    .transition()
                                    .ease("linear")
                                    .duration(edgeFx.opts.presentation.duration)
                                    .styleTween('opacity', function(d, i, a){return d3.interpolate(a, String(1));})
                                    .each("end", function(){
                                        path.style({
                                            'visibility'    : 'hidden',
                                            'opacity'       : '0',
                                        });
                                    });
                                    break;
                                case 'solo' :
                                case 'hidden' :
                                    break;
                            }

                            if (callback) {
                                setTimeout(callback, interval); 
                            }
                        });
                    };
                    queue.add(t, async, delay);
                }
            },
            animate   : null,
            complete  : null,
        };

        this.zerotween = function(d, i, a) {
            return d3.interpolate(a, String(0)); // interpolation of dash-offset style attr
        };

        this.scaletween = function (d, i, a) {
            var scale, path, tfS;
            path = d3.select(this);
            scale = plugin.tscale(i, path);
            tfS = plugin.resizepath(path, scale, a);
            plugin.w ++;
            return d3.interpolate(a, tfS);
        }

        this.tscale = function(i, path) {
            var scale, scalestr;
            scalestr = path.attr('data-edgefx-path-scale');
            scale = edgeFx.helpers.isJSON(scalestr) ? JSON.parse(path.attr('data-edgefx-path-scale')) : {width: 1, height: 1};
            ['width', 'height'].forEach(function(d){
                if (typeof scale[d] == 'undefined')
                    scale[d] = 1;
                scale[d] = 1 + (scale[d] - 1) * (plugin.w / Number(options.waves));
            });
            return scale;
        }

        this.gclone = function (selection, num, cloneAttrs) {
            selection = edgeFx.helpers.isQuery(selection) ? selection : d3.select(selection);
            cloneAttrs = cloneAttrs || false;
            var id = selection.attr("id");
            var parent = d3.select(selection.node().parentNode);
            var group = parent.append("g")
            .attr("id", id + "_g")
            .classed("cgroup", true);
            for (var i = 0; i < num; i ++) {
                var node_name = selection.property("nodeName");
                var attr = selection.node().attributes;
                var length = attr.length;
                var cloned = group.append(node_name)
                .attr("id", id + "_" + i);
                if (cloneAttrs) {
                    for (var j = 0; j < length; j++) { // Iterate on attributes and skip on "id"
                        if (attr[j].nodeName == "id") continue;
                        cloned.attr(attr[j].name,attr[j].value);
                    }
                }
                cloned
                .classed({
                    'clone' : true,
                    'main'  : false,
                });
            }
            return group;
        };

        this.adjust = function(draft, options) {
            var _draft, path, async, diff, selection, svg;
            _draft = edgeFx.helpers.extend({}, draft);
            svg = _draft._svg.element;
            path = _draft._path.element;
            selection = _draft.selection;
            diff = {};

            var sdim = svg.node().getBoundingClientRect();
            var soffset = edgeFx.helpers.getOffset(svg.node());

            for (dim in sdim) {
                switch (dim) {
                    case 'height' :
                    case 'width' :
                        diff[dim] = (Number(svg.attr(dim).replace(/[^0-9]/g, '')) * options.scale[dim]) - Number(svg.attr(dim).replace(/[^0-9]/g, ''));
                        svg.style(dim, (Number(svg.style(dim).replace(/[^0-9]/g, '')) + Number(diff[dim]))  + 'px');
                        svg.attr(dim, (Number(svg.attr(dim).replace(/[^0-9]/g, '')) + Number(diff[dim])));
                        break;
                }
            }
            for (pos in soffset) {
                switch (pos) {
                    case 'left' :
                        svg.style(pos, (Number(svg.style(pos).replace(/[^0-9]/g, '')) - (diff['width'] / 2)) + 'px');
                        // path.style(pos, (Number(path.style(pos).replace(/[^0-9]/g, '')) + (diff['width'] / 2)) + 'px');
                        break;
                    case 'top' :
                        svg.style(pos, (Number(svg.style(pos).replace(/[^0-9]/g, '')) - (diff['height'] / 2)) + 'px');
                        // path.style(pos, (Number(path.style(pos).replace(/[^0-9]/g, '')) + (diff['height'] / 2)) + 'px');
                        break;
                }
            }

            path.attr("transform", "translate(" 
                + (diff['width'] / 2)
                + ","
                + (diff['height'] / 2)
                + ")");

            _draft._svg.element = svg;
            _draft._path.element = path;

            return _draft;
        };

        this.resizepath = function(path, scale, tstring) {
            diff = {};
            tstring = tstring || false;
            var currentTransform = tstring ? tstring : path.attr("transform");
            var tfO = edgeFx.helpers.parseTString(currentTransform);
            var currentScale = typeof tfO['scale'] != 'undefined' ? {width: tfO['scale'][0], height: tfO['scale'][1]} : {width: 1, height: 1};
            var box = path.node().getBoundingClientRect();
            var soffset = edgeFx.helpers.getOffset(path.node());

            for (dim in box) {
                switch (dim) {
                    case 'height' :
                    case 'width' :
                        diff[dim] = Number(box[dim]) * ((scale[dim] - currentScale[dim]) / currentScale[dim]);
                        break;
                }
            }
            for (pos in soffset) {
                switch (pos) {
                    case 'left' :
                        path.style(pos, (Number(path.style(pos).replace(/[^0-9]/g, '')) - (diff['width'] / 2)) + 'px');
                        break;
                    case 'top' :
                        path.style(pos, (Number(path.style(pos).replace(/[^0-9]/g, '')) - (diff['height'] / 2)) + 'px');
                        break;
                }
            }

            var tfS = "";

            ['translate', 'scale', 'rotate', 'skewX', 'skewY'].forEach(function(t){
                switch (t) {
                    case 'translate' :
                        if (typeof tfO[t] != 'object') {
                            tfO[t] = [0,0];
                        };
                        tfO[t][0] = Number(tfO[t][0]) - (diff['width'] / 2);
                        tfO[t][1] = Number(tfO[t][1]) - (diff['height'] / 2);
                        tfS += t + '(' + tfO[t].join(',') + ') ';
                        break;
                    case 'scale' : 
                        tfS += t + '(' +  Object.keys(scale).map(function(d) { return scale[d]; }).join(',') + ') ';
                        break;
                    default:
                        if (typeof tfO[t] == 'object') tfS += t + '(' + tfO[t].join(',') + ') ';
                        break;
                }
            });
            return tfS.trim();
        };

        this.px2scale = function(path, pixels, square) {
            var tfO, currentScale, box, origArea, newArea, scale;
            square = square || false;
            tfO = edgeFx.helpers.parseTString(path.attr("transform"));

            // currentScale = typeof tfO['scale'] != 'undefined' ? Number(tfO['scale'].toString()) : 1;
            currentScale = typeof tfO['scale'] != 'undefined' ? {width: tfO['scale'][0], height: tfO['scale'][1]} : {width: 1, height: 1};
            box = path.node().getBoundingClientRect();
            if (square) {
                origArea = (Number(box['width']) * (1 / currentScale['width'])) * (Number(box['height']) * (1 / currentScale['height']));
                newArea  = ((Number(box['width']) * (1 / currentScale['width'])) + Number(pixels)) * ((Number(box['height']) * (1 / currentScale['height'])) + Number(pixels));
                scale = Math.sqrt(newArea / origArea);
            } else {
                scale = {};
                ['width', 'height'].forEach(function(d){
                    scale[d] = (((Number(box[d]) + Number(pixels)) / Number(box[d])) * (1 / currentScale[d]));
                });
            }
            return scale;
        };

    };
};	