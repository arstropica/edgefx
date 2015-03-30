/*!
* default.js edgeFX effects plugin
* Original author: @arstropica
* Licensed under the MIT license
*/
if (typeof edgeFx == 'object') {
    edgeFx.plugins['default'] = function(options) {
        var plugin = this;
        this.events = {
            ready     : null,
            init      : null,
            onload    : null,
            create    : null,
            queue     : function(draft, queue) {
                var path, async, delay, selection;
                path = draft._path.element;
                selection = draft.selection;
                async = path.attr("data-edgefx-anim-async") || true;
                delay = path.attr("data-edgefx-anim-delay");
                var t = function(callback) {
                    callback = callback || false;
                    var interval = path.attr("data-edgefx-anim-interval") || 0;
                    interval = edgeFx.helpers.isNumeric(interval) ? interval : edgeFx.helpers.randomIntFromInterval(100, 900);
                    var duration = path.attr("data-edgefx-anim-duration") || 0;
                    switch (edgeFx.opts.presentation.mode) {
                        case 'showcase' :
                        case 'fadein' :
                        case 'solo' :
                        case 'inline' :
                        default:
                            path.style({
                                'visibility'    : 'visible',
                            });
                            break;
                        case 'hidden' :
                            break;
                    }
                    path
                    .transition()
                    .duration(duration)
                    .ease("linear")
                    .styleTween("stroke-dashoffset", plugin.stroketween)

                    .each("end", function() {
                        switch (edgeFx.opts.presentation.mode) {
                            case 'showcase' :
                                selection.style({
                                    'opacity'    : '1.0', 
                                    'visibility': 'visible',
                                });
                                path.transition()
                                .duration(edgeFx.opts.presentation.duration)
                                .ease("linear")
                                .style({
                                    'visibility'    : 'hidden',
                                    'opacity'       : '0',
                                });
                                break;
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
                                .duration(edgeFx.opts.presentation.duration)
                                .ease("linear")
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
            },
            animate   : null,
            complete  : null,
        };

        this.stroketween = function(d, i, a) {
            var path = d3.select(this);
            var len = path.node().getTotalLength();
            return d3.interpolate(a, String(0)); // interpolation of dash-offset style attr
        };

    };
};	