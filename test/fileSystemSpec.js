'use strict';

describe('file system', function() {

    it('should have requestFileSystem API on this browser', function() {
        expect(window.requestFileSystem || window.webkitRequestFileSystem).toBeDefined();
    });

    it('should be able to get temporary file system from the browser', function(done) {
        jSponsor.fileSystem.$temporaryFileSystem().then(function(tfs) {
            tfs ? done() : done.fail('empty temporary fs');
        }, function() {
            done.fail('failed to get temp FS');
        });
    });

    it('should be able to get persistent file system from the browser', function(done) {
        // if you have failed to get persistent FS continuously, please check if confirm dialog in the browser.
        jSponsor.fileSystem.$persistentFileSystem().then(function(pfs) {
            pfs ? done() : done.fail('empty persistent FS');
        }, function() {
            done.fail('failed to get persistent FS');
        });
    });

    it('should be able to create file', function(done) {
        jSponsor.fileSystem.$temporaryFileSystem().then(function(tfs) {
            tfs.createFile('/first/second/test.txt', {subDirectories: true})
            .then(function() {
                return tfs.exists('first/second/test.txt');
            })
            .then(function() {
                done();
            })
            .catch(function() {
                done.fail('failed to create file');
            });
        }, function() {
            done.fail('failed to get file system');
        });
    });

    it('should be able to write/append/read', function(done) {
        jSponsor.fileSystem.$temporaryFileSystem().then(function(tfs) {
            var targetPath = '/first/foo/sample.txt';

            tfs.writeFile(targetPath, 'write test with jasmine!',{subDirectories: true})
                .then(function() {
                    return tfs.readFile(targetPath, {readFormat: jSponsor.fileSystem.READ_FORMAT.PLAIN_TEXT});
                })
                .then(function(data) {
                    if (data === 'write test with jasmine!') {
                        return  tfs.appendFile(targetPath, "appended");
                    }
                    done.fail('write content is NOT same with read content: ' + data);
                })
                .then(function() {
                    return tfs.readFile(targetPath, {readFormat: jSponsor.fileSystem.READ_FORMAT.PLAIN_TEXT});
                })
                .then(function(data) {
                    if (data === 'write test with jasmine!appended') {
                        return tfs.removeFile(targetPath);
                    } else {
                        done.fail('write content is NOT same with appended content');
                    }
                })
                .then(function() {
                    done();
                })
                .catch(function() {
                    done.fail('failed to write file');
                });
        }, function() {
            done.fail('failed to get file system');
        });
    });

    it('should be able to copy/remove/move files', function(done) {
        jSponsor.fileSystem.$temporaryFileSystem().then(function(tfs) {
            var testText = 'test for file operation';

            tfs.writeFile('/abc/def/example.js', testText, {subDirectories: true})
            .then(function() {
                return tfs.copyFile('/abc/def/example.js', 'abc');
            })
            .then(function() {
                return tfs.removeFile('/abc/def/example.js');
            })
            .then(function() {
                return tfs.readFile('/abc/example.js', {readFormat: jSponsor.fileSystem.READ_FORMAT.PLAIN_TEXT});
            })
            .then(function(data) {
                if (data === testText) {
                    return tfs.moveFile('/abc/example.js', '/moved', {newName: 'passed.js'});
                }
                done.fail('not equal with copied content');
            })
            .then(function() {
                return tfs.readFile('/moved/passed.js', {readFormat: jSponsor.fileSystem.READ_FORMAT.PLAIN_TEXT});
            })
            .then(function(data) {
                if (data === testText) {
                    done();
                } else {
                    done.fail('not equal with moved content');
                }
            })
            .catch(function() {
                done.fail('failed to touch file');
            });
        }, function() {
            done.fail('failed to get file system');
        });
    });
});