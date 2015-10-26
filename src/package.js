(function() {
    'use strict';

    /*
        shortcuts
     */
    var util = jSponsor.util;

    var packErr = util.errorFactory('Package');

    // cache
    var packages = {};

    // package manager
    jSponsor.pkgMgr = {
        createPackage: function(name, requirePackages) {
            if (packages[name]) {
                throw packErr('exist', 'failed to create package: {0}, already exist', name);
            }

            return packages[name] = createPackageInstance(name, requirePackages);
        },
        getPackage: function(name) { return packages[name]; }
    };

    /*
        Package
        component들에 대한 build info를 통합 관리
        다른 package와 merge, dependency package들을 load하는 등의 역할을 한다.
     */
    function createPackageInstance(name, requirePackages) {
        var buildData = {
            views: {},
            controllers: {},
            services: {}
        };

        requirePackages = util.makeArray(requirePackages);

        /*
            package interface
         */
        return {
            name: name,
            // remove duplicated package names
            requires: util.stripDups(requirePackages),
            view: function(name, param) {
                buildData.views[name] = param;
                return this;
            },
            controller: function(name, dependency, constructor) {
                buildData.controllers[name] = {
                    dependency: dependency,
                    constructor: constructor
                };
                return this;
            },
            service: function(name, dependency, constructor) {
                buildData.services[name] = {
                    dependency: dependency,
                    constructor: constructor
                };
                return this;
            },
            unpack: function() {
                return buildData;
            },
            loadRequires: function() {
                var reqs = this.requires;

                if (checkRequires(reqs) === false) {
                    return;
                }

                var packs = getPackageInstances(reqs);
                packs.forEach(function(pack) {
                    if (pack) {
                        mergeComponents(buildData, pack.unpack());
                    }
                });
            }
        };

        /*
         inner functions
         */
        function checkRequires(requires) {
            // ensure that sub dependent packages have been loaded
            for(var i = 0; i < requires.length; i++) {
                var req = requires[i];
                if (packages[req] === undefined) {
                    console.log('failed to get package[' + name + '], reason: can not load this package: ' + packages[req]);
                    return false;
                }
            }
            return true;
        }

        function getPackageInstances(packageNames) {
            var packageObjs = [];
            if (!packageNames) { return packageObjs; }

            packageNames.forEach(function(packName) {
                packageObjs.push(jSponsor.pkgMgr.getPackage(packName));
            });
            return packageObjs;
        }

        function mergeComponents(dest, target) {
            if (!dest || !target) {
                return;
            }

            util.extend(dest.views, target.views);
            util.extend(dest.controllers, target.controllers);
            util.extend(dest.services, target.services);
        }
    }
})();