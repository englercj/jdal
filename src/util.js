jDal.al = {
    //util class
    setup: function() {
        Components.utils.import('resource://gre/modules/Services.jsm');
        Components.utils.import('resource://gre/modules/FileUtils.jsm');
    },
    openConnection: function(f) {
        var fname = f || 'jdal.sqlite',
            file = FileUtils.getFile('ProfD', [fname]),
            
        return Services.storage.openDatabase(file);
    },
    closeConnection: function(handle) {
        handle.asyncClose();
    },
    execSql: function(handle, sql, success, error, completion) {
        var statement = handle.createStatement("SELECT * FROM table_name WHERE column_name = :parameter");
        statement.params.row_id = 1234;
        statement.executeAsync({  
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    var value = row.getResultByName("column_name");
                }
            },

            handleError: function(aError) {
                alert("Error: " + aError.message);
            },

            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                    alert("Query canceled or aborted!");
            }
        });
    }
};