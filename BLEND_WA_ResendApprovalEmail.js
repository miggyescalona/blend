  /**
 * Author: Paolo Miguel Escalona
 * Date:  2021-04-16
 * 
 * Date         Modified By             Notes
 * 2021-04-16  Paolo Miguel Escalona   Initial script creation
 * 2021-07-8   Paolo Miguel Escalona   Include due date calculation and display on subject
 * 2021-07-12  Paolo Escalona          Added stEntity to include vendor name on subject
 * 13 Sept 2021	  Miggy Escalona	   Exclude files > 10mb 
 */
var MAIN_OBJ 	= {
    FIELDS	:	{
        REAPPROVALNOTIF: 'custbody_cwgp_reapprovalnotification',
    },
    PARAMS: {
        PO_REAPPROVALTEMPLATE: 'custscript_cwgp_po_reapproval',
        PO_APPROVALTEMPLATE: 'custscript_cwgp_po_pendingapproval',
        VB_APPROVALTEMPLATE: 'custscript_nsts_gaw_email_temp_penapprvl'
    },
    RECTYPE: {
        PURCHASEORDER: 'purchaseorder',
        VENDORBILL: 'vendorbill'
    },
    APPROVALSTATUS: {
        PENDINGAPPROVAL: '1'
    }
};

