(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.service('product', ['$log'], function($log) {
        var logger = $log.getLogger('product');
        var srv = {
            name: 'beer'
        };

        srv.getName = function() {
            return this.name;
        };

        logger.info('-----[service] product is created!');
        return srv;
    });
})();