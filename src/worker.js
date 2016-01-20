(function() {
    'use strict';

    /*
        shortcut
     */
    var util = jSponsor.util,
        exception = jSponsor.exception,
        workerErr = exception.errorFactory('Worker');

    /*
        constant
     */
    // below code template will be used for worker backend
    var WORKER_SOURCE_CODE_TEMPLATE = function() {
        var constructor = '{{replaced_with_incoming_code}}';
        var workerObj = constructor();

        self.onmessage = function(e) {
            var method = e.data.method;
            if (!method) {
                self.postMessage('no method');
                return;
            }

            if (!workerObj[method] || typeof workerObj[method] !== 'function') {
                self.postMessage('there is no method: ' + method);
                return;
            }

            var res = workerObj[method].apply(workerObj, e.data.args);
            self.postMessage({
                method: method,
                id: e.data.id,
                result: res
            });
        };
    }.toString();

    // write constructor code into template
    function getWorkerSourceCode(constructor) {
        return "(" + WORKER_SOURCE_CODE_TEMPLATE.replace("\'{{replaced_with_incoming_code}}\'", constructor.toString()) + ")();";
    }

    /*
        Worker Proxy:
        worker proxy is user agent that has identical interface with the service returned by constructor.
        it just request to execute a function for worker and handle the message from worker.
     */
    function createWorkerProxy(path, constructor) {
        // id and waiting promise info are needed to take care of multiple simultaneous requests.
        var waitingPromises = {},
            getId = util.getIdPublisher();

        var worker = new Worker(path);
        worker.onmessage = function(e) {
            if (!e || !e.data) {
                throw workerErr("response message from worker is NOT valid format");
            }

            var data = e.data;
            var target = waitingPromises[data.id];
            if (!target) {
                throw workerErr("there is no worker handler");
            }

            target.resolve(data.result);
            delete waitingPromises[data.id];
        };

        var origin = constructor(),
            proxy = {};

        // make proxy functions
        for (var property in origin) {
            if (!origin.hasOwnProperty(property) || !util.isFunction(origin[property])) {
                continue;
            }
            proxy[property] = makeProxyFunction(property);
        }

        return proxy;

        function makeProxyFunction(name) {
            // origin methods should be replaced with the below function
            return function() {
                var args = [];

                for(var i = 0; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }

                var id = getId();
                // return promise object due to non-blocking processing
                return new Promise(function(resolve, reject) {
                    waitingPromises[id] = {
                        resolve: resolve,
                        reject: reject
                    };

                    worker.postMessage({
                        method: name,
                        id: id,
                        args: args
                    });
                });
            };
        }
    }

    jSponsor.worker = {
        createWorker: function(constructor) {
            if (!util.isFunction(constructor)) {
                throw workerErr("failed to create worker, because constructor param is not a function");
            }

            // build a worker source code with constructor and make a template blob code file for inline worker.
            var url = window.URL.createObjectURL(new Blob([getWorkerSourceCode(constructor)]));

            return createWorkerProxy(url, constructor);
        }
    };
})();
