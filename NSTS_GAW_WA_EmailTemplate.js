/**
* Copyright (c) 1998-2015 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* Email Template for Sending Emails
* 
* Version Type    Date            Author                                Remarks
* 3.00    Edit    10 Oct 2015     Dennis Geronimo                       Added email template
*                 22 June 2021    Paolo Escalona                        Added stEntity to include vendor name on subject
*			      08 July 2021    Paolo Miguel Escalona                 Include due date calculation and display on subject
*/                

var HC_PENDING_APPROVAL_SUBJECT             = "";
var HC_PENDING_APPROVAL_BODY_WITHECP        = "";                                       
var HC_PENDING_APPROVAL_BODY_WITHOUTECP     = "";


/**
* Get transaction record type name
* @param 
* @return string
* @author Dennis Geronimo
* @version 3.0
*/
function getTransactionRecordTypeName(internalid){
    var recordTypeName = '';
    switch(internalid){
        case 'JOURNALENTRY'         : recordTypeName = 'Journal Entry'; break;
        case 'INVENTORYTRANSFER'    : recordTypeName = 'Inventory Transfer'; break;
        case 'CHECK'                : recordTypeName = 'Check'; break;
        case 'CASHSALE'             : recordTypeName = 'Cash Sale'; break;
        case 'ESTIMATE'             : recordTypeName = 'Estimate'; break;
        case 'INVOICE'              : recordTypeName = 'Invoice'; break;
        case 'CUSTOMERPAYMENT'      : recordTypeName = 'customer payment'; break;
        case 'CREDITMEMO'           : recordTypeName = 'credit memo'; break;
        case 'INVENTORYADJUSTMENT'  : recordTypeName = 'inventory adjustment'; break;
        case 'PURCHASEORDER'        : recordTypeName = 'purchase order'; break;
        case 'ITEMRECEIPT'          : recordTypeName = 'item receipt'; break;
        case 'VENDORBILL'           : recordTypeName = 'vendor bill'; break;
        case 'VENDORPAYMENT'        : recordTypeName = 'vendor payment'; break;
        case 'VENDORCREDIT'         : recordTypeName = 'vendor credit'; break;
        case 'EXPENSEREPORT'        : recordTypeName = 'expense report'; break;
        case 'CASHREFUND'           : recordTypeName = 'cash refund'; break;
        case 'CUSTOMERREFUND'       : recordTypeName = 'customer refund'; break;
        case 'SALESORDER'           : recordTypeName = 'sales order'; break;
        case 'ITEMFULFILLMENT'      : recordTypeName = 'item fulfillment'; break;
        case 'RETURNAUTHORIZATION'  : recordTypeName = 'return authorization'; break;
        case 'ASSEMBLYBUILD'        : recordTypeName = 'assembly build'; break;    
        case 'OPPORTUNITY'          : recordTypeName = 'opportunity'; break;
        case 'CUSTOMERDEPOSIT'      : recordTypeName = 'customer deposit'; break;  
        case 'BINWORKSHEET'         : recordTypeName = 'bin worksheet'; break; 
        case 'VENDORRETURNAUTHORIZATION'     : recordTypeName = 'vendor return authorization'; break;
        case 'BINTRANSFER'          : recordTypeName = 'bin transfer'; break;  
        case 'TRANSFERORDER'        : recordTypeName = 'transfer order'; break;
        case "INTERCOMPANYJOURNALENTRY" : recordTypeName      = "Intercompany Journal Entry";break;
        case "PURCHASEREQUISITION" : recordTypeName  = "purchase Requisition";break;
        default:
            recordTypeName = internalid;
    }
    recordTypeName = recordTypeName.toUpperCase();
    return recordTypeName;
}

/**
 * Get email template
 * @param bIsWithECP
 * @param type
 * @param objTransInfo 
 * @returns {String}
 */
