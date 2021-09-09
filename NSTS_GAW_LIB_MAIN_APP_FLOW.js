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
* This script contains workflow action used in generating and updating approver list or mainly the general approval workflow
* 
* Version Type    Date            Author           						Remarks
* 1.00    Create  06 Mar 2014     Russell Fulling
* 1.01    Edit    29 May 2014     Jaime Villafuerte III/Dennis Geronimo
* 1.02    Edit    2 Mar 2015      Rose Ann Ilagan
* 2.00    Edit    16 Mar 2015     Rachelle Ann Barcelona				Added TDD Enhancements
* 2.00    Edit    16 Mar 2015     Rose Ann Ilagan						Optimize code and added email approval authentication
*/

//**********************************************************************GLOBAL VARIABLE DECLARATION - STARTS HERE**********************************************//

var HC_Inactive_Approver 		= false;
var HC_Delegate_Inactive_Apprvr = null;
var HC_Admin 					= null;
var HC_SuperApprover 			= null;

//**********************************************************************GLOBAL VARIABLE DECLARATION - ENDS HERE*****************************************************//

/**
* Delegate employee to approver
* @param (string  approver id)
* @return string employee id or null
* @type string
* @author Jaime Villafuerte
* @version 1.0
*/
function delegateEmployee(record)
{
	try{
	    var stEmpId 		= record.id;
		var idApprover		= record.id;
	    var recNewApprover 	= null;
	    
	    if (idApprover){
			
	        var arrApprover 	= record['fields'];
	        var stDateFormat 	= nlapiGetContext().getPreference('dateformat');
	        var stDelegateAppr   	= arrApprover[FLD_APPROVAL_DELEGATE];

	        if(stDelegateAppr){
				//check the employee record to see if this employee is delegating today
				var stappDelegateFrom  	= nlapiStringToDate(arrApprover[FLD_DELEGATE_FROM], stDateFormat);
				var stappDelegateTo    	= nlapiStringToDate(arrApprover[FLD_DELEGATE_TO], stDateFormat);
				
				//get the current date
				var sDate = new Date();
					sDate = nlapiDateToString(sDate);
					sDate = nlapiStringToDate(sDate);
						
				if ((sDate <= stappDelegateTo && sDate >= stappDelegateFrom) && stDelegateAppr != null){
					stEmpId = stDelegateAppr;
					recNewApprover				= new Object();
					recNewApprover['id']		= stEmpId;
					recNewApprover['fields'] 	= getApproverDetails(stEmpId);
				}
			}    
	    }
	    return recNewApprover;
	}catch(error){
		defineError('delegateEmployee',error);
		return null;
	}

}


