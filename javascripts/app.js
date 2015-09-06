var joystick = nipplejs.create({
	zone: document.getElementById('zone_joystick')
});

// Get debug elements and map them
var elDebug = document.getElementById('debug');
var elDump = elDebug.querySelector('.dump');
var els = {
	position: {
		x: elDebug.querySelector('.position .x .data'),
		y: elDebug.querySelector('.position .y .data')
	},
	force: elDebug.querySelector('.force .data'),
	distance: elDebug.querySelector('.distance .data'),
	angle: {
		radian: elDebug.querySelector('.angle .radian .data'),
		degree: elDebug.querySelector('.angle .degree .data')
	},
	direction: {
		x: elDebug.querySelector('.direction .x .data'),
		y: elDebug.querySelector('.direction .y .data'),
		angle: elDebug.querySelector('.direction .angle .data')
	}

};

joystick.on('start end', function (evt, data) {
	dump(evt.type);
	debug(data);
})
.on('move', function (evt, data) {
	debug(data);
})
.on('dir:up plain:up dir:left plain:left dir:down plain:down dir:right plain:right', function (evt, data) {
	dump(evt.type);
});

// Print data into elements
function debug (obj) {
	function parseObj (sub, el) {
		for (var i in sub) {
			if (typeof sub[i] === 'object') {
				parseObj(sub[i], el[i]);
			} else {
				el[i].innerHTML = sub[i];
			}
		}
	}
	parseObj(obj, els);
}
var nbEvents = 0;
// Dump data
function dump (evt) {
	if (elDump.children.length > 5) {
		elDump.removeChild(elDump.firstChild);
	}
	var newEvent = document.createElement('div');
	newEvent.innerHTML = '#' + nbEvents + ' : <span class="data">' + evt + '</span>';
	elDump.appendChild(newEvent);
	nbEvents += 1;
}
