(function() {
    'use strict';

    /*
        shrotcuts
     */
    var router = jSponsor.router,
        injector = jSponsor.injector,
        util = jSponsor.util,
        exception = jSponsor.exception,
        logger = jSponsor.logService.getLogger();

    var uiInstances = [],
        uiErr = exception.errorFactory('UI Manager');

    /*
        Regular expressions
     */
    var twoWayExprReg = /\{{2,2}[^\{\}]*\}{2,2}/g;

    /*
     *   UI Manager
     *
     *   UI Manager provides controller with UI javascript hooking point about View
     *   which is built in Web component.
     *   Each View component has an UI object that will be managed by UI Manager.
     */
    var uiManager = {
        registerViewComponent : function (param) {
            var name = param.viewName,
                ownerDoc = param.ownerDoc,
                controller = param.controller,
                cbLoaded = param.onLoaded,
                cbAttrChanged = param.onAttrChanged;

            var proto = Object.create(HTMLElement.prototype);
            proto.createdCallback = function() {
                var t = ownerDoc.querySelector('#' + name);
                var clone = ownerDoc.importNode(t.content, true);
                this.createShadowRoot().appendChild(clone);

                try {
                    // if there is a controller when call this function, this comes from definition of view component.
                    if (controller) {
                        this.uiInstance = createUIInstance(name, this, getController(name));
                    } else {
                        // check if this comes from router
                        var routeInfo = router.getRouteInfo(router.getCurrentUrl());
                        if (routeInfo.view === name) {
                            this.uiInstance = createUIInstance(name, this, getController(routeInfo.controller));
                        }
                        // if not any case, this view has no controller
                    }
                } catch(e) {
                    exception.exceptionHandle(e);
                }

                if (cbLoaded) {
                    cbLoaded(this);
                }

                function getController(findName) {
                    return function(viewModel) {
                        injector.getController(findName, viewModel);
                    };
                }
            };
            proto.detachedCallback = function() {
                destroyUIInstance(this.uiInstance);
                delete this.uiInstance;
            };
            proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
                if (oldVal === newVal) {
                    // do nothing
                    return;
                }

                if (cbAttrChanged) {
                    cbAttrChanged(this, attrName, newVal);
                }
            };

            if (controller) {
                // in this case, controller will be anonymous
                // so it's need to give view's name to controller alternatively
                // register controller at here so that injector creates it when createdCallback is called
                injector.setController(name, controller.dependency, controller.constructor);
            }

            document.registerElement(name, {
                prototype: proto
            });
        }
    };

    function createUIInstance(viewName, domObj, controllerBuilder) {
        var item = createActiveUIInstance(viewName, domObj, controllerBuilder);
        uiInstances.push(item);
        return item;
    }

    function destroyUIInstance(uiInstance) {
        logger.info("[UI Manager] destroy ui instance, name: " + uiInstance.viewName);
        uiInstance.takeEvent('destroy');
        uiInstance.clean();
        var index = uiInstances.indexOf(uiInstance);
        uiInstances.splice(index, 1);
    }


    function createActiveUIInstance(viewName, domObj, controllerBuilder) {
        var eventMap = {},
            viewModel = {
                $broadcast: function(event, data) {
                    if (!util.isString(event)) {
                        return;
                    }

                    uiInstances.forEach(function(inst) {
                        inst.takeEvent(event, data);
                    });
                },
                $post: function(event, data, targets) {
                    if (!util.isString(event) || !Array.isArray(targets)) {
                        return;
                    }

                    var targetInstances = uiInstances.filter(function(inst) {
                        return targets.indexOf(inst.viewName) > -1;
                    });

                    targetInstances.forEach(function(inst) {
                        inst.takeEvent(event, data);
                    });
                },
                $on: function(event, cbFn) {
                    if (!util.isString(event) || !util.isFunction(cbFn)) {
                        return;
                    }
                    eventMap[event] = cbFn;
                }
            };

        var controller = controllerBuilder(viewModel);

        try {
            var cRootNode = new CDTNode(domObj.shadowRoot, null, viewModel);

            var deepObserver = new DeepObserver(viewModel);
            deepObserver.open(function(property, value, path) {
                cRootNode.update(property, value, path);
            });
        } catch(e) {
            exception.exceptionHandle(e);
        }


        /*
         *  Active UI interface
         *
         *  viewModel will be injected into controller after create a view,
         *  so let it go with an active UI object.
         */
        return {
            viewName: viewName,
            dom: domObj,
            controller: controller,
            viewModel: viewModel,
            takeEvent: function(event, data) {
                var fn = eventMap[event];
                fn && fn(data);
            },
            clean: function() {
                deepObserver.close();
                cRootNode.clear();
            }
        };
    }


    /*
     Conditional Dom Tree Node
     */
    function CDTNode(dom, conditionInfo, viewModel) {
        var self = this;

        self.dom = dom;
        self.condition = self.createCondition(conditionInfo);
        self.viewModel = viewModel;
        self.childHTMLTemplate = dom.innerHTML;
        self.init();
        self.build();
    }

    CDTNode.prototype = {
        constructor: CDTNode,
        operator : {
            'js-if': {
                trimExpression: function(expr) {
                    return expr;
                },
                buildDom: function(exprStr, dom, value) {
                    if (!value) {
                        dom.innerHTML = '';
                    }
                }
            },
            'js-loop': {
                trimExpression: function(expr) {
                    var tokens = expr.split("in");
                    if (expr.indexOf('in') > -1 && tokens.length === 2) {
                        return tokens[1].trim();
                    }
                },
                buildDom: function(exprStr, dom, list) {
                    var tokens = exprStr.split("in");
                    if (exprStr.indexOf('in') > -1 && tokens.length === 2) {
                        var pointer = '{{' + tokens[0].trim() + '}}';
                        var childrenHTML = dom.innerHTML;
                        var resultHTML = "";

                        if (list && Array.isArray(list) === true) {
                            for(var k = 0; k < list.length; k++) {
                                resultHTML += childrenHTML.replace(pointer, list[k]);
                            }
                            dom.innerHTML = resultHTML;
                        }
                    } else {
                        dom.innerHTML = '';
                        throw uiErr('invalid expr', "js-loop has invalid expression");
                    }
                }
            }
        },
        eventBindList : ['js-click', 'js-keydown', 'js-keypress', 'js-keyup'],
        createCondition: function(info) {
            return {
                operator: info ? this.operator[info.operatorName] : null,
                exprStr: info ? info.exprStr : null,
                hasCondition: function() {
                    return !!(this.operator && this.exprStr);
                }
            };
        },
        init: function() {
            var self = this,
                cond = self.condition;

            // make an expression instance
            if (cond.hasCondition()) {
                self.exprInst = new Expression(cond.operator.trimExpression(cond.exprStr), self.viewModel);
            }
        },
        clearNode: function() {
            var self = this;

            self.childNodes = [];
            self.dataBindMap = {};

            if (self.dom.innerHTML !== self.childHTMLTemplate) {
                self.dom.innerHTML = self.childHTMLTemplate;
            }
        },
        build: function() {
            var self = this;

            self.clearNode();
            self.buildConditionalDomTree();
            self.parseAndBuildChildren();
            self.applyData();
        },
        buildConditionalDomTree: function() {
            var self = this,
                cond = self.condition;

            // build or rebuild a dom with condition operator
            if (cond.hasCondition() === true) {
                cond.operator.buildDom(cond.exprStr, self.dom, self.exprInst.eval());
            }

            // process text node in the root
            self.findDataBindTextNode(self.dom.childNodes);

        },
        findCDAttributes: function(attrs, cbFind) {
            if (!attrs || !cbFind) { return false; }

            var condOps = ['js-if', 'js-loop'];
            for(var i = 0; i < condOps.length; i++) {
                var expr = util.getAttrValue(attrs, condOps[i]);
                if (expr) {
                    cbFind(condOps[i], expr);
                    return true;
                }
            }
            return false;
        },
        findDataBindTextNode: function(childNodes) {
            var self = this;
            var currNode = null;

            for(var i = 0; i < childNodes.length; i++) {
                currNode = childNodes[i];
                if (util.isTextNode(currNode) !== true) {
                    continue;
                }

                var matched = currNode.data.match(twoWayExprReg);
                if (!matched) {
                    continue;
                }

                var updateNodeInfo = {
                    template: currNode.data,
                    subTemplates: [],
                    expressions: [],
                    node: currNode
                };

                /* jshint -W083 */
                matched.forEach(function(bindExprStr) {
                    var expression = new Expression(bindExprStr.slice(2, bindExprStr.length - 2), self.viewModel);
                    updateNodeInfo.expressions.push(expression);
                    updateNodeInfo.subTemplates.push(bindExprStr);
                    expression.eval();

                    expression.variables.forEach(function(path) {
                        self.registerDataBindMap(path, updateNodeInfo);
                    });
                });
            }
        },
        registerDataBindMap: function(path, updateInfo) {
            var map = this.dataBindMap;

            if (map[path] === undefined) {
                map[path] = [];
            }

            if (map[path].indexOf(updateInfo) === -1) {
                map[path].push(updateInfo);
            }
        },
        parseAndBuildChildren: function() {
            var self = this;
            var domStack = [];

            addChildrenToStack(domStack, self.dom.children);

            while(domStack.length > 0) {
                var currDom = domStack.pop();

                // first of all, handle conditional Dom signature
                /* jshint -W083 */
                var bFind = self.findCDAttributes(currDom.attributes, function(operator, expr) {
                    self.childNodes.push(new CDTNode(currDom, {
                        operatorName: operator,
                        exprStr: expr
                    }, self.viewModel));
                });
                // delegate child conditional-dom tree to CDTNode
                if (bFind === true) {
                    continue;
                }

                // handle data binding expression on the text node
                self.findDataBindTextNode(currDom.childNodes);

                // check if element has event bind attribute, if so add an event listener
                checkEventBindAttr(currDom);

                // check if element has model attribute, if so bind them
                checkBoundModelAttr(currDom);

                // next
                addChildrenToStack(domStack, currDom.children);
            }

            function addChildrenToStack(stack, children) {
                for(var i = 0; i < children.length; i++) {
                    stack.unshift(children[i]);
                }
            }

            function checkBoundModelAttr(dom) {
                var attrModelName = util.getAttrValue(dom.attributes, 'model');
                if (attrModelName === "") { return; }

                dom.addEventListener('input', function() {
                    self.viewModel[attrModelName] = dom.value;
                });
            }

            function checkEventBindAttr(dom) {

                util.searchAttrs(dom.attributes, self.eventBindList, function(attrName, expr) {
                    var exprInst = new Expression(expr, self.viewModel);

                    // TODO: need to check this event listener will be removed automatically when dom is destroyed
                    dom.addEventListener(attrName.replace('js-', ''), function() {
                        exprInst.eval();
                    });
                });
            }
        },
        applyData: function () {
            var viewModel = this.viewModel,
                dataBindMap = this.dataBindMap;

            if (!viewModel) {
                throw uiErr('no view model', 'failed to bind data, there is no view model!');
            }

            // update view
            for(var propertyName in dataBindMap) {
                if (dataBindMap.hasOwnProperty(propertyName) === false) {
                    continue;
                }
                this.updateNodes(propertyName);
                //logger.info("------- found data bind text: " + propertyName + " -------");
            }
        },
        updateNodes: function (chagedPath) {
            var self = this;

            // TODO: change the dataBindMap data structure for performance
            var targets = self.dataBindMap[chagedPath];
            if (!targets) {
                return;
            }

            targets.forEach(function(updateInfo) {
                var htmlStr = updateInfo.template;

                for (var i = 0; i < updateInfo.subTemplates.length; i++) {
                    htmlStr = htmlStr.replace(updateInfo.subTemplates[i], updateInfo.expressions[i].eval());
                }

                updateInfo.node.textContent = htmlStr;
            });
        },
        update: function(name, value, path) {
            var self = this,
                fullPath = "";

            if (path) {
                fullPath = path + (util.isNumberString(name) ? '' : '.' + name);
            } else {
                fullPath = name;
            }


            if (self.exprInst && self.exprInst.getLastValue() !== value && self.exprInst.isFactor(fullPath)) {
                // condition data is updated, rebuild CDT nodes
                self.build();
                return;
            }

            self.updateNodes(fullPath);

            self.childNodes.forEach(function(node) {
                node.update(name, value, path);
            });
        },
        clear: function() {
            this.childNodes.forEach(function(node) {
                node.clear();
            });
            this.childNodes = [];
        }
    };


    /*
        expression
     */
    function Expression(expr, viewModel) {
        this.postfixTokens = [];
        this.variables = [];
        this.viewModel = viewModel;
        this.lastValue = null;
        this.init(expr);
    }

    Expression.prototype = {
        constructor: Expression,
        operators: {
            //'.': { priority: 10, calc: function(l,r) { return l.r; }},
            '*': { priority: 5, calc: function(l,r) { return l*r; }},
            '/': { priority: 5, calc: function(l,r) { return l/r; }},
            '%': { priority: 5, calc: function(l,r) { return l%r; }},
            '+': { priority: 4, calc: function(l,r) { return l+r; }},
            '-': { priority: 4, calc: function(l,r) { return l-r; }},
            '>': { priority: 3, calc: function(l,r) { return l>r; }},
            '<': { priority: 3, calc: function(l,r) { return l<r; }},
            '>=': { priority: 3, calc: function(l,r) { return l>=r; }},
            '<=': { priority: 3, calc: function(l,r) { return l<=r; }},
            '==': { priority: 2, calc: function(l,r) { return l===r; }},
            '!=': { priority: 2, calc: function(l,r) { return l!==r; }},
            '||': { priority: 1, calc: function(l,r) { return l||r; }},
            '&&': { priority: 1, calc: function(l,r) { return l&&r; }}
        },
        getPriority: function(operator) {
            var info = this.operators[operator];
            return info && info.priority;
        },
        calculate: function(operator, opLeft, opRight) {
            var info = this.operators[operator];
            return info && info.calc(opLeft, opRight);
        },
        eval: function() {
            var self = this,
                postfixTokens = self.postfixTokens,
                operandStack = [],
                res, operandLeft, operandRight;

            for (var i = 0; i < postfixTokens.length; i++) {
                if (self.isOperator(postfixTokens[i]) === true) {
                    operandRight = operandStack.pop();
                    operandLeft = operandStack.pop();
                    res = self.calculate(postfixTokens[i], operandLeft, operandRight);
                } else {
                    res = self.getOperandValue(postfixTokens[i]);
                }

                operandStack.push(res);
            }

            if (operandStack.length !== 1) {
                throw uiErr('invalid expr', 'invalid postfix tokens, failed to Expression.eval()');
            }

            return self.lastValue = operandStack[0];
        },
        getOperandValue: function(operandStr) {
            var self = this,
                viewModel = self.viewModel;

            // string constants
            if (util.isQuotationString(operandStr)) {
                return operandStr.substring(1, operandStr.length - 1);
            }

            // numeric constants
            if (util.isNumberString(operandStr)) {
                return operandStr * 1;
            }

            var propertyName = operandStr,
                isFunc = false;
            // function of viewModel property
            if (util.isFunctionString(operandStr)) {
                propertyName = operandStr.substring(0, operandStr.indexOf('('));
                isFunc = true;
            }

            var path = propertyName.split('.'),
                value = viewModel;

            if (self.variables.indexOf(propertyName) === -1) {
                self.variables.push(propertyName);
            }

            for (var i = 0; i < path.length; i++) {
                value = value[path[i]];
            }

            if (isFunc) {
                return value();
            }

            return value;
        },
        init: function(expr) {
            if (!expr || typeof expr !== 'string') {
                return;
            }

            // first step - convert infix expressions into postfix while extracts token
            var self = this,
                postfix = [],
                operatorStack = [];

            forEachToken(expr, function(token, type) {
                if (type === 'operand') {
                    postfix.push(token);
                } else if (type === 'operator') {
                    while (operatorStack.length > 0) {
                        var lastOp = operatorStack.pop();
                        if (self.getPriority(lastOp) < self.getPriority(token)) {
                            operatorStack.push(lastOp);
                            break;
                        }
                        postfix.push(lastOp);
                    }
                    operatorStack.push(token);
                }
            });

            self.postfixTokens = postfix.concat(operatorStack.reverse());


            function forEachToken(expr, cbHandler) {
                var i = 0,
                    operand = '',
                    token = null;

                while (expr.length > i) {
                    if (self.isOperator(token = expr[i]) || self.isOperator(token = expr.substr(i, 2))) {
                        if (operand !== '') {
                            cbHandler(operand.trim(), 'operand');
                            operand = '';
                        }
                        cbHandler(token, 'operator');
                        i += token.length;
                    } else {
                        operand += expr[i];
                        i++;
                    }
                }

                if (operand !== '') {
                    cbHandler(operand.trim(), 'operand');
                }
            }
        },
        isOperator: function(code) {
            return code in this.operators;
        },
        getLastValue: function() {
            return this.lastValue;
        },
        isFactor: function(path) {
            var vars = this.variables;

            for (var i = 0; i < vars.length; i++) {
                if (vars[i].indexOf(path) === 0) {
                    return true;
                }
            }
            return false;
        }
    };


    /*
        Deep Observer
     */
    function DeepObserver(rootModel) {
        this.model = rootModel;
        this.pathTable = {};
        this.objId = 0;
        this.watchedObjs = [];
    }

    DeepObserver.prototype = {
        constructor: DeepObserver,
        open: function(clientCallback) {
            this.cbClient = clientCallback;
            this.deepObserve(this.model, null);
        },
        close: function() {
            var watchedObjs = this.watchedObjs;
            for (var i = 0; i < watchedObjs.length; i++) {
                var obj = watchedObjs[i];
                if (Array.isArray(obj)) {
                    Array.unobserve(obj, this.notifyChange);
                } else {
                    Object.unobserve(obj, this.notifyChange);
                }
            }

            this.watchedObjs = [];
        },
        deepObserve: function(model, path) {
            var self = this;

            if (!model || typeof model !== "object") {
                return;
            }

            self.addObserve(model, path);

            if (Array.isArray(model) === false) {
                for (var prop in model) {
                    if (!model.hasOwnProperty(prop)) {
                        continue;
                    }

                    self.deepObserve(model[prop], path ? path + '.' + prop : prop);
                }
            }
        },
        addObserve: function(model, path) {
            var self = this;

            if (self.model !== model) {
                var id = self.getNextObjId();
                model.$id = id;
                self.pathTable[id] = path;
            }

            if (Array.isArray(model)) {
                Array.observe(model, self.notifyChange.bind(self));
            } else {
                Object.observe(model, self.notifyChange.bind(self));
            }

            self.watchedObjs.push(model);
        },
        removeObserve: function(model) {
            var self = this;

            if (!model || typeof model === "object") {
                return;
            }

            if (Array.isArray(model)) {
                Array.unobserve(model, self.notifyChange);
            } else {
                Object.unobserve(model, self.notifyChange);
            }

            delete self.pathTable[model.$id];
            var i = self.watchedObjs.indexOf(model);
            if (i > -1) {
                self.watchedObjs.splice(i, 1);
            }
        },
        notifyChange: function(changes) {
            var self = this;

            changes.forEach(function(change) {
                var changedVal = change.object[change.name],
                    path = self.getPath(change.object);

                if (change.type === "add") {
                    self.deepObserve(changedVal, path);
                } else if (change.type === "delete") {
                    self.removeObserve(changedVal);
                }

                logger.info("[OBSERVE] type: " + change.type + ", name: " + change.name + ", new value: " + change.object[change.name] + ", oldValue: " + change.oldValue + ", path: " + path);
                self.cbClient(change.name, changedVal, path);
            });
        },
        getPath: function(model) {
            var id = model ? model.$id : -1;
            return this.pathTable[id];
        },
        getNextObjId: function() {
            return this.objId++;
        }
    };

    jSponsor.ui = uiManager;
})();