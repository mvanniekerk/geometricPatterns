(function main() {
	"use strict"
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d')

	const user = {
		x: 0,
		y: 0
	};

	const nodes = [];
	const lines = [];
	var intersections = [];
	const radius = 5;
	const cWidth = 1000;
	const cHeight = 1000;

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

	function edges(p1, p2)
	{
		var a = (p1.y - p2.y) / (p1.x - p2.x);
		if (a === Infinity) {
			console.log('slope is infinite');
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

	canvas.addEventListener("click", function (e) {
		nodes.push({x: user.x, y: user.y});
	});

	function update() {
		while (nodes.length > 1) {
			let p1 = nodes.pop();
			let p2 = nodes.pop();

			let line = edges(p1, p2);
			lines.push(line);
		}
		if (lines.length >= 2) {
			intersections = []
			for (let l1 = 0; l1 < lines.length; l1++) {
				for (let l2 = 0; l2 < l1; l2++) {
					intersections.push(intersect(lines[l1], lines[l2]));
				}
			}
		}
	}

	function render() {
		update();
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let node of nodes) {
			ctx.beginPath();
			ctx.arc(node.x, node.y, radius, 0, 2*Math.PI);
			ctx.fill();
		}
		for (let line of lines) {
			ctx.beginPath();
			ctx.moveTo(line.start.x, line.start.y);
			ctx.lineTo(line.end.x, line.end.y);
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
