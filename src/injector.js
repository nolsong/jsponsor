(function() {
    'use strict';

    var util = jSponsor.util;
    var injectorErr = util.errorFactory('Injector');

    var dependencyInfo = {
            controller: {},
            service: {}
        },
        cache = {
            service: {}
        };

    var injector = jSponsor.injector = {
        setController: function(name, dependencyList, constructor) {
            dependencyInfo.controller[name] = {
                dependency: dependencyList,
                constructor: constructor
            };
        },
        getController: function(name) {
            var createInfo = dependencyInfo.controller[name];
            if (!createInfo) {
                throw injectorErr('not found', 'can not found {0} controller', name);
            }

            // check it's dependency services
            // 현재 new하지 않아서 return undefined일 것이다. 그렇다면 ActivatedUI 객체가 가진 controller 객체는 없을 것이다.
            var viewModel = null;
            var dependentArgs = resolveDependency(createInfo.dependency);
            if (dependentArgs && Array.isArray(dependentArgs) === true) {
                var vmIndex = createInfo.dependency.indexOf('$viewModel');
                viewModel = dependentArgs[vmIndex];
                // 아래 bind 함수의 첫 인자가 binding할 객체이므로 null로 준다.
                dependentArgs.unshift(null);
            }

            // ECMA5 이전에는 new와 apply를 함께 쓸 수 없어서 메튜가 만든 테크닉을 썼다고 한다.
            // 하지만 이젠 bind 함수를 통해 생성자를 호출하며 spread 할 수 있다.
            // ECMA6에서는 문법 자체에서 spread를 지원한다고 한다.
            var instance = new (Function.prototype.bind.apply(createInfo.constructor, dependentArgs));
            instance.viewModel = viewModel;
            return instance;
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
                throw injectorErr('not found', 'can not found {0} service', name);
            }

            var instance = createInfo.constructor.apply(null, resolveDependency(createInfo.dependency));
            cache.service[name] = instance;

            return instance;
        }
    };

    function handleDependency(name) {
        // framework 내부 정의된 dependency 인가?
        switch(name) {
            case '$viewModel':
                return {name: 'viewModel'};
        }
        // 아니면 user custom service 이다.
        return injector.getService(name);
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