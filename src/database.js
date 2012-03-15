//This is the "Abstraction Layer" used to abstract off the browser
/**
 * Supported Browsers:
 *  - IndexedDB (prefered):
 *	- Firefox 4+
 *	- IE 10+
 *	- Chrome 11+
 *  - Web SQL (fallback):
 *	- Chrome 4+
 *	- Safari 3.1+
 *	- Opera 10.5+
 *	- iOS Safari 3.2+
 *	- Opera Mobile 11+
 *	- Android Browser 2.1+
 *	
 * TODO:
 *  - Handle Upgrade cases (specified version is greater than on disk version)
 *  - Handle WebSQL users
 *  - Optimize for selecting on indexedDB keypath (i.e. use .get() instead of .index())
 *  - Select filter uses OR logic now, needs to have AND logic as well
 *  
 * NOTE:
 *  - Schemas are passed as object of the form:
 *  {
 *	tableName: {
 *	    columns: {
 *		columnName: { unique: true/false }, //if {} not specific defaults to { unique: false }
 *		columnName: { unique: true/false },
 *		columnName: { unique: true/false },
 *		...
 *	    }
 *	},
 *	...
 *  }
 *  - Open callback prototype: function(db) {}
 */

jDal.DB = {
    db: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB || window.openDatabase,
    version: 4,
    size: 100000,
    types: {IndexedDB: 'IDB', WebSQL: 'WSQL'},
    open: function(dbName, schema, callback) {
	var db = jDal.DB.db;
	//No DB support
	if(!db) return false;
	
	//Otherwise this is a Indexed DB
	if(typeof(db) == 'object')
	    return new jDal.DB._handle(db.open(dbName, jDal.DB.version), jDal.DB.types.IndexedDB, schema, callback);
	//If we are using WebSQL Database Type
	else
	    return new jDal.DB._handle(db(dbName, jDal.DB.version, dbName, jDal.DB.size), jDal.DB.types.WebSQL, schema);
    },
    _handle: function(request, type, schema, openedCallback) {
	//////////////////////////////////////
	// HANDLE INITIALIZATION
	//////////////////////////////////////
	//privates
	this.db = null;
	this.type = type;
	this.schema = schema;

	//setup DB handle (parse request)
	if(type == jDal.DB.types.IndexedDB) {
	    request.onerror = _onError;
	    request.onsuccess = jDal._bind(this, function(req, e) {
		this.db = req.result;
		this.db.onerror = _onError;
		
		//Backwards compat with old IndexedDB draft (before FF10)
		if(this.db.version != jDal.DB.version) {
		    var setupReq = this.db.setVersion(jDal.DB.version);
		    setupReq.onsuccess = jDal._bind(this, function(req, e) {
			_createStructure.call(this, req, e);
			openedCallback.call(this, this);
		    });
		} else {
		    //call user callback
		    openedCallback.call(this, this);
		}
		
	    });
	    request.onupgradeneeded = jDal._bind(this, _createStructure);
	}
	else {
	    //get handle
	    db = request;
	    
	    //setup schema
	}

	//////////////////////////////////////
	// PUBLIC API
	//////////////////////////////////////
	//table    -> table to select from
	//filter   -> key value pair to filter by (in { col: val1, ... } format)
	//callback ->callback to execute when finished
	this.select = function(table, filter, callback) {
	    if(this.db === null) {
		throw new Error('DB not yet opened.');
	    }
	    
	    //if they skip a filter
	    if(typeof(filter) == 'function') {
		callback = filter;
		filter = null;
	    }
	    
	    if(this.type == jDal.DB.types.IndexedDB) {
		var objStore = this.db.transaction([table]).objectStore(table),
		    results = [],
		    selectCursor = function(req, e) {
			var cursor = req.result;
			if(cursor) {
			    results.push(cursor.value);
			    cursor.continue();
			} else {
			    callback.call(this, results);
			}
		    };
		
		if(filter === null) {
		    objStore.openCursor().onsuccess = jDal._bind(this, selectCursor);
		} else {
		    for(var col in filter) {
			objStore.index(col).openCursor(IDBKeyRange.only(filter[col])).onsuccess = jDal._bind(this, selectCursor);
		    }
		}
		
		return this;
	    } else {}
	};
	
	//table    -> table to insert into
	//data     -> array of objects to store (in { col: value, ... } format)
	//callback -> callback to execute when finished
	this.insert = function(table, data, callback) {
	    if(this.db === null) {
		throw new Error('DB not yet opened.');
	    }
	    
	    if(this.type == jDal.DB.types.IndexedDB) {
		var trans = this.db.transaction([table], IDBTransaction.READ_WRITE);
		
		trans.oncomplete = jDal._bind(this, function(req, e) {
		    callback.call(this);
		});
		
		var objStore = trans.objectStore(table);
		for (var i in data) {
		    if(data.hasOwnProperty(i)) {
			data[i]._id = jDal._generateGuid();
			
			var reqst = objStore.add(data[i]);
			
			reqst.onerror = jDal._bind(this, function(req, e) {
			    //guid collision, shouldnt happen but if it does, try again
			    if(e.target.errorCode === 4) {
				data[i]._id = jDal._generateGuid();
				objStore.add(data[i]);
			    }
                            e.stopPropogation();
			});
		    }
		}
		
		return this;
	    } else {}
	};
	
	//table    -> table to delete from
	//filter   -> key value pair to filter by (in { col: val1, ... } format)
	//callback -> callback to execute when finished
	this.drop = function(table, filter, callback) {
	    if(this.db === null) {
		throw new Error('DB not yet opened.');
	    }
	    
	    if(this.type == jDal.DB.types.IndexedDB) {
		var trans = this.db.transaction([table], IDBTransaction.READ_WRITE);
		
		trans.oncomplete = jDal._bind(this, function(e) {
		    callback.call(this, e);
		});
		
		testDb.select('testTable', filter, function(results) {
		    $.each(results, function(i, val) {
			trans.objectStore(table).delete(val._id);
		    });
		});
	    } else {}
	}
	
	this.isReady = function() {return (this.db !== null);}
	
	//////////////////////////////////////
	// PRIVATE UTILITIES
	//////////////////////////////////////
	//initializes structure of the database
	function _createStructure(req, e) {
	    // iterate through each table in schema
	    for(var tbl in this.schema) {
		if(this.schema.hasOwnProperty(tbl)) {
		    //if already created, move on
		    if(this.db.objectStoreNames.contains(tbl))
			continue;
		    
		    //store table obj, create object store
		    var table = this.schema[tbl],
			objStore = this.db.createObjectStore(tbl, { keyPath: '_id' });

		    //iterate through each column
		    for(var col in table['columns']) {
			if(table['columns'].hasOwnProperty(col)) {
			    //store column definition
			    var column = table['columns'][col] || { unique: false };

			    //create index for this column (in case they select by it)
			    objStore.createIndex(col, col, column);
			}
		    }
		}
	    }
	}
	
	//global error callback
	function _onError(e) {
            if(window.console && console.error)
                console.error("[JDAL] Database error code: " + e.target.errorCode);
	}
    }
};

jDal.DB._handle.prototype.constructor = jDal.DB._handle;