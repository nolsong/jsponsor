(function() {
    'use strict';

    /*
        short cut
     */
    var util = jSponsor.util,
        logger = jSponsor.logService.getLogger();

    var connector = {
        http: http,
        socketFactory: createSocketFactory(),
        remoteModel: createRESTFactory()
    };
    var connectorErr = util.errorFactory('Connector');


    /*
        http constants
     */
    var HTTP_STATUS_CODE_SUCCESS = 200,
        CONTENT_TYPE_JSON = "application/json",
        CONTENT_TYPE_JSON_UTF8 = CONTENT_TYPE_JSON + ";charset=uft-8",
        CONTENT_TYPE = "Content-Type",
        RESPONSE_HEADER_SPLITTER = "\r\n",
        DEFAULT_RESPONSE_TYPE = "",
        DEFAULT_TIMEOUT = 0;

    /*
        support only async XHR communication with Promise interface
     */
    function httpSender(method, url, payload, header, responseType, timeout, withCredentials) {
        return new Promise(function(resolve, reject) {
            var req = new XMLHttpRequest(),
                reqOptions = {
                    method: method,
                    url: url,
                    payload: payload,
                    header: header,
                    responseType: responseType,
                    timeout: timeout,
                    withCredentials: withCredentials
                };

            function success() {
                resolve({
                    data: req.response,
                    status: req.status,
                    header: getHeaderObj(req.getAllResponseHeaders()),
                    options: reqOptions
                });
            }
            function fail(customReason) {
                var errorText = customReason || req.statusText;
                logger.error("HTTP error: " + errorText + " occurred");
                reject({
                    error: Error(errorText),
                    status: req.status,
                    statusText: req.statusText,
                    options: reqOptions
                });
            }
            function getHeaderObj(headerStr) {
                var headerObj = {};
                if (!util.isString(headerStr)) {
                    return headerObj;
                }

                var headerTokens = headerStr.split(RESPONSE_HEADER_SPLITTER);
                headerTokens.forEach(function(headerItem) {
                    if (!headerItem) {
                        return;
                    }
                    var keyValue = headerItem.split(':');
                    if (keyValue && keyValue.length === 2) {
                        headerObj[keyValue[0].trim()] = keyValue[1].trim();
                    }
                });

                return headerObj;
            }

            req.onabort = fail;
            req.onerror = fail;
            req.ontimeout = function() { fail('timeout'); };
            req.onload = function() {
                req.status === HTTP_STATUS_CODE_SUCCESS ? success() : fail();
            };

            req.open(method, url, true);

            /*
                extends request header
             */
            for (var key in header) {
                if (header.hasOwnProperty(key) && key && header[key]) {
                    req.setRequestHeader(key, header[key]);
                }
            }

            req.responseType = responseType ? responseType : DEFAULT_RESPONSE_TYPE;
            req.withCredentials = withCredentials ? true : false;
            req.timeout = util.isNumber(timeout) ? timeout : DEFAULT_TIMEOUT;
            req.send(payload);
        });
    }

    function http(method, url, options) {
        options = options || {};
        options.header = options.header || {};

        return new Promise(function(resolve, reject) {
            if (!method || !url) {
                reject(Error('invalid parameter'));
                return;
            }

            // update the url for query string
            url = appendQueryStringToURL(url, options.query);

            // update the content type
            var changedType = updateContentType(method, options.header, options.payload);
            if (changedType) {
                options.header[CONTENT_TYPE] = changedType;
            }

            var transferData = convertToTransferData(options.header[CONTENT_TYPE], options.payload);
            if (transferData) {
                options.payload = transferData;
            }

            httpSender(method, url, options.payload, options.header, options.responseType, options.timeout, options.withCredentials)
                .then(function(res) {
                    var contentData = convertToContentData(res.header[CONTENT_TYPE], res.data);
                    if (contentData) {
                        res.data = contentData;
                    }
                    resolve(res);
                })
                .catch(function(res) {
                    reject(res);
                });
        });
    }

    function updateContentType(method, header, payload) {
        if (!usePayload(method, payload) || useCustomContentType(header)) {
            return;
        }

        if (util.isStrictObject(payload)) {
            return CONTENT_TYPE_JSON_UTF8;
        }
    }
    function usePayload(method, payload) {
        method = method.toLowerCase();
        return payload && (method === "post" || method === "put");
    }
    function useCustomContentType(header) {
        // User already set a content type manually
        return header && header[CONTENT_TYPE];
    }
    function appendQueryStringToURL(url, query) {
        return query ? url + '?' + convertQueryString(query) : url;
    }
    function convertQueryString(query) {
        var tokens = [];
        for (var key in query) {
            if (!query.hasOwnProperty(key)) {
                continue;
            }

            var value = query[key];
            if (value === undefined || value === null) {
                continue;
            }

            if (Array.isArray(value)) {
                /* jshint -W083 */
                value.forEach(function(arrValue) {
                    tokens.push(getSerializedEncodedURI(key, arrValue));
                });
            } else {
                tokens.push(getSerializedEncodedURI(key, value));
            }
        }
        return tokens.join('&');
    }
    function getSerializedEncodedURI(key, value) {
        if (typeof value === "object") {
            value = JSON.stringify(value);
        }
        return encodeURIComponent(key) + "=" + encodeURIComponent(value);
    }
    function convertToTransferData(contentType, data) {
        if (data === undefined || data === null || !contentType) {
            return;
        }

        if (contentType.indexOf(CONTENT_TYPE_JSON) === 0 && util.isStrictObject(data)) {
            return JSON.stringify(data);
        }
        // add another conversion to here
    }
    function convertToContentData(contentType, data) {
        if (data === undefined || data === null || !contentType) {
            return;
        }

        if (contentType.indexOf(CONTENT_TYPE_JSON) === 0 && util.isString(data)) {
            return JSON.parse(data);
        }
        // add another conversion to here
    }


    /*
     Web socket
     */
    var MAX_SOCKET_NO_LIMIT = -1;
    var WEB_SOCKET_PROTOCOL_PREFIX = "ws://",
        WEB_SOCKET_SECURE_PROTOCOL_PREFIX = "wss://",
        DEFAULT_WEB_SOCKET_PORT = 80,
        WS_PROTOCOL_SPLITTER_LAST_INDEX = 3;

    function createSocketFactory() {
        var sockets = [];

        return {
            max: MAX_SOCKET_NO_LIMIT,
            closeAll: function() {
                sockets.forEach(function(socket) {
                    socket && socket.close();
                });
                sockets = [];
            },
            getCount: function() { return sockets.length; },
            setMaxCount: function(num) {
                this.max = (num < 0) ? MAX_SOCKET_NO_LIMIT : num;
            },
            isFull: function() {
                return this.max !== MAX_SOCKET_NO_LIMIT && this.max <= this.getCount();
            },
            createSocket: function (url, options) {
                if (!url || this.isFull()) {
                    throw connectorErr('socket full',
                        "Can not create a socket due to full size({0}), if you want to increase this size, use a setMaxCount()", this.getCount());
                }

                options = options || {};
                url = buildSocketUrl(url, options);

                var ws = new WebSocket(url, options.protocols);
                if (!ws) {
                    throw connectorErr('socket error', "Failed to create a WebSocket");
                }

                var clientCallbacks = {};
                ws.onopen = function() {
                    logger.info("-------- WebSocket onopen! ---------");
                    addToSockets(ws);
                    clientCallbacks.open && clientCallbacks.open();
                };
                ws.onclose = function() {
                    logger.info("-------- WebSocket onclose! ---------");
                    removeFromSockets(ws);
                    clientCallbacks.close && clientCallbacks.close();
                };
                ws.onerror = function(e) {
                    logger.error("-------- WebSocket onerror! ---------");
                    clientCallbacks.error && clientCallbacks.error(e);
                };
                ws.onmessage = function(e) {
                    logger.info("-------- WebSocket onmessage! ---------");
                    clientCallbacks.message && clientCallbacks.message(e.data);
                };

                return {
                    on: function(eventName, fn) {
                        if (!eventName || !fn) { return; }

                        clientCallbacks[eventName] = fn;
                    },
                    send: function(data) {
                        ws.send(data);
                    },
                    close: function() {
                        ws.close();
                        removeFromSockets(ws);
                    }
                };
            }
        };

        function addToSockets(socket) {
            if (sockets.indexOf(socket) === -1) {
                sockets.push(socket);
            }
        }
        function removeFromSockets(socket) {
            var index = sockets.indexOf(socket);
            if (index === -1) { return; }

            sockets.splice(index, 1);
        }
        function buildSocketUrl(url, options) {
            if (url.indexOf(WEB_SOCKET_PROTOCOL_PREFIX) === -1 && url.indexOf(WEB_SOCKET_SECURE_PROTOCOL_PREFIX) === -1) {
                var prefix = (options.secure) ? WEB_SOCKET_SECURE_PROTOCOL_PREFIX : WEB_SOCKET_PROTOCOL_PREFIX;
                url = prefix + url;
            }

            if (url.lastIndexOf(':') <= WS_PROTOCOL_SPLITTER_LAST_INDEX) {
                var port = (options.port) ? options.port : DEFAULT_WEB_SOCKET_PORT;
                url += ':' + port;
            }

            return url;
        }
    }


    /*
        REST(Representational State Transfer) service
     */
    function createRESTFactory() {
        return function(url) {
            return {
                create: function(data) {
                    return connector.http('POST', url, {
                        payload: data
                    });
                },
                read: function() {
                    return connector.http('GET', url);
                },
                update: function() {
                    return connector.http('PUT', url);
                },
                delete: function() {
                    return connector.http('DELETE', url);
                }
            };
        };
    }

    jSponsor.connector = connector;
})();




