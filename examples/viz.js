// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.
var user = 'tomas.korcak@gooddata.com',
    passwd = '';

// Report elements identifiers from which we execute a GD report
//var metric = 'afSEwRwdbMeQ',
//    attr1 = 'oppclose.aam81lMifn6q',
//    attr2 = 'label.opp_owner.id.name';

//var projectId = 'ke0kk4gso44wykymy35h41vb7t0sdsiv'
//    metric = 'amyDTB56dJ5p',
//    attr1 = 'Crime.date.mmddyyyy',
//    attr2 = 'label.Time.Time',
//    attr3 = 'label.Incident.Category',
//    attr4 = 'label.Incident.GeoLatitude',
//    attr5 = 'label.Incident.GeoLongitude';

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

var elements = [
    attr1,
    attr2,
    attr3,
    attr4,
    metric
];

// For calculating tick time
var lastCalledTime = Date.now();

// FPS Stats
var stats = null;

var options = {
    color: "#ff0000",
    blending: DEFAULT_BLENDING
};

// Initialize map
(function() {
    function generateSprite(size) {
        var canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            gradient;

            size = size || 128;

        canvas.width = size;
        canvas.height = size;
        gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );

        var colorObject = new THREE.Color(options.color);
        var color = colorObject.toArray().map(function(c) { return parseInt(c * 255); });

        gradient.addColorStop(1.0, 'rgba(' + color.join() + ',0)');
        gradient.addColorStop(0.0, 'rgba(' + color.join() + ',1)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        return canvas;
    }

    /**
     * One tick
     */
    var tick = function() {
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

        document.body.appendChild( stats.domElement );

        requestAnimationFrame(tick);
    };

    /**
     * Initialize everything what is needed
     */
    function initialize() {
        var mapOptions = {
            zoom: 8,
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
        new ThreejsLayer({ map: map }, function(layer){
            var geometry = new THREE.Geometry(),
                texture = new THREE.Texture(generateSprite()),
                material, particles;

            for(var i = 0; i < 100000; i++) {
                var location = new google.maps.LatLng(37.773972 + Math.random() * 10, -122.431297 + Math.random() * 10),
                    vertex = layer.fromLatLngToVertex(location);
                geometry.vertices.push( vertex );
            }

            texture.needsUpdate = true;
            material = new THREE.PointCloudMaterial({
                size: 128,
                map: texture,
                opacity: 0.3,
                blending: BLENDING_TYPES[DEFAULT_BLENDING],
                depthTest: true,
                depthWrite:true,
                transparent: true
            });
            particles = new THREE.PointCloud( geometry, material );
            layer.add(particles);

            var gui = new dat.GUI();
            function update(){
                material.map = new THREE.Texture(generateSprite(material.size));
                material.map.needsUpdate = true;
                layer.render();
            }

            // Initialize loop
            var points = gui.addFolder('Points');

            points.add(material, 'size', 2, 1024).onChange(update);
            points.add(material, 'opacity', 0.1, 1).onChange(update);
            points.addColor(options, 'color').onChange(update);
            points.add(options, 'blending', Object.keys(BLENDING_TYPES)).onChange(function() {
                material.blending = BLENDING_TYPES[options.blending];
                material.needsUpdate = true;
                layer.render();
            });

            points.open();

            // And finally initLoop
            initLoop();
        });
    }

    // Set listener which will trigger initialization after everything is loaded
    google.maps.event.addDomListener(window, 'load', initialize);
}());

// Login
gooddata.user.login(user, passwd).then(function() {
    // Ask for data for the given metric and attributes from the GoodSales project
    var params = {
        filters: [{
            "incidenttime.aci81lMifn6q": {"id": 8059 }
        }]
    };

    gooddata.execution.getData(projectId, elements, params).then(function(dataResult) {
        // Yay, data arrived

        console.log(dataResult);
    });
});

