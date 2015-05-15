// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.
google.load("visualization", "1", {packages: ["corechart"]});
var chart = null;

// Initialize map
(function () {
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
            login: function () {
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

    function generateSprite(size, color) {
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

        gradient.addColorStop(1.0, 'rgba(' + convertColor(color).join() + ',0)');
        gradient.addColorStop(0.0, 'rgba(' + convertColor(color).join() + ',1)');
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

    function redrawChart(displayData) {
        // map the input so that it can be consumed by google charts
        var outData = displayData.map(function (ar) {
            return [ar.entry["Crime"], parseInt(ar.entry["Incidents"])]
        });

        // aggregate
        var aggr = {};
        for (var i = 0; i < outData.length; i++) {
            var c = outData[i];
            if (aggr.hasOwnProperty(c[0])) {
                aggr[c[0]] += c[1]
            } else {
                aggr[c[0]] = c[1]
            }
        }
        ;
        var keys = Object.keys(aggr)
        outData = []
        for (var i = 0; i < keys.length; i++) {
            outData.push([keys[i], aggr[keys[i]]])
        }
        ;

        // add header
        outData.unshift(["Crime Type", "Count"])

        var data = new google.visualization.arrayToDataTable(outData);

        var options = {
            title: 'Incident count by type',
            legend: {position: 'none'},
            chartArea: {left: 125}
            //hAxis: {ticks: ticks}
        };

        chart.draw(data, options);
    }

    function displayChart() {

        var chartDiv = document.createElement('div');
        chart = new google.visualization.BarChart(chartDiv);

        map.controls[google.maps.ControlPosition.LEFT_CENTER].push(chartDiv);
    };

    function addDataLayer(layer, sublayer, rawData) {
        var treePoints = [];

        var column = null;
        try {
            column = JSON.parse(sublayer.data.column).title;
        } catch(e) {
            column = null;
        }

        // Parse data
        var numRows = 0;
        Papa.parse(rawData, {
            header: true,
            worker: false,
            step: function (row) {
                if (!row.data || row.data.length < 1 || !!!row.data[0]['Location']) {
                    return;
                }

                if (column && sublayer.data.value && sublayer.data.value != '-- select --' && row.data[0][column] != sublayer.data.value) {
                    return;
                }

                var coords = row.data[0]['Location'].split(';');

                var lat = parseFloat(coords[0]), lng = parseFloat(coords[1]);
                var location = new google.maps.LatLng(lat, lng),
                    vertex = layer.fromLatLngToVertex(location);

                var data = {minLng: lng, minLat: lat, maxLng: lng, maxLat: lat, entry: row.data[0]};

                treePoints.push(data);
                if (treePoints.length % 5000 == 0) {
                    tree.load(treePoints);
                    treePoints = [];
                }

                sublayer.geometry.vertices.push(vertex);
                numRows++;
            }
        });

        if (treePoints.length) {
            tree.load(treePoints);
            treePoints = [];
        }

        var particles = new THREE.PointCloud(sublayer.geometry, sublayer.material);
        layer.add(particles);

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

        var moveTimeout = null;

        google.maps.event.addListener(map, 'mousemove', function (event) {
            // Check if there are any data in tree
            if(tree.data.children.length < 1) {
                return;
            }

            if(moveTimeout) {
                clearTimeout(moveTimeout);
            }

            moveTimeout = setTimeout(function() {
                var loc = event.latLng;
                console.log('Click, lng: ' + loc.lng() + ', lat:' + loc.lat());
                var point = [loc.lng(), loc.lat(), loc.lng(), loc.lat()];
                var result = knn(tree, point, options.knn.count);
                redrawChart(result);
                for (var i = 0; i < result.length; i++) {
                    console.log(result[i].entry);
                }

                moveTimeout = null;
            }, 50);

        });

        // Initialize three.js layer
        layer = new ThreejsLayer({map: map}, function (layer) {

        });

        displayChart();

        // And finally initLoop
        initLoop();
    }

    function getProjects() {
        var d = $.Deferred();

        gooddata.xhr.get('/gdc/md/').then(function (dataResult) {
            var projectValues = {
                '-- select --': null
            };

            for (var i = 0; i < dataResult.about.links.length; i++) {
                projectValues[dataResult.about.links[i].title] = dataResult.about.links[i].identifier;
            }

            options.project = '';

            d.resolve(projectValues);
        });

        return d.promise();
    }

    function getReports(project) {
        var d = $.Deferred();

        gooddata.xhr.get('/gdc/md/' + project + '/query/reports').then(function (dataResult) {
            var reportValues = {
                '-- select --': null
            };

            for (var i = 0; i < dataResult.query.entries.length; i++) {
                var report = dataResult.query.entries[i];
                if (/geosource/.test(report.tags)) {
                    reportValues[report.title] = JSON.stringify({
                        title: report.title,
                        link: report.link
                    });
                }
            }

            options.report = '';

            d.resolve(reportValues);
        });

        return d.promise();
    }

    function getColumns(report) {
        var d = $.Deferred();

        gooddata.xhr.get(report.link).then(function (dataResult) {
            options.reportDef = dataResult.report.content.definitions[dataResult.report.content.definitions.length - 1];
            gooddata.xhr.get(options.reportDef).then(function (dataResult) {
                var columnValues = {
                    '-- select --': null
                };

                for (var i = 0; i < dataResult.reportDefinition.content.grid.rows.length; i++) {
                    var row = dataResult.reportDefinition.content.grid.rows[i];
                    columnValues[row.attribute.alias] = JSON.stringify({
                        title: row.attribute.alias,
                        link: row.attribute.uri
                    });
                }

                options.column = '';

                d.resolve(columnValues);
            });
        });

        return d.promise();
    }

    function getColumnValues(column) {
        var d = $.Deferred();

        gooddata.xhr.get(column.link + '/elements?order=asc&limit=100').then(function (dataResult) {
            var valueValues = [];
            for (var i = 0; i < dataResult.attributeElements.elements.length; i++) {
                valueValues.push(dataResult.attributeElements.elements[i].title);
            }
            ;

            options.value = '';

            d.resolve(valueValues);
        });

        return d.promise();
    }

    function doLogin() {

        // Login
        gooddata.user.login(options.user.username, options.user.password).then(function () {
            var knn = gui.addFolder('KNN');
            knn.add(options.knn, 'count', 1, 1000).step(1);
            knn.open();
            // Ask for data for the given metric and attributes from the GoodSales project


            // TODO: Get project
            var projectFolder = gui.addFolder('Projects');

            var projectList = null;
            var reportList = null;
            var columnList = null;
            var valueList = null;

            function removeFolders(num) {
                if (num > 2 && reportList) {
                    projectFolder.remove(reportList);
                    reportList = null;
                }

                if (num > 1 && columnList) {
                    projectFolder.remove(columnList);
                    columnList = null;
                }

                if (num > 0 && valueList) {
                    projectFolder.remove(valueList);
                    valueList = null;
                }
            };

            getProjects().then(function (projects) {
                projectList = projectFolder.add(options, 'project', projects);
                projectList.onChange(function (project) {
                    getReports(project).then(function (reports) {
                        removeFolders(3);
                        reportList = projectFolder.add(options, 'report', reports);
                        reportList.onChange(function (reportRaw) {
                            var report = JSON.parse(reportRaw);
                            getColumns(report).then(function (columns) {
                                removeFolders(2);
                                columnList = projectFolder.add(options, 'column', columns);
                                columnList.onChange(function (columnRaw) {
                                    var column = JSON.parse(columnRaw);
                                    getColumnValues(column).then(function (values) {
                                        removeFolders(1);
                                        valueList = projectFolder.add(options, 'value', ['-- select --'].concat(values));
                                    });
                                });
                            });
                        });
                    });
                });
            });

            var layerNo = 0;

            // Initialize loop
            var layersCanvas = gui.addFolder('Layers');
            layersCanvas.add({
                'Add Layer': function () {
                    var layerName = '' + layerNo++ + ' - Layer ' + JSON.parse(options.report).title;
                    var layerFolder = layersCanvas.addFolder(layerName);

                    layerFolder.add({
                        'Remove this layer': function () {
                            layersCanvas.removeFolder(layerName);

                        }
                    }, 'Remove this layer');

                    var geometry = new THREE.Geometry();

                    var defaultSize = 16;
                    var newLayerOptions = {
                        color: '#ff0000',
                        blending: DEFAULT_BLENDING
                    };

                    var texture = new THREE.Texture(generateSprite(defaultSize, newLayerOptions.color));
                    texture.needsUpdate = true;

                    var material = new THREE.PointCloudMaterial({
                        size: defaultSize,
                        map: texture,
                        opacity: 0.3,
                        blending: BLENDING_TYPES[DEFAULT_BLENDING],
                        depthTest: true,
                        depthWrite: true,
                        transparent: true
                    });

                    var newLayer = {
                        geometry: geometry,
                        material: material,
                        options: newLayerOptions,
                        data: {
                            project: options.project,
                            report: options.report,
                            reportDefinition: options.reportDef,
                            column: options.column,
                            value: options.value
                        }
                    };

                    function update() {
                        material.map = new THREE.Texture(generateSprite(material.size, newLayer.options.color));
                        material.map.needsUpdate = true;
                        layer.render();
                    }

                    layerFolder.add(newLayer.material, 'size', 2, 1024).onChange(update);
                    layerFolder.add(newLayer.material, 'opacity', 0.1, 1).onChange(update);
                    layerFolder.addColor(newLayer.options, 'color').onChange(update);
                    layerFolder.add(newLayer.options, 'blending', Object.keys(BLENDING_TYPES)).onChange(function () {
                        newLayer.material.blending = BLENDING_TYPES[newLayer.options.blending];
                        newLayer.material.needsUpdate = true;
                        layer.render();
                    });

                    gooddata.xhr.post('/gdc/app/projects/' + newLayer.data.project + '/execute/raw/', {data: '{"report_req":{"reportDefinition":"' + newLayer.data.reportDefinition + '"}}'}).then(function (dataResult) {
                        $.ajax({
                            url: dataResult.uri,
                            type: "GET",
                            beforeSend: function (xhr) {
                                xhr.setRequestHeader("Accept", "text/csv");
                            },
                            success: function (res) {
                                addDataLayer(layer, newLayer, res).render();
                            },
                            error: function (err) {

                            }
                        });
                    });

                    options.layers.push(newLayer)
                    layerFolder.open();

                }
            }, 'Add Layer');
        });
    };

    // Set listener which will trigger initialization after everything is loaded
    google.maps.event.addDomListener(window, 'load', initialize);
}());
