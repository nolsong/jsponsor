/*
 * Application
 *
 * user shall define this application object to use the routing and template features.
 * they can add sub components such as view, controller, service to an application object directly,
 * but it's recommended to use a package to collect reusable components at one place.
 */

(function() {
    'use strict';

    /*
        shortcut functions
     */
    var registerViewComponent = jSponsor.ui.registerViewComponent.bind(jSponsor.ui),
        setService = jSponsor.injector.setService.bind(jSponsor.injector),
        setController = jSponsor.injector.setController.bind(jSponsor.injector),
        setWorker = jSponsor.injector.setWorker.bind(jSponsor.injector),
        registerRoute = jSponsor.router.register.bind(jSponsor.router);

    var exception = jSponsor.exception,
        util = jSponsor.util;

    /*
        private module error
     */
    var appErr = exception.errorFactory('App');


    /*
     * Application Manager
     *
     * multiple application will not be supported,
     * so if user define several application object, routing conflict exception will be arisen.
     * appManager is responsible for managing app's life cycle and connecting app with package.
     */
    var apps = {};

    jSponsor.appManager = {
        createApplication : function(name, config) {
            if (this.getApplication(name) !== undefined) {
                throw appErr('exist', 'failed to create application: {0}, already exist', name);
            }
            return apps[name] = createAppInstance(name, config);
        },
        flush: function() { apps = {}; },
        getApplication : function(name) { return apps[name]; }
    };


    function createAppInstance(name, config) {
        config = config || {};

        try {
            var mainPackage = jSponsor.pkgMgr.createPackage(name + '-main-package', config.packages);

            mainPackage.loadRequires();

            var componentBuilder = createComponentBuilder(mainPackage);
            componentBuilder.buildPackageComponents();
        } catch(e) {
            exception.exceptionHandle(e);
        }


        /*
            Application interface
         */
        return {
            name: name,
            packages: config.packages,
            view: function(name, param) {
                mainPackage.view(name, param);
                componentBuilder.buildView(name, param);
            },
            controller: function(name, dependency, constructor) {
                mainPackage.controller(name, dependency, constructor);
                componentBuilder.buildController(name, dependency, constructor);
            },
            service: function(name, dependency, constructor) {
                mainPackage.service(name, dependency, constructor);
                componentBuilder.buildService(name, dependency, constructor);
            },
            worker: function(name, constructor) {
                mainPackage.worker(name, constructor);
                componentBuilder.buildWorker(name, constructor);
            },
            route: function(routeInfos) {
                registerRoute(routeInfos);
            }
        };
    }

    function createComponentBuilder(pack) {
        if (isPackage(pack) !== true) {
            throw appErr('not found', 'failed to create component builder, incoming param is not package instance');
        }

        var componentBuildData = pack.unpack();

        /*
            Component Builder interface
         */
        return {
            buildPackageComponents: function() {
                var self = this;

                util.iterate(componentBuildData.views, function(viewName, buildData) {
                    self.buildView(viewName, buildData);
                });
                util.iterate(componentBuildData.controllers, function(ctrlName, buildData) {
                    self.buildController(ctrlName, buildData.dependency, buildData.constructor);
                });
                util.iterate(componentBuildData.services, function(srvName, buildData) {
                    self.buildService(srvName, buildData.dependency, buildData.constructor);
                });
                util.iterate(componentBuildData.workers, function(workerName, buildData) {
                    self.buildWorker(workerName, buildData);
                });
            },
            buildView: function(name, param) {
                registerViewComponent({
                    viewName: name,
                    ownerDoc: param.document,
                    controller: param.controller,
                    onLoaded: param.ready,
                    onAttrChanged: param.updatedAttribute
                });
            },
            buildController: function(name, dependency, constructor) {
                setController(name, dependency, constructor);
            },
            buildService: function(name, dependency, constructor) {
                setService(name, dependency, constructor);
            },
            buildWorker: function(name, constructor) {
                setWorker(name, constructor);
            }
        };

        /*
            inner functions
         */
        function isPackage(pack) {
            return !!(pack && pack.unpack);
        }
    }

})();