(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.controller('myController', ['$viewModel', '$router', '$http', '$socketFactory', '$remoteModel', 'product', '$log', 'sortWorker'], function(viewModel, router, http, socketFactory, remoteModel, srvProduct, $log, sortWorker) {
        var logger = $log.getLogger('myController');

        logger.info(">> testPackage:myController is created!, product name: " + srvProduct.getName());
        viewModel.title = "main";
        viewModel.tableTitle = "";
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
        }, 1000);

        viewModel.movePage = function() {
            router.location('/secondPage');
        };

        // test code for worker
        viewModel.sortStatus = "processing...";
        viewModel.sortNum = makeRandomNumber(100000, 1000000);
        viewModel.sortCode = sortWorker.code;

        sortWorker.bubbleSort(viewModel.sortNum).then(function(result) {
            viewModel.sortNum = result;
            viewModel.sortStatus = "completed!";
        }, function() {
            viewModel.sortNum = [];
            viewModel.sortStatus = "error occurred";
        });

        function makeRandomNumber(count, max) {
            var result = [];

            for(var i = 0; i < count; i += 1) {
                result.push(Math.floor(Math.random() * (max + 1)));
            }

            return result;
        }

        // test code for http connection
        http('GET', 'http://localhost:8080/sample/test/get/echo', {
            query: {
                name: 'nolsong',
                title: 'echo-main',
                foo: ['first', 'second', 'third']
            }
        })
        .then(function(res) {
            logger.info(res.data, res.status, res.options);
            var data = res.data;

            // update UI
            viewModel.user.name = data.name;
            viewModel.title = data.title;
        }, function (res) {
            logger.error(res.error, res.status, res.statusText, res.options);
        });

        // test for socket connection
        var socket = socketFactory.createSocket("localhost", {
            port: 8080,
            protocols: "echo-event"
        });

        var echoInterval;
        socket.on('open', function() {
            echoInterval = setInterval(function() {
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
                logger.info('[remoteBook:read]' + res.data.title);
                viewModel.book = {
                    title: res.data.title,
                    author: res.data.author
                };
            }, function(res) {
                logger.error('[remoteBook:read] error: '+ res.error);
            });
        };

        viewModel.changeTableTitle = function() {
            viewModel.$post('changeTitle', viewModel.tableTitle, ['my-table']);
        };

        /*
            UI event listeners
         */
        viewModel.$on('destroy', function() {
            clearInterval(echoInterval);
            socket.close();
        });
    });

    pack.controller('secondCtrl', ['$viewModel', '$router'], function(viewModel, router) {
        viewModel.title = 'This is second page!';

        viewModel.movePage = function() {
            router.location('/');
        };
    });
})();