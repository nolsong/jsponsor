(function() {
    'use strict';

    /*
        shortcut functions
     */
    var registerViewComponent = jSponsor.ui.registerViewComponent.bind(jSponsor.ui),
        setService = jSponsor.injector.setService.bind(jSponsor.injector),
        setController = jSponsor.injector.setController.bind(jSponsor.injector),
    /*
            component.html에 <script src='route.js'>가 있을 때 아래 registerRoute( ) 호출 시
            내부적인 this와 jSponsor.router가 서로 다른 객체를 가지고 있었다;;
            component.html이 HTML import로 호출되어 중복된 script load는 100% 차단된 줄 알았는데
            이와 관련된 side로 jSponsor.router 객체가 전역 객체에 새로 덥어 쓴 것이다...
            이런 문제를 조심하자.
         */
        registerRoute = jSponsor.router.register.bind(jSponsor.router);

    var util = jSponsor.util;

    /*
        private module error
     */
    var appErr = util.errorFactory('App');

    /*
     multiple app을 동시지원할 경우 router에서 현재 page의 href를 공유하므로 충돌이 생길 것이다.
     하지만 router 부분을 제외하고는 동시에 여러 app을 정의하고 운용할 수도 있다.
     기본 concept은 single app이지만 app manager를 통해 life cycle을 관리하도록 한다.
     */
    var apps = {};

    jSponsor.appManager = {
        createApplication : function(name, config) {
            if (this.getApplication(name) !== undefined) {
                throw appErr('exist', 'failed to create application: {0}, already exist', name);
            }
            return apps[name] = createAppInstance(name, config);
        },
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
            util.exceptionHandle(e);
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

                iterate(componentBuildData.views, function(viewName, buildData) {
                    self.buildView(viewName, buildData);
                });
                iterate(componentBuildData.controllers, function(ctrlName, buildData) {
                    self.buildController(ctrlName, buildData.dependency, buildData.constructor);
                });
                iterate(componentBuildData.services, function(srvName, buildData) {
                    self.buildService(srvName, buildData.dependency, buildData.constructor);
                });
            },
            buildView: function(name, param) {
                registerViewComponent(name, param.document, param.ready, param.controller);
            },
            buildController: function(name, dependency, constructor) {
                setController(name, dependency, constructor);
            },
            buildService: function(name, dependency, constructor) {
                setService(name, dependency, constructor);
            }
        };

        /*
            inner functions
         */
        function isPackage(pack) {
            return !!(pack && pack.unpack);
        }
        function iterate(obj, fn) {
            if (!obj || typeof fn !== 'function') { return; }

            Object.keys(obj).forEach(function(key) {
                fn(key, obj[key]);
            });
        }
    }

})();