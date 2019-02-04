"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function main() {
    "use strict";
    var canvas = document.getElementById('canvas');
    var drawTypeSelectors = document.forms.drawType.elements.drawType;
    var ctx = canvas.getContext('2d');
    var shapeList = document.getElementById('shapes');
    var undoButton = document.getElementById('undo');
    var Shape = /** @class */ (function () {
        function Shape() {
            this.checked = true;
            this.intersections = [];
            this.selected = false;
            this.color = 'black';
        }
        Shape.prototype.draw = function () {
            throw new Error('abstract class shape for draw');
        };
        Shape.prototype.mouseInRange = function () {
            throw new Error('abstract class shape for mouse in range');
        };
        Shape.prototype.intersectLine = function (line) {
            throw new Error('abstract class shape for intersect line');
        };
        Shape.prototype.intersectCircle = function (circle) {
            throw new Error('abstract class shape for intersect circle');
        };
        Shape.prototype.closestIntersectionPoints = function () { };
        Shape.prototype.removeSegment = function (shapes) { };
        Shape.prototype.genSegments = function () { };
        ;
        return Shape;
    }());
    var Circle = /** @class */ (function (_super) {
        __extends(Circle, _super);
        function Circle(center, radius) {
            var _this = _super.call(this) || this;
            _this.center = center;
            _this.radius = radius;
            return _this;
        }
        Circle.prototype.draw = function () {
            var x = viewPort.findX(this.center.x);
            var y = viewPort.findY(this.center.y);
            var radius = this.radius * viewPort.zoomFactor;
            var start = 0;
            var end = 2 * Math.PI;
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.arc(x, y, radius, end, start);
            ctx.stroke();
        };
        Circle.prototype.mouseInRange = function () {
            var fromCenter = Math.hypot(this.center.x - user.x, this.center.y - user.y);
            var distance = Math.abs(fromCenter - this.radius);
            return distance <= radius;
        };
        Circle.prototype.drawShapeSegment = function (points) {
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.center.x, this.center.y, this.radius, points.lower, points.higher);
            ctx.stroke();
            ctx.strokeStyle = 'black';
        };
        Circle.prototype.intersectLine = function (line) {
            var _a;
            (_a = this.intersections).push.apply(_a, circleLineIntersect(this, line));
        };
        // https://stackoverflow.com/questions/3349125/circle-circle-intersection-points 
        Circle.prototype.intersectCircle = function (c2) {
            var c1 = this;
            var d = Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y);
            // TODO: handle edge case
            if (d > c1.radius + c2.radius || d < Math.abs(c1.radius - c2.radius)) {
                // circles are inside each other
                return;
            }
            else if (d == 0 && c1.radius === c2.radius) {
                console.log('two circles are the same');
            }
            var a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
            var h = Math.sqrt(c1.radius * c1.radius - a * a);
            var xm = c1.center.x + a * (c2.center.x - c1.center.x) / d;
            var ym = c1.center.y + a * (c2.center.y - c1.center.y) / d;
            var xs1 = xm + h * (c1.center.y - c2.center.y) / d;
            var xs2 = xm - h * (c1.center.y - c2.center.y) / d;
            var ys1 = ym - h * (c1.center.x - c2.center.x) / d;
            var ys2 = ym + h * (c1.center.x - c2.center.x) / d;
            this.intersections.push({ x: xs1, y: ys1 });
            this.intersections.push({ x: xs2, y: ys2 });
        };
        return Circle;
    }(Shape));
    var Line = /** @class */ (function (_super) {
        __extends(Line, _super);
        function Line(start, end) {
            var _this = _super.call(this) || this;
            _this.start = start;
            _this.end = end;
            return _this;
        }
        Line.prototype.draw = function () {
            if (this.eraserSegment) {
                var lineSegment = this.eraserSegment;
                var startX = viewPort.findX(this.start.x);
                var startY = viewPort.findY(this.start.y);
                var endX = viewPort.findX(lineSegment.start.x);
                var endY = viewPort.findY(lineSegment.start.y);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                ctx.strokeStyle = 'red';
                startX = viewPort.findX(lineSegment.start.x);
                startY = viewPort.findY(lineSegment.start.y);
                endX = viewPort.findX(lineSegment.end.x);
                endY = viewPort.findY(lineSegment.end.y);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                ctx.strokeStyle = 'black';
                startX = viewPort.findX(lineSegment.end.x);
                startY = viewPort.findY(lineSegment.end.y);
                endX = viewPort.findX(this.end.x);
                endY = viewPort.findY(this.end.y);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                this.eraserSegment = undefined;
            }
            else {
                ctx.strokeStyle = this.color;
                var startX = viewPort.findX(this.start.x);
                var startY = viewPort.findY(this.start.y);
                var endX = viewPort.findX(this.end.x);
                var endY = viewPort.findY(this.end.y);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        };
        Line.prototype.removeSegment = function (shapes) {
            this.closestIntersectionPoints();
            if (this.eraserSegment) {
                if (this.start.x != this.eraserSegment.start.x || this.start.y != this.eraserSegment.start.y) {
                    shapes.push(new Line(this.start, this.eraserSegment.start));
                }
                if (this.end.x != this.eraserSegment.end.x || this.end.y != this.eraserSegment.end.y) {
                    shapes.push(new Line(this.eraserSegment.end, this.end));
                }
                for (var i = 0; i < shapes.length; i++) {
                    if (shapes[i] == this) {
                        shapes.splice(i, 1);
                        console.log(shapes);
                    }
                }
                createShapeTexts(shapes);
            }
        };
        Line.prototype.pointLineDistance = function (start, end, point) {
            var v1 = end.y - start.y;
            var v2 = -(end.x - start.x);
            var r1 = start.x - point.x;
            var r2 = start.y - point.y;
            return Math.abs(-v2 * r2 - r1 * v1) / Math.hypot(-v2, v1);
        };
        // http://mathworld.wolfram.com/Point-LineDistance2-Dimensional.html 
        Line.prototype.mouseInRange = function () {
            var d = this.pointLineDistance(this.start, this.end, user);
            return inBetween(this.start, this.end, user) && d <= radius;
        };
        Line.prototype.genSegments = function () {
            var points = this.intersections.slice(0, this.intersections.length);
            points.push(this.start);
            points.push(this.end);
            points.sort(function (a, b) {
                if (a.x == b.x) {
                    return a.y - b.y;
                }
                else {
                    return a.x - b.x;
                }
            });
            var newSegments = [];
            for (var i = 1; i < points.length; i++) {
                var start = points[i - 1];
                var end = points[i];
                newSegments.push({ start: start, end: end });
            }
            this.segments = newSegments;
            return newSegments;
        };
        Line.prototype.closestIntersectionPoints = function () {
            var lineSegments = this.genSegments();
            for (var _i = 0, lineSegments_1 = lineSegments; _i < lineSegments_1.length; _i++) {
                var lineSegment = lineSegments_1[_i];
                var start = lineSegment.start;
                var end = lineSegment.end;
                var startDist = Math.hypot(start.x - user.x, start.y - user.y);
                var endDist = Math.hypot(end.x - user.x, end.y - user.y);
                var dist = Math.hypot(start.x - end.x, start.y - end.y);
                if (startDist < dist && endDist < dist) {
                    this.eraserSegment = lineSegment;
                    return;
                }
            }
        };
        Line.prototype.intersectLine = function (l2) {
            var _a = this, p1 = _a.start, p2 = _a.end;
            var p3 = l2.start, p4 = l2.end;
            var a1 = (p1.y - p2.y) / (p1.x - p2.x);
            var a2 = (p3.y - p4.y) / (p3.x - p4.x);
            var b1 = p1.y - a1 * p1.x;
            var b2 = p3.y - a2 * p3.x;
            if (Math.abs(a1) > 1 << 28 && Math.abs(a2) < 1 << 28) {
                var result_1 = { x: p1.x, y: p1.x * a2 + b2 };
                if (inBetween(p1, p2, result_1) && inBetween(p3, p4, result_1)) {
                    this.intersections.push(result_1);
                }
                return;
            }
            else if (Math.abs(a1) < 1 << 28 && Math.abs(a2) > 1 << 28) {
                var result_2 = { x: p3.x, y: p3.x * a1 + b1 };
                if (inBetween(p1, p2, result_2) && inBetween(p3, p4, result_2)) {
                    this.intersections.push(result_2);
                }
                return;
            }
            else if (Math.abs(a1) > 1 << 28 && Math.abs(a2) > 1 << 28) {
                return;
            }
            var x = (b2 - b1) / (a1 - a2);
            var y = a2 * x + b2;
            var result = { x: x, y: y };
            if (inBetween(p1, p2, result) && inBetween(p3, p4, result)) {
                this.intersections.push({ x: x, y: y });
            }
        };
        Line.prototype.intersectCircle = function (circle) {
            var _a;
            (_a = this.intersections).push.apply(_a, circleLineIntersect(circle, this));
        };
        return Line;
    }(Shape));
    var user = {
        x: 0,
        y: 0,
        mouseDown: false,
        drawType: 'line'
    };
    var viewPort = {
        zoomFactor: 1,
        offsetX: 0,
        offsetY: 0,
        lastX: 0,
        lastY: 0,
        findX: function (x) {
            return x * this.zoomFactor + this.offsetX;
        },
        findY: function (y) {
            return y * this.zoomFactor + this.offsetY;
        }
    };
    var _loop_1 = function (radio) {
        radio.onclick = function (e) {
            user.drawType = radio.value;
        };
        if (radio.checked) {
            user.drawType = radio.value;
        }
    };
    for (var _i = 0, drawTypeSelectors_1 = drawTypeSelectors; _i < drawTypeSelectors_1.length; _i++) {
        var radio = drawTypeSelectors_1[_i];
        _loop_1(radio);
    }
    ;
    var nodes = [];
    var shapes = [];
    var radius = 5;
    var cWidth = 10000;
    var cHeight = 10000;
    function inBetween(p1, p2, p3) {
        var d12 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        var d23 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
        var d13 = Math.hypot(p1.x - p3.x, p1.y - p3.y);
        var diff = d13 + d23 - d12;
        var epsilon = 5;
        return -epsilon < diff && epsilon > diff;
    }
    // http://mathworld.wolfram.com/Circle-LineIntersection.html 
    function circleLineIntersect(circle, line) {
        var x1 = line.start.x - circle.center.x;
        var x2 = line.end.x - circle.center.x;
        var y1 = line.start.y - circle.center.y;
        var y2 = line.end.y - circle.center.y;
        var r = circle.radius;
        var dx = x2 - x1;
        var dy = y2 - y1;
        var dr = Math.hypot(dx, dy);
        var D = x1 * y2 - x2 * y1;
        var sgn = function (x) { return x < 0 ? -1 : 1; };
        var discr = r * r * dr * dr - D * D;
        if (discr < 0) {
            return [];
        }
        else if (discr == 0) {
            console.log('tangent line');
        }
        var xi1 = (D * dy + sgn(dy) * dx * Math.sqrt(discr)) / (dr * dr) + circle.center.x;
        var yi1 = (-D * dx + Math.abs(dy) * Math.sqrt(discr)) / (dr * dr) + circle.center.y;
        var p1 = { x: xi1, y: yi1 };
        var xi2 = (D * dy - sgn(dy) * dx * Math.sqrt(discr)) / (dr * dr) + circle.center.x;
        var yi2 = (-D * dx - Math.abs(dy) * Math.sqrt(discr)) / (dr * dr) + circle.center.y;
        var p2 = { x: xi2, y: yi2 };
        var result = [];
        if (inBetween(line.start, line.end, p1)) {
            result.push(p1);
        }
        if (inBetween(line.start, line.end, p2)) {
            result.push(p2);
        }
        return result;
    }
    function edges(p1, p2) {
        var a = (p1.y - p2.y) / (p1.x - p2.x);
        if (isNaN(a)) { // horizontal line (initial state)
            return new Line({ x: -cWidth, y: p1.y }, { x: cWidth, y: p1.y });
        }
        else if (Math.abs(a) > 1 << 28) { // vertical line
            var result = new Line({ x: p1.x, y: -cHeight }, { x: p1.x, y: cHeight });
            return result;
        }
        var b = p1.y - a * p1.x;
        var end = a * cWidth + b;
        var start = a * -cWidth + b;
        return new Line({ x: -cWidth, y: start }, { x: cWidth, y: end });
    }
    function pointInRange() {
        for (var _i = 0, shapes_1 = shapes; _i < shapes_1.length; _i++) {
            var shape = shapes_1[_i];
            for (var _a = 0, _b = shape.intersections; _a < _b.length; _a++) {
                var intersection = _b[_a];
                var distance = Math.hypot(user.x - intersection.x, user.y - intersection.y);
                if (distance <= radius) {
                    return intersection;
                }
            }
        }
    }
    function shapeInRange() {
        for (var _i = 0, shapes_2 = shapes; _i < shapes_2.length; _i++) {
            var shape = shapes_2[_i];
            if (shape.mouseInRange()) {
                return shape;
            }
        }
        return;
    }
    undoButton.addEventListener("click", function (e) {
        if (shapeList.lastChild) {
            shapes.pop();
            shapeList.lastChild.remove();
            update();
        }
    });
    canvas.addEventListener("mousemove", function (e) {
        var rect = canvas.getBoundingClientRect();
        if (e.buttons != 2) { // not the right mouse button
            user.x = (e.clientX - rect.left - viewPort.offsetX) / viewPort.zoomFactor;
            user.y = (e.clientY - rect.top - viewPort.offsetY) / viewPort.zoomFactor;
        }
        else if (e.buttons == 2) { // right mouse button
            viewPort.offsetX += e.clientX - viewPort.lastX;
            viewPort.offsetY += e.clientY - viewPort.lastY;
        }
        viewPort.lastX = e.clientX;
        viewPort.lastY = e.clientY;
    });
    canvas.addEventListener("mousedown", function (e) {
        if (e.button == 2 || user.drawType == 'eraser') { // right mouse button
            return;
        }
        var minIntersection = pointInRange();
        if (minIntersection) {
            nodes.push(minIntersection);
        }
        else {
            nodes.push({ x: user.x, y: user.y });
        }
        user.mouseDown = true;
    });
    canvas.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    });
    canvas.addEventListener("mouseup", function (e) {
        if (e.button == 2) { // right mouse button
            return;
        }
        else if (user.drawType == 'eraser') {
            var shape = shapeInRange();
            if (shape) {
                shape.removeSegment(shapes);
                update();
            }
            return;
        }
        var minIntersection = pointInRange();
        if (minIntersection) {
            nodes.push(minIntersection);
        }
        else {
            nodes.push({ x: user.x, y: user.y });
        }
        user.mouseDown = false;
    });
    canvas.addEventListener("wheel", function (e) {
        e.preventDefault();
        var delta = viewPort.zoomFactor * e.deltaY / 100;
        var zoomFactor = viewPort.zoomFactor + delta;
        if (zoomFactor >= 20 || zoomFactor <= 0.05) {
            return;
        }
        viewPort.zoomFactor = zoomFactor;
        viewPort.offsetX -= canvas.width / 2 * delta;
        viewPort.offsetY -= canvas.height / 2 * delta;
    });
    function createShapeText(name, id, shapes) {
        var newEl = document.createElement("li");
        var text = document.createTextNode(name + " " + id);
        newEl.onmouseenter = function () {
            shapes[id].color = 'red';
        };
        newEl.onmouseleave = function () {
            shapes[id].color = 'black';
        };
        var checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.onchange = function () {
            shapes[id].checked = checkbox.checked;
            update();
        };
        newEl.appendChild(text);
        newEl.appendChild(checkbox);
        shapeList.appendChild(newEl);
    }
    function createShapeTexts(shapes) {
        while (shapeList.lastChild) {
            shapeList.removeChild(shapeList.lastChild);
        }
        for (var i = 0; i < shapes.length; i++) {
            if (shapes[i] instanceof Circle) {
                createShapeText('circle', i, shapes);
            }
            else if (shapes[i] instanceof Line) {
                createShapeText('line', i, shapes);
            }
        }
    }
    function update() {
        if (nodes.length > 1) {
            var p1 = nodes.pop();
            var p2 = nodes.pop();
            var minIntersection = pointInRange();
            if (user.drawType === 'line') {
                var line = void 0;
                if (minIntersection) {
                    line = edges(p2, minIntersection);
                }
                else {
                    line = edges(p1, p2);
                }
                shapes.push(line);
                createShapeText('line', shapes.length - 1, shapes);
            }
            else if (user.drawType === 'circle') {
                var nodeRadius = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (minIntersection) {
                    nodeRadius = Math.hypot(p2.x - minIntersection.x, p2.y - minIntersection.y);
                }
                shapes.push(new Circle(p2, nodeRadius));
                createShapeText('circle', shapes.length - 1, shapes);
            }
        }
        for (var _i = 0, shapes_3 = shapes; _i < shapes_3.length; _i++) {
            var shape1 = shapes_3[_i];
            shape1.intersections = [];
            for (var _a = 0, shapes_4 = shapes; _a < shapes_4.length; _a++) {
                var shape2 = shapes_4[_a];
                if (shape1 !== shape2) {
                    if (shape1.checked && shape2.checked) {
                        if (shape2 instanceof Line) {
                            shape1.intersectLine(shape2);
                        }
                        else if (shape2 instanceof Circle) {
                            shape1.intersectCircle(shape2);
                        }
                    }
                }
            }
            if (shape1.intersections.length == 0 && shape1.checked) {
                console.log('no intersections', shape1);
            }
            shape1.genSegments();
        }
        console.log(shapes);
    }
    function newShape() {
        var minIntersection = pointInRange();
        if (user.drawType === 'line') {
            var line = edges(nodes[0], { x: user.x, y: user.y });
            if (minIntersection) {
                line = edges(nodes[0], minIntersection);
            }
            if (line !== null) {
                line.draw();
            }
        }
        else if (user.drawType === 'circle') {
            var node = nodes[0];
            var nodeRadius = Math.hypot(node.x - user.x, node.y - user.y);
            if (minIntersection) {
                nodeRadius = Math.hypot(node.x - minIntersection.x, node.y - minIntersection.y);
            }
            var circle = new Circle({ x: node.x, y: node.y }, nodeRadius);
            circle.draw();
        }
    }
    function drawPoint(point) {
        var x = viewPort.findX(point.x);
        var y = viewPort.findY(point.y);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    function render() {
        if (nodes.length > 1) {
            update();
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (nodes.length === 1 && user.mouseDown) {
            newShape();
        }
        var minIntersection = pointInRange();
        if (minIntersection) {
            drawPoint(minIntersection);
        }
        var closeShape = shapeInRange();
        if (closeShape) {
            closeShape.selected = true;
            if (user.drawType === 'eraser') {
                closeShape.closestIntersectionPoints();
            }
        }
        for (var _i = 0, shapes_5 = shapes; _i < shapes_5.length; _i++) {
            var shape = shapes_5[_i];
            if (shape.checked) {
                shape.draw();
            }
        }
        requestAnimationFrame(render);
    }
    render();
})();
