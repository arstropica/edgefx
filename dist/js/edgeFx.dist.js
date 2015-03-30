(function(){d3.geom = {};
    /**
    * Computes a contour for a given input grid function using the <a
    * href="http://en.wikipedia.org/wiki/Marching_squares">marching
    * squares</a> algorithm. Returns the contour polygon as an array of points.
    *
    * @param grid a two-input function(x, y) that returns true for values
    * inside the contour and false for values outside the contour.
    * @param start an optional starting point [x, y] on the grid.
    * @returns polygon [[x1, y1], [x2, y2], …]
    */
    d3.geom.contour = function(grid, start) {
        var s = start || d3_geom_contourStart(grid), // starting point
        c = [],    // contour polygon
        x = s[0],  // current x position
        y = s[1],  // current y position
        dx = 0,    // next x direction
        dy = 0,    // next y direction
        pdx = NaN, // previous x direction
        pdy = NaN, // previous y direction
        i = 0;

        do {
            // determine marching squares index
            i = 0;
            if (grid(x-1, y-1)) i += 1;
            if (grid(x,   y-1)) i += 2;
            if (grid(x-1, y  )) i += 4;
            if (grid(x,   y  )) i += 8;

            // determine next direction
            if (i === 6) {
                dx = pdy === -1 ? -1 : 1;
                dy = 0;
            } else if (i === 9) {
                dx = 0;
                dy = pdx === 1 ? -1 : 1;
            } else {
                dx = d3_geom_contourDx[i];
                dy = d3_geom_contourDy[i];
            }

            // update contour polygon
            if (dx != pdx && dy != pdy) {
                c.push([x, y]);
                pdx = dx;
                pdy = dy;
            }

            x += dx;
            y += dy;
        } while (s[0] != x || s[1] != y);

        return c;
    };

    // lookup tables for marching directions
    var d3_geom_contourDx = [1, 0, 1, 1,-1, 0,-1, 1,0, 0,0,0,-1, 0,-1,NaN],
    d3_geom_contourDy = [0,-1, 0, 0, 0,-1, 0, 0,1,-1,1,1, 0,-1, 0,NaN];

    function d3_geom_contourStart(grid) {
        var x = 0,
        y = 0;

        // search for a starting point; begin at origin
        // and proceed along outward-expanding diagonals
        while (true) {
            if (grid(x,y)) {
                return [x,y];
            }
            if (x === 0) {
                x = y + 1;
                y = 0;
            } else {
                x = x - 1;
                y = y + 1;
            }
        }
    }
    /**
    * Computes the 2D convex hull of a set of points using Graham's scanning
    * algorithm. The algorithm has been implemented as described in Cormen,
    * Leiserson, and Rivest's Introduction to Algorithms. The running time of
    * this algorithm is O(n log n), where n is the number of input points.
    *
    * @param vertices [[x1, y1], [x2, y2], …]
    * @returns polygon [[x1, y1], [x2, y2], …]
    */
    d3.geom.hull = function(vertices) {
        if (vertices.length < 3) return [];

        var len = vertices.length,
        plen = len - 1,
        points = [],
        stack = [],
        i, j, h = 0, x1, y1, x2, y2, u, v, a, sp;

        // find the starting ref point: leftmost point with the minimum y coord
        for (i=1; i<len; ++i) {
            if (vertices[i][1] < vertices[h][1]) {
                h = i;
            } else if (vertices[i][1] == vertices[h][1]) {
                h = (vertices[i][0] < vertices[h][0] ? i : h);
            }
        }

        // calculate polar angles from ref point and sort
        for (i=0; i<len; ++i) {
            if (i === h) continue;
            y1 = vertices[i][1] - vertices[h][1];
            x1 = vertices[i][0] - vertices[h][0];
            points.push({angle: Math.atan2(y1, x1), index: i});
        }
        points.sort(function(a, b) { return a.angle - b.angle; });

        // toss out duplicate angles
        a = points[0].angle;
        v = points[0].index;
        u = 0;
        for (i=1; i<plen; ++i) {
            j = points[i].index;
            if (a == points[i].angle) {
                // keep angle for point most distant from the reference
                x1 = vertices[v][0] - vertices[h][0];
                y1 = vertices[v][1] - vertices[h][1];
                x2 = vertices[j][0] - vertices[h][0];
                y2 = vertices[j][1] - vertices[h][1];
                if ((x1*x1 + y1*y1) >= (x2*x2 + y2*y2)) {
                    points[i].index = -1;
                } else {
                    points[u].index = -1;
                    a = points[i].angle;
                    u = i;
                    v = j;
                }
            } else {
                a = points[i].angle;
                u = i;
                v = j;
            }
        }

        // initialize the stack
        stack.push(h);
        for (i=0, j=0; i<2; ++j) {
            if (points[j].index !== -1) {
                stack.push(points[j].index);
                i++;
            }
        }
        sp = stack.length;

        // do graham's scan
        for (; j<plen; ++j) {
            if (points[j].index === -1) continue; // skip tossed out points
            while (!d3_geom_hullCCW(stack[sp-2], stack[sp-1], points[j].index, vertices)) {
                --sp;
            }
            stack[sp++] = points[j].index;
        }

        // construct the hull
        var poly = [];
        for (i=0; i<sp; ++i) {
            poly.push(vertices[stack[i]]);
        }
        return poly;
    }

    // are three points in counter-clockwise order?
    function d3_geom_hullCCW(i1, i2, i3, v) {
        var t, a, b, c, d, e, f;
        t = v[i1]; a = t[0]; b = t[1];
        t = v[i2]; c = t[0]; d = t[1];
        t = v[i3]; e = t[0]; f = t[1];
        return ((f-b)*(c-a) - (d-b)*(e-a)) > 0;
    }
    // Note: requires coordinates to be counterclockwise and convex!
    d3.geom.polygon = function(coordinates) {

        coordinates.area = function() {
            var i = 0,
            n = coordinates.length,
            a = coordinates[n - 1][0] * coordinates[0][1],
            b = coordinates[n - 1][1] * coordinates[0][0];
            while (++i < n) {
                a += coordinates[i - 1][0] * coordinates[i][1];
                b += coordinates[i - 1][1] * coordinates[i][0];
            }
            return (b - a) * .5;
        };

        coordinates.centroid = function(k) {
            var i = -1,
            n = coordinates.length - 1,
            x = 0,
            y = 0,
            a,
            b,
            c;
            if (!arguments.length) k = -1 / (6 * coordinates.area());
            while (++i < n) {
                a = coordinates[i];
                b = coordinates[i + 1];
                c = a[0] * b[1] - b[0] * a[1];
                x += (a[0] + b[0]) * c;
                y += (a[1] + b[1]) * c;
            }
            return [x * k, y * k];
        };

        // The Sutherland-Hodgman clipping algorithm.
        coordinates.clip = function(subject) {
            var input,
            i = -1,
            n = coordinates.length,
            j,
            m,
            a = coordinates[n - 1],
            b,
            c,
            d;
            while (++i < n) {
                input = subject.slice();
                subject.length = 0;
                b = coordinates[i];
                c = input[(m = input.length) - 1];
                j = -1;
                while (++j < m) {
                    d = input[j];
                    if (d3_geom_polygonInside(d, a, b)) {
                        if (!d3_geom_polygonInside(c, a, b)) {
                            subject.push(d3_geom_polygonIntersect(c, d, a, b));
                        }
                        subject.push(d);
                    } else if (d3_geom_polygonInside(c, a, b)) {
                        subject.push(d3_geom_polygonIntersect(c, d, a, b));
                    }
                    c = d;
                }
                a = b;
            }
            return subject;
        };

        return coordinates;
    };

    function d3_geom_polygonInside(p, a, b) {
        return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
    }

    // Intersect two infinite lines cd and ab.
    function d3_geom_polygonIntersect(c, d, a, b) {
        var x1 = c[0], x2 = d[0], x3 = a[0], x4 = b[0],
        y1 = c[1], y2 = d[1], y3 = a[1], y4 = b[1],
        x13 = x1 - x3,
        x21 = x2 - x1,
        x43 = x4 - x3,
        y13 = y1 - y3,
        y21 = y2 - y1,
        y43 = y4 - y3,
        ua = (x43 * y13 - y43 * x13) / (y43 * x21 - x43 * y21);
        return [x1 + ua * x21, y1 + ua * y21];
    }
    // Adapted from Nicolas Garcia Belmonte's JIT implementation:
    // http://blog.thejit.org/2010/02/12/voronoi-tessellation/
    // http://blog.thejit.org/assets/voronoijs/voronoi.js
    // See lib/jit/LICENSE for details.

    // Notes:
    //
    // This implementation does not clip the returned polygons, so if you want to
    // clip them to a particular shape you will need to do that either in SVG or by
    // post-processing with d3.geom.polygon's clip method.
    //
    // If any vertices are coincident or have NaN positions, the behavior of this
    // method is undefined. Most likely invalid polygons will be returned. You
    // should filter invalid points, and consolidate coincident points, before
    // computing the tessellation.

    /**
    * @param vertices [[x1, y1], [x2, y2], …]
    * @returns polygons [[[x1, y1], [x2, y2], …], …]
    */
    d3.geom.voronoi = function(vertices) {
        var polygons = vertices.map(function() { return []; });

        d3_voronoi_tessellate(vertices, function(e) {
            var s1,
            s2,
            x1,
            x2,
            y1,
            y2;
            if (e.a === 1 && e.b >= 0) {
                s1 = e.ep.r;
                s2 = e.ep.l;
            } else {
                s1 = e.ep.l;
                s2 = e.ep.r;
            }
            if (e.a === 1) {
                y1 = s1 ? s1.y : -1e6;
                x1 = e.c - e.b * y1;
                y2 = s2 ? s2.y : 1e6;
                x2 = e.c - e.b * y2;
            } else {
                x1 = s1 ? s1.x : -1e6;
                y1 = e.c - e.a * x1;
                x2 = s2 ? s2.x : 1e6;
                y2 = e.c - e.a * x2;
            }
            var v1 = [x1, y1],
            v2 = [x2, y2];
            polygons[e.region.l.index].push(v1, v2);
            polygons[e.region.r.index].push(v1, v2);
        });

        // Reconnect the polygon segments into counterclockwise loops.
        return polygons.map(function(polygon, i) {
            var cx = vertices[i][0],
            cy = vertices[i][1];
            polygon.forEach(function(v) {
                v.angle = Math.atan2(v[0] - cx, v[1] - cy);
            });
            return polygon.sort(function(a, b) {
                return a.angle - b.angle;
            }).filter(function(d, i) {
                return !i || (d.angle - polygon[i - 1].angle > 1e-10);
            });
        });
    };

    var d3_voronoi_opposite = {"l": "r", "r": "l"};

    function d3_voronoi_tessellate(vertices, callback) {

        var Sites = {
            list: vertices
            .map(function(v, i) {
                return {
                    index: i,
                    x: v[0],
                    y: v[1]
                };
            })
            .sort(function(a, b) {
                return a.y < b.y ? -1
                : a.y > b.y ? 1
                : a.x < b.x ? -1
                : a.x > b.x ? 1
                : 0;
            }),
            bottomSite: null
        };

        var EdgeList = {
            list: [],
            leftEnd: null,
            rightEnd: null,

            init: function() {
                EdgeList.leftEnd = EdgeList.createHalfEdge(null, "l");
                EdgeList.rightEnd = EdgeList.createHalfEdge(null, "l");
                EdgeList.leftEnd.r = EdgeList.rightEnd;
                EdgeList.rightEnd.l = EdgeList.leftEnd;
                EdgeList.list.unshift(EdgeList.leftEnd, EdgeList.rightEnd);
            },

            createHalfEdge: function(edge, side) {
                return {
                    edge: edge,
                    side: side,
                    vertex: null,
                    "l": null,
                    "r": null
                };
            },

            insert: function(lb, he) {
                he.l = lb;
                he.r = lb.r;
                lb.r.l = he;
                lb.r = he;
            },

            leftBound: function(p) {
                var he = EdgeList.leftEnd;
                do {
                    he = he.r;
                } while (he != EdgeList.rightEnd && Geom.rightOf(he, p));
                he = he.l;
                return he;
            },

            del: function(he) {
                he.l.r = he.r;
                he.r.l = he.l;
                he.edge = null;
            },

            right: function(he) {
                return he.r;
            },

            left: function(he) {
                return he.l;
            },

            leftRegion: function(he) {
                return he.edge == null
                ? Sites.bottomSite
                : he.edge.region[he.side];
            },

            rightRegion: function(he) {
                return he.edge == null
                ? Sites.bottomSite
                : he.edge.region[d3_voronoi_opposite[he.side]];
            }
        };

        var Geom = {

            bisect: function(s1, s2) {
                var newEdge = {
                    region: {"l": s1, "r": s2},
                    ep: {"l": null, "r": null}
                };

                var dx = s2.x - s1.x,
                dy = s2.y - s1.y,
                adx = dx > 0 ? dx : -dx,
                ady = dy > 0 ? dy : -dy;

                newEdge.c = s1.x * dx + s1.y * dy
                + (dx * dx + dy * dy) * .5;

                if (adx > ady) {
                    newEdge.a = 1;
                    newEdge.b = dy / dx;
                    newEdge.c /= dx;
                } else {
                    newEdge.b = 1;
                    newEdge.a = dx / dy;
                    newEdge.c /= dy;
                }

                return newEdge;
            },

            intersect: function(el1, el2) {
                var e1 = el1.edge,
                e2 = el2.edge;
                if (!e1 || !e2 || (e1.region.r == e2.region.r)) {
                    return null;
                }
                var d = (e1.a * e2.b) - (e1.b * e2.a);
                if (Math.abs(d) < 1e-10) {
                    return null;
                }
                var xint = (e1.c * e2.b - e2.c * e1.b) / d,
                yint = (e2.c * e1.a - e1.c * e2.a) / d,
                e1r = e1.region.r,
                e2r = e2.region.r,
                el,
                e;
                if ((e1r.y < e2r.y) ||
                    (e1r.y == e2r.y && e1r.x < e2r.x)) {
                    el = el1;
                    e = e1;
                } else {
                    el = el2;
                    e = e2;
                }
                var rightOfSite = (xint >= e.region.r.x);
                if ((rightOfSite && (el.side === "l")) ||
                    (!rightOfSite && (el.side === "r"))) {
                    return null;
                }
                return {
                    x: xint,
                    y: yint
                };
            },

            rightOf: function(he, p) {
                var e = he.edge,
                topsite = e.region.r,
                rightOfSite = (p.x > topsite.x);

                if (rightOfSite && (he.side === "l")) {
                    return 1;
                }
                if (!rightOfSite && (he.side === "r")) {
                    return 0;
                }
                if (e.a === 1) {
                    var dyp = p.y - topsite.y,
                    dxp = p.x - topsite.x,
                    fast = 0,
                    above = 0;

                    if ((!rightOfSite && (e.b < 0)) ||
                        (rightOfSite && (e.b >= 0))) {
                        above = fast = (dyp >= e.b * dxp);
                    } else {
                        above = ((p.x + p.y * e.b) > e.c);
                        if (e.b < 0) {
                            above = !above;
                        }
                        if (!above) {
                            fast = 1;
                        }
                    }
                    if (!fast) {
                        var dxs = topsite.x - e.region.l.x;
                        above = (e.b * (dxp * dxp - dyp * dyp)) <
                        (dxs * dyp * (1 + 2 * dxp / dxs + e.b * e.b));

                        if (e.b < 0) {
                            above = !above;
                        }
                    }
                } else /* e.b == 1 */ {
                    var yl = e.c - e.a * p.x,
                    t1 = p.y - yl,
                    t2 = p.x - topsite.x,
                    t3 = yl - topsite.y;

                    above = (t1 * t1) > (t2 * t2 + t3 * t3);
                }
                return he.side === "l" ? above : !above;
            },

            endPoint: function(edge, side, site) {
                edge.ep[side] = site;
                if (!edge.ep[d3_voronoi_opposite[side]]) return;
                callback(edge);
            },

            distance: function(s, t) {
                var dx = s.x - t.x,
                dy = s.y - t.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        };

        var EventQueue = {
            list: [],

            insert: function(he, site, offset) {
                he.vertex = site;
                he.ystar = site.y + offset;
                for (var i=0, list=EventQueue.list, l=list.length; i<l; i++) {
                    var next = list[i];
                    if (he.ystar > next.ystar ||
                        (he.ystar == next.ystar &&
                            site.x > next.vertex.x)) {
                        continue;
                    } else {
                        break;
                    }
                }
                list.splice(i, 0, he);
            },

            del: function(he) {
                for (var i=0, ls=EventQueue.list, l=ls.length; i<l && (ls[i] != he); ++i) {}
                ls.splice(i, 1);
            },

            empty: function() { return EventQueue.list.length === 0; },

            nextEvent: function(he) {
                for (var i=0, ls=EventQueue.list, l=ls.length; i<l; ++i) {
                    if (ls[i] == he) return ls[i+1];
                }
                return null;
            },

            min: function() {
                var elem = EventQueue.list[0];
                return {
                    x: elem.vertex.x,
                    y: elem.ystar
                };
            },

            extractMin: function() {
                return EventQueue.list.shift();
            }
        };

        EdgeList.init();
        Sites.bottomSite = Sites.list.shift();

        var newSite = Sites.list.shift(), newIntStar;
        var lbnd, rbnd, llbnd, rrbnd, bisector;
        var bot, top, temp, p, v;
        var e, pm;

        while (true) {
            if (!EventQueue.empty()) {
                newIntStar = EventQueue.min();
            }
            if (newSite && (EventQueue.empty()
                || newSite.y < newIntStar.y
                || (newSite.y == newIntStar.y
                    && newSite.x < newIntStar.x))) { //new site is smallest
                lbnd = EdgeList.leftBound(newSite);
                rbnd = EdgeList.right(lbnd);
                bot = EdgeList.rightRegion(lbnd);
                e = Geom.bisect(bot, newSite);
                bisector = EdgeList.createHalfEdge(e, "l");
                EdgeList.insert(lbnd, bisector);
                p = Geom.intersect(lbnd, bisector);
                if (p) {
                    EventQueue.del(lbnd);
                    EventQueue.insert(lbnd, p, Geom.distance(p, newSite));
                }
                lbnd = bisector;
                bisector = EdgeList.createHalfEdge(e, "r");
                EdgeList.insert(lbnd, bisector);
                p = Geom.intersect(bisector, rbnd);
                if (p) {
                    EventQueue.insert(bisector, p, Geom.distance(p, newSite));
                }
                newSite = Sites.list.shift();
            } else if (!EventQueue.empty()) { //intersection is smallest
                lbnd = EventQueue.extractMin();
                llbnd = EdgeList.left(lbnd);
                rbnd = EdgeList.right(lbnd);
                rrbnd = EdgeList.right(rbnd);
                bot = EdgeList.leftRegion(lbnd);
                top = EdgeList.rightRegion(rbnd);
                v = lbnd.vertex;
                Geom.endPoint(lbnd.edge, lbnd.side, v);
                Geom.endPoint(rbnd.edge, rbnd.side, v);
                EdgeList.del(lbnd);
                EventQueue.del(rbnd);
                EdgeList.del(rbnd);
                pm = "l";
                if (bot.y > top.y) {
                    temp = bot;
                    bot = top;
                    top = temp;
                    pm = "r";
                }
                e = Geom.bisect(bot, top);
                bisector = EdgeList.createHalfEdge(e, pm);
                EdgeList.insert(llbnd, bisector);
                Geom.endPoint(e, d3_voronoi_opposite[pm], v);
                p = Geom.intersect(llbnd, bisector);
                if (p) {
                    EventQueue.del(llbnd);
                    EventQueue.insert(llbnd, p, Geom.distance(p, bot));
                }
                p = Geom.intersect(bisector, rrbnd);
                if (p) {
                    EventQueue.insert(bisector, p, Geom.distance(p, bot));
                }
            } else {
                break;
            }
        }//end while

        for (lbnd = EdgeList.right(EdgeList.leftEnd);
            lbnd != EdgeList.rightEnd;
            lbnd = EdgeList.right(lbnd)) {
            callback(lbnd.edge);
        }
    }
    /**
    * @param vertices [[x1, y1], [x2, y2], …]
    * @returns triangles [[[x1, y1], [x2, y2], [x3, y3]], …]
    */
    d3.geom.delaunay = function(vertices) {
        var edges = vertices.map(function() { return []; }),
        triangles = [];

        // Use the Voronoi tessellation to determine Delaunay edges.
        d3_voronoi_tessellate(vertices, function(e) {
            edges[e.region.l.index].push(vertices[e.region.r.index]);
        });

        // Reconnect the edges into counterclockwise triangles.
        edges.forEach(function(edge, i) {
            var v = vertices[i],
            cx = v[0],
            cy = v[1];
            edge.forEach(function(v) {
                v.angle = Math.atan2(v[0] - cx, v[1] - cy);
            });
            edge.sort(function(a, b) {
                return a.angle - b.angle;
            });
            for (var j = 0, m = edge.length - 1; j < m; j++) {
                triangles.push([v, edge[j], edge[j + 1]]);
            }
        });

        return triangles;
    };
    // Constructs a new quadtree for the specified array of points. A quadtree is a
    // two-dimensional recursive spatial subdivision. This implementation uses
    // square partitions, dividing each square into four equally-sized squares. Each
    // point exists in a unique node; if multiple points are in the same position,
    // some points may be stored on internal nodes rather than leaf nodes. Quadtrees
    // can be used to accelerate various spatial operations, such as the Barnes-Hut
    // approximation for computing n-body forces, or collision detection.
    d3.geom.quadtree = function(points, x1, y1, x2, y2) {
        var p,
        i = -1,
        n = points.length;

        // Type conversion for deprecated API.
        if (n && isNaN(points[0].x)) points = points.map(d3_geom_quadtreePoint);

        // Allow bounds to be specified explicitly.
        if (arguments.length < 5) {
            if (arguments.length === 3) {
                y2 = x2 = y1;
                y1 = x1;
            } else {
                x1 = y1 = Infinity;
                x2 = y2 = -Infinity;

                // Compute bounds.
                while (++i < n) {
                    p = points[i];
                    if (p.x < x1) x1 = p.x;
                    if (p.y < y1) y1 = p.y;
                    if (p.x > x2) x2 = p.x;
                    if (p.y > y2) y2 = p.y;
                }

                // Squarify the bounds.
                var dx = x2 - x1,
                dy = y2 - y1;
                if (dx > dy) y2 = y1 + dx;
                else x2 = x1 + dy;
            }
        }

        // Recursively inserts the specified point p at the node n or one of its
        // descendants. The bounds are defined by [x1, x2] and [y1, y2].
        function insert(n, p, x1, y1, x2, y2) {
            if (isNaN(p.x) || isNaN(p.y)) return; // ignore invalid points
            if (n.leaf) {
                var v = n.point;
                if (v) {
                    // If the point at this leaf node is at the same position as the new
                    // point we are adding, we leave the point associated with the
                    // internal node while adding the new point to a child node. This
                    // avoids infinite recursion.
                    if ((Math.abs(v.x - p.x) + Math.abs(v.y - p.y)) < .01) {
                        insertChild(n, p, x1, y1, x2, y2);
                    } else {
                        n.point = null;
                        insertChild(n, v, x1, y1, x2, y2);
                        insertChild(n, p, x1, y1, x2, y2);
                    }
                } else {
                    n.point = p;
                }
            } else {
                insertChild(n, p, x1, y1, x2, y2);
            }
        }

        // Recursively inserts the specified point p into a descendant of node n. The
        // bounds are defined by [x1, x2] and [y1, y2].
        function insertChild(n, p, x1, y1, x2, y2) {
            // Compute the split point, and the quadrant in which to insert p.
            var sx = (x1 + x2) * .5,
            sy = (y1 + y2) * .5,
            right = p.x >= sx,
            bottom = p.y >= sy,
            i = (bottom << 1) + right;

            // Recursively insert into the child node.
            n.leaf = false;
            n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());

            // Update the bounds as we recurse.
            if (right) x1 = sx; else x2 = sx;
            if (bottom) y1 = sy; else y2 = sy;
            insert(n, p, x1, y1, x2, y2);
        }

        // Create the root node.
        var root = d3_geom_quadtreeNode();

        root.add = function(p) {
            insert(root, p, x1, y1, x2, y2);
        };

        root.visit = function(f) {
            d3_geom_quadtreeVisit(f, root, x1, y1, x2, y2);
        };

        // Insert all points.
        points.forEach(root.add);
        return root;
    };

    function d3_geom_quadtreeNode() {
        return {
            leaf: true,
            nodes: [],
            point: null
        };
    }

    function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
        if (!f(node, x1, y1, x2, y2)) {
            var sx = (x1 + x2) * .5,
            sy = (y1 + y2) * .5,
            children = node.nodes;
            if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
            if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
            if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
            if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
        }
    }

    function d3_geom_quadtreePoint(p) {
        return {
            x: p[0],
            y: p[1]
        };
    }
        
        // Added CommonJS / RequireJS definitions
    if (typeof define === "function" && define.amd) define(d3.geom); else if (typeof module === "object" && module.exports) module.exports = d3.geom;

})();
;
/*!
* D3 Queue plugin
* Original author: @mbostock
* License :
* Copyright (c) 2012, Michael Bostock
* All rights reserved.
* 
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
* this list of conditions and the following disclaimer in the documentation
* and/or other materials provided with the distribution.

* The name Michael Bostock may not be used to endorse or promote products
* derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
!function(){function n(n){function e(){for(;i=a<c.length&&n>p;){var u=a++,e=c[u],o=t.call(e,1);o.push(l(u)),++p,e[0].apply(null,o)}}function l(n){return function(u,t){--p,null==s&&(null!=u?(s=u,a=d=0/0,o()):(c[n]=t,--d?i||e():o()))}}function o(){null!=s?m(s):f?m(s,c):m.apply(null,[s].concat(c))}var r,i,f,c=[],a=0,p=0,d=0,s=null,m=u;return n||(n=1/0),r={defer:function(){return s||(c.push(arguments),++d,e()),r},await:function(n){return m=n,f=!1,d||o(),r},awaitAll:function(n){return m=n,f=!0,d||o(),r}}}function u(){}var t=[].slice;n.version="1.0.7","function"==typeof define&&define.amd?define(function(){return n}):"object"==typeof module&&module.exports?module.exports=n:this.queue=n}();
;
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
// End edgeFx;
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