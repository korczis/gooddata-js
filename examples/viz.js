// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.

// Initialize map
(function () {
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
        "no": THREE.NoBlending,
        "normal": THREE.NormalBlending,
        "additive": THREE.AdditiveBlending,
        "substractive": THREE.SubtractiveBlending,
        "multiply": THREE.MultiplyBlending

    };
    var DEFAULT_BLENDING = "normal";

    // GUI Layer
    var gui = null;

    // Threejs layer
    var layer = null;

    // RBush Tree - https://github.com/mourner/rbush
    var tree = rbush(4, ['.minLng', '.minLat', '.maxLng', '.maxLat']);

    // For calculating tick time
    var lastCalledTime = Date.now();

    // FPS Stats
    var stats = null;

    var options = {
        color: "#ff0000",
        blending: DEFAULT_BLENDING,
        knn: {
            count: 10
        },
        user: {
            username: 'tomas.korcak+hackathon@gooddata.com',
            password: 'hackathon',
            login: function() {
                doLogin();
            }
        },
        layers: []
    };

    var map = null;

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

        var treePoints = [];

        for (var i = 0; i < dataResult.rawData.length; i++) {
            var entry = dataResult.rawData[i];
            var coords = entry[2].split(';');

            var lat = parseFloat(coords[0]), lng = parseFloat(coords[1]);
            var location = new google.maps.LatLng(lat, lng),
                vertex = layer.fromLatLngToVertex(location);

            var data = {minLng: lng, minLat: lat, maxLng: lng, maxLat: lat, entry: entry};

            treePoints.push(data);
            if(treePoints.length % 5000 == 0) {
                tree.load(treePoints);
                treePoints = [];
            }

            geometry.vertices.push(vertex);
        }

        if(treePoints.length) {
            tree.load(treePoints);
            treePoints = [];
        }

        // Refactor to function
        var display = document.createElement('h1');
        display.style.color = 'black';
        display.innerHTML = dataResult.rawData.length + ' points';
        var myTextDiv = document.createElement('div');
        myTextDiv.appendChild(display);
        map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(myTextDiv);

        texture.needsUpdate = true;
        material = new THREE.PointCloudMaterial({
            size: 16,
            map: texture,
            opacity: 0.3,
            blending: BLENDING_TYPES[DEFAULT_BLENDING],
            depthTest: true,
            depthWrite: true,
            transparent: true
        });
        particles = new THREE.PointCloud(geometry, material);
        layer.add(particles);

        function update() {
            material.map = new THREE.Texture(generateSprite(material.size));
            material.map.needsUpdate = true;
            layer.render();
        }

        var knn = gui.addFolder('KNN');
        knn.add(options.knn, 'count', 1, 1000).step(1);
        knn.open();

        // Initialize loop
        var layersCanvas = gui.addFolder('Layers');

        layersCanvas.add({
            '+':function() {
                var layerName = 'Layer ' + options.layers.length
                var layerFolder = layersCanvas.addFolder(layerName);

                layerFolder.add({'-':function(){
                    layersCanvas.removeFolder(layerName);

                }},'-');

                material = new THREE.PointCloudMaterial({
                    size: 16,
                    map: texture,
                    opacity: 0.3,
                    blending: BLENDING_TYPES[DEFAULT_BLENDING],
                    depthTest: true,
                    depthWrite: true,
                    transparent: true
                });

                var newLayer = {
                    material: material,
                    options: {
                        color: '#ff0000',
                        blending: DEFAULT_BLENDING
                    }
                };

                layerFolder.add(newLayer.material, 'size', 2, 1024).onChange(update);
                layerFolder.add(newLayer.material, 'opacity', 0.1, 1).onChange(update);
                layerFolder.addColor(newLayer.options, 'color').onChange(update);
                layerFolder.add(newLayer.options, 'blending', Object.keys(BLENDING_TYPES)).onChange(function () {
                    newLayer.material.blending = BLENDING_TYPES[newLayer.options.blending];
                    newLayer.material.needsUpdate = true;
                    layer.render();
                });

                options.layers.push(newLayer)
                layerFolder.open();

            }},'+');


        // And finally initLoop
        initLoop();

        return layer;
    };

    /**
     * Initialize everything what is needed
     */
    function initialize() {
        // Create default GUI
        gui = new dat.GUI();
        var userFolder = gui.addFolder('Login');
        userFolder.add(options.user, 'username');
        userFolder.add(options.user, 'password');
        userFolder.add(options.user, 'login');
        userFolder.open();

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
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        google.maps.event.addListener(map, 'click', function(event) {
            var loc = event.latLng;
            console.log('Click, lng: ' + loc.lng() + ', lat:' + loc.lat());
            var point = [loc.lng(), loc.lat(), loc.lng(), loc.lat()];
            var result = knn(tree, point, options.knn.count);
            for(var i = 0; i < result.length; i++) {
                console.log(result[i].entry);
            }
        });

        // Initialize three.js layer
        layer = new ThreejsLayer({map: map}, function (layer) {

        });
    }

    function doLogin

    function doLogin() {
        // Login
        gooddata.user.login(options.user.username, options.user.password).then(function () {
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

            gooddata.xhr.post('/gdc/app/projects/rq3enqarynvkt7q11u0stev65qdwpow8/execute/raw/', {data: '{"report_req":{"reportDefinition":"/gdc/md/rq3enqarynvkt7q11u0stev65qdwpow8/obj/1320"}}'}).then(function (dataResult) {
                //    // Yay, data arrived
                //
                console.log(dataResult.uri);
                gooddata.xhr.get(dataResult.uri).then(function (csvResult) {
                    // var data = Papa.parse(csvResult);
                    console.log(csvResult);
                });
            });
        });
    };

    // Set listener which will trigger initialization after everything is loaded
    google.maps.event.addDomListener(window, 'load', initialize);
}());
