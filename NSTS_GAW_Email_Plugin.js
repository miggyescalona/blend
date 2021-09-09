/**
* Copyright (c) 1998-2015 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information off
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* This script contains codes to let user approve via email
* 
* Version Type    Date            Author           						Remarks
* 3.00    Edit    10 Sep 2015     Rose Ann Ilagan						Email Capture Plugin 
*/

//CUSTOM GENERAL PREFERENCE
var FLD_SCRIPT_PARAM_EMAIL_SENDER = 'custscript_nsts_gaw_email_sender';

//Initialize
var stEmailSender 		= nlapiGetContext().getPreference(FLD_SCRIPT_PARAM_EMAIL_SENDER);
var stInactiveApprover 	= null;

//ERROR CODES
var ERROR_WRONG_SUBJECT_FORMAT 			= '1';
var ERROR_TRANS_NOT_EXIST 				= '2';
var ERROR_INVALID_APPROVER 				= '3';
var ERROR_NO_REJECT_REASON	 			= '4';
var ERROR_INACTIVE_APPROVER	 			= '5';
var ERROR_TRANS_NOT_PENDING_APPROVAL	= '6';
var ERROR_TRANS_GENERAL_ERROR			= '7';
var ERROR_TRANS_IN_PROCESS				= '8';
var ERROR_HAS_APPROVED                  = '9';

var bOneWorld = isOneWorld();
var stEmpIdOfRoleApprover = null;

