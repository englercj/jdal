window.jDal = {
    //allows us to keep our 'this' reference
    _bind: function(scope, fn) {
	return function() {
	    var args = Array.prototype.slice.call(arguments);
	    args.splice(0, 0, this);
	    fn.apply(scope, args); 
	};
    },
    _generateGuid: function() {
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), 
        uuid = new Array(36), rnd=0, r;
	for (var i = 0; i < 36; i++) {
	    if (i==8 || i==13 ||  i==18 || i==23) {
		uuid[i] = '-';
	    } else if (i==14) {
		uuid[i] = '4';
	    } else {
		if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
		r = rnd & 0xf;
		rnd = rnd >> 4;
		uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
	    }
	}
	return uuid.join('');
    },
    //From jQuery Source
    _extend: function() {
        var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
            target = {};
        }

        // extend jQuery itself if only one argument is passed
        if ( length === i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && jQuery.isArray(src) ? src : [];

                        } else {
                            clone = src && jQuery.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[ name ] = jQuery.extend( deep, clone, copy );

                        // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    }
};