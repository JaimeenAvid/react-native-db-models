'use strict';

var React = require('react-native');
var Promise = require('promise-es6').Promise;

var AsyncStorage = React.AsyncStorage;

var reactNativeStore = {};
var dbName = "db_store";

var Model = function(tableName, databaseData) {
    this.tableName = tableName;
    this.databaseData = databaseData;
    this._where = null;
    this._limit = 100;
    this._offset = 0;
    return this;
};


reactNativeStore.createDataBase = function() {
    var self = this;
    return new Promise(function(resolve, reject) {

        AsyncStorage.setItem(dbName, JSON.stringify({}), function(err) {
            if (err) {
                reject(err)
            } else {
                resolve(data);
            }
        });

    });
};


reactNativeStore.saveTable = function(tableName, tableData) {
    var self = this;
    return new Promise(function(resolve, reject) {

        self.getItem(dbName).then(function(databaseData) {
            databaseData[tableName] = tableData || {
                'totalrows': 0,
                'autoinc': 1,
                'rows': {}
            };
            AsyncStorage.setItem(dbName, JSON.stringify(databaseData), function(err) {
                if (err) {
                    reject(err)
                } else {
                    resolve(databaseData);
                }
            })
        });

    });
}


reactNativeStore.table = function(tableName) {
    var self = this;
    return new Promise(function(resolve, reject) {
        return self.getItem(dbName).then(function(databaseData) {

            if (!databaseData)
                self.createDataBase().then(function(databaseData) {
                    self.saveTable(tableName).then(function() {
                        var model = new Model(tableName, databaseData ? databaseData : {});
                        resolve(model);
                    })
                });
            else {

                if (!databaseData[tableName]) {
                    self.saveTable(tableName).then(function(databaseData) {
                        var model = new Model(tableName, databaseData ? databaseData : {});
                        resolve(model);
                    });
                } else {
                    var model = new Model(tableName, databaseData ? databaseData : {});
                    resolve(model);
                }
            }
        })
    });
}

reactNativeStore.getItem = function(key) {
    return new Promise(function(resolve, reject) {
        AsyncStorage.getItem(key, function(err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(res));
            }
        });
    });
};

// where
Model.prototype.where = function(data) {
    this._where = data || null;
    return this;
}

// limit
Model.prototype.limit = function(data) {
    this._limit = data || 100;
    return this;
}

Model.prototype.offset = function(data) {
    this._offset = data || 0;
    return this;
}

Model.prototype.init = function(){
    this.where();
    this.limit();
    this.offset();
    return this;
}

Model.prototype.update = function(data, callback) {

    var results = [];
    var rows = this.databaseData[this.tableName]["rows"];

    var hasParams = false;
    if (this._where) {
        hasParams = true;
    }

    if (hasParams) {
        for (var row in rows) {

            var isMatch = true;

            for (var key in this._where) {
                if (rows[row][key] != this._where[key]) {
                    isMatch = false;
                }
            }

            if (isMatch) {

                results.push(this.databaseData[this.tableName]["rows"][row]["_id"]);

                for (var i in data) {
                    this.databaseData[this.tableName]["rows"][row][i] = data[i];
                }

                reactNativeStore.saveTable(this.tableName, this.databaseData[this.tableName]).then(function(data){
                    if(callback){
                        callback(data)
                    }
                }, function(err){
                    if(callback){
                        callback(err)
                    }
                });
            }

        }

        this.init();
        return results;

    } else {
        return false;
    }

};

Model.prototype.updateById = function(id, data, callback) {

    this.where({
        _id: id
    });

    return this.update(data, callback);
}

Model.prototype.remove = function(callback) {

    var results = [];
    var rows = this.databaseData[this.tableName]["rows"];
    var promise = null;
    var hasParams = false;
    if (this._where) {
        hasParams = true;
    }
    if (hasParams) {
        for (var row in rows) {
            var isMatch = true;

            for (var key in this._where) {

                if (rows[row][key] != this._where[key]) {
                    isMatch = false;
                }
            }
            if (isMatch) {
                results.push(this.databaseData[this.tableName]["rows"][row]['_id'])
                delete this.databaseData[this.tableName]["rows"][row];
                this.databaseData[this.tableName]["totalrows"]--;
                reactNativeStore.saveTable(this.tableName, this.databaseData[this.tableName]).then(function(data){
                    if(callback){
                        callback(data)
                    }
                }, function(err){
                    if(callback){
                        callback(err)
                    }
                })
            }

        }

    }
    this.init();
    if (callback && results.length === 0) {
        callback(null)
    }

};

Model.prototype.removeById = function(id) {

    this.where({
        _id: id
    });

    return this.remove();
}

Model.prototype.add = function(data, callback) {
    var autoinc = this.databaseData[this.tableName].autoinc;
    data._id = autoinc;
    this.databaseData[this.tableName].rows[autoinc] = data;
    this.databaseData[this.tableName].autoinc += 1;
    this.databaseData[this.tableName].totalrows += 1;
    reactNativeStore.saveTable(this.tableName, this.databaseData[this.tableName]).then(function(data){
        if(callback){
            callback(data)
        }
    }, function(err){
        if(callback){
            callback(err)
        }
    });

    this.init();
}

Model.prototype.get = function(id) {
    this.where({
        _id: id
    });
    return this.find(1);
}

Model.prototype.find = function() {

    var results = [];
    var rows = this.databaseData[this.tableName]["rows"];

    var hasParams = false;
    if (this._where) {
        hasParams = true;
    }

    if (hasParams) {
        for (var row in rows) {
            var isMatch = false;
            for (var key in this._where) {
                if (rows[row][key] == this._where[key]) {
                    isMatch = true;
                } else {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                results.push(rows[row]);
            }
        }
    } else {
        for (var row in rows) {
            results.push(rows[row]);
        }
    }

    if (typeof(limit) == 'number') {
        return results.slice(this._offset, this._limit + this._offset);
    } else {
        this.init();
        return results;
    }


}



module.exports = reactNativeStore;