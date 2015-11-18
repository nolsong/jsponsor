(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.controller('myController', ['$viewModel', '$router', '$http', '$socketFactory', '$remoteModel', 'product'], function(viewModel, router, http, socketFactory, remoteModel, srvProduct) {
        console.log(">> testPackage:myController is created!, product name: " + srvProduct.getName());
        viewModel.title = "main";
        viewModel.count = 0;
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
        }, 3000);

        viewModel.movePage = function() {
            router.location('/secondPage');
        };

        // test code for http connection
        http('GET', 'http://localhost:8080/sample/test/get/echo', {
            query: {
                name: 'nolsong',
                title: 'echo-main',
                foo: ['first', 'second', 'third']
            }
        })
        .then(function(res) {
            console.log(res.data, res.status, res.options);
            var data = res.data;

            // update UI
            viewModel.user.name = data.name;
            viewModel.title = data.title;
        }, function (res) {
            console.error(res.error, res.status, res.statusText, res.options);
        });

        // test for socket connection
        var socket = socketFactory.createSocket("localhost", {
            port: 8080,
            protocols: "echo-event"
        });

        var echoInterval;
        // TODO: need to receive a destroy message so that we can stop 'echo interval' and close the socket when out of this page
        socket.on('open', function() {
            echoInterval = setInterval(function() {
                if (viewModel.count >= 10) {
                    clearInterval(echoInterval);
                    socket.close();
                    return;
                }
                socket.send(viewModel.count + 1);
            }, 1000);
        });

        socket.on('message', function(msg) {
            viewModel.count = parseInt(msg, 10);
        });


        viewModel.bookTitle = "";
        viewModel.bookAuthor = "";

        var remoteBook = remoteModel('http://localhost:8080/sample/book');
        viewModel.saveBook = function() {
            remoteBook.create({
                id: 1,
                title: viewModel.bookTitle,
                author: viewModel.bookAuthor
            });
        };

        viewModel.getBook = function() {
            remoteBook.read().then(function(res) {
                console.log('[remoteBook:read]' + res.data.title);
                viewModel.book = {
                    title: res.data.title,
                    author: res.data.author
                };
            }, function(res) {
                console.log('[remoteBook:read] error: '+ res.error);
            });
        };
    });

    pack.controller('secondCtrl', ['$viewModel', '$router'], function(viewModel, router) {
        viewModel.title = 'This is second page!';

        viewModel.movePage = function() {
            router.location('/');
        };
    });
})();