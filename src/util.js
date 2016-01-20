(function() {
    'use strict';


    // TODO: add more utility methods to here
    var util = {
        noop: function() {},
        extend: function(dest, source) {
            if (dest && source) {
                for(var k in source) {
                    if (source.hasOwnProperty(k)) {
                        dest[k] = source[k];
                    }
                }
            }
            return dest;
        },
        makeArray: function (data) {
            if (data === undefined || data === null) {
                return [];
            }
            return Array.isArray(data) ? data : [data];
        },
        stripDups: function(arr) {
            if (!arr || !Array.isArray(arr)) { return arr; }

            // copy input array
            arr = arr.slice(0);

            var res = [], i;
            while(arr.length) {
                var pivot = arr.shift();
                res.push(pivot);

                while((i = arr.indexOf(pivot)) !== -1) {
                    arr.splice(i, 1);
                }
            }
            return res;
        },
        isFunction: function(fn) {
            return !!(fn && typeof fn === 'function');
        },
        isString: function(str) {
            return !!(str && typeof str === 'string');
        },
        isNumber: function(num) {
            return !!(num && typeof num === 'number');
        },
        isStrictObject: function(obj) {
            return !!(obj && typeof obj === 'object' &&  obj.toString() === '[object Object]');
        },
        isQuotationString: function(str) {
            if (!str || typeof str !== "string" || str.length < 2) {
                return false;
            }
            var firstCh = str[0],
                lastCh = str[str.length - 1];

            if (firstCh !== lastCh) {
                return false;
            }

            return firstCh === '\"' || firstCh === "\'";
        },
        isNumberString: function(str) {
            return !isNaN(str * 1) && typeof (str * 1) === 'number';
        },
        isFunctionString: function(str) {
            if (!str || typeof str !== "string") {
                return false;
            }

            var openIndex = str.indexOf('('),
                closeIndex = str.indexOf(')');

            return openIndex < closeIndex && openIndex > 0;
        },
        getAttrValue: function(attrs, propertyName) {
            if (!attrs) { return ""; }

            for(var i = 0; i < attrs.length; i++) {
                if (attrs[i].localName === propertyName) {
                    return attrs[i].nodeValue;
                }
            }
            return "";
        },
        searchAttrs: function(attrs, propertyList, cbFind) {
            if (!attrs || !Array.isArray(propertyList) || !cbFind) { return; }

            for(var i = 0; i < attrs.length; i++) {
                var attrName = attrs[i].localName;
                if (propertyList.indexOf(attrName) === -1) {
                    continue;
                }

                cbFind(attrName, attrs[i].nodeValue);
            }
        },
        isTextNode: function(node) {
            return !!(node && node.nodeName === "#text" && node.nodeType === 3);
        },
        stringFormat: function() {
            var dest = arguments[0],
                paramArgs = arguments,
                BASE_INDEX = 1;

            return dest.replace(/\{\d+\}/g, function(matched) {
                var index = matched.slice(1, -1) * 1 + BASE_INDEX;

                return paramArgs.length > index ? paramArgs[index] : matched;
            });
        },
        iterate: function(obj, fn) {
            if (!obj || typeof fn !== 'function') { return; }

            Object.keys(obj).forEach(function(key) {
                fn(key, obj[key]);
            });
        },
        getIdPublisher: function() {
            var currId = 0;

            return function () {
                return '$' + currId++;
            };
        }
    };

    jSponsor.util = util;
})();