function GetEmailTemplate(bIsWithECP,type,objTransInfo,objLoadRecord,objLoadEmailTemplate){
    var currentContext = nlapiGetContext();
    var stEmailTemplateId = currentContext.getSetting("SCRIPT", 'custscript_nsts_gaw_email_temp_penapprvl');
    var stLogTitle = "GETEMAILTEMPLATE";
    var templateId = 0;
    var emailMerger = null;
    var emailMergerResult = null;
    var stBody = '';
    var stSubject = '';
    
    var stInternalId            = objTransInfo.stInternalId;
    var stApproveLink           = objTransInfo.stApproveLink;
    var stRejectLink            = objTransInfo.stRejectLink;
    var stBaseRecordType        = objTransInfo.stBaseRecordType;
    var stBaseRecordTypeLabel   = objTransInfo.stBaseRecordTypeLabel;
    var stApproverName          = objTransInfo.stApproverName;
    var transNo                 = objTransInfo.transNo;
    var transId                 = objTransInfo.transId;
    var stECPAddress            = objTransInfo.stECPAddress;
    var stRecordUrl             = objTransInfo.stRecordUrl;
    var pendingLineApprovals    = objTransInfo.pendingLineApprovals
    var stApprover              = objTransInfo.stApprover;
    var stFirstname             = objTransInfo.stFirstname;
    var stLastname             = objTransInfo.stLastname;
    var stRole                  = objTransInfo.stRoleResult;
    var stEmailSender           = objTransInfo.stEmailSender;
    var stCreator               = objTransInfo.stCreator;
    var stEntity                = objTransInfo.stEntity;
    var stDueNotif              = objTransInfo.stDueNotif;
    var stBillNo                = objTransInfo.stBillNo;
    var stTotal                 = objTransInfo.stTotal;
    if(isEmpty(stDueNotif)){
        stDueNotif = '';
    }
    nlapiLogExecution('DEBUG','stEntity (Email Template): ', stEntity);

    if(isEmpty(stEmailTemplateId)){
        HC_PENDING_APPROVAL_SUBJECT             = "{typeLabel} # {transactionnumber} ({tranid}) is Pending Approval";
        HC_PENDING_APPROVAL_BODY_WITHECP        =   "<p>Hi {approverName},</p>"+
                                                    "<p>This {typeLabel} # {transactionnumber} ({tranid}) is waiting for your approval.</p>"+
                                                    "<p>You may <a href='mailto:{ecpaddress}?subject=APPROVED:%20{type}%20No.%20{transactionnumber}%20({tranid})"+
                                                    "&body=Reason:' target='_top'>approve</a> or" +
                                                    "<a href='mailto:{ecpaddress}?subject=REJECTED:%20{type}%20No.%20{transactionnumber}%20({tranid})"+
                                                    "&body=Reason:' target='_top'> reject</a> the transaction by sending an email.</p><br/>{pendingLines}<br/>"+
                                                    "<p>Thanks,</p><p>Admin</p><br/><p><b><a href='{recordUrl}'>View Record</a></b></p>";                                       
        HC_PENDING_APPROVAL_BODY_WITHOUTECP =  " <p>Hi {approverName},</p>"
                                                    +"<p>This {typeLabel} # {transactionnumber} ({tranid}) is waiting for your approval.</p>"
                                                    +"<p>You may click the view record link below or  <a href='{approveLink}&approverId={approver}"
                                                    + "&tranId={id}&tranType={type}&approverRole={role}&action=1'>approve</a> or "
                                                    +"<a href='{rejectLink}&approverId={approver}"
                                                    + "&tranid={id}&trantype={type}&approverRole={role}&approvalViaEmail=2&idAdmin={emailSender}"
                                                    +"&idCreator={creator}'> reject</a> directly.</p><br/>{pendingLines}<br/><p>Thanks,</p><p>Admin</p><br/><p><b><a href='{recordUrl}'>View Record</a></b></p>";
        
        if(bIsWithECP){
            return HC_PENDING_APPROVAL_BODY_WITHECP
        }else{
            return HC_PENDING_APPROVAL_BODY_WITHOUTECP;
        }
        return '';
    }
    
    templateId = stEmailTemplateId;
    
    if(bIsWithECP){    
		var emailTemp = objLoadEmailTemplate; 
        HC_PENDING_APPROVAL_BODY_WITHECP = emailTemp.getFieldValue('content'); 
        HC_PENDING_APPROVAL_SUBJECT =emailTemp.getFieldValue('subject');
        nlapiLogExecution("DEBUG", 'bIsWithECP',bIsWithECP);
      	nlapiLogExecution("DEBUG", 'HC_PENDING_APPROVAL_BODY_WITHECP',HC_PENDING_APPROVAL_BODY_WITHECP);
     	 nlapiLogExecution("DEBUG", 'HC_PENDING_APPROVAL_SUBJECT',HC_PENDING_APPROVAL_SUBJECT);
        
        stBody          = HC_PENDING_APPROVAL_BODY_WITHECP;
        stBody          = replaceAll('{approveLink}', stApproveLink, stBody)
        stBody          = replaceAll('{rejectLink}', stRejectLink, stBody)
        stBody          = replaceAll('{type}',stBaseRecordType,stBody);
        stBody          = replaceAll('{typeLabel}',stBaseRecordTypeLabel,stBody);
        stBody          = replaceAll('{approverName}',stApproverName,stBody);
        stBody          = replaceAll('{transactionnumber}',transNo,stBody);
        stBody          = replaceAll('{tranid}',transId,stBody);
        stBody          = replaceAll('{ecpaddress}',stECPAddress,stBody);
        stBody          = replaceAll('{recordUrl}',stRecordUrl,stBody);
        stBody          = replaceAll('{pendingLines}',pendingLineApprovals,stBody);
        stBody          = replaceAll('{approver}',stApprover,stBody);
        stBody          = replaceAll('{approverfirstname}',stFirstname,stBody);
        stBody          = replaceAll('{approverlastname}',stLastname,stBody);
        stBody          = replaceAll('{id}',stInternalId,stBody);
        stBody          = replaceAll('{role}',stRole,stBody);
        stBody          = replaceAll('{emailSender}',stEmailSender,stBody);
        stBody          = replaceAll('{creator}',stCreator,stBody);
        stBody          = replaceAll('{stEntity}',stEntity,stBody);
        
        HC_PENDING_APPROVAL_BODY_WITHECP    = pendingLineApprovals + " " + stBody;
        
        stSubject          = HC_PENDING_APPROVAL_SUBJECT;
        stSubject          = replaceAll('{approveLink}', stApproveLink, stSubject)
        stSubject          = replaceAll('{rejectLink}', stRejectLink, stSubject)
        stSubject          = replaceAll('{type}',stBaseRecordType,stSubject);
        stSubject          = replaceAll('{typeLabel}',stBaseRecordTypeLabel,stSubject);
        stSubject          = replaceAll('{approverName}',stApproverName,stSubject);
        stSubject          = replaceAll('{transactionnumber}',transNo,stSubject);
        stSubject          = replaceAll('{tranid}',transId,stSubject);
        stSubject          = replaceAll('{ecpaddress}',stECPAddress,stSubject);
        stSubject          = replaceAll('{recordUrl}',stRecordUrl,stSubject);
        stSubject          = replaceAll('{approver}',stApprover,stSubject);
        stSubject          = replaceAll('{approverfirstname}',stFirstname,stSubject);
        stSubject          = replaceAll('{approverlastname}',stLastname,stSubject);
        stSubject          = replaceAll('{id}',stInternalId,stSubject);
        stSubject          = replaceAll('{role}',stRole,stSubject);
        stSubject          = replaceAll('{emailSender}',stEmailSender,stSubject);
        stSubject          = replaceAll('{creator}',stCreator,stSubject);
        stSubject          = replaceAll('{stEntity}',stEntity,stSubject);
        stSubject          = replaceAll('{stDueNotif}',stDueNotif,stSubject);
        stSubject          = replaceAll('{stBillNo}',stBillNo,stSubject);
        stSubject          = replaceAll('{stTotal}',stTotal,stSubject);
        HC_PENDING_APPROVAL_SUBJECT = stSubject;
        
        var objRenderer = nlapiCreateTemplateRenderer();
        objRenderer.setTemplate(HC_PENDING_APPROVAL_BODY_WITHECP);
        objRenderer.addRecord('transaction',objLoadRecord);
        HC_PENDING_APPROVAL_BODY_WITHECP = objRenderer.renderToString()
        nlapiLogExecution("DEBUG", 'HC_PENDING_APPROVAL_BODY_WITHECP',HC_PENDING_APPROVAL_BODY_WITHECP);
                            nlapiLogExecution("ERROR", 'HC_PENDING_APPROVAL_BODY_WITHECP',HC_PENDING_APPROVAL_BODY_WITHECP);
        return HC_PENDING_APPROVAL_BODY_WITHECP;
    }else{
        var emailMerger = nlapiCreateEmailMerger(templateId);
        emailMerger.setTransaction(stInternalId)
        var emailMergerResult = emailMerger.merge();
        HC_PENDING_APPROVAL_BODY_WITHECP = emailMergerResult.getBody(); 
        HC_PENDING_APPROVAL_SUBJECT = emailMergerResult.getSubject();
    	
        
        stBody          = HC_PENDING_APPROVAL_BODY_WITHOUTECP;
        stBody          = replaceAll('{approveLink}', stApproveLink, stBody)
        stBody          = replaceAll('{rejectLink}', stRejectLink, stBody)
        stBody          = replaceAll('{type}',stBaseRecordType,stBody);
        stBody          = replaceAll('{typeLabel}',stBaseRecordTypeLabel,stBody);
        stBody          = replaceAll('{approverName}',stApproverName,stBody);
        stBody          = replaceAll('{transactionnumber}',transNo,stBody);
        stBody          = replaceAll('{tranid}',transId,stBody);
        stBody          = replaceAll('{ecpaddress}',stECPAddress,stBody);
        stBody          = replaceAll('{recordUrl}',stRecordUrl,stBody);
        stBody          = replaceAll('{pendingLines}',pendingLineApprovals,stBody);
        stBody          = replaceAll('{approver}',stApprover,stBody);
        stBody          = replaceAll('{approverfirstname}',stFirstname,stBody);
        stBody          = replaceAll('{approverlastname}',stLastname,stBody);
        stBody          = replaceAll('{id}',stInternalId,stBody);
        stBody          = replaceAll('{role}',stRole,stBody);
        stBody          = replaceAll('{emailSender}',stEmailSender,stBody);
        stBody          = replaceAll('{creator}',stCreator,stBody);
        stBody          = replaceAll('{stEntity}',stEntity,stBody);
        HC_PENDING_APPROVAL_BODY_WITHOUTECP    = stBody;
        
        stSubject          = HC_PENDING_APPROVAL_SUBJECT;
        stSubject          = replaceAll('{approveLink}', stApproveLink, stSubject)
        stSubject          = replaceAll('{rejectLink}', stRejectLink, stSubject)
        stSubject          = replaceAll('{type}',stBaseRecordType,stSubject);
        stSubject          = replaceAll('{typeLabel}',stBaseRecordTypeLabel,stSubject);
        stSubject          = replaceAll('{approverName}',stApproverName,stSubject);
        stSubject          = replaceAll('{transactionnumber}',transNo,stSubject);
        stSubject          = replaceAll('{tranid}',transId,stSubject);
        stSubject          = replaceAll('{ecpaddress}',stECPAddress,stSubject);
        stSubject          = replaceAll('{recordUrl}',stRecordUrl,stSubject);
        stSubject          = replaceAll('{approver}',stApprover,stSubject);
        stSubject          = replaceAll('{approverfirstname}',stFirstname,stSubject);
        stSubject          = replaceAll('{approverlastname}',stLastname,stSubject);
        stSubject          = replaceAll('{id}',stInternalId,stSubject);
        stSubject          = replaceAll('{role}',stRole,stSubject);
        stSubject          = replaceAll('{emailSender}',stEmailSender,stSubject);
        stSubject          = replaceAll('{creator}',stCreator,stSubject);
        stSubject          = replaceAll('{stEntity}',stEntity,stSubject);
        stSubject          = replaceAll('{stDueNotif}',stDueNotif,stSubject);
        stSubject          = replaceAll('{stBillNo}',stBillNo,stSubject);
        stSubject          = replaceAll('{stTotal}',stTotal,stSubject);
        HC_PENDING_APPROVAL_SUBJECT = stSubject;
        
        var objRenderer = nlapiCreateTemplateRenderer();
        objRenderer.setTemplate(HC_PENDING_APPROVAL_BODY_WITHOUTECP);
        objRenderer.addRecord('transaction',nlapiLoadRecord(type,stInternalId));
        HC_PENDING_APPROVAL_BODY_WITHOUTECP = objRenderer.renderToString()
        
        return HC_PENDING_APPROVAL_BODY_WITHOUTECP;
        //HC_PENDING_APPROVAL_BODY_WITHOUTECP
    }
    return '';
}


