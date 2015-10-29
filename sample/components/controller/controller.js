(function() {
    'use strict';

    var pack = jSponsor.package('testPackage');
    pack.controller('myController', ['$viewModel', '$router', 'product'], function(viewModel, router, srvProduct) {
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

        setTimeout(function() {
            router.location('/secondPage');
        }, 5000);
    });

    pack.controller('secondCtrl', ['$viewModel'], function(viewModel) {
        viewModel.title = 'This is second page!';
    });
})();