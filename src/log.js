(function() {
    'use strict';


    var util = jSponsor.util;

    /*
        constants
     */
    var DEFAULT_LOGGER_CATEGORY = "$jsponsor",
        LEVEL = {
            ALL: 0,
            TRACE: 1,
            DEBUG: 2,
            INFO: 3,
            WARN: 4,
            ERROR: 5,
            FATAL: 6,
            OFF: 7
        },
        DEFAULT_GLOBAL_LEVEL = LEVEL.ALL,
        DEFAULT_LEVEL = LEVEL.ALL;

    /*
        private caches
     */
    var loggers = {};


    /*
        modules
     */
    var filter = createFilter();

    /*
        log service
        This is used to set global options for logging
     */
    var logService = {
        // LEVEL constant may be needed to set level value for logger.
        LEVEL: LEVEL,

        // global level is master value to limit maximum level of all loggers.
        // logger's level which is smaller than global level won't be work, that is, ignored.
        setGlobalLevel: filter.setGlobalLevel,

        // return logger instance by category, if can not find a logger with category, create a new one.
        getLogger: function(category) {
            var targetName = category || DEFAULT_LOGGER_CATEGORY;

            if (!loggers[targetName]) {
                loggers[targetName] = new Logger(targetName);
            }

            return loggers[targetName];
        },

        // logger can be removed when it's not necessary anymore.
        removeLogger: function(category) {
            if (loggers[category]) {
                delete loggers[category];
            }
        },

        // block some loggers
        blockCategory: function(blockCategory) {
            if (!blockCategory) { return; }

            if (Array.isArray(blockCategory)) {
                blockCategory.forEach(filter.addBlockCategory);
            } else {
                filter.addBlockCategory(blockCategory);
            }
        },

        // unblock some loggers
        unblockCategory: function(unblockCategory) {
            if (!unblockCategory) { return; }

            if (Array.isArray(unblockCategory)) {
                unblockCategory.forEach(filter.removeBlockCategory);
            } else {
                filter.removeBlockCategory(unblockCategory);
            }
        }

    };

    /*
        Filter
        filter can control the global and default level and block or unblock loggers.
     */
    function createFilter() {
        var blockedCategories = [],
            globalLevel = DEFAULT_GLOBAL_LEVEL,
            defaultLevel = DEFAULT_LEVEL;

        return {
            addBlockCategory: function(name) {
                if (blockedCategories.indexOf(name) !== -1) {
                    // already exist
                    return;
                }

                blockedCategories.push(name);
                var targetLogger = loggers[name];
                if (targetLogger) {
                    targetLogger.disable();
                }
            },
            removeBlockCategory: function(name) {
                var index = blockedCategories.indexOf(name);
                if (index >= 0) {
                    blockedCategories.splice(index, 1);
                }

                var targetLogger = loggers[name];
                if (targetLogger) {
                    targetLogger.enable();
                }
            },
            isBlocked: function(name) {
                return blockedCategories.indexOf(name) >= 0;
            },
            setGlobalLevel: function(level) {
                if (this.isValidLevel(level)) {
                    globalLevel = level;
                }
            },
            getGlobalLevel: function() {
                return globalLevel;
            },
            setDefaultLevel: function(level) {
                if (this.isValidLevel(level)) {
                    defaultLevel = level;
                }
            },
            getDefaultLevel: function() {
                return defaultLevel;
            },
            isValidLevel: function(level) {
                if (typeof level !== "number") {
                    return false;
                }
                return level >= LEVEL.ALL && level <= LEVEL.OFF;
            }
        };
    }

    /*
        Logger
        This is main interface to use each log which is categorised.
     */
    function Logger(category) {
        this.category = category;
        this.level = filter.getDefaultLevel();
        this.enabled = true;
        this.formatter = createPlainFormatter();
        this.logDriver = createConsoleDriver();
        this.init();
    }

    Logger.prototype = {
        constructor: Logger,
        init: function() {
            if (filter.isBlocked(this.category)) {
                this.disable();
            }
        },
        // enable logger
        enable: function() {
            this.enabled = true;
        },

        // forced disable, regardless of level
        disable: function() {
            this.enabled = false;
        },
        setLevel: function(level) {
            if (filter.isValidLevel(level)) {
                this.level = level;
            }
        },
        setFormatter: function(formatter) {
            if (formatter) {
                this.formatter = formatter;
            }
        },
        setLogDriver: function(driver) {
            if (driver) {
                this.logDriver = driver;
            }
        },
        check: function(level) {
            return this.enabled && this.level <= level && filter.getGlobalLevel() <= level;
        }
    };

    /*
        formatter
        each formatter has own style to show specific text and it should be able to return string as a result.
     */
    function createPlainFormatter() {
        var ERROR_OBJ_MSG_PREFIX = "@Error: ",
            ERROR_STACK_MSG_PREFIX = "@ErrorStack> ";

        function objectDisplayFormat(obj) {
            // if argument is Error instance, show message and error stack.
            if (obj instanceof Error) {
                if (!obj.stack) {
                    return ERROR_OBJ_MSG_PREFIX + obj.message;
                }

                // if error stack has same string as error.message, just return stack string.
                return  obj.stack.indexOf(obj.message) !== -1 ? ERROR_STACK_MSG_PREFIX + obj.stack
                    : ERROR_OBJ_MSG_PREFIX + obj.message + "\n" + ERROR_STACK_MSG_PREFIX + obj.stack;
            }

            // if argument is object that can be converted to JSON, display it as JSON format string.
            if (util.isStrictObject(obj)) {
                return JSON.stringify(obj, null, 4);
            }

            return obj;
        }

        return {
            build: function(logParam) {
                var resultMsg = "",
                    len = logParam.args.length;

                for (var i = 0; i < len; i++) {
                    resultMsg += objectDisplayFormat(logParam.args[i]);
                    if (i < len - 1) { resultMsg += "\n"; }
                }

                return util.stringFormat("[{0}][{1}]{2}", logParam.category, logParam.level, resultMsg);
            }
        };
    }
    // TODO: add another formatter for various format(XML, JSON and so on)

    /*
        log driver
        each log driver has own way to write down text data on target device.
     */
    function createConsoleDriver() {
        var myConsole = window.console || {log: util.noop};

        return {
            log: function(levelText, text) {
                util.isFunction(myConsole[levelText]) ? myConsole[levelText](text) : myConsole.log(text);
            }
        };
    }
    // TODO: add another log driver for various target(file log, send to server via XHR and so on)


    function buildLogger() {
        var loggerAPIs = {
            trace: LEVEL.TRACE,
            debug: LEVEL.DEBUG,
            info: LEVEL.INFO,
            warn: LEVEL.WARN,
            error: LEVEL.ERROR,
            fatal: LEVEL.FATAL
        };

        // register log APIs with level
        for (var api in loggerAPIs) {
            if (loggerAPIs.hasOwnProperty(api)) {
                Logger.prototype[api] = createLoggerAPI(loggerAPIs[api], api);
            }
        }

        function createLoggerAPI(level, levelText) {
            // below function will be logger methods(trace, debug, info, warn, error, fatal)
            return function() {
                if (!this.check(level)) {
                    return;
                }

                var logText = this.formatter.build({
                    category: this.category,
                    level: levelText,
                    args: arguments
                });

                this.logDriver.log(levelText, logText);
            };
        }
    }

    buildLogger();

    jSponsor.logService = logService;
})();
