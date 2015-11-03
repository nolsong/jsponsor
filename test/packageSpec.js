'use strict';

describe("package", function() {
    var packMan = jSponsor.pkgMgr;

    beforeEach(function() {
        packMan.flush();
    });

    it("should return valid package object with createPackage()", function() {
        var pack = packMan.createPackage('testPackage', []);
        expect(pack).toBeDefined();
        expect(pack).toEqual(packMan.getPackage('testPackage'));
        expect(pack.name).toBe('testPackage');
    });

    it("should not be able to get package objects with same name", function() {
        var pack1, pack2;

        try {
            pack1 = packMan.createPackage('testPack', []);
            pack2 = packMan.createPackage('testPack', []);
        } catch(e) {
            expect(e).toBeDefined();
        }

        expect(pack1).toBeDefined();
        expect(pack2).toBeUndefined();
    });

    it("should resolve dependent packages", function() {
        var rootPack = packMan.createPackage('root', []);
        var child1 = packMan.createPackage('child1', ['root']);
        var child2 = packMan.createPackage('child2', ['root', 'child1', 'root']);
        var child3 = packMan.createPackage('child3', ['child1', 'child2']);

        expect(rootPack).toBeDefined();
        expect(child1).toBeDefined();
        expect(child2).toBeDefined();
        expect(child3).toBeDefined();

        expect(rootPack.requires).toEqual([]);
        expect(child1.requires).toEqual(['root']);
        // should be removed duplicated elements
        expect(child2.requires).toEqual(['root', 'child1']);
        expect(child3.requires).toEqual(['child1', 'child2']);
    });
});

