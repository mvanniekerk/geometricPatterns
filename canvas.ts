(function main() {
	"use strict"
	const canvas = <HTMLCanvasElement> document.getElementById('canvas');
	const drawTypeSelectors = (<any>document.forms).drawType.elements.drawType;
	const ctx = <CanvasRenderingContext2D> canvas.getContext('2d');
	const shapeList = document.getElementById('shapes')!;
	const undoButton = document.getElementById('undo')!;

	type Maybe<T> = T | undefined;

	class Shape {
		checked: boolean;
		intersections: Point[];
		selected: boolean;
		constructor() {
			this.checked = true;
			this.intersections = [];
			this.selected = false;
		}
		draw() {
			throw new Error('abstract class shape for draw');
		}
		mouseInRange() : boolean {
			throw new Error('abstract class shape for mouse in range');
		}
		intersectLine(line: Line) : void {
			throw new Error('abstract class shape for intersect line');
		}
		intersectCircle(circle: Circle) : void {
			throw new Error('abstract class shape for intersect circle');
		}
		closestIntersectionPoints() {
			throw new Error('abstract class shape for closest intersection points');
		}
		genSegments() : void {
		}
		removeSegment() : void {}
	}
	

	class Circle extends Shape {
		center: Point;
		radius: number;
		redIntersectionPoints?: {lower: number, higher: number};
		constructor(center : Point, radius : number) {
			super();
			this.center = center;
			this.radius = radius;
		}

		draw() {
			let x = this.center.x * viewPort.zoomFactor + viewPort.offsetX;	
			let y = this.center.y * viewPort.zoomFactor + viewPort.offsetY
			let radius = this.radius * viewPort.zoomFactor;
			let start = 0;
			let end = 2*Math.PI;
			if (this.selected && !user.mouseDown) {
				ctx.strokeStyle = 'red';
				this.selected = false;
				for (let intersection of this.intersections) {
					drawPoint(intersection);
				}
				if (user.drawType === 'eraser' && this.redIntersectionPoints) {
					start = this.redIntersectionPoints.lower;
					end = this.redIntersectionPoints.higher;
					ctx.strokeStyle = 'red';
					ctx.beginPath();
					ctx.arc(x, y, radius, start, end);
					ctx.stroke();
					ctx.strokeStyle = 'black';
				}
			} 
			ctx.beginPath();
			ctx.arc(x, y, radius, end, start);
			ctx.stroke();
			ctx.strokeStyle = 'black';
		}

		mouseInRange() {
			let fromCenter = Math.hypot(this.center.x - user.x, this.center.y - user.y);
			let distance = Math.abs(fromCenter - this.radius);
			return distance <= radius
		}

		closestIntersectionPoints() {

		}

		drawShapeSegment(points: {lower: number, higher: number}) {
			ctx.strokeStyle = 'red';
			ctx.beginPath();
			ctx.arc(this.center.x, this.center.y, this.radius, points.lower, points.higher);
			ctx.stroke();
			ctx.strokeStyle = 'black';
		}

		intersectLine(line : Line) : void{
			this.intersections.push(...circleLineIntersect(this, line));
		}
		
		// https://stackoverflow.com/questions/3349125/circle-circle-intersection-points 
		intersectCircle(c2: Circle) : void
		{
			let c1 = this;
			let d = Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y);

			// TODO: handle edge case
			if (d > c1.radius + c2.radius || d < Math.abs(c1.radius - c2.radius)) {
				// circles are inside each other
				return; 
			} else if (d == 0 && c1.radius === c2.radius) {
				console.log('two circles are the same');
			}

			let a = (c1.radius*c1.radius - c2.radius*c2.radius + d*d) / (2*d);
			let h = Math.sqrt(c1.radius*c1.radius - a*a);
			let xm = c1.center.x + a*(c2.center.x - c1.center.x)/d;
			let ym = c1.center.y + a*(c2.center.y - c1.center.y)/d;

			let xs1 = xm + h*(c1.center.y - c2.center.y)/d;
			let xs2 = xm - h*(c1.center.y - c2.center.y)/d;

			let ys1 = ym - h*(c1.center.x - c2.center.x)/d;
			let ys2 = ym + h*(c1.center.x - c2.center.x)/d;

			this.intersections.push({x: xs1, y: ys1});
			this.intersections.push({x: xs2, y: ys2});
		}
	}

	class Line extends Shape {
		start: Point;
		end: Point;
		lineSegments?: {start: Point, end: Point, hidden: boolean}[];
		eraserSegment?: {start: Point, end: Point, hidden: boolean};
		constructor(start: Point, end: Point) {
			super();
			this.start = start;
			this.end = end;
		}

		draw() {
			if (this.lineSegments) {
				for (let lineSegment of this.lineSegments) {
					if (!lineSegment.hidden || this.eraserSegment == lineSegment) {
						if (this.eraserSegment == lineSegment) {
							ctx.strokeStyle = 'red';
						}
						let startX = lineSegment.start.x * viewPort.zoomFactor + viewPort.offsetX;
						let startY = lineSegment.start.y * viewPort.zoomFactor + viewPort.offsetY;
						let endX = lineSegment.end.x * viewPort.zoomFactor + viewPort.offsetX;
						let endY = lineSegment.end.y * viewPort.zoomFactor + viewPort.offsetY;
						ctx.beginPath();
						ctx.moveTo(startX, startY);
						ctx.lineTo(endX, endY);
						ctx.stroke();
						ctx.strokeStyle = 'black';
					}
				}
				if (this.eraserSegment) {
					this.eraserSegment.hidden = false;
					this.eraserSegment = undefined;
				}
			} else {
				let startX = this.start.x * viewPort.zoomFactor + viewPort.offsetX;
				let startY = this.start.y * viewPort.zoomFactor + viewPort.offsetY;
				let endX = this.end.x * viewPort.zoomFactor + viewPort.offsetX;
				let endY = this.end.y * viewPort.zoomFactor + viewPort.offsetY;
				ctx.beginPath();
				ctx.moveTo(startX, startY);
				ctx.lineTo(endX, endY);
				ctx.stroke();
				ctx.strokeStyle = 'black';
			}
		}

		removeSegment() {
			this.closestIntersectionPoints();
			if (this.eraserSegment) {
				this.eraserSegment = undefined;
			}
		}

		pointLineDistance(start: Point, end: Point, point: Point) : number {
			let v1 = end.y - start.y;
			let v2 = -(end.x - start.x);
			let r1 = start.x - point.x;
			let r2 = start.y - point.y;
			return Math.abs(-v2*r2-r1*v1)/Math.hypot(-v2, v1);
		}

		// http://mathworld.wolfram.com/Point-LineDistance2-Dimensional.html 
		mouseInRange() {
			let d = this.pointLineDistance(this.start, this.end, user);
			return d <= radius;
		}

		genSegments() : void {
			let points = this.intersections.slice(0, this.intersections.length);
			points.push(this.start);
			points.push(this.end);
			points.sort((a,b) => {
				if (a.x == b.x) {
					return a.y - b.y;
				} else {
					return a.x - b.x;
				}
			});
			this.lineSegments = [];
			for (let i = 1; i<points.length;i++) {
				let start = points[i-1];
				let end = points[i];
				this.lineSegments.push({start, end, hidden: false});
			}
		}

		closestIntersectionPoints() : void {
			if (this.lineSegments) {
				for (let lineSegment of this.lineSegments) {
					let start = lineSegment.start;
					let end = lineSegment.end;
					let startDist = Math.hypot(start.x - user.x, start.y - user.y);
					let endDist = Math.hypot(end.x - user.x, end.y - user.y);
					let dist = Math.hypot(start.x - end.x, start.y - end.y);
					if (startDist < dist && endDist < dist) {
						if (lineSegment.hidden) {
							return;
						}
						lineSegment.hidden = true;
						this.eraserSegment = lineSegment;
						return;
					}
				}
			}
		}

		intersectLine(l2: Line) : void {
			let l1 = this;
			var {start: p1, end: p2} = l1
			var {start: p3, end: p4} = l2

			var a1 = (p1.y - p2.y) / (p1.x - p2.x);
			var a2 = (p3.y - p4.y) / (p3.x - p4.x);

			var b1 = p1.y - a1*p1.x;
			var b2 = p3.y - a2*p3.x;

			if (!Number.isFinite(a1) && Number.isFinite(a2)) {
				this.intersections.push({x: p1.x, y: p1.x*a2+b2});
				return;
			} else if (Number.isFinite(a1) && !Number.isFinite(a2)) {
				this.intersections.push({x: p3.x, y: p3.x*a1+b1});
				return;
			} else if (!Number.isFinite(a1) && !Number.isFinite(a2)) {
				console.log('both lines are vertical');
				return;
			}

			var x = (b2 - b1)/(a1 - a2);
			var y = a2*x + b2;

			this.intersections.push({x, y});
		}

		intersectCircle(circle: Circle) : void {
			this.intersections.push(...circleLineIntersect(circle, this));
		}

	}

	interface Point {
		x: number; 
		y: number;
	}

	const user = {
		x: 0,
		y: 0,
		mouseDown: false,
		drawType: 'line'
	};

	const viewPort = {
		zoomFactor: 1,
		offsetX: 0,
		offsetY: 0,
		lastX: 0,
		lastY: 0
	}


	for (let radio of drawTypeSelectors) {
		radio.onclick = function (e: MouseEvent) {
			user.drawType = radio.value;
		};

		if (radio.checked) {
			user.drawType = radio.value;
		}
	};

	const nodes: Point[] = [];
	const shapes: Shape[] = [];
	const radius = 5;
	const cWidth = 10000;
	const cHeight = 10000;

	// http://mathworld.wolfram.com/Circle-LineIntersection.html 
	function circleLineIntersect(circle: Circle, line: Line) : Point[]
	{
		let x1 = line.start.x - circle.center.x;
		let x2 = line.end.x - circle.center.x;
		let y1 = line.start.y - circle.center.y;
		let y2 = line.end.y - circle.center.y;
		let r = circle.radius;

		let dx = x2 - x1;
		let dy = y2 - y1;
		let dr = Math.hypot(dx, dy);
		let D = x1*y2 - x2*y1

		let sgn = (x: number) => x < 0 ? -1 : 1;
		let discr = r*r*dr*dr-D*D;

		if (discr < 0) {
			return [];
		} else if (discr == 0) {
			console.log('tangent line');
		}

		let xi1 = (D*dy + sgn(dy)*dx*Math.sqrt(discr)) / (dr*dr) + circle.center.x;
		let yi1 = (-D*dx + Math.abs(dy)*Math.sqrt(discr)) / (dr*dr) + circle.center.y;
		
		let xi2 = (D*dy - sgn(dy)*dx*Math.sqrt(discr)) / (dr*dr) + circle.center.x;
		let yi2 = (-D*dx - Math.abs(dy)*Math.sqrt(discr)) / (dr*dr) + circle.center.y;

		return [{x: xi1, y: yi1}, {x: xi2, y: yi2}]
	}


	function edges(p1: Point, p2: Point) : Line {
		var a = (p1.y - p2.y) / (p1.x - p2.x);
		if (isNaN(a)) { // horizontal line (initial state)
			return new Line({x: -cWidth, y: p1.y}, {x: cWidth, y: p1.y})
		} else if (!Number.isFinite(a)) { // vertical line
			return new Line({x: p1.x, y: -cHeight}, {x: p1.x, y: cHeight});
		}
		var b = p1.y - a*p1.x;
		var end = a*cWidth + b;
		var start = a*-cWidth + b;

		return new Line({x: -cWidth, y: start}, {x: cWidth, y: end})
	}

	function pointInRange() : Maybe<Point> {
		for (let shape of shapes) {
			for (let intersection of shape.intersections) {
				let distance = Math.hypot(user.x - intersection.x, user.y - intersection.y);
				if (distance <= radius ) {
					return intersection;
				}
			}
		}
	}

	function shapeInRange() : Maybe<Shape> {
		for (let shape of shapes) {
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
		} else if (e.buttons == 2) { // right mouse button
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

		let minIntersection = pointInRange();

		if (minIntersection) {
			nodes.push(minIntersection);
		} else {
			nodes.push({x: user.x, y: user.y});
		}

		user.mouseDown = true;
	});

	canvas.addEventListener("contextmenu", function (e) {
		e.preventDefault();
	});

	canvas.addEventListener("mouseup", function (e) {
		if (e.button == 2 ) { // right mouse button
			return;
		} else if (user.drawType == 'eraser') {
			let shape = shapeInRange();
			console.log(shape);
			if (shape) {
				shape.removeSegment();
			}
			return;
		}

		let minIntersection = pointInRange();

		if (minIntersection) {
			nodes.push(minIntersection);
		} else {
			nodes.push({x: user.x, y: user.y});
		}

		user.mouseDown = false;
	});

	canvas.addEventListener("wheel", function (e) {
		let delta = viewPort.zoomFactor * e.deltaY / 100;
		let zoomFactor = viewPort.zoomFactor + delta;
		if (zoomFactor >= 20 || zoomFactor <= 0.05) {
			return;
		}
		viewPort.zoomFactor = zoomFactor;
		viewPort.offsetX -= canvas.width / 2 * delta;
		viewPort.offsetY -= canvas.height / 2 * delta;
	});

	function createShapeText(name: String, shapes: Shape[]) {
		let id = shapes.length - 1;
		let newEl = document.createElement("li");
		let text = document.createTextNode(name + " " + id);

		var checkbox = document.createElement('input');
		checkbox.type = "checkbox";
		checkbox.checked = true;
		checkbox.onchange = function () {
			shapes[id].checked = checkbox.checked;
			update();
		}

		newEl.appendChild(text);
		newEl.appendChild(checkbox);
		shapeList.appendChild(newEl);
	}

	function update() {
		if (nodes.length > 1) {
			let p1 = nodes.pop()!;
			let p2 = nodes.pop()!;

			let minIntersection = pointInRange();

			if (user.drawType === 'line') {
				let line = edges(p1, p2);
				if (minIntersection) {
					line = edges(p2, minIntersection);
				}
				shapes.push(line);
				createShapeText('line', shapes);
			} else if (user.drawType === 'circle') {
				let nodeRadius = Math.hypot(p1.x - p2.x, p1.y - p2.y);
				if (minIntersection) {
					nodeRadius = Math.hypot(p2.x - minIntersection.x, p2.y - minIntersection.y);
				}
				shapes.push(new Circle(p2, nodeRadius));
				createShapeText('circle', shapes);
			}
		}

		for (let shape1 of shapes) {
			shape1.intersections = [];
			for (let shape2 of shapes){
				if (shape1 !== shape2) {
					if (shape1.checked && shape2.checked) {
						if (shape2 instanceof Line) {
							shape1.intersectLine(<Line> shape2);
						} else if (shape2 instanceof Circle) {
							shape1.intersectCircle(<Circle> shape2);
						}
					}
				}
			}
			shape1.genSegments();
		}
		console.log(shapes);
	}

	function newShape() {
		let minIntersection = pointInRange();

		if (user.drawType === 'line') {
			let line = edges(nodes[0], {x: user.x, y: user.y});
			if (minIntersection) {
				line = edges(nodes[0], minIntersection);
			}

			if (line !== null) {
				line.draw();
			}
		} else if (user.drawType === 'circle') {
			let node = nodes[0]
			let nodeRadius = Math.hypot(node.x - user.x, node.y - user.y);
			if (minIntersection) {
				nodeRadius = Math.hypot(node.x - minIntersection.x, node.y - minIntersection.y);
			}
			let circle = new Circle({x: node.x, y: node.y}, nodeRadius);
			circle.draw();

		}
	}

	function drawPoint(point: Point) : void {
			let x = point.x * viewPort.zoomFactor + viewPort.offsetX;
			let y = point.y * viewPort.zoomFactor + viewPort.offsetY; 
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2*Math.PI);
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

		let minIntersection = pointInRange();

		if (minIntersection) {
			drawPoint(minIntersection);
		}

		let closeShape = shapeInRange();

		if (closeShape) {
			closeShape.selected = true;
			if (user.drawType === 'eraser') {
				closeShape.closestIntersectionPoints();
			} 
		}

		for (let shape of shapes) {
			if (shape.checked) {
				shape.draw();
			}
		}
		requestAnimationFrame(render);
	}

	render();

})();
