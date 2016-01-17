(function() {
    'use strict';

    var util = jSponsor.util,
        defaultLogger = jSponsor.logService.getLogger();

    var fnHandler = function(exception) {
        defaultLogger.error(exception.message);
    };

    jSponsor.exception = {
        errorFactory: function(moduleName) {

            return function(errType) {
                var errText = '[' + moduleName + '][' + errType + ']',
                    errMsgArgs = [];

                for (var i = 1; i < arguments.length; i++) {
                    errMsgArgs.push(arguments[i]);
                }
                errText += util.stringFormat.apply(this, errMsgArgs);
                return new Error(errText);
            };
        },
        exceptionHandle: function(exception) {
            fnHandler(exception);
        },
        overrideExceptionHandler: function(handler) {
            if (util.isFunction(handler)) {
                fnHandler = handler;
            }
        }
    };
})();
