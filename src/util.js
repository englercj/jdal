window.jDal = {
    //allows us to keep our 'this' reference
    _bind: function(scope, fn) {
	return function() {
	    var args = Array.prototype.slice.call(arguments);
	    args.splice(0, 0, this);
	    fn.apply(scope, args); 
	};
    }
};