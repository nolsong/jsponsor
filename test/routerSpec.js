'use strict';

describe("router", function() {
    var router = jSponsor.router;

    beforeEach(function() {
        router.flush();
    });

    it("test for initial URL", function() {
        expect(router.getCurrentUrl()).toEqual('/');
    });

    it("should be checked that info param has Array type", function() {
        try {
            router.register({
                url: 'test',
                controller: 'testCtrl',
                view: 'views'
            });
        } catch(e) {
            expect(e).toBeDefined();
        }

        try {
            router.register([{
                url: 'test',
                controller: 'testCtrl',
                view: 'views'
            }]);
            expect(router.getRouteInfo('test')).toBeDefined();
        } catch(e) {
            expect(e).toBeUndefined();
        }
    });

    it("map should has valid information by register()", function() {
        router.register([{
            url: '/',
            controller: 'firstController',
            view: 'firstPage'
        }, {
            url: '/second',
            controller: 'secondController',
            view: 'secondPage'
        }]);

        var firstRouteInfo = router.getRouteInfo('/'),
            secondRouteInfo = router.getRouteInfo('/second');

        expect(firstRouteInfo).toBeDefined();
        expect(firstRouteInfo.controller).toEqual('firstController');
        expect(firstRouteInfo.view).toEqual('firstPage');

        expect(secondRouteInfo).toBeDefined();
        expect(secondRouteInfo.controller).toEqual('secondController');
        expect(secondRouteInfo.view).toEqual('secondPage');
    });

    it("test for changing the location", function() {
        router.register([{
            url: '/media',
            controller: 'moviePlayer',
            view: 'playPage'
        }, {
            url: '/',
            controller: 'root',
            view: 'rootPage'
        }]);

        try {
            router.location('/abc');
            expect(null).toEqual('should not come here');
        } catch(e) {
            expect(e).toBeDefined();
        }

        router.location('/media');

        expect(router.getCurrentUrl()).toEqual('/media');
        expect(window.location.hash).toEqual('#media');
        router.location('/');

        expect(router.getCurrentUrl()).not.toEqual('/media');
        expect(router.getCurrentUrl()).toEqual('/');
        expect(window.location.hash).toEqual('');
    });
});