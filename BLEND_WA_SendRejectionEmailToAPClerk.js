/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 */
define(['N/render','N/search','N/runtime','N/email'], function(render,search,runtime,email) {

    var LOG_NAME;
    function onAction(scriptContext) {
    try{
        LOG_NAME = 'onAction';
        var userObj = runtime.getCurrentUser();
        var newRec = scriptContext.newRecord;
        var vendorId = newRec.id; 
        log.debug('vendorId | userObj.id', vendorId +'|'+userObj.id);
        var arrRecipients = [];

        var employeeSearchObj = search.create({
            type: "employee",
            filters:
            [
               ["role","anyof","1031","1071"], 
               "AND", 
               ["email","isnotempty",""]
            ],
            columns:
            [
               search.createColumn({
                  name: "entityid",
                  sort: search.Sort.ASC,
                  label: "Name"
               }),
               search.createColumn({name: "email", label: "Email"}),
               search.createColumn({name: "internalid", label: "Internal ID"})
            ]
         });
         var searchResultCount = employeeSearchObj.runPaged().count;
         log.debug("employeeSearchObj result count",searchResultCount);
         employeeSearchObj.run().each(function(result){
            log.debug(result.getValue({name:"email"}));
            arrRecipients.push(result.getValue({name:"email"}));
            return true;
         });

        var mergeResult = render.mergeEmail({
            templateId: 16,
            entity: {
                type: 'vendor',
                id: vendorId
                },
            recipient: null,
            supportCaseId: null, 
            transactionId: null,
            customRecord: null
        });
        var emailSubject = mergeResult.subject; 
        var emailBody = mergeResult.body; 
            if(!isEmpty(arrRecipients)){
                email.send({
                    author : userObj.id, 
                    recipients : arrRecipients, 
                    subject : emailSubject, 
                    body : emailBody, 
                });
            }   

    }
    catch(e){
        log.error(LOG_NAME,e);
    }
    }

    function isEmpty(value) {

        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) {
            return true;
        }
        return false;
    }


    return {
        onAction: onAction
    }
});
