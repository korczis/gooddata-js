// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.
var user = 'tomas.korcak@gooddata.com',
    passwd = '';

// Report elements identifiers from which we execute a GD report
//var metric = 'afSEwRwdbMeQ',
//    attr1 = 'oppclose.aam81lMifn6q',
//    attr2 = 'label.opp_owner.id.name';

var projectId = 'rq3enqarynvkt7q11u0stev65qdwpow8'
var metric = 'akaFDPTufOga',
    attr1 = 'label.incidentdata.category',
    attr2 = 'incidenttime.date.mmddyyyy',
    attr3 = 'label.locations.xy',
    attr4 = 'label.locations.neighbourhood';


var elements = [
    attr1,
    attr2,
    attr3,
    attr4,
    metric
];

var BLENDING_TYPES = {
    "additive": THREE.AdditiveBlending,
    "normal": THREE.NormalBlending,
    "substractive": THREE.SubtractiveBlending

};
var DEFAULT_BLENDING = "normal";

var projectId = 'rq3enqarynvkt7q11u0stev65qdwpow8',
    metric = 'aPgWeliOiAT7',
    attr1 = 'incidenttime.date.mmddyyyy',
    attr2 = 'label.incidentdata.category',
    attr3 = 'label.locations.xy',
    attr4 = 'label.locations.neighbourhood';

// Threejs layer
var layer = null;

// For calculating tick time
var lastCalledTime = Date.now();

// FPS Stats
var stats = null;

var options = {
    color: "#ff0000",
    startColor: "#ff0000",
    stopColor: "#ff0000",
    blending: DEFAULT_BLENDING
};

// Initialize map
(function () {
    // http://graphics.stanford.edu/~seander/bithacks.html
    // http://bocoup.com/weblog/find-the-closest-power-of-2-with-javascript/
    function nearestPow2(aSize) {
        return Math.pow(2, Math.round(Math.log(aSize) / Math.log(2)));
    }

    function convertColor(color) {
        var colorObject = new THREE.Color(color);
        return colorObject.toArray().map(function (c) {
            return parseInt(c * 255);
        });
    }

    function generateSprite(size) {
        var canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            gradient;

        size = nearestPow2(size || 128);

        canvas.width = size;
        canvas.height = size;
        gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );

        gradient.addColorStop(1.0, 'rgba(' + convertColor(options.color).join() + ',0)');
        gradient.addColorStop(0.0, 'rgba(' + convertColor(options.color).join() + ',1)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        return canvas;
    }

    /**
     * One tick
     */
    var tick = function () {
        // Begin of stats loop
        stats.begin();

        // Calculate delta from prev frame
        var delta = delta = (new Date().getTime() - lastCalledTime) / 1000;

        // Update
        lastCalledTime = Date.now();

        // TODO: Do heavy work here


        // End of stats loop
        stats.end();

        // Request another tick
        requestAnimationFrame(tick);
    };

    /**
     * Init update loop
     */
    function initLoop() {
        stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms

        // align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.body.appendChild(stats.domElement);

        requestAnimationFrame(tick);
    };

    function initLayer(layer, dataResult) {
        var geometry = new THREE.Geometry(),
            texture = new THREE.Texture(generateSprite()),
            material, particles;

        // Make sure we work with array
        dataResult = dataResult || [];

        for (var i = 0; i < dataResult.rawData.length; i++) {
            var entry = dataResult.rawData[i];
            var coords = entry[2].split(';');

            var lat = parseFloat(coords[0]), lng = parseFloat(coords[1]);
            var location = new google.maps.LatLng(lat, lng),
                vertex = layer.fromLatLngToVertex(location);
            geometry.vertices.push(vertex);
        }

        texture.needsUpdate = true;
        material = new THREE.PointCloudMaterial({
            size: 128,
            map: texture,
            opacity: 0.3,
            blending: BLENDING_TYPES[DEFAULT_BLENDING],
            depthTest: true,
            depthWrite: true,
            transparent: true
        });
        particles = new THREE.PointCloud(geometry, material);
        layer.add(particles);

        var gui = new dat.GUI();

        function update() {
            material.map = new THREE.Texture(generateSprite(material.size));
            material.map.needsUpdate = true;
            layer.render();
        }

        // Initialize loop
        var points = gui.addFolder('Points');

        points.add(material, 'size', 2, 1024).onChange(update);
        points.add(material, 'opacity', 0.1, 1).onChange(update);
        points.addColor(options, 'color').onChange(update);
        // points.addColor(options, 'startColor').onChange(update);
        // points.addColor(options, 'stopColor').onChange(update);
        points.add(options, 'blending', Object.keys(BLENDING_TYPES)).onChange(function () {
            material.blending = BLENDING_TYPES[options.blending];
            material.needsUpdate = true;
            layer.render();
        });

        points.open();

        // And finally initLoop
        initLoop();

        return layer;
    };

    /**
     * Initialize everything what is needed
     */
    function initialize() {
        var mapOptions = {
            zoom: 13,
            center: new google.maps.LatLng(37.773972, -122.431297),
            mapTypeControlOptions: {
                mapTypeIds: []
            },
            panControl: false,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            overviewMapControl: false,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
                position: google.maps.ControlPosition.LEFT_BOTTOM
            }
        };

        // Create google map
        var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        // Initialize three.js layer
        layer = new ThreejsLayer({map: map}, function (layer) {

        });
    }

    // Set listener which will trigger initialization after everything is loaded
    google.maps.event.addDomListener(window, 'load', initialize);

    // Login
    gooddata.user.login(user, passwd).then(function () {
        // Ask for data for the given metric and attributes from the GoodSales project
        var params = {
            filters: [{
                "incidenttime.aci81lMifn6q": {"id": 8059}
            }]
        };

        // TODO: Get the data here
        gooddata.execution.getData(projectId, elements).then(function(dataResult) {
            // Yay, data arrived

            initLayer(layer, dataResult).render();

            console.log(dataResult);
        });
    });
}());


