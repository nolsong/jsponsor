(function() {
    'use strict';

    /*
        shortcut functions
     */
    var registerViewComponent = jSponsor.ui.registerViewComponent.bind(jSponsor.ui),
        setService = jSponsor.injector.setService.bind(jSponsor.injector),
        setController = jSponsor.injector.setController.bind(jSponsor.injector),
    /*
            component.html�� <script src='route.js'>�� ���� �� �Ʒ� registerRoute( ) ȣ�� ��
            �������� this�� jSponsor.router�� ���� �ٸ� ��ü�� ������ �־���;;
            component.html�� HTML import�� ȣ��Ǿ� �ߺ��� script load�� 100% ���ܵ� �� �˾Ҵµ�
            �̿� ���õ� side�� jSponsor.router ��ü�� ���� ��ü�� ���� ���� �� ���̴�...
            �̷� ������ ��������.
         */
        registerRoute = jSponsor.router.register.bind(jSponsor.router);

    var util = jSponsor.util;

    /*
        private module error
     */
    var appErr = util.errorFactory('App');

    /*
     multiple app�� ���������� ��� router���� ���� page�� href�� �����ϹǷ� �浹�� ���� ���̴�.
     ������ router �κ��� �����ϰ�� ���ÿ� ���� app�� �����ϰ� ����� ���� �ִ�.
     �⺻ concept�� single app������ app manager�� ���� life cycle�� �����ϵ��� �Ѵ�.
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