/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 */

 /**
 * 
 * Date : 17 June 2021
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *   17 June 2021       Miggy Escalona      Initial Version
 *   27 June 2021       Miggy Escalona      Changed author from -5 to 41225, get additional email recipients from customer record
 */

 var WA_OBJ = {
    PARAMETER: {
        AUTHOR: '41225', ////41225 in Prod, 25142 in SB
    },
}

 var CSV_FOLDER = 1823567;
 var PDF_FOLDER = 1823568;
 define(['N/record','N/file','N/search','N/email','N/record'], function(record,file,search,email,record) {

    function onAction(context) {
        try{
            var newRec = context.newRecord;
            log.debug('newRec',newRec);

            var currentForm = context.form;
                
            log.debug('internalid',newRec.id);
                
            var transactionSearchObj = search.create({
            type: "transaction",
            filters:
            [
            ["internalid","anyof",newRec.id], 
            "AND", 
            ["mainline","is","T"], 
            "AND", 
            ["file.folder","anyof",CSV_FOLDER,PDF_FOLDER]
            ],
            columns:
            [
            search.createColumn({
                name: "name",
                join: "file",
                label: "Name"
            }),
            search.createColumn({
                name: "internalid",
                join: "file",
                label: "Internal ID"
            })
            ]
            });
            var arrFileId = [];
            var arrFileObj = [];
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug('searchResultCount: ', searchResultCount);
            transactionSearchObj.run().each(function(result){
                arrFileId.push(result.getValue({name:"internalid", join:'file'}))
                return true;
            });
            log.debug('arrFileId: ', arrFileId);
            for(var x = 0;x<arrFileId.length;x++){
                arrFileObj.push(file.load({
                    id: arrFileId[x]
                }));
            }

            log.debug('arrFileObj: ', arrFileObj);
        

           /* var objInvoice = record.load({
                type: record.Type.INVOICE,
                id: newRec.id,
                isDynamic: true,
            });*/

            var stBody = '';
            stBody += 'Hello ' + newRec.getText('entity'); + ',';
            stBody+= '\n\n';
            stBody += 'Thank you for selecting Blend as your technology partner!' +'\n\n';
            stBody += 'Attached is ' + newRec.getValue('tranid') + ' that contains a detailed report of the loans billed under this Invoice.'+'\n\n';
            stBody += "Our team is available at invoicing@blend.com should you have any questions or concerns regarding your account. For any other additional requests, feel free to reach out to your account manager and they'll be glad to assist."+'\n\n';
            stBody += 'We greatly appreciate our partnership and we look forward to your prompt payment!'+'\n\n';

            stBody += 'Best regards,'+'\n';
            stBody += 'Blend Invoicing'+'\n';
            stBody += 'Email: invoicing@blend.com'+'\n';

            var objCustomer = record.load({
                type: record.Type.CUSTOMER,
                id: newRec.getValue('entity'),
                isDynamic: true,
            });
          
           var arrEmail = [];
           var stEmail = objCustomer.getValue('custentity_bl_additional_emails');
           if(!isEmpty(stEmail)){
           	 stEmail = stEmail.replace(/\s/g, '');
		   	 arrEmail = stEmail.split(',');
           }

            arrEmail.push(objCustomer.getValue('email'));
            var arrCC = [];
            arrCC.push(WA_OBJ.PARAMETER.AUTHOR);
            var stSubject = 'Blend Labs, Inc. Invoice ' + newRec.getValue('tranid');

            email.send({
                author: WA_OBJ.PARAMETER.AUTHOR,
                recipients: arrEmail,
                subject: stSubject,
                body: stBody,
                attachments: arrFileObj,
                cc: arrCC,
                relatedRecords: {
                    transactionId: newRec.id
                }
            });

    }
    catch(e){
        log.error('onAction',e);
    }
    }
   
     function isEmpty(value){
        
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    return {
        onAction: onAction
    }
});