var LOG_TITLE;
function resendApprovalEmail(type){
    LOG_TITLE = 'resendApprovalEmail';
    try{
          	var recType = nlapiGetRecordType();
            var stApprovalStatus = nlapiGetFieldValue('approvalstatus');

            nlapiLogExecution('DEBUG',LOG_TITLE,'Approval Status: ' + stApprovalStatus + '| recType: ' + recType);

            var stEmailTemplateId;
            var objLoadEmailTemplate;
            var stBody;
            var stSubject;
      		var recId = nlapiGetRecordId();

            if(recType == MAIN_OBJ.RECTYPE.PURCHASEORDER && stApprovalStatus == MAIN_OBJ.APPROVALSTATUS.PENDINGAPPROVAL){    
                var objPO = nlapiLoadRecord('purchaseorder', recId);

              var stApprover;
              var customrecord_nsts_gaw_approver_listSearch = nlapiSearchRecord("customrecord_nsts_gaw_approver_list",null,
              [
                 ["custrecord_nsts_gaw_po_rec_type","anyof",recId], 
                 "AND", 
                 ["custrecord_nsts_gaw_approverlinestatus","anyof","@NONE@"], 
                 "AND", 
                 ["custrecord_nsts_gaw_approverrole","anyof","@NONE@"]
              ], 
              [
                 new nlobjSearchColumn("custrecord_nsts_gaw_rulesequence"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_po_rec_type"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_tran_approver"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_list_date"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_approverrole"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_porulename"), 
                 new nlobjSearchColumn("custrecord_nsts_gaw_approverlinestatus")
              ]
              );
              if(customrecord_nsts_gaw_approver_listSearch) {
               for (var i = 0 ; i < customrecord_nsts_gaw_approver_listSearch.length; i++) {
                 stApprover = customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_tran_approver');
                };
              };

                var blReapprovalNotif = nlapiGetFieldValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF);
                if(blReapprovalNotif == 'T'){
                    stEmailTemplateId = nlapiGetContext().getSetting("SCRIPT", MAIN_OBJ.PARAMS.PO_REAPPROVALTEMPLATE);
                }
                else{
                    stEmailTemplateId = nlapiGetContext().getSetting("SCRIPT",  MAIN_OBJ.PARAMS.PO_APPROVALTEMPLATE);
                }
    
    
    
                if(!isEmpty(stEmailTemplateId)){
                    var objLoadEmailTemplate = nlapiLoadRecord('emailtemplate', stEmailTemplateId);
                }
    
                var stEmailSender       = nlapiGetContext().getPreference('custscript_nsts_gaw_email_sender');
                var stInternalId        = nlapiGetRecordId();
                var stBaseRecordType    = nlapiGetRecordType();
              	if(stBaseRecordType){
					stBaseRecordType = stBaseRecordType.toUpperCase();
                }
                var stInternalId        = nlapiGetRecordId();
                var stRecordUrl         = nlapiResolveURL('RECORD', MAIN_OBJ.RECTYPE.PURCHASEORDER, recId);
                var stBaseRecordTypeLabel = getTransactionRecordTypeName(stBaseRecordType);
                var stApproveLink    = 'mailto:{ecpaddress}?subject=APPROVED:%20{type}%20Ref{tranid}%20{transactionnumber}&body=Reason:';
                var stRejectLink     = 'mailto:{ecpaddress}?subject=REJECTED:%20{type}%20Ref{tranid}%20{transactionnumber}&body=Please note the reason for rejection:%0D%0AReason:';
                var stFirstname = '';
                var stLastname = '';
                var stApproverName = '';
                var transNo = nlapiGetFieldValue('transactionnumber');
                var transId = nlapiGetFieldValue('tranid');
                var stECPAddress = nlapiGetContext().getPreference('custscript_nsts_gaw_ecp_address');
                var stCreator = '';
                var stDueDate = nlapiGetFieldValue('duedate');
                var stDueNotif;
                var stEntity = nlapiGetFieldText('entity');
                var stTotal = numberWithCommas(nlapiGetFieldValue('total'));
                var intCurrency = nlapiGetFieldValue('currency');
                if(intCurrency == '1' || intCurrency == '3'){
                    stTotal = '$'+stTotal;
                }
                else if(intCurrency == '2'){
                    stTotal = '£'+stTotal;
                }
                else if(intCurrency == '4'){
                    stTotal = '€'+stTotal;
                }
                else if(intCurrency == '5'){
                    stTotal == 'Fr.'+stTotal
                }

                if(!isEmpty(stDueDate)){
                    stDueNotif = getDueDateDiff(stDueDate);
                }
    
    
                var objTranInfoPlaceHolder = {
                    stBaseRecordType        : isEmptyReplaceWith(stBaseRecordType,''),
                    stBaseRecordTypeLabel   : isEmptyReplaceWith(stBaseRecordTypeLabel,''),
                    stInternalId            : isEmptyReplaceWith(stInternalId,''),
                    stApproveLink           : isEmptyReplaceWith(stApproveLink,''),
                    stRejectLink            : isEmptyReplaceWith(stRejectLink,''),
                    stApproverName          : isEmptyReplaceWith(stApproverName,''),
                    transNo                 : isEmptyReplaceWith(transNo,''),
                    transId                 : isEmptyReplaceWith(transId,''),
                    stECPAddress            : isEmptyReplaceWith(stECPAddress,''),
                    stRecordUrl             : isEmptyReplaceWith(stRecordUrl,''),
                    //pendingLineApprovals    : pendingLineApprovals + pendingLineApprovals_orgAprover,
                    stApprover              : isEmptyReplaceWith(stApprover,''),
                    stFirstname             : isEmptyReplaceWith(stFirstname,''),
                    stLastname             : isEmptyReplaceWith(stLastname,''),
                    stRoleResult            : '',
                    stEmailSender           : isEmptyReplaceWith(stEmailSender,''),
                    stCreator               : isEmptyReplaceWith(stCreator,''),
                    stDueNotif              : isEmptyReplaceWith(stDueNotif,''),
                    stEntity                : isEmptyReplaceWith(stEntity,''),
                    stTotal                : isEmptyReplaceWith(stTotal,''),
                }

                GetEmailTemplate(true, MAIN_OBJ.RECTYPE.PURCHASEORDER, objTranInfoPlaceHolder,objPO,objLoadEmailTemplate);
                stBody = HC_PENDING_APPROVAL_BODY_WITHECP;
              	stBody = stBody.replace('undefined','');
                stSubject = HC_PENDING_APPROVAL_SUBJECT;   
    
                var intNextApprover = nlapiGetFieldValue('custbody_nsts_gaw_next_approvers');
                var intNextRoleApprover = nlapiGetFieldValue('custbody_nsts_gaw_next_role_approvers');
                var recipient = [];
                var cc = [];
                if(!isEmpty(intNextApprover)){
                    recipient = intNextApprover;
                }
                else{
                    recipient = getMainRoleRecipient(intNextRoleApprover)
                    cc = getRoleApprovers(intNextRoleApprover);

                }
    
                nlapiLogExecution('DEBUG','params', stEmailSender + '|' + recipient +'|' + stSubject);

                var objSendEmail = {
                    'stEmailSender': stEmailSender,
                    'recipient': recipient,
                    'cc' : cc,
                    'stSubject': stSubject,
                    'stBody': stBody,
                    'stInternalId': stInternalId
                }
                
                var records = [];
             	records['transaction'] = nlapiGetRecordId();
              
                var fileToSend = [];
            	fileToSend  = searchFilesAttached(objSendEmail.stInternalId);


                nlapiLogExecution('DEBUG',LOG_TITLE, 'objSendEmail: ' + JSON.stringify(objSendEmail));
				nlapiLogExecution('DEBUG',LOG_TITLE, 'emailSender: ' + objSendEmail.stEmailSender +  '| recipient: ' +  objSendEmail.recipient +  '| stSubject: ' +  objSendEmail.stSubject +   '| cc: ' + objSendEmail.cc +  '| records: ' +  records)
              
                var objEmail = nlapiSendEmail(objSendEmail.stEmailSender, objSendEmail.recipient, objSendEmail.stSubject, objSendEmail.stBody, null, objSendEmail.cc, records, fileToSend);
            	nlapiLogExecution('DEBUG',LOG_TITLE,objEmail);

    
            }
            else if(recType == MAIN_OBJ.RECTYPE.VENDORBILL && stApprovalStatus == MAIN_OBJ.APPROVALSTATUS.PENDINGAPPROVAL){
                var objVB = nlapiLoadRecord('vendorbill', recId);
              	var id = nlapiSubmitRecord(objVB, true);
                var objVB = nlapiLoadRecord('vendorbill', recId);
              	var id = nlapiSubmitRecord(objVB, true);
              	nlapiLogExecution('DEBUG','id',id);
              
                  var stApprover;
                  var customrecord_nsts_gaw_approver_listSearch = nlapiSearchRecord("customrecord_nsts_gaw_approver_list",null,
                  [
                     ["custrecord_nsts_gaw_po_rec_type","anyof",recId], 
                     "AND", 
                     ["custrecord_nsts_gaw_approverlinestatus","anyof","@NONE@"], 
                     "AND", 
                     ["custrecord_nsts_gaw_approverrole","anyof","@NONE@"]
                  ], 
                  [
                     new nlobjSearchColumn("custrecord_nsts_gaw_rulesequence"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_po_rec_type"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_tran_approver"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_list_date"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_approverrole"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_porulename"), 
                     new nlobjSearchColumn("custrecord_nsts_gaw_approverlinestatus")
                  ]
                  );
                  if(customrecord_nsts_gaw_approver_listSearch) {
                   for (var i = 0 ; i < customrecord_nsts_gaw_approver_listSearch.length; i++) {
                     stApprover = customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_tran_approver');
                    };
                  };


    
                stEmailTemplateId = nlapiGetContext().getSetting("SCRIPT", MAIN_OBJ.PARAMS.VB_APPROVALTEMPLATE);
    
                if(!isEmpty(stEmailTemplateId)){
                    var objLoadEmailTemplate = nlapiLoadRecord('emailtemplate', stEmailTemplateId);
                }
    
                var stEmailSender       = nlapiGetContext().getPreference('custscript_nsts_gaw_email_sender');
                var stInternalId        = nlapiGetRecordId();
                var stBaseRecordType    = nlapiGetRecordType();
               	if(stBaseRecordType){
					stBaseRecordType = stBaseRecordType.toUpperCase();
                }
                var stInternalId        = nlapiGetRecordId();
                var stRecordUrl         = nlapiResolveURL('RECORD', MAIN_OBJ.RECTYPE.PURCHASEORDER, recId);
                var stBaseRecordTypeLabel = getTransactionRecordTypeName(stBaseRecordType);
                var stApproveLink    = 'mailto:{ecpaddress}?subject=APPROVED:%20{type}%20Ref{tranid}%20{transactionnumber}&body=Reason:';
                var stRejectLink     = 'mailto:{ecpaddress}?subject=REJECTED:%20{type}%20Ref{tranid}%20{transactionnumber}&body=Please note the reason for rejection:%0D%0AReason:';
                var stFirstname = '';
                var stLastname = '';
                var stApproverName = '';
                var transNo = nlapiGetFieldValue('transactionnumber');
                var transId = nlapiGetFieldValue('tranid');
                var stECPAddress = nlapiGetContext().getPreference('custscript_nsts_gaw_ecp_address');
                var stCreator = '';
                var stDueDate = nlapiGetFieldValue('duedate');
                var stDueNotif;
                var stEntity = nlapiGetFieldText('entity');
                var stBillNo = nlapiGetFieldValue('tranid');

                if(!isEmpty(stDueDate)){
                    stDueNotif = getDueDateDiff(stDueDate);
                }
    
                var objTranInfoPlaceHolder = {
                    stBaseRecordType        : isEmptyReplaceWith(stBaseRecordType,''),
                    stBaseRecordTypeLabel   : isEmptyReplaceWith(stBaseRecordTypeLabel,''),
                    stInternalId            : isEmptyReplaceWith(stInternalId,''),
                    stApproveLink           : isEmptyReplaceWith(stApproveLink,''),
                    stRejectLink            : isEmptyReplaceWith(stRejectLink,''),
                    stApproverName          : isEmptyReplaceWith(stApproverName,''),
                    transNo                 : isEmptyReplaceWith(transNo,''),
                    transId                 : isEmptyReplaceWith(transId,''),
                    stECPAddress            : isEmptyReplaceWith(stECPAddress,''),
                    stRecordUrl             : isEmptyReplaceWith(stRecordUrl,''),
                    //pendingLineApprovals    : pendingLineApprovals + pendingLineApprovals_orgAprover,
                    stApprover              : isEmptyReplaceWith(stApprover,''),
                    stFirstname             : isEmptyReplaceWith(stFirstname,''),
                    stLastname             : isEmptyReplaceWith(stLastname,''),
                    stRoleResult            : '',
                    stEmailSender           : isEmptyReplaceWith(stEmailSender,''),
                    stCreator               : isEmptyReplaceWith(stCreator,''),
                    stDueNotif              : isEmptyReplaceWith(stDueNotif,''),
                    stEntity                : isEmptyReplaceWith(stEntity,''),
                    stBillNo                : isEmptyReplaceWith(stBillNo,''),
                    stTotal                : isEmptyReplaceWith(stTotal,''),
                }

                GetEmailTemplate(true, MAIN_OBJ.RECTYPE.PURCHASEORDER, objTranInfoPlaceHolder,objVB,objLoadEmailTemplate);
                stBody = HC_PENDING_APPROVAL_BODY_WITHECP;
              	stBody = stBody.replace('undefined','');
                stSubject = HC_PENDING_APPROVAL_SUBJECT;   
    
                var intNextApprover = nlapiGetFieldValue('custbody_nsts_gaw_next_approvers');
                var intNextRoleApprover = nlapiGetFieldValue('custbody_nsts_gaw_next_role_approvers');
                var recipient = [];
                var cc = [];
                if(!isEmpty(intNextApprover)){
                    recipient = intNextApprover;
                }
                else{
                    recipient = getMainRoleRecipient(intNextRoleApprover)
                    cc = getRoleApprovers(intNextRoleApprover);

                }
    
                nlapiLogExecution('DEBUG','params', stEmailSender + '|' + recipient +'|' + stSubject);

                var objSendEmail = {
                    'stEmailSender': stEmailSender,
                    'recipient': recipient,
                    'cc' : cc,
                    'stSubject': stSubject,
                    'stBody': stBody,
                    'stInternalId': stInternalId
                }

                var records = [];
             	records['transaction'] = nlapiGetRecordId();
              
                var fileToSend = [];
            	fileToSend  = searchFilesAttached(objSendEmail.stInternalId);


                nlapiLogExecution('DEBUG',LOG_TITLE, 'objSendEmail: ' + JSON.stringify(objSendEmail));
				nlapiLogExecution('DEBUG',LOG_TITLE, 'emailSender: ' + objSendEmail.stEmailSender +  '| recipient: ' +  objSendEmail.recipient +  '| stSubject: ' +  objSendEmail.stSubject +   '| cc: ' + objSendEmail.cc +  '| records: ' +  records)
              
               	var objEmail = nlapiSendEmail(objSendEmail.stEmailSender, objSendEmail.recipient, objSendEmail.stSubject, objSendEmail.stBody, null, objSendEmail.cc, records, fileToSend);
            	nlapiLogExecution('DEBUG',LOG_TITLE,objEmail);


            }
      
            /* var objRec = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
             var objResult = JSON.parse(objRec.getFieldValue('custbody_cwgp_sendemailobj'));
     
             var records = [];
             records['transaction'] = nlapiGetRecordId();

            nlapiLogExecution('DEBUG',LOG_TITLE, 'emailSender: ' + objResult.stEmailSender +  '| recipient: ' +  objResult.recipient +  '| stSubject: ' +  objResult.stSubject +   '| cc: ' + objResult.cc +  '| records: ' +  records)

            var fileToSend = [];
            fileToSend  = searchFilesAttached(objResult.stInternalId);


            var objEmail = nlapiSendEmail(objResult.stEmailSender, objResult.recipient, objResult.stSubject, objResult.stBody, objResult.cc, null, records, fileToSend);

            nlapiLogExecution('DEBUG',LOG_TITLE,objEmail);*/
      
    }
 
    catch(e){
          nlapiLogExecution('ERROR',LOG_TITLE,e);
    }

}

function getDueDateDiff(duedate){
    var x = new Date(duedate);
    var y = new Date()
    var diffTime = x - y;
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    var stNotif = '';
    if(diffDays < 0){
        stNotif = ', PASTDUE ' + Math.abs(diffDays) + ' Days'
    }
    else{
        stNotif = ', DUE in ' + Math.abs(diffDays) + ' Days'
    }
    return stNotif;
}

function isEmpty(value){
                
    if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
    { 
        return true; 
    }
    return false;
}

function searchFilesAttached(stInternalId){

	LOG_TITLE = 'searchFilesAttached';

	var arrFiles = [];

	try{		

		var results = nlapiSearchRecord("transaction",null,
        [
            ["internalid","anyof",stInternalId], 
            "AND", 
            ["mainline","is","T"], 
            "AND", 
            ["file.documentsize","lessthan","10000"], 
            "AND", 
            ["file.name","isnotempty",""]
        ], 
        [
            new nlobjSearchColumn("internalid","file",null), 
            new nlobjSearchColumn("name","file",null),
            new nlobjSearchColumn("documentsize","file",null), 
        ]
        );
		
		var fileSize = 0;
		if(results){
			nlapiLogExecution('debug', LOG_TITLE, 'results ' + results.length);
			for(var i = 0; i < results.length; i++){
                var result1 = results[i];
                var resultsCol = result1.getAllColumns();
                var fileId = result1.getValue(resultsCol[0]);
                fileSize += parseInt(result1.getValue(resultsCol[2]));
                nlapiLogExecution('DEBUG','fileId | fileSize',fileId +'|'+fileSize);
                var objFile = nlapiLoadFile(fileId);
				arrFiles.push(objFile);
			}		
		}
        if(fileSize > 10000){
            arrFiles = [];
        }

	}catch(e){
		nlapiLogExecution('ERROR',LOG_TITLE, e);
	}
	return arrFiles;
}


function isEmptyReplaceWith(str,value){
	return (isEmpty(str))? value : str;
}

function getRoleApprovers(stRoleResult){
    LOG_TITLE = 'getRoleApprovers';
	try{         

			var arrRes = nlapiSearchRecord("employee",null,
            [
               ["role","anyof",stRoleResult], 
               "AND", 
               ["isinactive","is","F"]
            ], 
            [
               new nlobjSearchColumn("internalid"), 
               new nlobjSearchColumn("entityid").setSort(false), 
               new nlobjSearchColumn("email")
            ]
            );
			var arrApprover =[];
			if(arrRes.length > 1){
				for(var i=1;i<arrRes.length;i++){
                    var result1 = arrRes[i];
                    var resultsCol = result1.getAllColumns();
                    var objApprover= result1.getValue(resultsCol[2])
                    arrApprover.push(objApprover);
				}
				return arrApprover;
			}else{
				return null;
            }
	}catch(error){
		nlapiLogExecution('ERROR',LOG_TITLE,error);      
	}
}

function getMainRoleRecipient(stRoleResult){
    LOG_TITLE = 'getMainRoleRecipient';
	try{         

			var arrRes = nlapiSearchRecord("employee",null,
            [
               ["role","anyof",stRoleResult], 
               "AND", 
               ["isinactive","is","F"]
            ], 
            [
               new nlobjSearchColumn("internalid"), 
               new nlobjSearchColumn("entityid").setSort(false), 
               new nlobjSearchColumn("email")
            ]
            );
			var arrApprover =[];
			if(arrRes){
                    var result1 = arrRes[0];
                    var resultsCol = result1.getAllColumns();
                    var objApprover= result1.getValue(resultsCol[2])
                    arrApprover.push(objApprover);
				    
                    return arrApprover;
			}else{
				return null;
            }
	}catch(error){
		nlapiLogExecution('ERROR',LOG_TITLE,error);      
	}
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}