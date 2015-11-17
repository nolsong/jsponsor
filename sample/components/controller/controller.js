(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.controller('myController', ['$viewModel', '$router', 'product', '$http', '$socketFactory'], function(viewModel, router, srvProduct, http, socketFactory) {
        console.log(">> testPackage:myController is created!, product name: " + srvProduct.getName());
        viewModel.title = "main";
        viewModel.user = {
            name: "tsjung",
            getAge: function() {
                return 32;
            }
        };
        viewModel.order = {
                list : ["FIRST", "SECOND", "THIRD"]
            };
        viewModel.sub = '-subText';

        viewModel.onList = true;
        setTimeout(function() {
            viewModel.sub = "-Settings";
            viewModel.order.list[0] = 'changed';
            viewModel.order.list.push('FOURTH');
            viewModel.order.list.push('FIVETH');
            //viewModel.onList = false;
            viewModel.user.name = 'nolsong';
        }, 3000);

        viewModel.movePage = function() {
            router.location('/secondPage');
        };

        // test code for http connection
        http('GET', 'http://localhost:8080/sample/test/get', {
            query: {
                id: 1,
                name: 'abc',
                foo: ['first', 'second', 'third'],
                bar: {
                    guest: 'you',
                    config: 'basic'
                }
            }
        })
        .then(function(res) {
            console.log(res.data, res.status, res.options);
        }, function (res) {
            console.info(res.error, res.status, res.statusText, res.options);
        });


        var socket = socketFactory.createSocket("localhost", {
            port: 8080,
            protocols: "test-event"
        });

        socket.on('open', function() {
            socket.send("hi there!");
            setTimeout(function() {
                socket.close();
            }, 2000);
        });

        socket.on('message', function(msg) {
            console.log("[Client] data: " + msg);
        });
    });

    pack.controller('secondCtrl', ['$viewModel', '$router'], function(viewModel, router) {
        viewModel.title = 'This is second page!';

        viewModel.movePage = function() {
            router.location('/');
        };
    });
})();