/**
* Process email received from the email capture plugin
* @param (object email)
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function process(email) {
	var stEmailCode = null;
	var stAction	= null;
	var stTransId	= null;
	var stTransType = null;
	var arrTrans	= null;
	var objTrans	= new Object();
	try{		
		var stFrom 		= email.getFrom();
			stFrom		= logAddress('from: ',stFrom);
		var stBody		= email.getTextBody();
		var stSubject	= email.getSubject();
		
		nlapiLogExecution('DEBUG', 'Email',  'stEmailSender='+stEmailSender+ ' from: ' + stFrom + ' stBody: ' + stBody	+ ' stSubject: ' + stSubject);
		
		//Check transaction status before proceeding
		objTrans = getTransactionDetails(stSubject,stBody);
        nlapiLogExecution('DEBUG','objTrans',JSON.stringify(objTrans));
		if(objTrans.status == 'cancelled' || objTrans.status == 'rejected' || objTrans.status == 'approved'){
			objTrans.errorCode = ERROR_TRANS_NOT_PENDING_APPROVAL;
			objTrans.errorDetails	= 'not pending approval';
		}else if(objTrans.errorCode == null){
			var arrEmp			= searchEmp(stFrom);
			var stAction		= objTrans.action;
			var stInternalId 	= objTrans.internalid;
			var stReason 		= objTrans.reason;
			if(bOneWorld == 'T')
				var stSubsidiary 	= objTrans.subsidiary;
			else
				var stSubsidiary 	= null;
			var stNextApprvrs 	= objTrans.nextapprovers;
			var stRoleApprvr 	= objTrans.roleapprover;
			var stApprvrType 	= objTrans.apprvrType;
			var stInactive		= null;
			stTransType         = objTrans.type;
			initializeMappingFields(stTransType);  
			nlapiLogExecution('DEBUG', 'Email',  'stTransType='+stTransType+' stInternalId:'+stInternalId);
			var stTranStatus 		= getTransactionStatus(stTransType,stInternalId);
			//Check if void
			var objRecVoided = null;
			var stVoidTotal = 0;
			if(FLD_TOTAL == 'estimatedtotal'){
				var objRecVoided		= nlapiLoadRecord(stTransType,stInternalId);
				var stMemo				= objRecVoided.getFieldValue('memo');
				var stVoidTotal			= objRecVoided.getFieldValue('estimatedtotal');			
				
				if(stVoidTotal)
					stVoidTotal = parseFloat(stVoidTotal);
			}else{
				var objRecVoided		= nlapiLookupField(stTransType,stInternalId,['memo', FLD_TOTAL])
				if(objRecVoided){
					stMemo				= objRecVoided['memo'];
					var stVoidTotal			= objRecVoided[FLD_TOTAL];			
					
					if(stVoidTotal)
						stVoidTotal = parseFloat(stVoidTotal);
				}else{
					stMemo = '';
					stVoidTotal = 0;
				}
				
			}
			if(!isEmpty(stTranStatus)){
				if(stTranStatus == ERROR_TRANS_IN_PROCESS){
					objTrans.errorCode 		= ERROR_TRANS_IN_PROCESS;
					objTrans.errorDetails	= 'in process';
				}else if(stTranStatus == ERROR_TRANS_NOT_PENDING_APPROVAL){
					objTrans.errorCode 		= ERROR_TRANS_NOT_PENDING_APPROVAL;
					objTrans.errorDetails	= 'not pending approval';
				}
			}else if(stMemo == 'VOID' && stVoidTotal == 0){
				objTrans.errorCode 		= ERROR_TRANS_NOT_PENDING_APPROVAL;
				objTrans.errorDetails	= 'not pending approval';				
			}else if(arrEmp && (stRoleApprvr || !isEmptyVariantVar(stNextApprvrs))){
				var bMatch		= null;
				var arrApprovers = searchApprovers(stInternalId, stTransType);
				var arrApproverRecord = new Object();
				if(arrApprovers){
					if(stApprvrType == HC_APPRVL_TYPE_LIST_APPRVRS || stApprvrType == HC_APPRVL_TYPE_LINE_APPRVRS){				
						var count = 0;
						var intApprover = 0;
						for(intApprover = 0;intApprover < arrApprovers.length;intApprover++){
							var approver = arrApprovers[intApprover].getValue(FLD_LIST_TRAN_APPROVER);
							for(count = 0; count < arrEmp.length; count++){
								//check if valid approver
								bMatch 	= matchApprover(arrEmp[count],approver,null,stSubsidiary);								
														
								if(bMatch){		
									stInactiveApprover	= arrEmp[count].getValue('entityid');
									stInactive 			= arrEmp[count].getValue('isinactive');
									arrApproverRecord   = arrApprovers[intApprover];
									break;
								}
							}
							if(bMatch)
								break;
						}
					}else{
						var approver = arrApprovers[0].getValue(FLD_LIST_TRAN_APPROVER);
						var appRole	 = arrApprovers[0].getValue(FLD_LIST_APPROVER_ROLE);
						var count = 0;
                        nlapiLogExecution('DEBUG','approver1',approver);
                        nlapiLogExecution('DEBUG','appRole',appRole);
						for(count = 0; count < arrEmp.length; count++){
							//check if valid approver
							bMatch 	= matchApprover(arrEmp[count],approver,appRole,stSubsidiary);	
                            
                            nlapiLogExecution('DEBUG','bMatch',bMatch);
													
							if(bMatch){
								//if(approver){		
								arrApproverRecord   = arrApprovers[0];	
								stInactiveApprover	= arrEmp[count].getValue('entityid');
								stInactive 			= arrEmp[count].getValue('isinactive');
								
								//for role approver
								if(isEmpty(approver))
									stEmpIdOfRoleApprover = arrEmp[count].getId();	
                                    nlapiLogExecution('DEBUG','stEmpIdOfRoleApprover',stEmpIdOfRoleApprover);								
								break;
							}
						}
					}		
					if(bMatch){
						if(stInactive == 'T'){
							objTrans.errorCode 		= ERROR_INACTIVE_APPROVER;
							objTrans.errorDetails	= 'inactive approver';
						}else{
							try{
								var result = null;
								if(stAction == 'APPROVE'){
									result = approveTransaction(stTransType, stInternalId,stReason,arrApproverRecord,objTrans);
								}else{
									result = rejectTransaction(stTransType, stInternalId,stReason,arrApproverRecord);
								}
								if(result){
									if(result == ERROR_TRANS_IN_PROCESS){
										objTrans.errorCode 		= ERROR_TRANS_IN_PROCESS;
										objTrans.errorDetails	= 'in process';
									}else if(result == ERROR_TRANS_NOT_PENDING_APPROVAL){
										objTrans.errorCode 		= ERROR_TRANS_NOT_PENDING_APPROVAL;
										objTrans.errorDetails	= 'not pending approval';
									}else{
										objTrans.errorCode 		= stAction;
										objTrans.errorDetails	= result;										
									}
																			
								}else{
									objTrans.errorCode 		= ERROR_TRANS_IN_PROCESS;
									objTrans.errorDetails	= 'not success on approve';										
								}
		                    }catch(error){
								objTrans.errorCode 		= ERROR_INVALID_APPROVER;
								objTrans.errorDetails	= error.toString();                        	
		                    }									
						}
					}else{
                        var objEmp = searchEmpRec(stFrom)
                        var objApproverList = searchApproverList(objTrans.internalid);
           
                        nlapiLogExecution('DEBUG','objEmp',JSON.stringify(objEmp));
                        nlapiLogExecution('DEBUG','objApproverList',JSON.stringify(objApproverList));

                        var blMatch = false;
                        blMatch = hasApproved(objEmp,objApproverList);
                        
                        nlapiLogExecution('DEBUG','blMatch',blMatch);

                        if(blMatch){
                            objTrans.errorCode = ERROR_HAS_APPROVED;
                            objTrans.errorDetails	= 'has approved';
                        }
                        else{
                            objTrans.errorCode = ERROR_INVALID_APPROVER;
                            objTrans.errorDetails	= 'no match emp';
                        }

					}
				}else{
					objTrans.errorCode = ERROR_INVALID_APPROVER;
					objTrans.errorDetails	= 'no approvers defined';
				}				
			}
			else{
				objTrans.errorCode = ERROR_INVALID_APPROVER;
				objTrans.errorDetails	= 'no emp results';
			}
			
		}
	}catch(error){
		objTrans.errorCode 		= ERROR_TRANS_GENERAL_ERROR;
		objTrans.errorDetails	= error.toString();
		defineError('process', error);		
	}
	sendEmail(objTrans, stFrom, stSubject,stTransType,stInternalId);
}

/**
* Marked approved the transaction id received
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function approveTransaction(stTransType, stInternalId,stReason,arrApprover,objTrans){
	var id = null;
	var result = false;
	try{
		var	arrAppId		= arrApprover.getId();
		
        var sToday = nlapiDateToString(new Date(),'datetimetz');

		var stNextApprvrs 		= objTrans.nextapprovers;
		var stApprvrType 		= objTrans.apprvrType;
		var stTranStatus 		= getTransactionStatus(stTransType,stInternalId);
		
		if(!isEmpty(stTranStatus)){
			return stTranStatus;
		}
		
		if(stApprvrType == HC_APPRVL_TYPE_LIST_APPRVRS || stApprvrType == HC_APPRVL_TYPE_LINE_APPRVRS){

			var arrAppList = searchApprovers(stInternalId,arrApprover.getValue(FLD_LIST_TRAN_APPROVER)); 
			try{
	            //Update approver list
				//update to support multiple approver list
	    		for(var icount=0;icount < arrAppList.length;icount++){         
	    			var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_APPROVED, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE,FLD_LIST_REJECTION_REASON],['T', HC_STATUS_APPROVED,sToday,stReason]);      
	        	}
	            
	    		stNextApprvrs = getMultiApproverList(stNextApprvrs);
	    		var remApprover = removeUserFromNextApprovers(arrApprover.getValue(FLD_LIST_TRAN_APPROVER),stNextApprvrs);
	    		stNextApprvrs = remApprover;
	    		
	    		//Update transaction next approvers
	    		var rec = nlapiLoadRecord(stTransType,stInternalId);
	    		rec.setFieldValues(FLD_NXT_APPRVRS,stNextApprvrs);
	    		rec.setFieldValue(FLD_APPROVAL_VIA_EMAIL,HC_APPROVE_ACTION);
	    		nlapiSubmitRecord(rec,false,true);
			}catch(error){
			    if ( error instanceof nlobjError ){
			    	if(error.getCode() == 'RCRD_HAS_BEEN_CHANGED'){
			    		//Update approver list
						//update to support multiple approver list
			    		for(var icount=0;icount < arrAppList.length;icount++){         
			    			var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_APPROVED, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE,FLD_LIST_REJECTION_REASON],[null, null,null,null]);      
			        	}
			    		return ERROR_TRANS_IN_PROCESS;
			    	}
			    }
			}
    		
    		
		}else{
	        //Update approver list
			if(stEmpIdOfRoleApprover)
				nlapiSubmitField(REC_APPROVER_LIST, arrAppId, 	[FLD_LIST_TRAN_APPROVER, FLD_LIST_REJECTION_REASON],[stEmpIdOfRoleApprover, stReason]);      
			else
				nlapiSubmitField(REC_APPROVER_LIST, arrAppId, 	[FLD_LIST_REJECTION_REASON],
	        													[stReason]);    
				nlapiSubmitField(stTransType, stInternalId,[FLD_APPROVAL_STATUS, FLD_NEXT_APPROVER, FLD_DELEGATE,FLD_APPROVAL_VIA_EMAIL], [HC_STATUS_PENDING_APPROVAL, null, 'F',HC_APPROVE_ACTION],true); 
			
		}
		result = true;
	}catch(error){
        defineError('approveTransaction', error);
    	if(stTransType == 'journalentry'){
    		stTransType = 'intercompanyjournalentry';
    		nlapiSubmitField(stTransType, stInternalId,[FLD_APPROVAL_STATUS, FLD_NEXT_APPROVER, FLD_DELEGATE,FLD_APPROVAL_VIA_EMAIL], [HC_STATUS_PENDING_APPROVAL, null, 'F',HC_APPROVE_ACTION],true); 
    	}
    }
	return result;
}

/**
* Marked rejected the transaction id received
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function rejectTransaction(stTransType, stInternalId,stReason,arrApprover){
	var id = null;
	var result = false;
	try{
        var sToday = nlapiDateToString(new Date(),'datetimetz');
        

		var stTranStatus 		= getTransactionStatus(stTransType,stInternalId);
		
		if(!isEmpty(stTranStatus)){
			return stTranStatus;
		}
		
		var stApproverId 	= arrApprover.getValue(FLD_LIST_TRAN_APPROVER);
		var stApproverRole	= arrApprover.getValue(FLD_LIST_APPROVER_ROLE);
		var	arrAppId		= arrApprover.getId();
		
		//update to support multiple approver list
		var arrAppList = searchApprovers(stInternalId,arrApprover.getValue(FLD_LIST_TRAN_APPROVER)); 
		for(var icount=0;icount < arrAppList.length;icount++){         
			//var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_APPROVED, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE,FLD_LIST_REJECTION_REASON],['T', HC_STATUS_APPROVED,sToday,stReason]);      
			if(stEmpIdOfRoleApprover)
				var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_TRAN_APPROVER, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE, FLD_LIST_REJECTION_REASON],
		        																					[stEmpIdOfRoleApprover, HC_STATUS_REJECTED, sToday, stReason]);  
			else
				var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE, FLD_LIST_REJECTION_REASON],
	        																						[HC_STATUS_REJECTED, sToday, stReason]);      
    	} 
		
        //Update transaction to rejected	            
        try{
	        nlapiSubmitField(stTransType, stInternalId, [FLD_APPROVAL_STATUS, FLD_NEXT_APPROVER ,FLD_APPROVAL_VIA_EMAIL,FLD_REJECTION_REASON], 
	        											[HC_STATUS_REJECTED, null,HC_REJECT_ACTION,stReason]);

	        nlapiSubmitField(stTransType, stInternalId, [FLD_APPROVAL_STATUS, FLD_NEXT_APPROVER ,FLD_APPROVAL_VIA_EMAIL,FLD_REJECTION_REASON], 
	        											[HC_STATUS_REJECTED, null,HC_REJECT_ACTION,stReason]);
	    }catch(error){
	        defineError('reject', error);
	        if(error.getCode() == 'RCRD_HAS_BEEN_CHANGED'){
	        	for(var icount=0;icount < arrAppList.length;icount++){         
	    			if(stEmpIdOfRoleApprover)
	    				var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_TRAN_APPROVER, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE, FLD_LIST_REJECTION_REASON],
	    		        																					[null, null, null, null]);  
	    			else
	    				var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrAppList[icount].getId(), 	[FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE, FLD_LIST_REJECTION_REASON],
	    																									[null, null, null, null]);      
	        	}
	    		return ERROR_TRANS_IN_PROCESS;
	    	}
	    }
	    result = true;
	}catch(error){
        defineError('rejectTransaction', error);			    	
        
    }
	return result;	
}

/**
* Check if the employee that sent email is the valid approver for the transaction
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function matchApprover(emp, approver, appRole, stSubsidiary){
	var empId		= emp.getId();
	var empRole 	= emp.getValue('role');
	var stInactive 	= emp.getValue('isinactive');
	if(bOneWorld == 'T')
		var empSubsd 	= emp.getValue('subsidiary');
	else
		var empSubsd 	= null;

	var match = false;

    nlapiLogExecution('DEBUG','matchApprover', empId + '|' + empRole + '|' + emp + '|' + approver + '|' + appRole +'|'+ stSubsidiary);

	
	if(empId == approver){
		match = true;
	}if(empRole && (empRole == appRole)&& (bOneWorld == 'T') && (stSubsidiary == empSubsd)){
		match = true;
	}if(empRole && (empRole == appRole)&& (bOneWorld == 'F')){
		match = true;
	}
	return match;
}

/**
* Get The transaction details given the email subject
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function getTransactionDetails(stSubject,stBody){

	var objTrans	= new Object();
	try{
		if(stSubject){
			stSubject 		= stSubject.trim();
			var arrToken 	= stSubject.split(/\s+/);
			var objTrans	= new Object();
			var arrRes		= null;
			var stReason	= null;
			
			if(arrToken){
				if(arrToken.length >= 4){
					//Check transaction action
					var stAction 		= arrToken[0].toLowerCase();
					var stTransType 	= arrToken[1].toLowerCase();
					var stTranId	 	= arrToken[3].toLowerCase();
					
					
					//Get the action on email subject

					stReason = getRejectionReason(stBody);
					
					if((stAction == 'rejected' || stAction == 'rejected:')){
						stAction = 'REJECT';
					}
					if((stAction == 'approved' || stAction == 'approved:')){
						stAction = 'APPROVE';
					}
					
					//If action is reject, check if rejection reason is enabled
					if(stAction == 'REJECT' && !stReason){
						objTrans.errorCode 		= ERROR_NO_REJECT_REASON;
						objTrans.errorDetails	= 'no rejection reason';	
					}else if(stAction == 'APPROVE' || stAction == 'REJECT'){
						arrRes = searchTrans(stTranId,stTransType);
						if(arrRes){
							objTrans.internalid 		= arrRes[0].getValue('internalid');
							
							if(bOneWorld == 'T')
								objTrans.subsidiary 		= arrRes[0].getValue('subsidiary');
							else
								objTrans.subsidiary 		= null;
							objTrans.nextapprovers 		= arrRes[0].getValue(FLD_NXT_APPRVRS);
							objTrans.roleapprover 		= arrRes[0].getValue(FLD_NXT_ROLE_APPRVRS);
							objTrans.apprvrType 		= arrRes[0].getValue(FLD_APPRVR_TYPE);
							objTrans.status 			= arrRes[0].getValue('status');
							objTrans.action				= stAction;
							objTrans.type				= stTransType;
							objTrans.reason				= stReason;
							objTrans.errorCode			= null;
							objTrans.errorDetails		= null;	
							if(objTrans.status)
								objTrans.status = objTrans.status.trim().toLowerCase();
						}else{
							objTrans.errorCode = ERROR_TRANS_NOT_EXIST;
							objTrans.errorDetails	= 'trans not exist.';				
						}
					}else{
						objTrans.errorCode = ERROR_WRONG_SUBJECT_FORMAT;
						objTrans.errorDetails	= 'wrong action on subject.';
					}
				}else{
					objTrans.errorCode = ERROR_WRONG_SUBJECT_FORMAT;
					objTrans.errorDetails	= 'Wrong subject format. missing params';			
				}
			}else{
				objTrans.errorCode = ERROR_WRONG_SUBJECT_FORMAT;
				objTrans.errorDetails	= 'Wrong subject format. - subject with spaces';
			}
		}else{
			objTrans.errorCode = ERROR_WRONG_SUBJECT_FORMAT;
			objTrans.errorDetails	= 'No subject found.';
		}
		return objTrans;
	}catch(error){
		defineError('process',error);
		objTrans.errorCode = ERROR_WRONG_SUBJECT_FORMAT;
		objTrans.errorDetails	= error.toString();
	}	
	return objTrans;
}

/**
* Get Rejection reason given the email body
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function getRejectionReason(stBody){
	try{
		if(stBody){
			var stOrigBody	= stBody.trim();
			stBody 			= stBody.toLowerCase();	
			stBody			= stBody.trim();
			var arrToken 	= stBody.split(/\s+/);
			var stSubstr	= null;
			if(stBody.indexOf('reason:') >= 0){
				var stReason		= stOrigBody.substring(stBody.indexOf('reason:')+7,stOrigBody.length);
					stReason		= stReason.trim();
				var arrReason		= stReason.split(/\s+/);
					stReason		= arrReason.join(' ');
				return stReason;
			}else{
				return null;
			}
		}else{
			return null;
		}
	}catch(error){
		defineError(error);
		return null;
	}
}

/**
* Search transaction given the transaction id and transaction type from the email subject
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function searchTrans(stTranId, stType){
	try{

	    var arrRes = null;
    	stType = stType.toLowerCase();
	    var arrCol = [new nlobjSearchColumn('internalid'),
						new nlobjSearchColumn('status'),
						new nlobjSearchColumn(FLD_NXT_APPRVRS),
						new nlobjSearchColumn(FLD_NXT_ROLE_APPRVRS),
						new nlobjSearchColumn(FLD_APPRVR_TYPE)];
	    
	    if(bOneWorld == 'T')
	    	arrCol.push(new nlobjSearchColumn('subsidiary'));
	    var arrFil = [new nlobjSearchFilter('transactionnumber', null, 'is', stTranId),
	                  new nlobjSearchFilter('recordtype', null, 'is', stType)
	    				];
	    arrRes = nlapiSearchRecord('transaction', null, arrFil, arrCol);
	    
	    //**************JOURNALENTRY
	    if(!arrRes && stType){
	    	if(stType == 'intercompanyjournalentry'){
			    var arrRes = null;
			    var arrCol = [new nlobjSearchColumn('internalid'),
								new nlobjSearchColumn('status'),
								new nlobjSearchColumn(FLD_NXT_APPRVRS),
								new nlobjSearchColumn(FLD_NXT_ROLE_APPRVRS),
								new nlobjSearchColumn(FLD_APPRVR_TYPE)];
			    

			    if(bOneWorld == 'T')
			    	arrCol.push(new nlobjSearchColumn('subsidiary'));
			    
			    var arrFil = [new nlobjSearchFilter('transactionnumber', null, 'is', stTranId),
			                  new nlobjSearchFilter('type', null, 'anyof', 'Journal')
			    				];
			    arrRes = nlapiSearchRecord('transaction', null, arrFil, arrCol);
	    	}
	    }
	    return arrRes;
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}

/**
* Search valid approvers for the transaction
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function searchApprovers(idPO, idApprover){
	try{

	    var arrFilters = new Array();
	        arrFilters.push(new nlobjSearchFilter(FLD_LIST_PO, null, 'is', idPO));
	        arrFilters.push(new nlobjSearchFilter(FLD_LIST_HISTORICAL_REJECT,null,'is','F'));
	    
	    if (!isEmpty(idApprover)){
	    	arrFilters.push(new nlobjSearchFilter(FLD_LIST_TRAN_APPROVER, null, 'is', idApprover));
	    }
	    return nlapiSearchRecord(REC_APPROVER_LIST, SS_GET_NEXT_APPRVR, arrFilters, null);
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}

/**
* Search employee given email address
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function searchEmp(stEmail){
	try{
	    var arrRes = null;

	    var arrCol = [new nlobjSearchColumn('isinactive'),
					  new nlobjSearchColumn('entityid'),
	                  new nlobjSearchColumn('internalid'),
	                  new nlobjSearchColumn('role')];
	    
	    if(bOneWorld == 'T')
	    	arrCol.push(new nlobjSearchColumn('subsidiary'));
	    var arrFil = [new nlobjSearchFilter('email', null, 'is', stEmail)];
	    arrRes = nlapiSearchRecord('employee', null, arrFil, arrCol);
	    
	    return arrRes;
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}

/**
* Search internalid and employee name (single line)
* @param 
* @return object
* @author Paolo Miguel Escalona
* @version CW
*/
function searchEmpRec(stEmail){
	try{
	    var arrRes = null;

	    var arrCol = [new nlobjSearchColumn('internalid'),
					  new nlobjSearchColumn('entityid')];
	    
	    if(bOneWorld == 'T')
	    	arrCol.push(new nlobjSearchColumn('subsidiary'));
	    var arrFil = [new nlobjSearchFilter('email', null, 'is', stEmail)];
	    arrRes = nlapiSearchRecord('employee', null, arrFil, arrCol);
	    
	    return arrRes;
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}


/**
* Search transactions approver list
* @param 
* @return object
* @author Paolo Miguel Escalona
* @version CW
*/
function searchApproverList(tranid){
	try{
	    var arrRes = [];
        var res = null;

	    var arrCol = [new nlobjSearchColumn('custrecord_nsts_gaw_tran_approver')];

	    var arrFil = [new nlobjSearchFilter('custrecord_nsts_gaw_po_rec_type', null, 'anyof', tranid)];
	    res = nlapiSearchRecord('customrecord_nsts_gaw_approver_list', null, arrFil, arrCol);
        nlapiLogExecution('DEBUG','res',JSON.stringify(res));
        for (var i = 0; i < res.length; i++) {
            nlapiLogExecution('DEBUG','approverId',res[i].getValue('custrecord_nsts_gaw_tran_approver'));
            arrRes.push(res[i].getValue('custrecord_nsts_gaw_tran_approver'));  
        }
	    
	    return arrRes;
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}

/**
* Check if current approver has approved before
* @param 
* @return object
* @author Paolo Miguel Escalona
* @version CW
*/
function hasApproved(objEmp,objApprover){
	try{
        var blMatch = false;
	    for(var x = 0; x < objApprover.length;x++){
            if(objEmp[0].id == objApprover[x]){
                nlapiLogExecution('DEBUG','match',objEmp[0].id + '|' + objApprover[x])
                blMatch = true;
                break;
            }
        }
        return blMatch;
	}catch(error){
		defineError('searchTrans',error);		
		return null;
	}
}


/**
* Get the email address given the from object
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function logAddress(label, address)
{
	try{
		return address.getEmail();
	}catch(error){
		defineError('logAddress', error);
	}
}

/**
* Send email for notification
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function sendEmail(objTrans, stFrom, stOrigSubject,stType,stInternalId){
	 nlapiLogExecution( 'DEBUG', stInternalId+':send email', 'code: '+objTrans.errorCode + ' details: '+objTrans.errorDetails+' stInternalId:'+stInternalId);	
	 var stSubject 				= "";
	 var stBody 				= "";
	 var bNotifyAdminInvalid	= false;
	 var bNotifyAdminInactiv	= false;
	 var recordUrl				= null;
	 switch(objTrans.errorCode)
     {
	     
        case ERROR_HAS_APPROVED:
             stSubject 	= 'You have already approved this transaction';
	    	 stBody		= 'You have already approved this transaction:'  + ' ('+ stOrigSubject + ')';
	         break;
        case ERROR_WRONG_SUBJECT_FORMAT:
	    	 stSubject 	= 'INVALID SUBJECT FORMAT';
	    	 stBody		= "The subject format must be {ACTION:} {TRANSACTION TYPE} # {TRANSACTION NUMBER}.";
	         break;
	     case ERROR_TRANS_NOT_EXIST:
	    	 stSubject 	= 'TRANSACTION DOES NOT EXIST';
	    	 stBody		= 'Kindly check the transaction number and transaction type you are approving/rejecting.';
	         break;
	     case ERROR_INVALID_APPROVER:
	    	 recordUrl = getTransURL(stType, stInternalId);
	    	 stSubject 		= 'INVALID ROLE/EMPLOYEE APPROVER';
	    	 stBody			= 'You do not have permission to approve/reject this transaction.';
	    	 bNotifyAdminInvalid	= true;
	         break;
	     case ERROR_NO_REJECT_REASON:
	    	 stSubject 	= 'MISSING REJECTION REASON';
	    	 //stBody		= 'Rejection reason is required. Kindly add the reason on the email body: Example: {Reason: INVALID}.';
	    	 stBody		= 'Please note the reason for rejection. : Example: {Reason: INVALID}.';
	         break;
	     case ERROR_INACTIVE_APPROVER:
	    	 recordUrl = getTransURL(stType, stInternalId);
	    	 stSubject 	= 'INACTIVE APPROVER';
	    	 stBody		= 'You are marked inactive and do not have permission to approve/reject this transaction.';
	    	 bNotifyAdminInactiv = true;
	         break;
	     case ERROR_TRANS_NOT_PENDING_APPROVAL:
	    	 stSubject 	= 'TRANSACTION NOT PENDING APPROVAL';
	    	 stBody		= 'This transaction is not pending approval.';
	         break;
	     case ERROR_TRANS_GENERAL_ERROR:
	    	 stSubject 	= 'ERROR';
	    	 stBody		= 'Error encountered while processing: '+objTrans.errorDetails;
	    	 break;
	     case ERROR_TRANS_IN_PROCESS:
	    	 recordUrl = getTransURL(stType, stInternalId);
	    	 stSubject = 'APPROVAL IN PROGRESS';
	    	 stBody		= 'This transaction is still in process. Please try again later.';
	    	 break;
	     case 'APPROVE':
	    	 recordUrl = getTransURL(stType, stInternalId);
	    	 stSubject 	= 'SUCCESSFULLY APPROVED';
	    	 //stBody		= 'You have successfully approved the transaction. '+"<b><a href='"+recordUrl+"'>View Record<a/></b>";
	    	 stBody		= 'You have successfully approved the transaction. ';
	    	 break;
	     case 'REJECT':
	    	 recordUrl = getTransURL(stType, stInternalId);
	    	 stSubject = 'SUCCESSFULLY REJECTED';
	    	 //stBody		= 'You have successfully rejected the transaction. '+"<b><a href='"+recordUrl+"'>View Record<a/></b>";
	    	 stBody		= 'You have successfully rejected the transaction. ';
	    	 break;
     }		
	 if(stSubject){
		 var stEmailSubject = stSubject + ' ('+ stOrigSubject + ')';
		 var stEmailBody = '<p>Hi,</p>'+
					'<p>'+stBody+'</p>'+
					'<p>Thanks, <p/>'+
					'<p>Blend Accounting <p/><br/>';
		var tranrecord 					= [];
			tranrecord['entity'] 		= stEmailSender;
		if(stInternalId)
			tranrecord['transaction'] 	= stInternalId;
		
		nlapiSendEmail(stEmailSender, stFrom, stEmailSubject, stEmailBody, null, null, tranrecord, null);
		if(bNotifyAdminInvalid){			
	    	 stSubject 		= 'INVALID APPROVER DETECTED';
	    	 stBody			= "The person with an email address of '"+stFrom+"'"+" has tried to approve/reject this <a href='"+recordUrl+"'>transaction</a>"+' where he/she is not a valid approver.';
			 stEmailSubject = stSubject + ' ('+ stOrigSubject + ')';
			 stEmailBody = '<p>Hi,</p>'+
						'<p>'+stBody+'</p>'+
						'<p>Thanks, <p/>'+
						'<p>Admin <p/><br/>';
			nlapiSendEmail(stEmailSender, stEmailSender, stEmailSubject, stEmailBody, null, null, tranrecord, null);
		}
		if(bNotifyAdminInactiv){			
	    	 stSubject 		= 'INACTIVE APPROVER DETECTED';
	    	 stBody			= "The person with an email address of '"+stFrom+"': "+ '('+stInactiveApprover+')' +" has tried to approve/reject this <a href='"+recordUrl+"'>transaction</a>"+' but he/she is marked inactive.';
			 stEmailSubject = stSubject + ' ('+ stOrigSubject + ')';
			 stEmailBody = '<p>Hi,</p>'+
						'<p>'+stBody+'</p>'+
						'<p>Thanks, <p/>'+
						'<p>Admin <p/><br/>';
			nlapiSendEmail(stEmailSender, stEmailSender, stEmailSubject, stEmailBody, null, null, tranrecord, null);
		}
	 }
}

/**
* Get Status of record
* @param 
* @return object
* @author Rose Ann Ilagan
* @version 3.0
*/
function getTransactionStatus(stTransType,stTransId){
	try{
		stTransType = stTransType.toUpperCase();
		var record = nlapiLookupField(stTransType,stTransId,[FLD_APPROVAL_VIA_EMAIL,FLD_APPROVAL_STATUS]);
		if(!record && stTransType == 'INTERCOMPANYJOURNALENTRY'){
			record = nlapiLookupField('JOURNALENTRY',stTransId,[FLD_APPROVAL_VIA_EMAIL,FLD_APPROVAL_STATUS]);
		}
		if(record[FLD_APPROVAL_STATUS] == HC_STATUS_PENDING_APPROVAL){
			if(!isEmpty(record[FLD_APPROVAL_VIA_EMAIL])){
				return ERROR_TRANS_IN_PROCESS;
			}			
		}else{
			return ERROR_TRANS_NOT_PENDING_APPROVAL;
		}
	}catch(error){
		defineError('getTransactionStatus',error);
	}
	return null;
}