/**
 * Created by tsjung on 2015-09-04.
 */
(function() {
    'use strict';

    var util = jSponsor.util;
    var routerErr = util.errorFactory('Router');

    var router = {
        currentUrl : '/',
        map: {},
        register : function(infoList) {
            var self = this;

            if (!infoList || Array.isArray(infoList) === false) {
                console.log(">> failed to register route map!");
                return;
            }

            for(var i = 0; i < infoList.length; i++) {
                var info = infoList[i];
                self.map[info.url] = info;
            }
        },
        location: function(url) {
            console.log('++ location change to : ' + url);
            if (!this.map[url]) {
                console.log(">> failed to change location... reason: there is no map info...");
                return;
            }
        },
        getRouteInfo: function(url) {
            url = url || '/';

            return this.map[url];
        },
        getCurrentUrl : function() {
            return this.currentUrl;
        }
    };

    jSponsor.router = router;
})();