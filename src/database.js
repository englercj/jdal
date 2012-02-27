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
 *  
 * NOTE:
 *  - Schemas are passed as object of the form:
 *  {
 *	tableName: {
 *	    key: 'columnName',
 *	    columns: {
 *		columnName: { unique: true/false }, //if {} not specific defaults to { unique: false }
 *		columnName: { unique: true/false },
 *		columnName: { unique: true/false },
 *		...
 *	    }
 *	},
 *	...
 *  }
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
			createStructure.call(this, req, e);
			openedCallback.call(this);
		    });
		} else {
		    //call user callback
		    openedCallback.call(this);
		}
		
	    });
	    request.onupgradeneeded = jDal._bind(this, createStructure);
	}
	else {
	    //get handle
	    db = request;
	    
	    //setup schema
	}

	this.select = function(table, filter, callback) {
	    if(this.db === null) {
		throw new Error('DB not yet opened.');
	    }
	    
	    if(this.type == jDal.DB.types.IndexedDB) {
		var objStore = this.db.transaction([table]).objectStore(table),
		    index = objStore.index(filter[0]);
		    
		index.get(filter[1]).onsuccess = jDal._bind(this, function(req, e) {
		    callback.call(this, req.result);  
		});
		
		return this;
	    } else {}
	};
	
	this.insert = function(table, data, callback) {
	    if(this.db === null) {
		throw new Error('DB not yet opened.');
	    }
	    
	    if(this.type == jDal.DB.types.IndexedDB) {
		var trans = this.db.transaction([table], IDBTransaction.READ_WRITE);
		
		trans.oncomplete = jDal._bind(this, function(req, e) {
		    callback.call(this);
		});
		
		/*trans.onerror = jDal._bind(this, function(req, e) {
		    console.log('Error', req, e);
		});*/
		
		var objStore = trans.objectStore(table);
		for (var i in data) {
		    objStore.add(data[i]);
		    //var reqst = objStore.add(data[i]);
		    /*reqst.onsuccess = jDal._bind(this, function(req, e) {
			console.log(this, req, e);
		    });*/
		}
		
		return this;
	    } else {}
	};
	
	function createStructure(req, e) {
	    //console.log(this, req, e);
	    // iterate through each table in schema
	    for(var tbl in this.schema) {
		if(this.schema.hasOwnProperty(tbl)) {
		    //if already created, move on
		    if(this.db.objectStoreNames.contains(tbl))
			continue;
		    
		    //store table obj, create object store
		    var table = this.schema[tbl],
			objStore = this.db.createObjectStore(tbl, { keyPath: table['key'] });

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
	
	function _onError(e) {
	    console.log(e);
	    console.error("Database error: " + e.target.errorCode);
	}
    }
};

jDal.DB._handle.prototype.constructor = jDal.DB._handle;