/// <reference path="../typings/jquery/jquery.d.ts"/>
/**
* Wikiplus
* Author:+Eridanus Sora/@妹空酱
* Github:https://github.com/Last-Order/Wikiplus
*/
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

$(function () {
    var i18n = function i18n() {
        _classCallCheck(this, i18n);
    };

    var Wikipage = (function () {
        _createClass(Wikipage, [{
            key: 'throwError',
            value: function throwError(name) {}
        }, {
            key: 'inArray',
            value: function inArray(value) {
                var array = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

                if ($.inArray(value, array) === -1) {
                    return false;
                } else {
                    return true;
                }
            }
        }]);

        function Wikipage() {
            var pageName = arguments.length <= 0 || arguments[0] === undefined ? window.mw.config.values.wgPageName : arguments[0];

            _classCallCheck(this, Wikipage);

            var self = this;
            console.log('页面类构建中');
            //可用性和权限检测
            if (!window.mw) {
                console.log('页面Javascript载入不完全或这不是一个Mediawiki站点');
                return;
            }
            if (!window.mw.config.values.wgEnableAPI || !window.mw.config.values.wgEnableWriteAPI) {
                self.throwError(1000, '无可用的API');
                return;
            }
            if (!self.inArray('autoconfirmed', window.mw.config.values.wgUserGroups)) {
                self.throwError(1001, '非自动确认用户');
                return;
            }
            //从MediaWiki定义的全局变量中获得信息
            self.pageName = pageName.replace(/ /ig, '_'); // Mediawiki处理空格时可能会出错
            self.revisionId = window.mw.config.values.wgRevisionId;
            self.articleId = window.mw.config.values.wgArticleId;
            self.API = location.protocol + '//' + location.host + window.mw.config.values.wgScriptPath + '/api.php';
            //多语言
            self.languages = {};
            //预载入中文的
            self.languages['zh-cn'] = {
                'fail_to_get_timestamp': '无法获得页面时间戳'
            };
            self.i18n = function (stringName) {};
            //定义错误列表
            self.errorList = {
                'fail_to_get_timestamp': {
                    'number': 1004,
                    'message': self.i18n('fail_to_get_timestamp')
                }
            };
            //抛出错误
            self.throwError = function (name) {
                var self = this;
                if (!self.errorList[name]) {
                    name = 'unknown_error_name';
                }
                var e = new Error();
                console.log(self.errorList[name]);
                e.number = self.errorList[name].number;
                e.message = self.errorList[name].message;
                console.log('%c致命错误[' + e.number + ']:' + e.message, 'color:red');
                return e;
            };
            self.throwError('fail_to_get_timestamp');
            //从API获得编辑令牌和起始时间戳
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: self.API,
                data: {
                    'action': 'query',
                    'prop': 'revisions|info',
                    'titles': self.pageName,
                    'rvprop': 'timestamp',
                    'intoken': 'edit',
                    'format': 'json'
                },
                beforeSend: function beforeSend() {
                    console.time('获得页面基础信息时间耗时');
                },
                success: function success(data) {
                    if (data && data.query && data.query.pages) {
                        var info = data.query.pages;
                        for (var key in info) {
                            if (key !== '-1') {
                                if (info[key].revisions && info[key].revisions.length > 0) {
                                    self.timeStamp = info[key].revisions[0].timestamp;
                                } else {
                                    self.throwError(1004, '无法获得页面时间戳');
                                }
                                if (info[key].edittoken) {
                                    if (info[key].edittoken != '+\\') {
                                        self.editToken = info[key].edittoken;
                                    } else {
                                        console.log('无法通过API获得编辑令牌，可能是空页面，尝试通过前端API获取通用编辑令牌');
                                        self.editToken = window.mw.user.tokens.get('editToken');
                                        if (self.editToken && self.editToken != '+\\') {
                                            console.log('成功获得通用编辑令牌 来自前端API');
                                        } else {
                                            self.throwError(1005, '无法获得页面编辑令牌 请确认登录状态');
                                        }
                                    }
                                }
                            } else {
                                //原来版本这里依然会试着用前端API来获取Token，但是这样就没有了起始时间戳，有产生编辑覆盖的可能性
                                self.throwError(1007, '无法获得页面基础信息');
                                self.inited = true;
                            }
                        }
                    }
                }
            }).done(function () {
                console.timeEnd('获得页面基础信息时间耗时');
            });
        }

        //通用页面编辑

        _createClass(Wikipage, [{
            key: 'edit',
            value: function edit() {
                var title = arguments.length <= 0 || arguments[0] === undefined ? this.pageName : arguments[0];
                var content = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
                var config = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
                var callback = arguments.length <= 3 || arguments[3] === undefined ? {
                    'success': new Function(),
                    'fail': new Function()
                } : arguments[3];

                var self = this;
                if (self.inited) {
                    $.ajax({
                        type: 'POST',
                        url: self.API,
                        data: $.extend({
                            'action': 'edit',
                            'format': 'json',
                            'text': content,
                            'title': title,
                            'token': self.editToken,
                            'basetimestamp': self.timeStamp
                        }, config),
                        success: function success(data) {
                            if (data && data.edit) {
                                if (data.edit.result && data.edit.result == 'Success') {
                                    callback.success();
                                } else {
                                    if (data.edit.code) {
                                        //防滥用过滤器
                                        callback.fail(self.throwError(1018, '触发防滥用过滤器:' + data.edit.info.replace('/Hit AbuseFilter: /ig', '') + '<br><small>' + data.edit.warning + '</small>'));
                                    } else {
                                        callback.fail(self.throwError(1019, '未知编辑错误'));
                                    }
                                }
                            } else if (data && data.error && data.error.code) {
                                switch (data.error.code) {}
                            }
                        }
                    });
                } else {
                    callback.fail(self.throwError(1017, '页面类未加载完成'));
                }
            }
        }]);

        return Wikipage;
    })();

    $(document).ready(function () {
        var Wikiplus = function Wikiplus() {
            _classCallCheck(this, Wikiplus);

            var self = this;
            this.version = '2.0';
            this.releaseNote = '重构;';
            console.log('正在加载Wikiplus');
            self.kotori = new Wikipage();
        };

        new Wikiplus();
    });
});
