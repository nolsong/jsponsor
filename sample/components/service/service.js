/**
 * Created by nol on 2015-09-06.
 */
(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.service('product', [], function() {
        var srv = {
            name: 'beer'
        };

        srv.getName = function() {
            return this.name;
        };

        console.log('-----[service] product is created!');
        return srv;
    });
})();