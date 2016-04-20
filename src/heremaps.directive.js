/**
 * Created by Dmytro on 4/11/2016.
 */
module.exports = function(
    $window,
    Config,
    APIService,
    UtilsService,
    MarkersService,
    CONSTS) {
    return {
        restrict: 'EA',
        template: "<div ng-style=\"{'width': mapWidth, 'height': mapHeight}\"></div>",
        replace: true,
        scope: {
            coords: '=',
            zoom: '=',
            height: '=',
            width: '=',
            places: '=',
            events: '=' //TODO: support passing custom listeners
        },
        controller: function($scope, $element, $attrs) {
            console.log($scope)
            $scope.modules = {
                controls: !!$attrs.$attr.controls,
                pano: !!$attrs.$attr.pano,
                events: !!$attrs.$attr.events
            };

            $scope.heremaps = {};

            APIService.loadApiCore().then(_apiReady);

            _setMapSize();

            var _resizeMap = UtilsService.throttle(_resizeHandler, CONSTS.UPDATE_MAP_RESIZE_TIMEOUT);

            // $window.addEventListener('resize', _resizeMap); TODO

            $scope.$on('$destory', function(){
                $window.removeEventListener('resize', _resizeMap);
            });


            function _apiReady() {
                // TODO: Move to separate function - _SetupMap
                $scope.heremaps.platform = new H.service.Platform(Config);

                $scope.heremaps.layers = $scope.heremaps.platform.createDefaultLayers();

                if(typeof $scope.coords.lat === 'number' && typeof $scope.coords.lng === 'number') {
                    $scope.heremaps.map = new H.Map($element[0], $scope.heremaps.layers.normal.map, {
                        zoom: $scope.zoom || 10,
                        center: new H.geo.Point($scope.coords.lat, $scope.coords.lng)
                    });

                    _loadModules();    
                } else {
                    console.error('Missed coords');
                }
                

            }

            //TODO: should has been refactored/ use $attrs.$attr directly
            function _loadModules() {

                // APIService.loadModule($attrs.$attr, {
                //     "control": _uiModuleReady,
                //     "pano": _panoModuleReady
                // })

                if ($scope.modules.controls) {
                    APIService.loadUIModule().then(function() {
                        _uiModuleReady();
                    });
                }

                if ($scope.modules.pano) {
                    APIService.loadPanoModule().then(function() {
                        _panoModuleReady();
                    });
                }

                if ($scope.modules.events) {
                    APIService.loadEventsModule().then(function() {
                        _eventsModuleReady();
                    });
                }

            }
            //

            function _uiModuleReady() {
                // TODO: Use $scope.heremaps.ui.component
                $scope.uiComponent = H.ui.UI.createDefault($scope.heremaps.map, $scope.heremaps.layers);
            }

            function _panoModuleReady() {
                //$scope.heremaps.platform.configure(H.map.render.panorama.RenderEngine);
            }

            function _eventsModuleReady() {
                var map = $scope.heremaps.map,
                    events = $scope.heremaps.mapEvents = new H.mapevents.MapEvents(map),
                    behavior = $scope.heremaps.behavior = new H.mapevents.Behavior(events);

                map.addEventListener('tap', function(evt) {
                    console.log(evt.type, evt.currentPointer.type);
                });

                // disable the default draggability of the underlying map
                // when starting to drag a marker object:
                map.addEventListener('dragstart', function(ev) {
                    var target = ev.target;
                    if (target instanceof H.map.Marker) {
                        behavior.disable();
                    }
                }, false);

                // Listen to the drag event and move the position of the marker
                // as necessary
                map.addEventListener('drag', function(ev) {
                    var target = ev.target,
                        pointer = ev.currentPointer;
                    if (target instanceof mapsjs.map.Marker) {
                        target.setPosition(map.screenToGeo(pointer.viewportX, pointer.viewportY));
                    }
                }, false);

                // re-enable the default draggability of the underlying map
                // when dragging has completed
                map.addEventListener('dragend', function(ev) {
                    var target = ev.target;
                    if (target instanceof mapsjs.map.Marker) {
                        behavior.enable();
                    }
                }, false);

                MarkersService.addMarkerToMap($scope.heremaps, $scope.places);

            }

            function _resizeHandler() {
                _setMapSize();

                $scope.heremaps.map.getViewPort().resize();
            }

            function _setMapSize() {
                var height = $scope.height || CONSTS.DEFAULT_MAP_SIZE.HEIGHT,
                    width = $scope.width || CONSTS.DEFAULT_MAP_SIZE.WIDTH;

                $scope.mapHeight = height + 'px';
                $scope.mapWidth = width + 'px';

                UtilsService.runScopeDigestIfNeed($scope);
            }

        }
    }
};