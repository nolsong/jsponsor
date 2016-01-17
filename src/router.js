(function() {
    'use strict';

    /*
        short cuts
     */
    var exception = jSponsor.exception;
    var routeErr = exception.errorFactory('Router');

    /*
        constants
     */
    var FLAG_MARK = '#',
        ROOT_MARK = '/';

    // location.hash is a flag part of url, we will use this to distinguish local page's url
    var initialUrl = window.location.hash;
    initialUrl = initialUrl.replace(FLAG_MARK, ROOT_MARK) || ROOT_MARK;

    var router = {
        ROUTE_URL_ATTR: 'url',
        currentUrl : initialUrl,
        map: {},
        flush: function() {
            this.map = {};
        },
        register : function(infoList) {
            var self = this;

            if (!infoList || Array.isArray(infoList) === false) {
                throw routeErr('invalid param', 'failed to register route map!');
            }

            infoList.forEach(function(info) {
                self.map[info.url] = info;
            });
        },
        location: function(url) {
            var self = this;

            if (!self.map[url]) {
                throw routeErr('invalid param', 'failed to change a location, there is no routing info with this url: {0}', url);
            }

            self.currentUrl = url;

            window.location.hash = (url === ROOT_MARK) ? '' : url.replace(/^\//g, FLAG_MARK);

            // changing 'url' attribute on the route-view will trigger for updating it
            self.element && self.element.setAttribute(self.ROUTE_URL_ATTR, url);
        },
        getRouteInfo: function(url) {
            url = url || ROOT_MARK;

            return this.map[url];
        },
        getCurrentUrl : function() {
            return this.currentUrl;
        },
        setRouteViewElement: function(element) {
            this.element = element;
        }
    };

    jSponsor.router = router;
})();