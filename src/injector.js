/*
 * Injector
 *
 * Injector allows other modules to get components by just name without knowing about how to create them.
 * That make it easy to get decoupling between controller and service.
 */
(function() {
    'use strict';

    var exception = jSponsor.exception;
    var injectorErr = exception.errorFactory('Injector');

    var dependencyInfo = {
            controller: {},
            service: {},
            worker: {}
        };

    // cache for singleton instance
    var cache = {
            service: {},
            worker: {}
        };

    var injector = jSponsor.injector = {
        flush: function() {
            dependencyInfo = {
                controller: {},
                service: {},
                worker: {}
            };
            cache = {
                service: {},
                worker: {}
            };
        },
        setController: function(name, dependencyList, constructor) {
            dependencyInfo.controller[name] = {
                dependency: dependencyList,
                constructor: constructor
            };
        },
        getController: function(name, givenViewModel) {
            var createInfo = dependencyInfo.controller[name];
            if (!createInfo) {
                throw injectorErr('not found', 'can not found {0} controller', name);
            }

            // check their dependent services
            var dependentArgs = resolveDependency(createInfo.dependency);
            if (dependentArgs && Array.isArray(dependentArgs) === true) {
                var vmIndex = createInfo.dependency.indexOf('$viewModel');

                // upgrade a default viewModel
                if (givenViewModel) {
                    dependentArgs[vmIndex] = givenViewModel;
                }
                // put 'null' into the dependentArgs for bind method's first param.
                dependentArgs.unshift(null);
            }

            /* jshint -W058 */
            return new (Function.prototype.bind.apply(createInfo.constructor, dependentArgs));
        },
        setService: function(name, dependencyList, constructor) {
            dependencyInfo.service[name] = {
                dependency: dependencyList,
                constructor: constructor
            };
        },
        getService: function(name) {
            var cached = cache.service[name];
            if (cached) {
                return cached;
            }

            var createInfo = dependencyInfo.service[name];
            if (!createInfo) {
                return;
            }

            var instance = createInfo.constructor.apply(null, resolveDependency(createInfo.dependency));
            cache.service[name] = instance;

            return instance;
        },
        setWorker: function(name, constructor) {
            dependencyInfo.worker[name] = constructor;
        },
        getWorker: function(name) {
            var cached = cache.worker[name];
            if (cached) { return cached; }

            var constructor = dependencyInfo.worker[name];
            if (!constructor) {
                return;
            }

            var instance;
            try {
                instance = jSponsor.worker.createWorker(constructor);
                cache.worker[name] = instance;
            } catch(e) {
                exception.exceptionHandle(e);
            }

            return instance;
        }
    };

    function handleDependency(name) {
        // check if this is private object
        switch(name) {
            case '$viewModel':
                // default viewModel
                return {name: 'viewModel'};

            case '$router':
                return jSponsor.router;

            case '$http':
                return jSponsor.connector.http;

            case '$socketFactory':
                return jSponsor.connector.socketFactory;

            case '$remoteModel':
                return jSponsor.connector.remoteModel;

            case '$log':
                return jSponsor.logService;
        }
        // if not, this will be user custom service or worker
        var target = injector.getService(name) || injector.getWorker(name);
        if (!target) {
            throw injectorErr('not found', 'can not found {0} : dependent object', name);
        }

        return target;
    }
    function resolveDependency(depList) {
        if (!depList || depList.length === 0) {
            return;
        }

        var result = [];
        for (var i = 0; i < depList.length; i++) {
            result.push(handleDependency(depList[i]));
        }
        return result;
    }

})();