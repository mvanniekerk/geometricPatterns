(function main() {
	"use strict"
	const canvas = <HTMLCanvasElement> document.getElementById('canvas');
	const drawTypeSelectors = (<any>document.forms).drawType.elements.drawType;
	const ctx = <CanvasRenderingContext2D> canvas.getContext('2d');
	const shapeList = document.getElementById('shapes')!;
	const undoButton = document.getElementById('undo')!;

	type Shape = Circle | Line;
	type Maybe<T> = T | undefined;

	interface Point {
		x: number; 
		y: number;
	}

	interface Circle {
		center: Point;
		radius: number;
		checked: boolean;
	}

	function isCircle(o: any): o is Circle {
		return 'center' in o && 'radius' in o;
	}

	interface Line {
		start: Point;
		end: Point;
		checked: boolean;
	}

	function isLine(o: any): o is Line {
		return 'start' in o && 'end' in o;
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
	var intersections: Point[] = [];
	const radius = 5;
	const cWidth = 10000;
	const cHeight = 10000;

	function intersect(l1: Line, l2: Line) : Point
	{
		var {start: p1, end: p2} = l1
		var {start: p3, end: p4} = l2

		var a1 = (p1.y - p2.y) / (p1.x - p2.x);
		var a2 = (p3.y - p4.y) / (p3.x - p4.x);

		var b1 = p1.y - a1*p1.x;
		var b2 = p3.y - a2*p3.x;

		if (!Number.isFinite(a1) && Number.isFinite(a2)) {
			return {x: p1.x, y: p1.x*a2+b2};
		} else if (Number.isFinite(a1) && !Number.isFinite(a2)) {
			return {x: p3.x, y: p3.x*a1+b1}
		} else if (!Number.isFinite(a1) && !Number.isFinite(a2)) {
			return {x: NaN, y: NaN}
		}

		var x = (b2 - b1)/(a1 - a2);
		var y = a2*x + b2;

		return {x, y};
	}

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

	// https://stackoverflow.com/questions/3349125/circle-circle-intersection-points 
	function circleIntersect(c1: Circle, c2: Circle) : Point[]
	{
		let d = Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y);

		// TODO: hancle edge case
		if (d > c1.radius + c2.radius || d < Math.abs(c1.radius - c2.radius)) {
			return [];
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

		return [{x: xs1, y: ys1}, {x: xs2, y: ys2}];
	}

	function edges(p1: Point, p2: Point) : Line
	{
		var a = (p1.y - p2.y) / (p1.x - p2.x);
		if (isNaN(a)) { // horizontal line (initial state)
			return {
				start: {x: -cWidth, y: p1.y},
				end: {x: cWidth, y: p1.y},
				checked: true
			}
		} else if (!Number.isFinite(a)) { // vertical line
			return {
				start: {x: p1.x, y: -cHeight},
				end: {x: p1.x, y: cHeight},
				checked: true
			}
		}
		var b = p1.y - a*p1.x;
		var end = a*cWidth + b;
		var start = a*-cWidth + b;

		return {
			start: {x: -cWidth, y: start},
			end: {x: cWidth, y: end},
			checked: true
		}
	};

	function pointInRange() : Maybe<Point>
	{
		let minDist = Infinity;
		let minIntersection: Maybe<Point>;
		for (let intersection of intersections) {
			let distance = Math.hypot(user.x - intersection.x, user.y - intersection.y);
			if (distance < minDist) {
				minDist = distance;
				minIntersection = intersection;
			}
		}

		if (minIntersection !== null && minDist <= radius / viewPort.zoomFactor) {
			return minIntersection;
		} else {
			return; 
		}
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
		if (e.button == 2) { // right mouse button
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
		if (e.button == 2) { // right mouse button
			return;
		}

		nodes.push({x: user.x, y: user.y});
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
			console.log(intersections);
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
				shapes.push({center: p2, radius: nodeRadius, checked: true});
				createShapeText('circle', shapes);
			}
		}

		intersections = []

		for (let l1 = 0; l1 < shapes.length; l1++) {
			for (let l2 = 0; l2 < l1; l2++) {
				if (shapes[l1].checked && shapes[l2].checked) {
					if (isLine(shapes[l1]) && isLine(shapes[l2])) {
						intersections.push(intersect(<Line> shapes[l1], <Line> shapes[l2]));
					} else if (isCircle(shapes[l1]) && isCircle(shapes[l2])) {
						intersections.push(...circleIntersect(<Circle> shapes[l1], <Circle> shapes[l2]));
					} else if (isCircle(shapes[l1]) && isLine(shapes[l2])) {
						intersections.push(...circleLineIntersect(<Circle> shapes[l1], <Line> shapes[l2])); 
					} else if (isLine(shapes[l1]) && isCircle(shapes[l2])) {
						intersections.push(...circleLineIntersect(<Circle> shapes[l2], <Line> shapes[l1])); 
					}
				}
			}
		}
	}

	function drawCircle(circle: Circle) {
		let x = circle.center.x * viewPort.zoomFactor + viewPort.offsetX;	
		let y = circle.center.y * viewPort.zoomFactor + viewPort.offsetY
		let radius = circle.radius * viewPort.zoomFactor;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2*Math.PI);
		ctx.stroke();

	}

	function drawLine(line: Line) {
		let startX = line.start.x * viewPort.zoomFactor + viewPort.offsetX;
		let startY = line.start.y * viewPort.zoomFactor + viewPort.offsetY;
		let endX = line.end.x * viewPort.zoomFactor + viewPort.offsetX;
		let endY = line.end.y * viewPort.zoomFactor + viewPort.offsetY;
		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.lineTo(endX, endY);
		ctx.stroke();
	}

	function newShape() {
		let minIntersection = pointInRange();

		if (user.drawType === 'line') {
			let line = edges(nodes[0], {x: user.x, y: user.y});
			if (minIntersection) {
				line = edges(nodes[0], minIntersection);
			}

			if (line !== null) {
				drawLine(line);
			}
		} else if (user.drawType === 'circle') {
			let node = nodes[0]
			let nodeRadius = Math.hypot(node.x - user.x, node.y - user.y);
			if (minIntersection) {
				nodeRadius = Math.hypot(node.x - minIntersection.x, node.y - minIntersection.y);
			}
			drawCircle({center: {x: node.x, y: node.y}, radius: nodeRadius, checked: true});

		}
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
			let x = minIntersection.x * viewPort.zoomFactor + viewPort.offsetX;
			let y = minIntersection.y * viewPort.zoomFactor + viewPort.offsetY; 
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2*Math.PI);
			ctx.fill();
		}

		for (let shape of shapes) {
			if (shape.checked) {
				if (isLine(shape)) {
					drawLine(shape);
				} else if (isCircle(shape)) {
					drawCircle(shape);
				}
			}
		}
		requestAnimationFrame(render);
	}

	render();

})();
