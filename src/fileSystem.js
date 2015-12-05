(function() {
    'use strict';

    /*
        short cut
     */
    //var util = jSponsor.util;

    /*
        These file system APIs are dependent on browser, below implementation will be available on the chrome only
     */
    var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

    // default size for requested file system is 5MB
    var DEFAULT_TEMP_FS_BYTES = 5 * 1024 * 1024,
        DEFAULT_PERS_FS_BYTES = 5 * 1024 * 1024,
        DEFAULT_MIME_TYPE = "text/plain";

    var fileSystem = {
        FILE_TYPE: {
            FILE: 1,
            DIRECTORY: 2
        },
        READ_FORMAT: {
            PLAIN_TEXT: 0,
            BINARY_STRING: 1,
            ARRAY_BUFFER: 2,
            DATA_URL: 3
        },
        $temporaryFileSystem: function(requestBytes) {
            return new Promise(function(resolve, reject) {
                requestFileSystem(window.TEMPORARY, requestBytes || DEFAULT_TEMP_FS_BYTES, function(rawFileSystem) {
                    if (!rawFileSystem) {
                        reject('failed to get filesystem');
                        return;
                    }

                    console.log("[$temporaryFileSystem] get filesystem: " + rawFileSystem.name);
                    resolve(getAbstractFileSystem(rawFileSystem));
                }, function(e) {
                    reject(e.name);
                });
            });
        },
        $persistentFileSystem: function(requestBytes) {
            return new Promise(function(resolve, reject) {
                navigator.webkitPersistentStorage.requestQuota(requestBytes || DEFAULT_PERS_FS_BYTES, function(grantedBytes) {
                    if (grantedBytes <= 0) {
                        reject('no space');
                        return;
                    }

                    requestFileSystem(window.PERSISTENT, grantedBytes, function(rawFileSystem) {
                        if (!rawFileSystem) {
                            reject('failed to get filesystem');
                            return;
                        }

                        console.log("[$persistentFileSystem] get filesystem: " + rawFileSystem.name + ", grunted size: " + grantedBytes + " bytes");
                        resolve(getAbstractFileSystem(rawFileSystem));
                    }, function(e) {
                        reject(e.name);
                    });
                }, function(e) {
                    reject(e.name);
                });
            });
        }
    };

    function getAbstractFileSystem(rawFileSystem) {
        var rootDirEntry = rawFileSystem.root;

        return {
            createFile: function(path, option) {
                var self = this;
                option = option || {};

                return new Promise(function(resolve, reject) {
                    if (option.subDirectories) {
                        var parentTokens = getParentDirTokens(path);
                        if (parentTokens) {
                            var parentPath = parentTokens.join('/');
                            self.exists(parentPath).then(function() {
                                makeFile(path);
                            }, function() {
                                // if parent path does not exists, make it recursively
                                self.createDirectory(parentPath, option).then(function() {
                                    makeFile(path);
                                }).catch(function(msg) {
                                    reject(msg);
                                });
                            });
                            return;
                        }
                    }

                    makeFile(path);

                    function makeFile(filePath) {
                        rootDirEntry.getFile(filePath, {create: true}, function(fileEntry) {
                            createMetaInfo(fileEntry, function(info) {
                                resolve(info);
                            });
                        }, function(e) {
                            reject(e.name);
                        });
                    }
                });
            },
            writeFile: function(path, data, option) {
                var self = this;

                option = option || {};
                return new Promise(function(resolve, reject) {
                    if (option.subDirectories) {
                        self.exists(path).then(executeWrite, function() {
                            // if parent path does not exist
                            return self.createFile(path, {subDirectories: true});
                        }).then(executeWrite, executeWrite);
                    } else {
                        executeWrite();
                    }

                    function executeWrite() {
                        writeDataToFile(path);
                    }
                    function writeDataToFile(filePath) {
                        rootDirEntry.getFile(filePath, {create: true}, function(fileEntry) {
                            fileEntry.createWriter(function(fileWriter) {
                                fileWriter.onwriteend = function() {
                                    createMetaInfo(fileEntry, function(info) {
                                        resolve(info);
                                    });
                                };
                                fileWriter.onerror = function(e) {
                                    reject(e.toString());
                                };

                                if (option.append === true) {
                                    fileWriter.seek(fileWriter.length);
                                }

                                var blob = new Blob(Array.isArray(data) ? data : [data], {type: option.mimeType || DEFAULT_MIME_TYPE});
                                fileWriter.write(blob);
                            }, function (e) {
                                reject(e.name);
                            });
                        }, function(e) {
                            reject(e.name);
                        });
                    }
                });
            },
            appendFile: function(path, data, option) {
                option = option || {};
                option.append = true;
                return this.writeFile(path, data, option);
            },
            readFile: function(path, option) {
                option = option || {};

                return new Promise(function(resolve, reject) {
                    rootDirEntry.getFile(path, {}, function(fileEntry) {
                        fileEntry.file(function(file) {
                            var reader = new FileReader();
                            reader.onload = function() {
                                resolve(this.result);
                            };
                            reader.onerror = function(e) {
                                reject(e.name);
                            };
                            readDataFile(reader, option.readFormat, file);
                        }, function(e) {
                            reject(e.name);
                        });
                    }, function(e) {
                        reject(e.name);
                    });
                });

                function readDataFile(rd, format, fileObj) {
                    var READ_FORMAT = fileSystem.READ_FORMAT;
                    switch(format) {
                        case READ_FORMAT.ARRAY_BUFFER: return rd.readAsArrayBuffer(fileObj);
                        case READ_FORMAT.BINARY_STRING: return rd.readAsBinaryString(fileObj);
                        case READ_FORMAT.DATA_URL: return rd.readAsDataURL(fileObj);
                        default:
                            return rd.readAsText(fileObj);
                    }
                }
            },
            removeFile: function(path) {
                return new Promise(function(resolve, reject) {
                    rootDirEntry.getFile(path, {create: false}, function(fileEntry) {
                        fileEntry.remove(function() {
                            resolve(path);
                        }, function(e) {
                            reject(e.name);
                        });
                    }, function(e) {
                        reject(e.name);
                    });
                });
            },
            copyFile: function(src, dest, option) {
                option = option || {};
                return new Promise(function(resolve, reject) {
                    if (!src || !dest) {
                        reject('invalid param');
                        return;
                    }

                    rootDirEntry.getFile(src, {}, function(fileEntry) {
                        rootDirEntry.getDirectory(dest, {create: true}, function(dirEntry) {
                            fileEntry.copyTo(dirEntry, option.newName, function() {
                                resolve(dest);
                            }, function(e) {
                                reject(e.name);
                            });
                        }, function(e) {
                            reject(e.name);
                        });
                    }, function(e) {
                        reject(e.name);
                    });
                });
            },
            moveFile: function(src, dest, option) {
                option = option || {};
                return new Promise(function(resolve, reject) {
                    if (!src || !dest) {
                        reject('invalid param');
                        return;
                    }

                    rootDirEntry.getFile(src, {}, function(fileEntry) {
                        rootDirEntry.getDirectory(dest, {create: true}, function(dirEntry) {
                            fileEntry.moveTo(dirEntry, option.newName, function() {
                                resolve(dest);
                            }, function(e) {
                                reject(e.name);
                            });
                        }, function(e) {
                            reject(e.name);
                        });
                    }, function(e) {
                        reject(e.name);
                    });
                });
            },
            createDirectory: function(path, option) {
                option = option || {};
                return new Promise(function(resolve, reject) {
                    if (!path) {
                        reject('invalid path');
                        return;
                    }

                    mkDir(rootDirEntry, (option.subDirectories === true) ? path.split('/') : [path]);

                    function mkDir(dirEntry, pathTokens) {
                        var currDirName = pathTokens[0];

                        // '/example/...' or './example/..' avoid these cases!
                        if (!currDirName || currDirName === '.') {
                            pathTokens = pathTokens.slice(1);
                            currDirName = pathTokens[0];
                        }
                        dirEntry.getDirectory(currDirName, {create: true}, function(currDir) {
                            if (pathTokens.length <= 1) {
                                resolve(currDir.name);
                            } else {
                                mkDir(currDir, pathTokens.slice(1));
                            }
                        }, function(e) {
                            reject(e.name);
                        });
                    }
                });
            },
            removeDirectory: function(path, option) {
                option = option || {};
                return new Promise(function(resolve, reject) {
                    if (!path) {
                        reject('invalid path');
                        return;
                    }

                    rootDirEntry.getDirectory(path, {}, function(dirEntry) {
                        if (option.recursive) {
                            dirEntry.removeRecursively(function() {
                                resolve();
                            }, function(e) {
                                reject(e.name);
                            });
                        } else {
                            dirEntry.remove(function() {
                                resolve();
                            }, function(e) {
                                reject(e.name);
                            });
                        }
                    }, function(e) {
                        reject(e.name);
                    });
                });
            },
            exists: function(path) {
                return new Promise(function(resolve, reject) {
                    rootDirEntry.getFile(path, {create: false}, function() {
                        resolve();
                    }, function() {
                        rootDirEntry.getDirectory(path, {create: false}, function() {
                            resolve();
                        }, function(e) {
                            reject(e.name);
                        });
                    });
                });
            },
            getMetaInfo: function(path) {
                return new Promise(function(resolve, reject) {
                    rootDirEntry.getFile(path, {create: false}, function(fileEntry) {
                        createMetaInfo(fileEntry, function(info) {
                            resolve(info);
                        });
                    }, function(e) {
                        reject(e.name);
                    });
                });
            }
        };

        function createMetaInfo(fileEntry, cbFn) {
            if (!cbFn) { return; }

            if (!fileEntry) {
                cbFn();
                return;
            }

            var basicInfo = {
                type: fileEntry.isFile ? fileSystem.FILE_TYPE.FILE : fileSystem.FILE_TYPE.DIRECTORY,
                name: fileEntry.name,
                path: fileEntry.fullPath
            };

            fileEntry.getMetadata(function(meta) {
                basicInfo.date = meta.modificationTime;
                basicInfo.size = meta.size;
                cbFn(basicInfo);
            }, function() {
                cbFn(basicInfo);
            });
        }

        function getParentDirTokens(pathStr) {
            if (!pathStr) {
                return null;
            }

            var tokens = pathStr.split('/');
            if (!tokens[0] || tokens[0] === '.') {
                tokens = tokens.slice(1);
            }

            if (!tokens || tokens.length < 2) {
                // parent directory does not exists
                return null;
            }

            return tokens.slice(0, tokens.length - 1);
        }
    }


    //fileSystem.$persistentFileSystem().then(function(tfs) {
    //    tfs.createFile('/first/second/test.txt', {subDirectories: true})
    //        .then(function(info) {
    //            console.log("[create] : " + getInfoStr(info));
    //            return tfs.writeFile('check/foo/bar/ok.txt', "fighting!", {subDirectories: true});
    //        })
    //        .then(function(info) {
    //            console.log("[write] : " + getInfoStr(info));
    //            return tfs.appendFile('check/foo/bar/ok.txt', ", You are perfect!");
    //        })
    //        .then(function() {
    //            return tfs.readFile('check/foo/bar/ok.txt', {readFormat: fileSystem.READ_FORMAT.PLAIN_TEXT});
    //        })
    //        .then(function(data) {
    //            console.log("[read] data: " + data);
    //            return tfs.copyFile('check/foo/bar/ok.txt', 'first');
    //        })
    //        .then(function() {
    //            console.log("[copy] ok");
    //            return tfs.removeFile('check/foo/bar/ok.txt');
    //        })
    //        .then(function(name) {
    //            console.log("[removed] fileName: " + name);
    //            return tfs.readFile('first/ok.txt');
    //        })
    //        .then(function(data) {
    //            console.log("[read] first/ok.txt: " + data);
    //            return tfs.removeDirectory('first', {recursive: true});
    //        })
    //        .then(function() {
    //            console.log("[removeDir] ok");
    //        })
    //        .catch(function(msg) {
    //            console.error("[TFS] error: " + msg);
    //        });
    //});
    //
    //function getInfoStr(info) {
    //    return JSON.stringify(info);
    //}

    jSponsor.fileSystem = fileSystem;
})();
