// this file originally belongs in Balance project 
// do not modify
define(["jquery", "jquery.ui"], function() {
    /* Use this on form dialog. Will resolve with object containing form's fields 
       or null if user rejects the dialog. */
    $.fn.dialogPromise = function () {
        var dialog = this;
        return new Promise(function (resolve, reject) {
            dialog.dialog({
                // The dialog appears instantly as the promise waits
                autoOpen: true,
                modal: true,
                buttons: {
                    Ok: function () {
                        resolve(objectifyForm(form));
                        // This must be here, closing is not implicit
                        dialog.dialog("close");
                    },
                    Cancel: function () {
                        resolve(false);
                        dialog.dialog("close");
                    }
                },
                close: function () {
                    resolve(false);
                }
            });
            // Try to not forget that user may press enter while filling out the fields
            // also notice ONE here. That's IMPORTANT to avoid memory leak
            // since we're gonna add this event every time dialog opens
            var form = dialog.find("form").one("submit", function (event) {
                event.preventDefault();
                resolve(objectifyForm(form));
                dialog.dialog("close");
            });
        });
    };
    /** Converts structure that looks like this:
     [
       {
         name: "NAME",
         value: "VALUE"
       }
     ]
    
     to structure like this:
      {NAME: "VALUE"} 
      **/
    function convertSerArToAssocAr(ar) {
      var obj = {};
      for (var i = 0, l = ar.length; i < l; i++) {
          if(ar[i].name)
            obj[ar[i].name] = ar[i].value;
      }
      return obj;
    }
    
    function objectifyForm(form) {
        if (typeof form.css != "function")
            form = $(form);
        return convertSerArToAssocAr(form.serializeArray());
    }
});