/**
* Search approval rules given corresponding transaction type, subsidiary and integer last sequence
* @param (string transaction type, string subsidiary and integer sequence)
* @return object approval rules
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function searchApprovalRules(stTranType, stSubsidiary, intLastSeq, isCreatedFromPO, isSinglePOApproval)
{
    var stTranType = getTranRecType(stTranType);    
    if (intLastSeq == 0)
        intLastSeq = 1;
    var intLastSeq = (intLastSeq) ? intLastSeq : 0;
    
    var col = [new nlobjSearchColumn(FLD_RULES_APPRVR, FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_RULES_MINAMT, FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP).setSort(),
               new nlobjSearchColumn(FLD_RULES_ROLETYPE, FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_RULES_ROLE_EMAIL, FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_APP_RULE_GRP_DEF_CURR),
               new nlobjSearchColumn(FLD_APP_RULE_GRP_USE_EXC_RATE),
               new nlobjSearchColumn(FLD_RULES_APPRVR_REC_TYPE,FLD_RULES_RULE_GRP),      
               new nlobjSearchColumn(FLD_RULES_APPRVR_REC_FLD,FLD_RULES_RULE_GRP),
               new nlobjSearchColumn(FLD_RULES_TRANS_MAPPED_FLD_ID,FLD_RULES_RULE_GRP),
			   new nlobjSearchColumn(FLD_RULES_LINE_APPROVER,FLD_RULES_RULE_GRP),      
			   new nlobjSearchColumn(FLD_RULES_SUBLIST,FLD_RULES_RULE_GRP),
			   new nlobjSearchColumn(FLD_RULES_MULT_EMP,FLD_RULES_RULE_GRP)];
    
    nlapiLogExecution('DEBUG','stTranType',stTranType);
    nlapiLogExecution('DEBUG','isCreatedFromPO',isCreatedFromPO);
	nlapiLogExecution('DEBUG','isSinglePOApproval',isSinglePOApproval);

	////VB Created PO and not Single Approval
     if(stTranType == '2' && isCreatedFromPO){
         nlapiLogExecution('DEBUG','1');
        var fil = [new nlobjSearchFilter('custrecord_cwgp_isfrompo', null, 'is', "T"),
                new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
               new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
               new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
               new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
    }
	///PO Single Approval
	else if(stTranType == '1' && isSinglePOApproval){
		nlapiLogExecution('DEBUG','2');
		var fil = [new nlobjSearchFilter('custrecord_cwgp_singleapprovrouting', null, 'is', "T"),
		new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
	   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
	   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
	   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	}
	///VB not created PO and not Single Approval
    else if(stTranType == '2' && !isCreatedFromPO){
        nlapiLogExecution('DEBUG','3');
    var fil = [new nlobjSearchFilter('custrecord_cwgp_isfrompo', null, 'is', "F"),
                new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
               new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
               new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
               new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
    }
	///PO Standard Approval
	else if(stTranType == '1' && !isSinglePOApproval){
		nlapiLogExecution('DEBUG','4');
		var fil = [new nlobjSearchFilter('custrecord_cwgp_singleapprovrouting', null, 'is', "F"),
					new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
				   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
				   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
				   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	}
    if(stSubsidiary)
    	fil.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', stSubsidiary));
    
    var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
    
    if (!res){
        if(stTranType == '2' && isCreatedFromPO){
			nlapiLogExecution('DEBUG','5');
		   var fil = [new nlobjSearchFilter('custrecord_cwgp_isfrompo', null, 'is', "T"),
				   new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
				  new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
				  new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
				  new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	   }
	   else if(stTranType == '1' && isSinglePOApproval){
		   nlapiLogExecution('DEBUG','6');
		   var fil = [new nlobjSearchFilter('custrecord_cwgp_singleapprovrouting', null, 'is', "T"),
		   new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
		  new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
		  new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
		  new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	   }
	   else if(stTranType == '2' && !isCreatedFromPO){
		   nlapiLogExecution('DEBUG','7');
	   var fil = [new nlobjSearchFilter('custrecord_cwgp_isfrompo', null, 'is', "F"),
				   new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
				  new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
				  new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
				  new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	   }
	   else if(stTranType == '1' && !isSinglePOApproval){
		   nlapiLogExecution('DEBUG','8');
		   var fil = [new nlobjSearchFilter('custrecord_cwgp_singleapprovrouting', null, 'is', "F"),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
					  new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
					  new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
					  new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq)];
	   }
        var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
    }

	nlapiLogExecution('DEBUG','res: ',JSON.stringify(res));
    return res;
}



/**
* Check creator is approver
* @param (null)
* @return boolean
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function checkCreatorIsApprover(record, stApprover){
	var stCreator 	= record.creator;//nlapiGetFieldValue(FLD_CREATED_BY);
	var stEmpId 	= record['employee'];//nlapiGetFieldValue('employee');
	var stRequestorId = nlapiGetFieldValue(FLD_TRAN_REQUESTOR);
	var stEntity = record['entity'];//nlapiGetFieldValue('entity');
	
	if(!stApprover)
		return false;
	
	//Employee field on expense report is entity
	if (stTransRecordType == 'EXPENSEREPORT'){
		if(stApprover == stEntity)
			return true;
	}
	if((stApprover == stCreator)||(stApprover == stEmpId)||(stApprover == stRequestorId)){
		return true;
	}
	return false;
}
/**
* Get Approver Details
* @param (null)
* @return string internal id
* @type string
* @author Rose Ann Ilagan
* @version 3.0
*/
function getApproverDetails(idApprover,arrApproverDetails){
	try{
		if(arrApproverDetails){
			for(var count = 0; count < arrApproverDetails.length; count++){
				if(idApprover == arrApproverDetails[count].getId()){
					var recEmp = new Object();
					recEmp['firstname'] = arrApproverDetails[count].getValue('firstname');
					recEmp['lastname'] = arrApproverDetails[count].getValue('lastname');
					recEmp['isinactive'] = arrApproverDetails[count].getValue('isinactive');
					recEmp[FLD_APPROVAL_DELEGATE] = arrApproverDetails[count].getValue(FLD_APPROVAL_DELEGATE);
					recEmp[FLD_DELEGATE_FROM] = arrApproverDetails[count].getValue(FLD_DELEGATE_FROM);
					recEmp[FLD_DELEGATE_TO] = arrApproverDetails[count].getValue(FLD_DELEGATE_TO);
					
					return recEmp;
				}
			}
		}else if(idApprover){
			var recApproverFields = nlapiLookupField('employee',idApprover,['firstname','lastname','isinactive',FLD_APPROVAL_DELEGATE,FLD_DELEGATE_FROM,FLD_DELEGATE_TO]);
			return recApproverFields;
		}
		return null;
	}catch(error){
		defineError('getApproverFields',error);
	}
	return null;
}

