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

	function intersect(l1, l2)
	{
		var {start: p1, end: p2} = l1
		var {start: p3, end: p4} = l2

		var ua, ub, denom = (p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y);
		if (denom == 0) {
			return null;
		}
		ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x))/denom;
		ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x))/denom;
		return {
			x: p1.x + ua * (p2.x - p1.x),
			y: p1.y + ub * (p2.y - p1.y),
			seg1: ua >= 0 && ua <= 1,
			seg2: ub >= 0 && ub <= 1
		};
	}

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
			let start = nodes.pop();
			let end = nodes.pop();

			lines.push({start: start, end: end});
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
		ctx.beginPath();
		ctx.arc(10, 10, 10, 0, 2*Math.PI);
		ctx.fill();
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
