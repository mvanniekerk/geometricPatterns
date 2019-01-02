(function main() {
	"use strict"
	const canvas = document.getElementById('canvas');
	const drawTypeSelectors = document.forms["drawType"].elements["drawType"];
	const ctx = canvas.getContext('2d');
	const shapeList = document.getElementById('shapes');

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
		radio.onclick = function (e) {
			user.drawType = radio.value;
		};

		if (radio.checked) {
			user.drawType = radio.value;
		}
	};

	const nodes = [];
	const lines = [];
	const circles = [];
	var intersections = [];
	const radius = 5;
	const cWidth = 10000;
	const cHeight = 10000;

	function intersect(l1, l2)
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
	function circleLineIntersect(circle, line) 
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

		let sgn = (x) => x < 0 ? -1 : 1;
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
	function circleIntersect(c1, c2) {
		let d = Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y);

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

	function edges(p1, p2)
	{
		var a = (p1.y - p2.y) / (p1.x - p2.x);
		if (isNaN(a)) { // horizontal line (initial state)
			return {
				start: {x: -cWidth, y: p1.y},
				end: {x: cWidth, y: p1.y}
			}
		} else if (!Number.isFinite(a)) { // vertical line
			return {
				start: {x: p1.x, y: -cHeight},
				end: {x: p1.x, y: cHeight}
			}
		}
		var b = p1.y - a*p1.x;
		var end = a*cWidth + b;
		var start = a*-cWidth + b;

		return {
			start: {x: -cWidth, y: start},
			end: {x: cWidth, y: end}
		}
	};

	function pointInRange() {
		let minDist = Infinity;
		let minIntersection = null;
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
			return null;
		}
	}

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
		console.log(viewPort);
	});

	function createShapeText(name, shapes) {
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
			let p1 = nodes.pop();
			let p2 = nodes.pop();

			let minIntersection = pointInRange();

			if (user.drawType === 'line') {
				let line = edges(p1, p2);
				if (minIntersection) {
					line = edges(p2, minIntersection);
				}
				line.checked = true;
				lines.push(line);
				createShapeText('line', lines);
			} else if (user.drawType === 'circle') {
				let nodeRadius = Math.hypot(p1.x - p2.x, p1.y - p2.y);
				if (minIntersection) {
					nodeRadius = Math.hypot(p2.x - minIntersection.x, p2.y - minIntersection.y);
				}
				circles.push({center: p2, radius: nodeRadius, checked: true});
				createShapeText('circle', circles);
			}
		}

		intersections = []

		for (let l1 = 0; l1 < lines.length; l1++) {
			for (let l2 = 0; l2 < l1; l2++) {
				if (lines[l1].checked && lines[l2].checked) {
					intersections.push(intersect(lines[l1], lines[l2]));
				}
			}
		}

		for (let circle of circles) {
			for (let line of lines) {
				if (circle.checked && line.checked) {
					intersections.push(...circleLineIntersect(circle, line)); 
				}
			}
		}

		for (let c1 = 0; c1 < circles.length; c1++) {
			for (let c2 = 0; c2 < c1; c2++) {
				if (circles[c1].checked && circles[c2].checked) {
					intersections.push(...circleIntersect(circles[c1], circles[c2]));
				}
			}
		}
	}

	function newShape() {
		let minIntersection = pointInRange();

		if (user.drawType === 'line') {
			let line = edges(nodes[0], {x: user.x, y: user.y});
			if (minIntersection) {
				line = edges(nodes[0], minIntersection);
			}

			if (line !== null) {
				ctx.beginPath();
				ctx.moveTo(line.start.x * viewPort.zoomFactor + viewPort.offsetX, line.start.y * viewPort.zoomFactor + viewPort.offsetY);
				ctx.lineTo(line.end.x * viewPort.zoomFactor + viewPort.offsetX, line.end.y * viewPort.zoomFactor + viewPort.offsetY);
				ctx.stroke();
			}
		} else if (user.drawType === 'circle') {
			let node = nodes[0]
			let nodeRadius = Math.hypot(node.x - user.x, node.y - user.y);
			if (minIntersection) {
				nodeRadius = Math.hypot(node.x - minIntersection.x, node.y - minIntersection.y);
			}

			ctx.beginPath();
			ctx.arc(node.x * viewPort.zoomFactor + viewPort.offsetX, node.y * viewPort.zoomFactor + viewPort.offsetY, nodeRadius * viewPort.zoomFactor, 0, 2*Math.PI);
			ctx.stroke();
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
			ctx.beginPath();
			ctx.arc(minIntersection.x * viewPort.zoomFactor + viewPort.offsetX, minIntersection.y * viewPort.zoomFactor + viewPort.offsetY, radius, 0, 2*Math.PI);
			ctx.fill();
		}

		for (let line of lines) {
			if (line.checked) {
				ctx.beginPath();
				ctx.moveTo(line.start.x * viewPort.zoomFactor + viewPort.offsetX, line.start.y * viewPort.zoomFactor + viewPort.offsetY);
				ctx.lineTo(line.end.x * viewPort.zoomFactor + viewPort.offsetX, line.end.y * viewPort.zoomFactor + viewPort.offsetY);
				ctx.stroke();
			}
		}
		for (let circle of circles) {
			if (circle.checked) {
				ctx.beginPath();
				ctx.arc(circle.center.x * viewPort.zoomFactor + viewPort.offsetX, circle.center.y * viewPort.zoomFactor + viewPort.offsetY, circle.radius * viewPort.zoomFactor, 0, 2*Math.PI);
				ctx.stroke();
			}
		}
		requestAnimationFrame(render);
	}

	render();

})();
