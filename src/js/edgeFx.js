/*!
* D3.js edgeFX plugin
* version: 0.0.1
* Original author: @arstropica
* Licensed under the MIT license
*/
(function (context, edgeFx) {
    // "use strict";

    if (typeof exports === "object") {
        // CommonJS
        if (typeof module !== 'undefined' && module.exports) {
            var d3 = require('d3');
            var geom = require('geom');
            var queue = require('queue');
            module.exports = edgeFx(d3, geom, queue);
        }
    } else {
        if (typeof define === "function" && define.amd) {
            // RequireJS | AMD
            define(["d3", "geom", "queue"], function (d3, geom, queue) {
                // publish edgeFx to the global namespace for backwards compatibility
                // and define it as an AMD module
                context.edgeFx = edgeFx(d3, geom, queue);
                return context.edgeFx;
            });
        } else {
            // No AMD, expect d3 to exist in the current context and publish
            // edgeFx to the global namespace
            if (!context.d3) {
                if (console && console.warn) {
                    console.warn("edgeFx requires d3 to run.  Are you missing a reference to the d3 library?");
                } else {
                    throw "edgeFx requires d3 to run.  Are you missing a reference to the d3 library?";
                }
            } else if (!context.d3.geom) {
                if (console && console.warn) {
                    console.warn("edgeFx requires geom to run.  Are you missing a reference to the geom library?");
                } else {
                    throw "edgeFx requires geom to run.  Are you missing a reference to the geom library?";
                }
            } else if (!context.queue) {
                if (console && console.warn) {
                    console.warn("edgeFx requires queue to run.  Are you missing a reference to the queue library?");
                } else {
                    throw "edgeFx requires queue to run.  Are you missing a reference to the queue library?";
                }
            } else {
                context.edgeFx = edgeFx(context.d3, context.d3.geom, context.queue);
            }
        }
    }

    }(this, function (d3, geom, queue) {
        // "use strict";

        var timestamp = new Date();

        // Create the stub object
        var edgeFx = {
            version : "0.0.1",
            helpers : {},
            filters : {},
            defaults: {},
            draft   : {
                methods : {},
                factory : {},
                state : {},
            },
            effects : {
                init    : {},
                methods : {},
                factory : {},
            },
            plugins : {
            },
            animation: {
                queue : null,
                state : {},
                methods: {},
                factory: {},
            },
            events  : {
                factory : {},
                methods : {},
            },
            opts    : {},
        };

        edgeFx.defaults = {
            presentation    : {
                mode        : 'showcase', // showcase|fadein|inline|solo|hidden
                duration    : 3000,
                delay       : 2000,
            },
            svg     : {
                class       : 'edgeSVG',
                root        : 'BODY',
                insert      : true,
                visibility  : true,
                path    : {
                    stroke      : {
                        color       : '#000',
                        width       : 2,
                        opacity     : 'random',
                        class       : 'edgeLine',
                        pattern     :  'solid',
                        visibility  : true,
                    },
                    filter  : {
                        selector    : null,
                        features    : ['background', 'border', 'image'],
                    },
                    animation: {
                        async       : false,
                        delay       : 0,
                        duration    : 1000,
                        tween       : {
                            type        : 'styleTween',
                            property    : 'stroke-dashoffset',
                            fn          : function(d, i, a) {
                                var path = d3.select(this);
                                var len = path.node().getTotalLength();
                                return d3.interpolate(a, String(0)); // interpolation of dash-offset style attr
                            },
                        },
                        repeat      : {
                            iterations  : 0,
                            interval    : 'random',
                        },
                    },
                },
            },
            effects : {},
            plugins : {
                _default : function(options) {
                    this.events = {
                        ready     : function(selection, opts) {},
                        init      : function(selection, opts) {},
                        onload    : function(selection, opts) {},
                        create    : function(selection, opts) {},
                        queue     : function(draft, queue) {},
                        animate   : function(selection, opts) {},
                        complete  : function() {},
                    };

                },
            },
        };

        edgeFx.drafts = [];

        /*Define Helper Methods*/
        d3.selection.prototype.appendData = function(_datum){
            this.datum(function() { return this.dataset; });
            var data = this.data();
            if (typeof data == 'object' && data.length > 0) {
            } else {
                data = [];
            }
            for (prop in _datum) {
                if (_datum.hasOwnProperty(prop)) {
                    var slug = prop.camelCase();
                    var _dval = (typeof _datum[prop] == 'object') ? edgeFx.helpers.toJSON(_datum[prop]) : _datum[prop];
                    data[0][slug] = _dval;
                }
            }
            this.data(data);
            this.datum(function() { return this.dataset; });
            return this;
        };

        d3.selection.prototype.getData = function(prop) {
            prop = prop || false;
            var data = this.data();
            if (! prop) {
                return data;
            } else if (data && data.length > 0) {
                return typeof data[0][prop] == 'undefined' ? false : data[0][prop];
            } else {
                return false;
            }
        }

        // ES 15.2.3.6 Object.defineProperty ( O, P, Attributes )
        // Partial support for most common case - getters, setters, and values
        if (typeof Object.defineProperty != 'function') {
            var orig = Object.defineProperty;
            Object.defineProperty = function (o, prop, desc) {
                // In IE8 try built-in implementation for defining properties on DOM prototypes.
                if (orig) { try { return orig(o, prop, desc); } catch (e) {} }

                if (o !== Object(o)) { throw TypeError("Object.defineProperty called on non-object"); }
                if (Object.prototype.__defineGetter__ && ('get' in desc)) {
                    Object.prototype.__defineGetter__.call(o, prop, desc.get);
                }
                if (Object.prototype.__defineSetter__ && ('set' in desc)) {
                    Object.prototype.__defineSetter__.call(o, prop, desc.set);
                }
                if ('value' in desc) {
                    o[prop] = desc.value;
                }
                return o;
            };
        }

        Object.defineProperty(String.prototype, "capitalize", {
            enumerable: false,
            value: function() {
                return this.charAt(0).toUpperCase() + this.slice(1);
            }
        });

        Object.defineProperty(String.prototype, "camelCase", {
            enumerable: false,
            value: function() {
                return this.replace( /-([a-z])/ig, function( all, letter ) {
                    return letter.toUpperCase();
                });
            }
        });

        Object.defineProperty(Array.prototype, "clean", {
            enumerable: false,
            value: function(deleteValue) {
                deleteValue = deleteValue || undefined;
                for (var i = 0; i < this.length; i++) {
                    if (this[i] == deleteValue || this[i] == "" || this[i] === null) {         
                        this.splice(i, 1);
                        i--;
                    }
                }
                return this;
            }
        });

        Object.defineProperty(Object.prototype, "getMethods", {
            enumerable: false,
            value: function() {
                var res = [];
                for(var m in this) {
                    if(typeof this[m] == "function") {
                        res.push(m)
                    }
                }
                return res;
            }
        });

        Object.defineProperty(Object.prototype, "isEmpty", {
            enumerable: false,
            value: function() {
                for (var prop in this)
                if (this.hasOwnProperty(prop)) return false;
                return true;
            }
        });

        Object.defineProperty(Object.prototype, "flatten", {
            enumerable: false,
            value: function(separator, prefix) {
                var obj, prefix;
                if (typeof this != 'undefined') {
                    separator = separator || '-';
                    prefix = arguments.length > 1 ? ((arguments[1].length > 0) ? (arguments[1] + separator) : '') : '';
                    obj = arguments.length > 2 ? arguments[2] : {};
                    for (var prop in this) {
                        if (this.hasOwnProperty(prop)) {
                            var path = prefix + prop;
                            if (typeof this[prop] == 'object') {
                                if (Object.prototype.toString.call(this[prop]) == '[object Object]') {
                                    var flattened = this[prop].flatten(separator, path, obj);
                                    for (var flat in flattened) {
                                        if (flattened.hasOwnProperty(flat)) {
                                            obj[flat] = flattened[flat];
                                        }
                                    }
                                } else if (typeof this[prop] != 'undefined') {
                                    obj[path] = this[prop];
                                }
                            } else if (typeof this[prop] != 'undefined') {
                                obj[path] = this[prop];
                            }
                        }
                    }
                }
                return obj || {};
            }
        });

        edgeFx.helpers.isJSON = function (str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        };

        edgeFx.helpers.toJSON = function(obj, replacer, indent){
            var printedObjects = [];
            var printedObjectKeys = [];

            function printOnceReplacer(key, value){
                if ( printedObjects.length > 2000){ // browsers will not print more than 20K, I don't see the point to allow 2K.. algorithm will not be fast anyway if we have too many objects
                    return 'object too long';
                }
                var printedObjIndex = false;
                printedObjects.forEach(function(obj, index){
                    if(obj===value){
                        printedObjIndex = index;
                    }
                });

                if ( key == ''){ //root element
                    printedObjects.push(obj);
                    printedObjectKeys.push("root");
                    return value;
                }

                else if(printedObjIndex+"" != "false" && typeof(value)=="object"){
                    if ( printedObjectKeys[printedObjIndex] == "root"){
                        return "(pointer to root)";
                    }else{
                        return "(see " + ((!!value && !!value.constructor) ? value.constructor.name.toLowerCase()  : typeof(value)) + " with key " + printedObjectKeys[printedObjIndex] + ")";
                    }
                }else{

                    var qualifiedKey = key || "(empty key)";
                    printedObjects.push(value);
                    printedObjectKeys.push(qualifiedKey);
                    if(replacer){
                        return replacer(key, value);
                    }else{
                        return value;
                    }
                }
            }
            return JSON.stringify(obj, printOnceReplacer, indent);
        };

        edgeFx.helpers.isQuery = function(obj, nodeName) {
            nodeName = nodeName || false;
            return obj && obj.hasOwnProperty && obj instanceof d3.selection && (nodeName ? obj.node().nodeName == nodeName : true);
        };

        edgeFx.helpers.isString = function(str) {
            return str && $.type(str) === "string";
        };

        edgeFx.helpers.isNumeric = function(n) { 
            return !isNaN(parseFloat(n)) && isFinite(n); 
        };

        edgeFx.helpers.isArray = function(a) {
            return Array.isArray(a);  
        };

        edgeFx.helpers.getStyle = function (el, cssprop){
            cssprop = cssprop || false;
            if (el.currentStyle) //IE
                return cssprop ? el.currentStyle[cssprop] : el.currentStyle;
            else if (document.defaultView && document.defaultView.getComputedStyle) //Firefox
                return cssprop ? document.defaultView.getComputedStyle(el, "")[cssprop] : document.defaultView.getComputedStyle(el, "");
                else //try and get inline style
                    return cssprop ? el.style[cssprop] : el.style;
        };

        edgeFx.helpers.hasBorder = function(element) {
            var style = window.getComputedStyle(element, null),
            sides = ['top', 'right', 'bottom', 'left'],
            maxBorder = 0;

            maxBorder = Math.max(maxBorder, parseInt(style.getPropertyValue('border-width')));
            for (var i = 0, length = sides.length; i < length; i++) {
                maxBorder = Math.max(maxBorder, parseInt(style.getPropertyValue('border-' + sides[i] + '-width')));
            }

            return maxBorder;        
        };

        edgeFx.helpers.hasBackground = function(element) {
            var style = window.getComputedStyle(element, null),
            hasBG = false,
            exclude = ['rgba(0, 0, 0, 0)', 'none'];
            props = ['color', 'image'];

            // hasBG = hasBG ? hasBG : style.getPropertyValue('background');
            for (var i = 0, length = props.length; i < length; i++) {
                hasBG = hasBG ? hasBG : (exclude.indexOf(style.getPropertyValue('background-' + props[i])) < 0);
            }

            return hasBG;        
        };

        edgeFx.helpers.getBorderRadius = function(element) {
            var style = window.getComputedStyle(element, null),
            exclude = [null, '0px', '0px 0px', '0px 0px 0px 0px', '0 0 0 0'];
            props = {
                topright: ['border-top-right-radius', '-moz-border-radius-topright', '-webkit-border-top-right-radius'],
                bottomright: ['border-bottom-right-radius', '-moz-border-radius-bottomright', '-webkit-border-bottom-right-radius'], 
                bottomleft: ['border-bottom-left-radius', '-moz-border-radius-bottomleft', '-webkit-border-bottom-left-radius'],
                topleft: ['border-top-left-radius', '-moz-border-radius-topleft', '-webkit-border-top-left-radius'], 
            }, 
            result = {
                topright: false,
                bottomright: false,
                bottomleft: false,
                topleft: false,
            };
            for (bpos in props) {
                var _props = props[bpos];
                for (var i = 0, length = _props.length; i < length; i++) {
                    var _prop = style.getPropertyValue(_props[i]);
                    // console.log(bpos + ': ' + _prop);
                    result[bpos] = result[bpos] ? result[bpos] : ((edgeFx.helpers.searchStringInArray(_prop, exclude) == -1) ? parseInt(_prop.replace('px', '')) : result[bpos]);
                }
            }

            return result;

        };

        edgeFx.helpers.searchStringInArray = function(str, strArray) {
            for (var j=0; j<strArray.length; j++) {
                if (strArray[j] === null) {
                    if (str === null) return j;
                } else {
                    if (strArray[j].match(str)) return j;
                }
            }            
            return -1;
        };

        edgeFx.helpers.setAttributes = function(el, obj) {
            var attr, value, _results;
            _results = [];
            for (attr in obj) {
                value = obj[attr];
                if (typeof value == 'string') {
                    _results.push(el.setAttribute(attr, value));
                } else {
                    el[attr] = value;
                }
            }
            return _results;
        };

        edgeFx.helpers.nodeParents = function(el) {
            var parents = [];
            var p = el.parentNode;
            while (p !== document) {
                var o = p;
                parents.push(o);
                p = o.parentNode;
            }
            return parents; // returns an Array []
        };

        /*Modified from http://andrewdupont.net/2009/08/28/deep-extending-objects-in-javascript/*/
        edgeFx.helpers.extend = function() {
            for(var i=1; i<arguments.length; i++) {
                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) {
                        if (arguments[i][key] && arguments[i][key].constructor && arguments[i][key].constructor === Object) {
                            arguments[0][key] = arguments[0][key] || {};
                            arguments.callee(arguments[0][key], arguments[i][key]);
                        } else {
                            arguments[0][key] = arguments[i][key];
                        }
                    }
                }
            }
            return arguments[0];
        };

        edgeFx.helpers.randomIntFromInterval = function(min,max) {
            return Math.floor(Math.random()*(max-min+1)+min);
        };

        edgeFx.helpers.callfunc = function (functionName, context) {
            var args = [].slice.call(arguments).splice(2).length === 1 ? [].slice.call(arguments).splice(2)[0] : [].slice.call(arguments).splice(2);
            if (typeof functionName == 'string') {
                var namespaces = functionName.split(".");
                var func = namespaces.pop();
                for(var i = 0; i < namespaces.length; i++) {
                    context = context[namespaces[i]];
                }
                return context[func].apply(context, args);
            } else {
                var func = functionName;
                return func.apply(context, args);
            }
        };

        edgeFx.helpers.getOffsetSum = function(elem) {
            var top=0, left=0

            while(elem) {
                top = top + parseInt(elem.offsetTop)
                left = left + parseInt(elem.offsetLeft)
                elem = elem.offsetParent        
            }

            return {top: top, left: left}
        };

        /*From http://javascript.info/tutorial/coordinates*/
        edgeFx.helpers.getOffset = function(elem) {
            if (elem.getBoundingClientRect) {
                return edgeFx.helpers.getOffsetRect(elem);
            } else { // old browser
                return edgeFx.helpers.getOffsetSum(elem);
            }
        };

        /*From http://javascript.info/tutorial/coordinates*/
        edgeFx.helpers.getOffsetRect = function(elem) {
            // (1)
            var box = elem.getBoundingClientRect()

            var body = document.body
            var docElem = document.documentElement

            // (2)
            var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
            var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft

            // (3)
            var clientTop = docElem.clientTop || body.clientTop || 0
            var clientLeft = docElem.clientLeft || body.clientLeft || 0

            // (4)
            var top  = box.top +  scrollTop - clientTop
            var left = box.left + scrollLeft - clientLeft

            return { top: Math.round(top), left: Math.round(left) }
        };

        /*From http://stackoverflow.com/questions/17824145/parse-svg-transform-attribute-with-javascript*/
        edgeFx.helpers.parseTString = function (a) {
            var b={};
            if (a) {
                for (var i in a = a.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g))
                {
                    var c = a[i].match(/[\w\.\-]+/g);
                    b[c.shift()] = c;
                }
            }
            return b;
        };

        /*Define Filter Methods*/
        edgeFx.filters.filter = function(selection, filters) {
            selection = edgeFx.helpers.isQuery(selection) ? selection : d3.selectAll(selection);
            if (selection.empty())
                return selection;

            filters = filters || {};
            if(Object.getOwnPropertyNames(filters).length === 0){
                selection.attr("data-edgefx-filtered", 1);
            } else {
                for (type in filters) {
                    var criteria = filters[type];
                    if (criteria) {
                        switch (type) {
                            case 'features' : {
                                var features = edgeFx.helpers.isArray(criteria) ? criteria : [criteria];
                                features.forEach(function(feature){
                                    switch (feature) {
                                        case 'background' : {
                                            selection.filter(edgeFx.filters.cssBackground).attr("data-edgefx-filtered", 1); 
                                            break;
                                        }
                                        case 'border' : {
                                            selection.filter(edgeFx.filters.cssBorder).attr("data-edgefx-filtered", 1); 
                                            break;
                                        }
                                        case 'image' : {
                                            selection.filter(edgeFx.filters.isImage).attr("data-edgefx-filtered", 1); 
                                            break;
                                        }
                                    }      
                                });
                                break;
                            }
                            case 'selector' : {
                                selection.select(criteria).attr("data-edgefx-filtered", 1);
                                break;
                            }
                        }
                    }
                }
            }

            return d3.selectAll("[data-edgefx-filtered='1']");
        };

        edgeFx.filters.cssBackground = function(element, index) {
            var hasBG = false,
            exclude = ['rgba(0, 0, 0, 0)', 'none'];
            props = ['color', 'image'];

            for (var i = 0, length = props.length; i < length; i++) {
                var currentStyle = edgeFx.helpers.getStyle(this, "background-" + props[i]);
                if (currentStyle) {
                    hasBG = hasBG ? hasBG : (exclude.indexOf(currentStyle) < 0);
                } else if (window.getComputedStyle) {
                    var style = window.getComputedStyle(this, null);
                    hasBG = hasBG ? hasBG : (exclude.indexOf(style.getPropertyValue('background-' + props[i])) < 0);
                }
            }
            return hasBG;
        };

        edgeFx.filters.cssBorder = function(element, index) {
            var sides = ['top', 'right', 'bottom', 'left'];
            var maxBorder = 0;
            var currentStyle = edgeFx.helpers.getStyle(this);
            if (currentStyle) {
                for (var i = 0, length = sides.length; i < length; i++) {
                    maxBorder = Math.max(maxBorder, parseInt(currentStyle['border-' + sides[i] + '-width']));
                }
            } else if (window.getComputedStyle) {
                var style = window.getComputedStyle(this, null);
                for (var i = 0, length = sides.length; i < length; i++) {
                    maxBorder = Math.max(maxBorder, parseInt(style.getPropertyValue('border-' + sides[i] + '-width')));
                }
            }
            return maxBorder > 0;
        };

        edgeFx.filters.isImage = function(element, index) {
            return this.nodeName == 'IMG';
        };        

        /*Define Draft Methods*/
        edgeFx.draft.factory = function(selection){
            this.selection = null;
            this.selection = edgeFx.helpers.isQuery(selection) ? selection : d3.selectAll(selection);
            this._svg = this._svg();
            this._path = this._path();
        };

        edgeFx.draft.factory.svg = function(root, options) {
            var styles = {};
            this.sourceOffset = [];

            this._svgRoot = edgeFx.helpers.isQuery(root) ? root : d3.select(root);
            if (this._svgRoot.empty()) {
                throw "The '" + root + "' root selector did not match any elements.  Please prefix with '#' to select by id or '.' to select by class";
                return false;
            }

            this.element = this._svgRoot.append("svg");

            if (typeof options.id != 'undefined')
                this.element.attr("id", options.id);

            if (typeof options.width != 'undefined')
                this.element.attr("width", options.width);

            if (typeof options.height != 'undefined')
                this.element.attr("height", options.height);

            if (typeof options.class != 'undefined') 
                this.element.classed(options.class, true);

            if (typeof options.styles != 'undefined') {
                ['top', 'left', 'position', 'height', 'width'].forEach(function(c, i){
                    if (typeof options.styles[c] != 'undefined') {
                        styles[c] = options.styles[c];
                    }
                });
            }

            this.element.style(styles);

            if (typeof options.sourceOffset != 'undefined')
                this.sourceOffset = [edgeFx.opts.svg.path.stroke.width, edgeFx.opts.svg.path.stroke.width];

            this.element.property("sourceOffset", this.sourceOffset);

        };

        edgeFx.draft.factory.path = function(svg, selection) {
            var _element, _id, pathstr, child, path, style, _i, _len, _ref, _results, _opacity, _class, _color, _width, l, _sourceOffset, _data, _datum, _pattern;
            svg.element = edgeFx.helpers.isQuery(svg.element) ? svg.element : d3.select(svg.element);

            selection = edgeFx.helpers.isQuery(selection) ? selection : d3.select(selection);

            _data = selection.data();

            _element = selection.node();

            _class = selection.getData('edgefxStrokeClass') || edgeFx.opts.svg.path.stroke.class;
            _color = selection.getData('edgefxStrokeColor') || edgeFx.opts.svg.path.stroke.color;
            _width = selection.getData('edgefxStrokeWidth') || edgeFx.opts.svg.path.stroke.width;
            _opacity = selection.getData('edgefxStrokeOpacity') || edgeFx.opts.svg.path.stroke.opacity;
            _opacity = (edgeFx.helpers.isNumeric(_opacity)) ? _opacity : (edgeFx.helpers.randomIntFromInterval(10, 90) / 100);
            _pattern = selection.getData('edgefxStrokePattern') || edgeFx.opts.svg.path.stroke.pattern;
            _sourceOffset = svg.element.property('sourceOffset');

            try {
                switch (_element.nodeName) {
                    case 'IMG' : {
                        pathstr = edgeFx.draft.methods.iPath(_element, _sourceOffset);
                        break;
                    }
                    default : {
                        pathstr = edgeFx.draft.methods.sPath(_element, _sourceOffset);
                        break;
                    }
                }
            } catch(e) {
                return false;
            }

            path = svg.element.append("path").attr("d", pathstr);
            len = path.node().getTotalLength();
            path.classed("path main " + _class, true);
            path.attr("id", "edgePath_" + edgeFx.helpers.randomIntFromInterval(1000000, 9999999));
            path.attr("stroke", _color);
            path.attr("stroke-width", _width);
            path.attr("fill", "none");
            path.attr("stroke-dasharray", edgeFx.draft.methods.pattern2array(_pattern, len));
            path.attr("stroke-dashoffset", String(len) + "px");
            path.style({
                "opacity" : _opacity,
                "stroke" : _color,
                "stroke-width" : _width,
                "fill" : "none",
            });

            var options = typeof edgeFx.opts.svg.path.animation == 'object' ? edgeFx.opts.svg.path.animation.flatten('-', 'edgefx-anim') : false;
            if (options && typeof options == 'object' && ! options.isEmpty()) {
                path.appendData(options)
            }

            if (_data.length > 0) {
                _datum = _data[0];
                for (prop in _datum) {
                    if (prop.match(/^edgefx/i) && prop != 'edgefxFiltered') {
                        path.attr("data-" + prop, _datum[prop]);
                    }
                }
            }

            // Do Presentation Actions
            switch (edgeFx.opts.presentation.mode) {
                case 'fadein' :
                case 'showcase' :
                case 'solo' :
                default :
                    selection.style({
                        'visibility'    : 'hidden',
                        'opacity'       : '0',
                    });
                    path.style({
                        'visibility'    : 'hidden',
                    });
                    break;
                case 'inline' :
                case 'hidden' :
                    path.style({
                        'visibility'    : 'hidden',
                    });
                    break;
            }

            selection.classed({
                'hassvg' : true,
            });

            this.element = path;
        };

        edgeFx.draft.factory.prototype._svg = function() {
            var element, defaults, options, _box, _offset, _svgRoot, _width, _height, _top, _left, _class;
            element = this.selection.node();
            options = {
                styles : {},
            };
            defaults = {
                'id'     : 'edgeSVG_' + edgeFx.helpers.randomIntFromInterval(1000000, 9999999),
                'width'     : 0,
                'height'    : 0,
                'class'     : '',
                'sourceOffset' : [0,0],
                'styles'    : {
                    'top'       : 0,
                    'left'      : 0,
                    'width'     : 0,
                    'height'    : 0,
                    'position'  : 'absolute',
                }
            };

            try { _svgRoot = d3.select(edgeFx.opts.svg.root); } catch(e) { _svgRoot = d3.select("body"); };
            _class = edgeFx.opts.svg.class;
            _box = element.getBoundingClientRect();
            _offset = edgeFx.helpers.getOffset(element);
            _height = (parseInt(_box.height) + (2 * edgeFx.opts.svg.path.stroke.width));
            _width = (parseInt(_box.width) + (2 * edgeFx.opts.svg.path.stroke.width));
            _top = (_offset.top -  edgeFx.opts.svg.path.stroke.width);
            _left = (_offset.left - edgeFx.opts.svg.path.stroke.width);

            options.class           = _class;
            options.width           = _width;
            options.height          = _height;
            options.sourceOffset    = [edgeFx.opts.svg.path.stroke.width, edgeFx.opts.svg.path.stroke.width];
            options.styles.top      = _top + 'px';
            options.styles.left     = _left + 'px';
            options.styles.width    = _width + 'px';
            options.styles.height   = _height + 'px';

            options = edgeFx.helpers.extend({}, defaults, options);

            return new edgeFx.draft.factory.svg(_svgRoot, options);
        };

        edgeFx.draft.factory.prototype._path = function() {
            return new edgeFx.draft.factory.path(this._svg, this.selection);            
        };

        edgeFx.draft.factory.prototype.get = function(resource) {
            switch (resource) {
                case "svg" : {
                    return this._svg.element;
                    break;
                }
                case "path" : {
                    return this._path.element;
                    break;
                }
            }

            return false;
        };

        edgeFx.draft.factory.prototype.getAttr = function(resource, attr) {
            var el = this.get(resource);
            if (el)
                return el.attr(attr);
            return false;
        };

        edgeFx.draft.methods.sPath = function(el, sourceOffset) {
            var box, path, _x,_y,_top_width,_bottom_width,_width,_left_height,_right_height,_height,_radii;
            box = el.getBoundingClientRect();
            _x = sourceOffset[0], // box.left - sourceOffset[0],
            _y = sourceOffset[1], // box.top - sourceOffset[1],
            _radii = edgeFx.helpers.getBorderRadius(el),
            _width = box.width,
            _top_width = box.width,
            _bottom_width = box.width,
            _height = box.height,
            _left_height = box.height,
            _right_height = box.height;

            for(bpos in _radii) {
                if (_radii[bpos]) { 
                    switch (bpos) {
                        case 'topleft' : {
                            _left_height -= _radii[bpos];
                            _top_width -= _radii[bpos];
                            break;
                        }
                        case 'bottomleft' : {
                            _left_height -= _radii[bpos];
                            _bottom_width -= _radii[bpos];
                            break;
                        }
                        case 'bottomright' : {
                            _right_height -= _radii[bpos];
                            _bottom_width -= _radii[bpos];
                            break;
                        }
                        case 'topright' : {
                            _right_height -= _radii[bpos];
                            _top_width -= _radii[bpos];
                            break;
                        }
                    }                 
                }
            }

            path = "M" + (_x + _radii['topleft']) + " " + _y;
            // Curve?
            if (_radii['topleft']) {
                path += " A" + Number(_radii['topleft'] * 1) + " " + Number(_radii['topleft'] * 1) + " 0 0 0 " + _x + " " + (_y + Number(_radii['topleft'] * 1));
            }
            // Down
            path += " L" + _x + " " + (_y + Number(_radii['topleft'] * 1) + _left_height);
            // Curve?
            if (_radii['bottomleft']) {
                path += " A" + Number(_radii['bottomleft'] * 1) + " " + Number(_radii['bottomleft'] * 1) + " 0 0 0 " + (_x + Number(_radii['bottomleft'] * 1)) + " " + (_y + _height);
            }
            // Across Right
            path += " L" + (_x + Number(_radii['bottomleft'] * 1) + _bottom_width) + " " + (_y + _height);
            // Curve?
            if (_radii['bottomright']) {
                path += " A" + Number(_radii['bottomright'] * 1) + " " + Number(_radii['bottomright'] * 1) + " 0 0 0 " + (_x + _width) + " " + (_y + _right_height + Number(_radii['bottomright'] * 1));
            }
            // Up
            path += " L" + (_x + _width) + " " + (_y + Number(_radii['topright'] * 1));
            // Curve?
            if (_radii['topright']) {
                path += " A" + Number(_radii['topright'] * 1) + " " + Number(_radii['topright'] * 1) + " 0 0 0 " + (_x + _width - Number(_radii['topright'] * 1)) + " " + _y;
            }
            // Across Left
            path += " L" + (_x + Number(_radii['topleft'] * 1)) + " " + _y;
            // Close
            path += " Z";
            return path;
        };

        edgeFx.draft.methods.iPath = function(el, sourceOffset) {
            var box, canvas, points, cw, ch, ctx, imgData, data, defineNonTransparent, path, _x, _y, parentOffset;
            geom = d3.geom || window.d3.geom;
            if (typeof geom == 'undefined') {
                throw "Could not find variable 'geom'.  Is the D3 countour plugin library installed?";
                return false;
            };

            parentOffset = edgeFx.helpers.nodeParents(el).shift().getBoundingClientRect();
            box = el.getBoundingClientRect();
            _x = sourceOffset[0]; // box.left - sourceOffset[0],
            _y = sourceOffset[1]; // box.top - sourceOffset[1],

            canvas = document.createElement("canvas");

            cw = canvas.width;
            ch = canvas.height;
            ctx = canvas.getContext('2d');

            ctx.drawImage(el, 0, 0, el.width, el.height);

            imgData = ctx.getImageData(0, 0, cw, ch);
            data = imgData.data;
            defineNonTransparent = function (x, y) {
                var a = data[(y * cw + x) * 4 + 3];
                return (a > 20);
            };

            points = geom.contour(defineNonTransparent);

            path = "M" + (points[0][0] + _x) + " " + (points[0][1] + _y);
            for (var i = 1; i < points.length; i ++) {
                path += " L" + (points[i][0] + _x) + " " + (points[i][1] + _y);
            }
            path += " Z";

            return path;
        }

        edgeFx.draft.methods.pattern2array = function(pattern, len) {
            pattern = pattern || edgeFx.opts.svg.path.stroke.pattern || 'solid';
            var dasharray = [];
            switch (pattern) {
                case 'solid' : {
                    dasharray.push(String(len) + 'px', String(len) + 'px');
                    break;
                }
                case 'dashed' : {
                    dasharray.push('25px', '25px');
                    break;
                }
                case 'dotted' : {
                    dasharray.push('2px', '25px');
                    break;
                }
                default : {
                    if (pattern.match(/,/i)) {
                        dasharray = pattern.split(/[\s,]+/).splice(0,2).map(function (dash) {
                            return dash.replace(/^(\d+)$/i, '$1px');
                        });
                    } else if (pattern.match(/[\s]*(\d+(?:px)?)[\s]+(\d+(?:px)?)/)) {
                        dasharray = pattern.split(/[\s]+/).clean().splice(0,2).map(function (dash) {
                            return dash.replace(/^(\d+)$/i, '$1px');
                        });
                    } else if (pattern.match(/[\s]*(\d+(?:px)?)[\s]*/)) {
                        dasharray = [pattern, pattern].map(function (dash) {
                            return dash.replace(/^(\d+)$/i, '$1px');
                        });
                    } else {
                        dasharray.push(String(len) + 'px', String(len) + 'px');
                    }
                    break;
                }
            }
            return dasharray.join(', ');
        };

        edgeFx.draft.methods.scale = function(selection, options, recurse) {
            var styles;
            selection = edgeFx.helpers.isQuery(selection) ? selection : d3.selectAll(selection);
            options = options || false;
            recurse = recurse || false;

            if (! options) return;

            if (typeof options.styles != 'undefined') {
                ['top', 'left', 'height', 'width'].forEach(function(c, i){
                    if (typeof options.styles[c] != 'undefined') {
                        styles[c] = (parseFloat(selection.style(c)) + parseFloat(options.styles[c])) + "px";
                    }
                });

                if (typeof options.recenter != 'undefined') {
                    if (options.recenter) {
                        ['height', 'width'].forEach(function(c, i){
                            if (typeof options.styles[c] != 'undefined') {
                                switch (c) {
                                    case 'height' :
                                        styles['top'] = (parseFloat(selection.style('top')) - (parseFloat(options.styles['height']) / 2)) + "px";
                                        break;
                                    case 'width' :
                                        styles['left'] = (parseFloat(selection.style('left')) - (parseFloat(options.styles['width']) / 2)) + "px";
                                        break;
                                }
                            }
                        });
                    }
                }

                selection.style(styles);

                if (recurse && options.recenter) {
                    selection.select(recurse).each(function(){
                        var _styles = {};
                        ['height', 'width'].forEach(function(c, i){
                            if (typeof options.styles[c] != 'undefined') {
                                switch (c) {
                                    case 'height' :
                                        _styles['top'] = (parseFloat(d3.select(this).style('top')) - (parseFloat(options.styles['height']) / 2)) + "px";
                                        break;
                                    case 'width' :
                                        _styles['left'] = (parseFloat(d3.select(this).style('left')) - (parseFloat(options.styles['width']) / 2)) + "px";
                                        break;
                                }
                            }
                        });
                        d3.select(this).style(_styles);
                    });
                }

            }




        };

        /*Define Effects Methods*/
        edgeFx.effects.factory = function(){
        };

        edgeFx.effects.init = function(){
            if (edgeFx.opts.effects) {
                // var effects = typeof edgeFx.opts.effects == 'string' ? edgeFx.opts.effects.split(/[\s,]+/) : edgeFx.opts.effects;
                if (typeof edgeFx.opts.effects == 'string') {
                    var effects = new Object();
                    effects[edgeFx.opts.effects] = true;
                } else {
                    var effects = edgeFx.opts.effects;
                }
                if (Object.prototype.toString.call(effects) == '[object Object]') {
                    for (effect in effects) {
                        var options = effects[effect];
                        if (typeof edgeFx.plugins[effect] != 'undefined') {
                            var plugin = new edgeFx.plugins[effect](options);
                            if (Object.prototype.toString.call(plugin.events) == '[object Object]') {
                                for (event in plugin.events) {
                                    if (plugin.events.hasOwnProperty(event)) {
                                        if (typeof plugin.events[event] == 'function') {
                                            edgeFx.ev.addEvent(event, plugin.events[event], 10);
                                        }
                                    }
                                }
                            }
                        }
                    };
                }
            }
        };

        /* Adapted from Q&A: http://stackoverflow.com/a/18536991 */
        edgeFx.effects.methods.gclone = function (selection, num, cloneAttrs) {
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

        edgeFx.effects.factory.prototype.echo = function(svg, settings) {
            svg = edgeFx.helpers.isQuery(svg, "path") ? svg : d3.select(svg);
            var path = edgeFx.helpers.isQuery(svg.select("path.path.main"), "path") ? svg.select("path.path.main") : false;
            if (path) {
                var echo = typeof settings.paths != 'undefined' ? settings.paths : 5;
                echo = edgeFx.helpers.isNumeric(echo) ? echo : 5;
                var opacity = edgeFx.helpers.getStyle(path.node(), "opacity");
                var rangeMin = (opacity * 0.25);
                var step = ((opacity * 0.75) / echo);
                var group = edgeFx.effects.methods.gclone(path, echo);
                if (group && edgeFx.helpers.isQuery(group) && ! group.empty()) {
                    group.attr("data-edgefxEffect", "echo");
                    var paths = group.selectAll("path");
                    var o = opacity - step;
                    paths.each(function(){
                        d3.select(this)
                        .attr("opacity", o)
                        .style("opacity", o);
                        o = o - step;
                    });
                }
                if (typeof settings == 'object' && settings.hasOwnProperty) {
                    for (_setting in settings) {
                        switch (_setting) {
                            case 'animation' : {
                                var _animation = settings[_setting];
                                if (_animation && _animation.hasOwnProperty) {
                                    group
                                    .select("path")
                                    .each(function(d, i){
                                        var _prop = "anim";                
                                        for (_key in _animation) {
                                            d3.select(this).attr("data-edgefx-" + _prop + "-" + _key, _animation[_key]);
                                        }
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
                return group;
            }
            return false;
        };

        edgeFx.effects.factory.prototype.concentric = function(svg, settings) {
            svg = edgeFx.helpers.isQuery(svg, "path") ? svg : d3.select(svg);
            var path = edgeFx.helpers.isQuery(svg.select("path.path.main"), "path") ? svg.select("path.path.main") : false;
            if (path) {
                var num = typeof settings.paths != 'undefined' ? settings.paths : 5;
                num = edgeFx.herlpers.isNumeric(num) ? num : 5;
                var group = edgeFx.effects.methods.gclone(path, num);
                if (group && edgeFx.helpers.isQuery(group) && ! group.empty()) {
                    group.attr("data-edgefxEffect", "concentric");
                }
                if (typeof settings == 'object' && settings.hasOwnProperty) {
                    for (_setting in settings) {
                        switch (_setting) {
                            case 'edges' : {
                                var _edges = edgeFx.helpers.isArray(settings[_setting]) ? settings[_setting] : [settings[_setting]];
                                if (_edges.length >= num) {
                                    group
                                    .select("path")
                                    .each(function(d, i){
                                        var _edge = _edges[i];
                                        if (typeof _edge == 'object' && _edge.hasOwnProperty) {
                                            for (_prop in _edge) {
                                                switch (_prop) {
                                                    case 'stroke' : {
                                                        var _stroke = _edge[_prop];
                                                        for (_key in _stroke) {
                                                            d3.select(this).attr("data-edgefx-" + _prop + "-" + _key, _stroke[_key]);
                                                            switch (_key) {
                                                                case 'color' : {
                                                                    d3.select(this).style("stroke", _stroke[_key]);
                                                                    d3.select(this).attr("stroke", _stroke[_key]);
                                                                    break;
                                                                }
                                                                case 'width' : {
                                                                    d3.select(this).style("stroke-width", _stroke[_key]);
                                                                    d3.select(this).attr("stroke-width", _stroke[_key]);
                                                                    break;
                                                                }
                                                                case 'opacity' : {
                                                                    d3.select(this).style("opacity", _stroke[_key]);
                                                                    d3.select(this).attr("opacity", _stroke[_key]);
                                                                    break;
                                                                }
                                                                case 'class' : {
                                                                    d3.select(this).classed(_stroke[_key], true);
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    });
                                } else {

                                }
                                break;
                            }
                            case 'animation' : {
                                var _animation = settings[_setting];
                                if (_animation && _animation.hasOwnProperty) {
                                    group
                                    .select("path")
                                    .each(function(d, i){
                                        var _prop = "anim";                
                                        for (_key in _animation) {
                                            d3.select(this).attr("data-edgefx-" + _prop + "-" + _key, _animation[_key]);
                                        }
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
                return group;
            }
            return false;
        }

        /*Define Animation Methods*/
        edgeFx.animation.factory = function(draft) {
            this.draft = draft;
            edgeFx.ev.doEvent("queue", this, this.draft, edgeFx.animation.queue);           
        };

        edgeFx.animation.methods.queue = function(callback) {
            this.queue = queue(1);
            this.tasks = [];
            this.callback = callback || function(){};
        };

        edgeFx.animation.methods.queue.prototype.add = function(fn, async, delay) {
            fn = fn || function(callback){
                callback = callback || false;
                if (callback) callback();
            };
            async = async || true;
            delay = delay || 0;
            var dfn = function(q, callback){
                setTimeout(function(){fn(callback);}, delay);
            };
            var len = this.tasks.length;
            if (len === 0) {
                this.tasks.push([dfn]);
            } else {
                switch (async) {
                    case "true" :
                    case true :
                    case 1 : 
                    default : {
                        this.tasks[(len - 1)].push(dfn);
                        break;
                    }
                    case "false" :
                    case 0 : {
                        this.tasks.push([dfn]);
                        break;
                    }
                }
            }
        };

        edgeFx.animation.methods.queue.prototype.start = function(delay) {
            delay = delay || 0;
            var tasks = this.tasks;
            var _queue = this.queue;
            var callback = this.callback;
            setTimeout(function(){
                tasks.forEach(function(sync, j) {
                    if (edgeFx.helpers.isArray(sync)) {
                        var t = function(idx, callback){
                            callback = callback || false;
                            var q = queue();
                            // console.log("Running sync task " + idx);
                            sync.forEach(function(async, i){
                                // console.log("Running async task " + i);
                                q.defer(async, i);
                            });
                            q.await(function(error){console.log("Completed sync task " + j); if (callback) callback();});
                        };
                        _queue.defer(t, j);
                    } else {
                        _queue.defer(sync, j);
                    }
                });
                _queue.awaitAll(function(error, results){ callback(); });
                }, delay);
        };

        edgeFx.animation.methods.complete = function(){
            for (var index in edgeFx.draft.state) {
                if (edgeFx.draft.state.hasOwnProperty(index)) {
                    var draft = edgeFx.draft.state[index];
                    draft._svg.element.style({
                        'pointer-events' : 'none',
                    });
                    switch (edgeFx.opts.presentation.mode) {
                        case 'showcase' :
                        default:
                            d3.select(edgeFx.opts.svg.root).style({
                                'visibility'    : 'visible',
                                'opacity'    : '1.0',
                            });
                            draft.selection.style({
                                'opacity'    : '1.0', 
                                'visibility': 'visible',
                            });
                            break;
                        case 'fadein' :
                        case 'inline' :
                            draft.selection.style({
                                'opacity'    : '1.0', 
                                'visibility': 'visible',
                            });
                            break;
                        case 'solo' :
                            draft._path.element.style({
                                'visibility': 'visible',
                            });
                            break;
                        case 'hidden' :
                            break;
                    }
                }
            }

            console.log('edgeFx rendering in -> ', new Date() - timestamp, 'ms')
        };

        /*Define Event Factory*/
        edgeFx.events.factory = function() {
            this.events = {};
        }

        edgeFx.events.factory.prototype.addEvent = function(event, fn, priority) {
            event = event || false;
            fn = fn || false;
            priority = priority || 10;

            if (event && fn) {
                if (typeof this.events[event] == 'undefined') {
                    this.events[event] = {};
                }
                if (typeof this.events[event][priority] == 'undefined') {
                    this.events[event][priority] = new Array();
                }
                this.events[event][priority].push(fn);
                return true;
            }
            return false;            
        };

        edgeFx.events.factory.prototype.removeEvent = function(event, fn, priority) {
            var index = -1;
            event = event || false;
            fn = fn || false;
            priority = priority || false;

            if (event && fn && (priority !== false)) {
                if (typeof this.events[event] != 'undefined') {
                    if (typeof this.events[event][priority] == 'object' && edgeFx.helpers.isArray(this.events[event][priority])) {
                        this.events[event][priority].forEach(function(f, i){
                            if (f === fn){
                                index = i;
                            }
                        });
                        if (index >= 0) {
                            this.events[event][priority].splice(index, 1);
                            return true;
                        }
                    }
                }
            }
            return false;            
        };

        edgeFx.events.factory.prototype.doEvent = function(event, context) {
            event = event || false;
            context = context || window;
            var args = [].slice.call(arguments).splice(2);
            if (event) {
                if (typeof this.events[event] != 'undefined') {
                    if (this.events[event].isEmpty() === false) {
                        for (priority in this.events[event]) {
                            var callbacks = this.events[event][priority];
                            if (edgeFx.helpers.isArray(callbacks)) {
                                callbacks.forEach(function(callback){
                                    try {
                                        edgeFx.helpers.callfunc(callback, context, args);
                                    } catch (e) {
                                        console.log("Error Report Starts ---------------");
                                        console.dir(args);
                                        console.dir(callback);
                                        console.log(e.stack);
                                        console.log("Error Report Ends ---------------");
                                    }
                                });
                            }
                        }
                    }
                }

            }
        };

        edgeFx.events.factory.prototype.getHandlers = function(event) {
            event = event || false;
            if (event) {
                if (typeof this.events[event] != 'undefined') {
                    return this.events[event];
                }
            }
            return false;
        };

        /*Define Event Methods*/
        /*From http://stackoverflow.com/a/7088499/4364696*/
        edgeFx.events.methods.ready = function(_selection, _options) {
            var readyStateCheckInterval = setInterval(function() {
                if (document.readyState === "complete") {
                    console.log('DOM loaded in -> ', new Date() - timestamp, 'ms')
                    clearInterval(readyStateCheckInterval);
                    var selection = edgeFx.helpers.isQuery(_selection) ? _selection : d3.selectAll(_selection);
                    // Do Presentation Actions
                    switch (edgeFx.opts.presentation.mode) {
                        case 'solo' :
                        case 'fadein' :
                        case 'showcase' :
                        default :
                            d3.select(edgeFx.opts.svg.root).style({
                                'visibility'    : 'hidden',
                                'opacity'       : '0',
                            });
                            selection.style({
                                'visibility'    : 'hidden',
                                'opacity'       : '0',
                            });
                            break;
                        case 'inline' :
                        case 'hidden' :
                            break;
                    }
                    edgeFx.ev.doEvent("ready", this, selection, _options);
                }
                }, 10);
        };

        // DOM Loaded
        edgeFx.events.methods.init = function(selection, options) {
            this.selection = edgeFx.filters.filter(selection, options.filter);
            this.options = options;
            edgeFx.ev.doEvent("init", this, this.selection, this.options);
            if (this.selection.empty()) {
                console.log("No nodes could be selected for edgeFx. Exiting..."); 
                return;
            }
        };

        // Window Loaded
        edgeFx.events.methods.onload = function(selection, options) {
            this.selection = d3.selectAll("[data-edgefx-filtered='1']");
            this.options = edgeFx.opts.svg;

            if (this.selection.empty())
                return false;

            // Bind data attributes to elements
            this.selection.datum(function() { return this.dataset; });

            var defaults = this.options.flatten('-', 'edgefx-svg');

            this.selection.each(function(){
                var data = d3.select(this).data();
                if (data.length > 0) {
                    var normalized = edgeFx.helpers.extend({}, defaults, data[0]);
                }
                d3.select(this).data(normalized);
            });

            edgeFx.ev.doEvent("onload", this, this.selection, this.options);
        };

        // Vector Creation
        edgeFx.events.methods.create = function(selection, options) {
            this.selection = d3.selectAll("[data-edgefx-filtered='1']");
            this.options = edgeFx.opts.svg;
            if (this.selection.empty()) {
                return false;
            }
            this.selection.classed('edgesrc', true);
            this.selection.each(function(d, i){
                var draft = new edgeFx.draft.factory(d3.select(this));
                edgeFx.draft.state[i] = draft;
                d3.select(this).appendData({
                    "edgefx-draft"      : i,
                });
            });
            edgeFx.ev.doEvent("create", this, this.selection, this.options);
        };

        // Vector Animation
        edgeFx.events.methods.queue = function(selection, options) {
            this.selection = d3.selectAll("[data-edgefx-filtered='1'][data-edgefx-draft]");
            this.options = edgeFx.opts.svg;

            if (this.selection.empty()) {
                return false;
            }

            // Do Presentation Actions
            switch (edgeFx.opts.presentation.mode) {
                case 'fadein' :
                    d3.select(edgeFx.opts.svg.root).style({
                        'visibility'    : 'visible',
                    })
                    .transition()
                    .duration(edgeFx.opts.presentation.duration)
                    .style('opacity', '1.0');
                    break;
                case 'showcase' :
                case 'solo' :
                default :
                    d3.select(edgeFx.opts.svg.root).style({
                        'visibility'    : 'visible',
                        'opacity'       : '1.0',
                    });
                    break;
                case 'inline' :
                case 'hidden' :
                    break;
            }

            this.selection.each(function(d, i){
                var data = d3.select(this).data();
                var index = data[0]['edgefxDraft'];
                var draft = edgeFx.draft.state[index];
                edgeFx.animation.state[i] = new edgeFx.animation.factory(draft);
            });
            edgeFx.ev.doEvent("animate", this, this.selection, this.options);
        };

        edgeFx.events.methods.animate = function(selection, options) {
            edgeFx.animation.queue.start(edgeFx.opts.presentation.delay);
        };

        edgeFx.events.methods.complete = function() {
            edgeFx.ev.doEvent("complete", this);
        };

        d3.edgeFx = function(_selection, _options){
            var options;
            _options = _options || {};
            if (typeof _options['effects'] == 'undefined') _options['effects'] = {'default': true};
            edgeFx.animation.queue = new edgeFx.animation.methods.queue(edgeFx.events.methods.complete);
            edgeFx.ev = new edgeFx.events.factory();
            edgeFx.opts = options = edgeFx.helpers.extend({}, edgeFx.defaults, _options);

            edgeFx.ev.addEvent("ready", edgeFx.effects.init, 0);
            edgeFx.ev.addEvent("ready", edgeFx.events.methods.init, 10);
            edgeFx.ev.addEvent("init", edgeFx.events.methods.onload, 10);
            edgeFx.ev.addEvent("onload", edgeFx.events.methods.create, 10);
            edgeFx.ev.addEvent("create", edgeFx.events.methods.queue, 10);
            edgeFx.ev.addEvent("animate", edgeFx.events.methods.animate, 10);
            edgeFx.ev.addEvent("complete", edgeFx.animation.methods.complete, 10);

            edgeFx.events.methods.ready(_selection, options);
        };

        // Added CommonJS / RequireJS definitions
        if (typeof define === "function" && define.amd) define(edgeFx); else if (typeof module === "object" && module.exports) module.exports = edgeFx;

        var _edgeFx = edgeFx;

        window.edgeFx = edgeFx;

        return edgeFx;       

}));
// End edgeFx