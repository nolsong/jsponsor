'use strict';

describe('injector', function() {

    beforeEach(function() {
        jSponsor.injector.flush();
    });

    it("should get defined controller/service after setting it", function() {
        jSponsor.injector.setController('testController', [], function() {});

        var controller = jSponsor.injector.getController('testController');
        expect(controller).toBeDefined();

        jSponsor.injector.setService('testService', [], function() {
            return {
                name: 'abc'
            };
        });

        var service = jSponsor.injector.getService('testService');
        expect(service).toBeDefined();
        expect(service.name).toEqual('abc');
    });

    it("should not be able to get a controller/service object without setting", function() {
        var controller;

        try {
            controller = jSponsor.injector.getController('testController');
        } catch(e) {
            expect(controller).toBeUndefined();
            expect(e).toBeDefined();
        }
    });

    it("should be able to resolve dependent components", function() {
        jSponsor.injector.setService('service1', [], function() {
            return {
                name: 'service1'
            };
        });

        jSponsor.injector.setService('service2', ['service1'], function() {
            return {
                name: 'service2'
            };
        });

        jSponsor.injector.setController('myController', ['service1', 'service2'], function(service1, service2) {
            expect(service1).toBeDefined();
            expect(service2).toBeDefined();
            expect(service1.name).toEqual('service1');
            expect(service2.name).toEqual('service2');
            expect(service1).not.toEqual(service2);
            expect(service1).toEqual(jSponsor.injector.getService('service1'));
            expect(service2).toEqual(jSponsor.injector.getService('service2'));
        });

        jSponsor.injector.getController('myController');
    });


});
