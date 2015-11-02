'use strict';

describe("base", function() {
    it("should have jSponsor global object", function() {
        expect(jSponsor).toBeDefined();
    });

    it("should have jSponsor.info object", function() {
        expect(jSponsor.info).toBeDefined();
    });

    it("should have version string", function() {
        expect(typeof jSponsor.info.version).toEqual("string");
    });
});
