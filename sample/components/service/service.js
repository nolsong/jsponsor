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

    pack.worker('sortWorker', function() {
        return {
            bubbleSort: function(arr) {
                if (!arr) { return; }

                var i, j;
                for (i = arr.length - 1; i > 0; i--) {
                    for (j = 0; j < i; j++) {
                        if (arr[j] > arr[j + 1]) {
                            swap(arr, j, j + 1);
                        }
                    }
                }

                return arr;
                function swap(arr, a, b) {
                    var temp = arr[a];
                    arr[a] = arr[b];
                    arr[b] = temp;
                }
            },
            getWorkerName: function() {
                return 'sortWorker';
            }
        };
    });
})();