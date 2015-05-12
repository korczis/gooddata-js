// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.
var projectId = 'la84vcyhrq8jwbu4wpipw66q2sqeb923', // GoodSales Demo
    user = 'tomas.korcak@gooddata.com',
    passwd = '';

// Report elements identifiers from which we execute a GD report
var metric = 'afSEwRwdbMeQ',
    attr1 = 'oppclose.aam81lMifn6q',
    attr2 = 'label.opp_owner.id.name';
var elements = [attr1, attr2, metric];

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
        gradient.addColorStop(1.0, 'rgba(255,0,0,0)');
        gradient.addColorStop(0.0, 'rgba(255,0,0,1)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        return canvas;
    }

    var tick = function(stats) {

        stats.begin();

        // monitored code goes here

        stats.end();

        requestAnimationFrame(function() {
            tick(stats);
        });
    };

    function initLoop() {
        var stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms

        // align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.body.appendChild( stats.domElement );

        requestAnimationFrame(function() {
            tick(stats);
        });
    };

    function initialize() {
        var mapOptions = {
            zoom: 8,
            center: new google.maps.LatLng(-34.397, 150.644),
            mapTypeControlOptions: {
                mapTypeIds: []
            },
            streetViewControl: false,
            disableDefaultUI: true
        };

        var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        new ThreejsLayer({ map: map }, function(layer){
            var geometry = new THREE.Geometry(),
                texture = new THREE.Texture(generateSprite()),
                material, particles;

            for(var i = 0; i < 100; i++) {
                var location = new google.maps.LatLng(-34.397 + Math.random(), 150.644 + Math.random()),
                    vertex = layer.fromLatLngToVertex(location);
                geometry.vertices.push( vertex );
            }

            texture.needsUpdate = true;
            material = new THREE.PointCloudMaterial({
                size: 128,
                map: texture,
                opacity: 0.3,
                blending: THREE.NormalBlending,
                depthTest: false,
                depthWrite:false,
                transparent: true
            });
            particles = new THREE.PointCloud( geometry, material );
            layer.add(particles);

            var gui = new dat.GUI();
            function update(){
                material.map = new THREE.Texture(generateSprite(material.size));
                layer.render();
            }

            gui.add(material, 'size', 2, 100).onChange(update);
            gui.add(material, 'opacity', 0.1, 1).onChange(update);

            // And finally initLoop
            initLoop();
        });
    }

    google.maps.event.addDomListener(window, 'load', initialize);
}());

// Login
gooddata.user.login(user, passwd).then(function() {
    // Ask for data for the given metric and attributes from the GoodSales project
    gooddata.execution.getData(projectId, elements).then(function(dataResult) {
        // Yay, data arrived

        console.log(dataResult);
    });
});