/**
 * Get email template
 * @param bIsWithECP
 * @param type
 * @param objTransInfo 
 * @returns {String}
 */
function GetEmailTemplateForApproveReject(stSendOption,tranId,stBaseRecordType){
    
    
    var stLogTitle = 'GETEMAILTEMPLATEFORAPPROVEREJECT';
    var currentContext = nlapiGetContext();
    var stRetValue = {
            subject: '',
            body: '',
    };
    var stEmailTemplateId = null;
    var emailMerger = null;
    var emailMergerResult = null;
    
    
    if(stSendOption == "approve"){
        stRetValue.subject  = "Transaction # {transactionnumber} ({tranid}) is Approved";
        stRetValue.body     = 'Hi {creator},<br />\
                            <br />\
                            This transaction # {transactionnumber} ({tranid}) is now approved.<br />\
                            You may click the link below to view the approved transaction.<br />\
                            <br />\
                            Thanks,<br />\
                            Admin<br />\
                            <br />\
                            <strong><a href="{recordUrl}">View Record</a></strong>';
        
        stEmailTemplateId = currentContext.getSetting("SCRIPT", 'custscript_nsts_gaw_email_temp_apprv');
      	if(stBaseRecordType == 'PURCHASEORDER'){
          nlapiLogExecution('DEBUG','stBaseRecordType',stBaseRecordType);
          stEmailTemplateId = currentContext.getSetting("SCRIPT", 'custscript_cwgp_po_approved');
        }
    }else{	
        stRetValue.subject  = "Transaction # {transactionnumber} ({tranid}) is rejected";
        stRetValue.body     = '<p>Hi {creator},</p>\
                            <p>This transaction # {transactionnumber} ({tranid}) was rejected due to the following reasons:</p>\
                            <p>Reason:&nbsp;${transaction.custbody_nsts_gaw_rejection_reason}</p>\
                            <p>You may click the link below to view the rejected transaction.</p>\
                            <p>Thanks,</p>\
                            <p>Admin<br /><br />\
                            <a href="{recordUrl}">View Record</a></p>';
        
        stEmailTemplateId = currentContext.getSetting("SCRIPT", 'custscript_nsts_gaw_email_temp_reject');
      	if(stBaseRecordType == 'PURCHASEORDER'){
          nlapiLogExecution('DEBUG','stBaseRecordType',stBaseRecordType);
          stEmailTemplateId = currentContext.getSetting("SCRIPT", 'custscript_cwgp_po_rejected');
        }
    }

    if(!isEmpty(stEmailTemplateId)){
        emailMerger = nlapiCreateEmailMerger(stEmailTemplateId);
        emailMerger.setTransaction(tranId)
        emailMergerResult = emailMerger.merge();
        stRetValue.body = emailMergerResult.getBody(); //nlapiMergeRecord(templateId, type, tranId).getValue();
        stRetValue.subject = emailMergerResult.getSubject();
        return stRetValue;
    }
    return stRetValue;
}

function isEmpty(value){
                
    if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
    { 
        return true; 
    }
    return false;
}