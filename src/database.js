//This is the "Abstraction Layer" used to abstract off the browser
/**
 * Supported Browsers:
 *  - IndexedDB (prefered):
 *	- Firefox 4+
 *	- IE 9+
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
jDal = {};
jDal.DB = {
    db: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB || window.openDatabase,
    version: 3,
    size: 100000,
    types: {IndexedDB: 'IDB', WebSQL: 'WSQL'},
    open: function(dbName, schema) {
	var db = jDal.DB.db;
	//No DB support
	if(!db) return false;
	
	//Otherwise this is a Indexed DB
	if(typeof(db) == 'object')
	    return new jDal.DB._handle(db.open(dbName, jDal.DB.version), jDal.DB.types.IndexedDB, schema);
	//If we are using WebSQL Database Type
	else
	    return new jDal.DB._handle(db(dbName, jDal.DB.version, dbName, jDal.DB.size), jDal.DB.types.WebSQL, schema);
    },
    _handle: function(request, type, schema) {
	//privates
	this.db = null;
	console.log(request);
	    
	this.schema = schema;

	//setup DB handle (parse request)
	if(type == jDal.DB.types.IndexedDB) {
	    request.onerror = jDal.DB._onError;
	    request.onsuccess = function(e) {
		console.log(this);
		console.log("Done!", e, request.result);
		db = request.result;
		db.onerror = jDal.DB._onError;
	    }
	    request.onupgradeneeded = function(e) {
		console.log(this);
		// iterate through each table in schema
		for(tbl in schema) {
		    if(schema.hasOwnProperty(tbl)) {
			//store table obj, create object store
			var table = schema[tbl],
			    objStore = db.createObjectStore(tbl, { keyPath: table['key'] });
			
			//iterate through each column
			for(col in table['columns']) {
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
	}
	else {
	    //get handle
	    db = request;
	    
	    //setup schema
	}

	this.select = {};
	this.insert = {};
	this.query = {};
	
	function _onError(e) {
	    console.error("Database error: " + e.target.errorCode);
	}
    }
};