(function main() {
	"use strict"
	const canvas = document.getElementById('canvas');
	const drawTypeSelectors = document.forms["drawType"].elements["drawType"];
	const ctx = canvas.getContext('2d');

	const user = {
		x: 0,
		y: 0,
		mouseDown: false,
		drawType: 'line'
	};


	for (let radio of drawTypeSelectors) {
		radio.onclick = function (e) {
			user.drawType = radio.value;
			console.log(radio.value);
		};

		if (radio.checked) {
			user.drawType = radio.value;
			console.log(user.drawType);
		}
	};

	const nodes = [];
	const lines = [];
	const circles = [];
	var intersections = [];
	const radius = 5;
	const cWidth = canvas.width;
	const cHeight = canvas.height;

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

	function circleIntersect(circle, line) 
	{
		let x1 = line.start.x - circle.centre.x;
		let x2 = line.end.x - circle.centre.x;
		let y1 = line.start.y - circle.centre.y;
		let y2 = line.end.y - circle.centre.y;
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

		let xi1 = (D*dy + sgn(dy)*dx*Math.sqrt(discr)) / (dr*dr) + circle.centre.x;
		let yi1 = (-D*dx + Math.abs(dy)*Math.sqrt(discr)) / (dr*dr) + circle.centre.y;
		
		let xi2 = (D*dy - sgn(dy)*dx*Math.sqrt(discr)) / (dr*dr) + circle.centre.x;
		let yi2 = (-D*dx - Math.abs(dy)*Math.sqrt(discr)) / (dr*dr) + circle.centre.y;

		return [{x: xi1, y: yi1}, {x: xi2, y: yi2}]
	}

	function edges(p1, p2)
	{
		var a = (p1.y - p2.y) / (p1.x - p2.x);
		if (isNaN(a)) {
			return {
				start: {x: 0, y: p1.y},
				end: {x: cWidth, y: p1.y}
			}
		} else if (!Number.isFinite(a)) {
			return {
				start: {x: p1.x, y: 0},
				end: {x: p1.x, y: cHeight}
			}
		}
		var b = p1.y - a*p1.x;
		var end = a*cWidth + b;

		return {
			start: {x: 0, y: b},
			end: {x: cWidth, y: end}
		}
	};

	canvas.addEventListener("mousemove", function (e) {
		var rect = canvas.getBoundingClientRect();
		user.x = e.clientX - rect.left;
		user.y = e.clientY - rect.top;
	});

	canvas.addEventListener("mousedown", function (e) {
		nodes.push({x: user.x, y: user.y});
		user.mouseDown = true;
	});

	canvas.addEventListener("mouseup", function (e) {
		nodes.push({x: user.x, y: user.y});
		user.mouseDown = false;
	});

	function update() {
		if (nodes.length > 1) {
			let p1 = nodes.pop();
			let p2 = nodes.pop();

			if (user.drawType === 'line') {
				let line = edges(p1, p2);
				lines.push(line);
			} else if (user.drawType === 'circle') {
				let radius = Math.hypot(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));

				circles.push({centre: p2, radius: radius});
			}
		}

		intersections = []

		for (let l1 = 0; l1 < lines.length; l1++) {
			for (let l2 = 0; l2 < l1; l2++) {
				intersections.push(intersect(lines[l1], lines[l2]));
			}
		}

		for (let circle of circles) {
			for (let line of lines) {
				intersections.push(...circleIntersect(circle, line)); 
			}
		}
	}

	function render() {
		update();
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (nodes.length === 1 && user.mouseDown) {
			if (user.drawType === 'line') {
				let line = edges(nodes[0], {x: user.x, y: user.y});

				if (line !== null) {
					ctx.beginPath();
					ctx.moveTo(line.start.x, line.start.y);
					ctx.lineTo(line.end.x, line.end.y);
					ctx.stroke();
				}
			} else if (user.drawType === 'circle') {
				let node = nodes[0]
				let radius = Math.hypot(Math.abs(node.x - user.x), Math.abs(node.y - user.y));

				ctx.beginPath();
				ctx.arc(node.x, node.y, radius, 0, 2*Math.PI);
				ctx.stroke();
			}
		}

		for (let line of lines) {
			ctx.beginPath();
			ctx.moveTo(line.start.x, line.start.y);
			ctx.lineTo(line.end.x, line.end.y);
			ctx.stroke();
		}
		for (let circle of circles) {
			ctx.beginPath();
			ctx.arc(circle.centre.x, circle.centre.y, circle.radius, 0, 2*Math.PI);
			ctx.stroke();
		}
		for (let intersection of intersections) {
			ctx.beginPath();
			ctx.arc(intersection.x, intersection.y, radius, 0, 2*Math.PI);
			ctx.fill();
		}
		requestAnimationFrame(render);
	}

	render();

})();
