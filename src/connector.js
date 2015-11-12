(function() {
    'use strict';


    var connector = {};

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
                console.log("HTTP error: " + errorText + " occurred");
                reject({
                    error: Error(errorText),
                    status: req.status,
                    statusText: req.statusText,
                    options: reqOptions
                });
            }
            function getHeaderObj(headerStr) {
                var headerObj = {};
                if (!headerStr || typeof headerStr !== "string") {
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
            req.timeout = (typeof timeout === "number") ? timeout : DEFAULT_TIMEOUT;
            req.send(payload);
        });
    }

    function http(method, url, options) {
        options = options || {};
        options.header = options.header || {};

        return new Promise(function(resolve, reject) {
            if (!method || !url) {
                reject(Error('invaild parameter'));
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

    connector.http = http;

    function updateContentType(method, header, payload) {
        if (!usePayload(method, payload) || useCustomContentType(header)) {
            return;
        }

        if (typeof payload === "object" && payload.toString() === "[object Object]") {
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

        if (contentType.indexOf(CONTENT_TYPE_JSON) === 0 && typeof data === "object") {
            return JSON.stringify(data);
        }
        // add another conversion to here
    }
    function convertToContentData(contentType, data) {
        if (data === undefined || data === null || !contentType) {
            return;
        }

        if (contentType.indexOf(CONTENT_TYPE_JSON) === 0 && typeof data === "string") {
            return JSON.parse(data);
        }
        // add another conversion to here
    }


    jSponsor.connector = connector;
})();




