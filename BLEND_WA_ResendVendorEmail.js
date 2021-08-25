  /**
 * Author: Paolo Miguel Escalona
 * Date:  2021-07-22
 * 
 * Date         Modified By             Notes
 * 2021-07-22  Paolo Miguel Escalona   Initial script creation
 */
   var MAIN_OBJ 	= {
    FIELDS	:	{
        SENDTOVENDOR: 'custbody_cwgp_sendtovendor',
    },
    TEMPLATE :{
        VENDOR: '12'
    },
    EMAILPREF: {
        EMAILSENDER: 'custscript_nsts_gaw_email_sender'
    }
};

var LOG_TITLE;
function resendVendorEmail(type){
    LOG_TITLE = 'resendVendorEmail';
    try{
                var blSendToVendor = nlapiGetFieldValue(MAIN_OBJ.FIELDS.SENDTOVENDOR);
                nlapiLogExecution('DEBUG','blSendToVendor',blSendToVendor);
                if(blSendToVendor){
                    var emailMerger = nlapiCreateEmailMerger(MAIN_OBJ.TEMPLATE.VENDOR);
                    emailMerger.setTransaction(nlapiGetRecordId());
                    var emailMergerResult = emailMerger.merge();
                    var emailSubject = emailMergerResult.getSubject();
                    var emailBody = emailMergerResult.getBody();


                    ///Tranrecord
                    var tranrecord                  = [];
                    tranrecord['transaction']       = nlapiGetRecordId();

                    ///Files
                    var fileToSend      =  [];
                    fileToSend = searchFilesAttached(nlapiGetRecordId());
                    fileToSend.push(nlapiPrintRecord('TRANSACTION', nlapiGetRecordId(), 'DEFAULT', null));

                    ///Email Sender
                    var stEmailSender       = nlapiGetContext().getPreference(MAIN_OBJ.EMAILPREF.EMAILSENDER);

                    nlapiSendEmail(stEmailSender, nlapiGetFieldValue('entity'), emailSubject, emailBody, null, null, tranrecord, fileToSend);
                }
    }
    catch(e){
        nlapiLogExecution('ERROR', LOG_TITLE, e);
    }
}

function searchFilesAttached(stInternalId){

	LOG_TITLE= 'searchFilesAttached';

	var arrFiles = [];

	try{		

		var arrfilters = [];
		arrfilters.push(new nlobjSearchFilter('internalid', null, 'anyof', stInternalId));
		arrfilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid', 'file'));

		var results = nlapiSearchRecord('transaction', null, arrfilters, arrColumns);	

		
		if(results){
			nlapiLogExecution('debug', LOG_TITLE, 'results ' + results.length);
			for(var i = 0; i < results.length; i++){
				var fileId = results[i].getValue('internalid', 'file');
				nlapiLogExecution('debug', LOG_TITLE, 'fileId ' + fileId);
				var objFile = nlapiLoadFile(fileId);
				arrFiles.push(objFile);
			}			
		}

	}catch(e){
		nlapiLogExecution('ERROR', LOG_TITLE, e);
	}
	return arrFiles;
}
