'use strict';

describe("app manager", function() {

    beforeEach(function() {
        jSponsor.appManager.flush();
        jSponsor.pkgMgr.flush();
    });

    it("should be created default app object", function() {
       var app = jSponsor.appManager.createApplication('testApp');

       expect(app).not.toBeNull();
       expect(typeof app).toEqual("object");
    });

    it("should not create apps with same name", function() {
        try {
            var firstApp = jSponsor.appManager.createApplication('twinsApp');
            var secondApp = jSponsor.appManager.createApplication('twinsApp');
        } catch(e) {
            expect(e).toBeDefined();
        }

        expect(firstApp).not.toEqual(secondApp);
    });

    it("should return an app object by name", function() {
        var createdApp = jSponsor.appManager.createApplication('myApp');
        var foundApp = jSponsor.appManager.getApplication('myApp');

        expect(createdApp).toBeDefined();
        expect(foundApp).toBeDefined();
        expect(createdApp).toEqual(foundApp);
    });

    it("should have app interfaces", function() {
        var app = jSponsor.appManager.createApplication('testApp');

        expect(app).toBeDefined();
        expect(app.name).toEqual('testApp');
        expect(app.view).toBeDefined();
        expect(app.controller).toBeDefined();
        expect(app.service).toBeDefined();
        expect(app.route).toBeDefined();
    });

    it ("should have components of package that are imported", function() {
        var testPackage = jSponsor.pkgMgr.createPackage('testPackage', []);
        expect(testPackage).toBeDefined();

        testPackage.view('my-view', {});
        testPackage.controller('myController', [], function() {});
        testPackage.service('myService', [], function() { return {} } );

        var testApp = jSponsor.appManager.createApplication('testApp', {
            packages: ['testPackage']
        });

        expect(testApp).toBeDefined();
        expect(jSponsor.injector.getController('myController')).toBeDefined();
        expect(jSponsor.injector.getService('myService')).toBeDefined();
    });
});
