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
            // ���� new���� �ʾƼ� return undefined�� ���̴�. �׷��ٸ� ActivatedUI ��ü�� ���� controller ��ü�� ���� ���̴�.
            var viewModel = null;
            var dependentArgs = resolveDependency(createInfo.dependency);
            if (dependentArgs && Array.isArray(dependentArgs) === true) {
                var vmIndex = createInfo.dependency.indexOf('$viewModel');
                viewModel = dependentArgs[vmIndex];
                // �Ʒ� bind �Լ��� ù ���ڰ� binding�� ��ü�̹Ƿ� null�� �ش�.
                dependentArgs.unshift(null);
            }

            // ECMA5 �������� new�� apply�� �Բ� �� �� ��� ��Ʃ�� ���� ��ũ���� ��ٰ� �Ѵ�.
            // ������ ���� bind �Լ��� ���� �����ڸ� ȣ���ϸ� spread �� �� �ִ�.
            // ECMA6������ ���� ��ü���� spread�� �����Ѵٰ� �Ѵ�.
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
        // framework ���� ���ǵ� dependency �ΰ�?
        switch(name) {
            case '$viewModel':
                return {name: 'viewModel'};
        }
        // �ƴϸ� user custom service �̴�.
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