/**
* Send email for inactive approver
* @param (object) a variable representing an instance of an object
* @return the class name of the object
* @type string
* @author Nestor M. Lim
* @version 1.0
*/
function sendEmailInactive(record,approvalListRes)
{
	try{
		var stApprover = approvalListRes['approver'];
		HC_Admin        	 		= nlapiGetContext().getPreference(SPARAM_EMAIL_SENDER);
		HC_SuperApprover	 		= nlapiGetContext().getPreference(SPARAM_SUPER_APPROVER);
		var type = record['type'];
	 	if (HC_Admin && HC_SuperApprover && stApprover){
	 		var stRecId = null;
	 		//Get approver name
	 		var fields		= approvalListRes['fields'];
		    var stApprvrName = fields['firstname'] + ' '+fields['lastname']; 
		    //Get transaction id or number and url
		    stRecId = record['transno']
		    var recordUrl =  nlapiResolveURL('RECORD', record['type'], record['id']);
		    //Compose email
		    var subject = type+' #'+stRecId+' is Pending for Approval but Inactive Approver has been detected';
		    var body = '<p>Hi,</p>'+
		    			'<p>This '+type+' #'+ stRecId +' has inactive approver: '+stApprvrName+' and needs to be super approved.</p>'+
		    			'<p>Thanks, <p/>'+
		    			'<p>Admin <p/><br/>'+
		    			"<b><a href='"+recordUrl+"'>View Record<a/></b>";
		    	
		    var tranrecord = [];
		    	tranrecord['transaction'] = record['id'];
		    	
		    nlapiSendEmail(HC_Admin, HC_SuperApprover, subject, body, null, null, tranrecord, null);
	 	}
	}catch(error){
		defineError('sendEmailInactive',error);
	}
}

/**
* Get Employee Approvers for Parallel Rule
* @param (array) array id of employee approvers
* @return object
* @type string
* @author Rose Ann Ilagan
* @version 2.5
*/
function getParallelApprovers(stNextApprovers){
	try{	
	    var arrRes = null;
	    var arrCol = [new nlobjSearchColumn('firstname'),
						new nlobjSearchColumn('lastname'),
						new nlobjSearchColumn('isinactive'),
						new nlobjSearchColumn(FLD_APPROVAL_DELEGATE),
						new nlobjSearchColumn(FLD_DELEGATE_FROM),
						new nlobjSearchColumn(FLD_DELEGATE_TO)];
	    var arrFil = [new nlobjSearchFilter('internalid', null, 'anyof',stNextApprovers)];
	    arrRes = nlapiSearchRecord('employee', null, arrFil, arrCol);
		
		return arrRes;
	}catch(error){
		defineError('getParallelApprovers',error);
	}
	return null;
}