var express = require('express');
var nunjucks = require('nunjucks');
var bodyParser = require('body-parser');
var expressWs  = require('express-ws')(express());
var dateFormat = require('dateformat');

var app = expressWs.app;

// POST parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/static', express.static(__dirname + '/static'));

// Provide the websocket server to any attached applications
app.use(function (req, res, next) {
	res.locals = {
		ws: expressWs.getWss(),
	};
	next();
});


nunjucks.configure(__dirname + '/templates', {
	autoescape: true,
	express: app
});

dateFormat.masks.updateTime = 'mmmm dS, yyyy \'at\' h:MM:ss TT';


/*******************************************************************************
 * Local state
 ******************************************************************************/

// status = {
//  group: {
//   status-item: {value: val, time: date}
//  }
// }
var statuses = {};

var DEFAULT_GROUP = 'Global';

app.ws('/ws', function (req, res) { });

app.get('/', function (req, res) {
	res.render('index.nunjucks', {
		statuses: statuses
	});
});

app.post('/update', function (req, res) {
	// Get the group of this status item
	var group = DEFAULT_GROUP;
	if ('group' in req.body) {
		group = req.body.group;
	}

	// Get the actual name
	var key = req.body.key;

	// Get the status
	var value = req.body.value;

	if (key !== undefined && value !== undefined) {
		// Got a valid status update
		if (!(group in statuses)) {
			statuses[group] = {};
		}
		if (!(key in statuses[group])) {
			statuses[group][key] = {};
		}
		var now = new Date();
		statuses[group][key]['value'] = value;
		statuses[group][key]['timestamp'] = Date.now();
		statuses[group][key]['timestr'] = dateFormat(now, "updateTime");
	}

	res.locals.ws.clients.forEach(function (client) {
		try {
			client.send(JSON.stringify({
				group: group,
				key: key,
				value: value,
			}));
		} catch (e) { }
	});

	res.end();
});

var server = app.listen(10201, function () {
	// var host = server.address().address;
	// var port = server.address().port;

	// console.log('Listening for devices at http://%s:%s', host, port);
});
