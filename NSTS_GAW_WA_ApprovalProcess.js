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
* 3.00    Edit    16 Mar 2015     Rose Ann Ilagan						Optimize code and added email approval authentication
*/

//**********************************************************************GLOBAL VARIABLE DECLARATION - STARTS HERE**********************************************//


//SUITELET
var SCRIPT_REJECT_SUITELET = 'customscript_nsts_gaw_reject_upd_sl';
var DEPLOY_REJECT_SUITELET = 'customdeploy_nsts_gaw_reject_upd_sl';

var SCRIPT_APPROVE_SUITELET = 'customscript_nsts_gaw_apprv_via_email_sl';
var DEPLOY_APPROVE_SUITELET = 'customdeploy_nsts_gaw_apprv_via_email_sl';

//OTHER FIELDS
var HC_Inactive_Approver 		= false;
var HC_Delegate_Inactive_Apprvr = null;
var HC_Admin 					= null;
var HC_SuperApprover 			= null;

//**********************************************************************GLOBAL VARIABLE DECLARATION - ENDS HERE*****************************************************//



//**********************************************************************WORKFLOW ACTION SCRIPT FUNCTIONS - STARTS HERE**********************************************//
/**
* Workflow Action   : NSTS | GAW - Check If Auto Approve
*                   : customscript_nsts_gaw_check_auto_approve
* Checks if Auto Approve
* @param (null)
* @return string/checkbox 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function checkifAutoApprove(){
	try{ 
		// Specify the record type and the saved search ID
		var stInternalId = nlapiGetRecordId();
		if(!isEmptyVariantVar(stInternalId)){
			var arrResults = nlapiSearchRecord('transaction', SS_SYSTEM_GENERATED_JES);
			if(arrResults){
				if(arrResults.length > 0){
					for (var i = 0; i < arrResults.length; i++){
						try{
							var stResInternalId = arrResults[i].getValue('internalid', null, 'GROUP');
							if(stInternalId == stResInternalId)
								return 'T'
						}catch(error){
							
						}
					}
				}
			}
		}	
	}catch(error){
		defineError('checkifAutoApprove',error);
	}
	return 'F';	
}
/**
* Workflow Action   : NSTS | GAW - Check If User Approver
*                   : customscript_nsts_gaw_check_user_approver
* Checks if logged-in user is an approver to show approve buttons
* @param (null)
* @return string/checkbox 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function setNextApproversToString(){
	try{ 
		var arrApprovers = nlapiGetFieldValues(FLD_NXT_APPRVRS);
	    if(!isEmptyVariantVar(arrApprovers)){
	        if(arrApprovers instanceof Array){
	            return ',' + arrApprovers.join(',') + ',';
	        }else{
	            return '';
	        }
	    }else{
	        return '';
	    }
	}catch(error){
		defineError('checkIfUserApprover',error);
	}
	return '';
}

/**
* Workflow Action   : NSTS | GAW - Set Next Approvers
*                   : customscript_nsts_gaw_set_approvers
* Set next employee/role approvers on the transaction, return checkbox type if approvers are found
* @param (null)
* @return string 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function setNextApprovers(){
	try{ 
		var stresult 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_set_apprvr_param');
		var recTrans 	= nlapiGetNewRecord();
		if(stresult){
			recTrans.setFieldValue('nextapprover','');
			var objRecord = JSON.parse(stresult);
			if(objRecord){
				//Set Approver Type
				var stType = objRecord['type'];
				if(stType)
					recTrans.setFieldValue(FLD_APPRVR_TYPE,stType);
				//Set next approvers
				var stapprover = objRecord['id'];
				if(stapprover){
					recTrans.setFieldValues(FLD_NXT_APPRVRS,[stapprover]);
					recTrans.setFieldValue(FLD_NXT_ROLE_APPRVRS,null);
					recTrans.setFieldValue('nextapprover',stapprover);
					return 'T';
				}else{
					var objTrans = JSON.parse(objRecord['trans']);
					if(objTrans){
						var arrApprovers = objTrans['nextapprovers']
						if(checkMultiSelectLength(arrApprovers) > 0)
							return 'T';
					}
				}
				//Set Role Approvers
				var stRoleResult = getRole(stresult);
				if(stRoleResult){							
					recTrans.setFieldValue(FLD_NXT_ROLE_APPRVRS,stRoleResult);
					recTrans.setFieldValues(FLD_NXT_APPRVRS,[]);
				}
			}
		}
	}catch(error){
		defineError('setNextApprover',error);
	}
	return 'F';
}

/**
* Workflow Action   : NSTS | GAW - Get Global Fields (EMP) WA
*                   : customscript_nsts_gaw_get_fields
* Get Global fields from the general preference
* @param (null)
* @return string 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function getGlobalFields(){

	var label 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_label');
	if(!label)
		label 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_label1');
	if(!label)
		label 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_label2');
	var result 	= null;
	if(label == 'emailsender')
		result 	= nlapiGetContext().getPreference(SPARAM_EMAIL_SENDER);
	else if(label == 'superapprover')
		result 	= nlapiGetContext().getPreference(SPARAM_SUPER_APPROVER);
	else if(label == 'emailpluginaddress')
		result 	= nlapiGetContext().getPreference(SPARAM_ECP_ADDR_PO);
	else if(label == 'soemailpluginaddress')
		result 	= nlapiGetContext().getPreference(SPARAM_ECP_ADDR_SO);
	else if(label == 'enableplugin')
		result 	= nlapiGetContext().getPreference(SPARAM_ENABLE_ECP);
	else if(label == 'enablecloaking')
		result 	= nlapiGetContext().getPreference(SPARAM_ENABLE_CLOAK);
	else if(label == 'oneworld')
		result 	= isOneWorld();
	else if(label == 'voided'){
		result 	= nlapiGetFieldValue('voided');	
		if(!result)
			result = 'F';
	}
	else{
		
	}	
	return result;
}

/**
* Workflow Action   : NSTS | GAW - Global Chck Apprvr Inac WA
*                   : customscript_nsts_gaw_chk_apprvr_inac_wa
* Check if Approver is inactive
* @param (null)
* @return string/checkbox type 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function checkIfApproverInactive()
{
	try{
		var stRuleResult 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_rf_result');
		var objRecord		= JSON.parse(stRuleResult);
		if(objRecord){
			var bInactiveApproverFound 	= objRecord['INACTIVEAPPROVERFOUND'];
			if(bInactiveApproverFound == 'T')
				return bInactiveApproverFound;
		}
	}catch(error){
		defineError('checkIfApproverInactive',error);
	}
	return 'F';		
}

/**
* Workflow Action   : NSTS | GAW - Get Reject or Appr Link
*                   : customscript_nsts_gaw_get_email_link
* Get Approval or Rejection link on email
* @param (null)
* @return string 
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function getApproveOrRejectLink()
{
    try{
        var idPO = nlapiGetRecordId();
        var recType = stTransRecordType;		
        var stReturnLink = null;
        
        //Script parameters
        var stApproverAction = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_approval_action');
         
        //Get external url of suitelet
        if (stApproverAction == HC_APPROVE_ACTION){
			stReturnLink = nlapiResolveURL('SUITELET', SCRIPT_APPROVE_SUITELET, DEPLOY_APPROVE_SUITELET,true);
        }
        if (stApproverAction == HC_REJECT_ACTION){
            stReturnLink = nlapiResolveURL('SUITELET', SCRIPT_REJECT_SUITELET, DEPLOY_REJECT_SUITELET,true);      
        }
        return stReturnLink;
    }catch(error){
        defineError('getApproveOrRejectLink', error);
        return null;
    }
}

/**
* Workflow Action   : NSTS | GAW - Global Get Record Type WA
*                   : customscript_nsts_gaw_get_rec_type_wa
* Returns the string record type
* @param (null)
* @return string record type or null
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function getRecordtype()
{
    var stRecordType = nlapiGetRecordType();
    if (stRecordType)
        stRecordType = stRecordType.toLowerCase();
    //IJE will use the journal entry rule group
    if(stRecordType == 'intercompanyjournalentry'){
    	stRecordType = 'journalentry';
    }
    return stRecordType;
}

/**
* Workflow Action   : NSTS | GAW - Global Get Order Status WA
*                   : customscript_nsts_order_stat_wa
* Returns the record status
* @param (null)
* @return string record type or null
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function getOrderStatus()
{
	try{
		var stOrderStatus = nlapiGetFieldValue('status');
		if(stOrderStatus)
			stOrderStatus = stOrderStatus.toLowerCase();
		return stOrderStatus;
	}catch(error){
		defineError('getOrderStatus', error)
	}
}
/**
* Workflow Action   : NSTS| GAW - Check Changes Upon Edit WA
*                   : customscript_nsts_gaw_check_tol_limt_wa
* Check if amount is within tolerance amount/percent or if any of line approvers have changed.
* @param (null)
* @return the boolean value on the condition if within tolerance limit of between new and old total amount
* @type boolean
* @author Jaime Villafuerte
* @version 1.0
*/
function validateChangesUponEdit(){
	try{	
		var stResetWorkflow 	= nlapiGetFieldValue(FLD_CUSTBODY_RESET_WORKFLOW);
		var PO_TO_VB_TOLER   	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_po_to_vb_tol');  
		if(!stResetWorkflow || PO_TO_VB_TOLER == 'T'){
			var bWithin 			= checkToleranceLimit(PO_TO_VB_TOLER);
			if(bWithin){
				var recNew = nlapiGetNewRecord();
				//Check if any of the line approvers have changed
				var stApproverType = recNew.getFieldValue(FLD_APPRVR_TYPE);
				if(stApproverType == HC_APPRVL_TYPE_LINE_APPRVRS){
					//Get Rule group line approvers
					var bLineApproversChanged = checkIfLineApproversChanged();
					if(bLineApproversChanged)
						return false;
					else
						return true;
					
				}
			}else{
				return false;
			}
		}else{
			stResetWorkflow = stResetWorkflow.trim().toLowerCase();
			if(stResetWorkflow == 'reset')
				return false;
			else
				return true;
		}
	}catch(error){
		defineError('validateChangesUponEdit',error);
	}
	return true;
}

/**
* Workflow Action   : NSTS| GAW - Check Changes Upon Edit WA
*                   : customscript_nsts_gaw_check_tol_limt_wa
* Check if line approvers have changed.
* @param (null)
* @return the boolean 
* @type boolean
* @author Jaime Villafuerte
* @version 1.0
*/
function checkIfLineApproversChanged(){
	try{	
		var arrAppList   		= getLastSequenceCreated();
		var intLastSeq      	= arrAppList[0].getValue(FLD_LIST_RULE_SEQ);
		var bOneWorld 			= isOneWorld();
		if(bOneWorld == 'T')
			var stSubsidiary		= nlapiGetFieldValue('subsidiary');
		else
			var stSubsidiary = null;
		var bChangedApprover 	= false;
		var bOneWorld 			= isOneWorld();
		if(intLastSeq){
			intLastSeq       		= Math.floor(intLastSeq);
			var arrApprovalrules 	= searchApprovalRules(stTransRecordType, stSubsidiary, intLastSeq);
			var stSublist 			= arrApprovalrules[0].getValue(FLD_RULES_SUBLIST, FLD_RULES_RULE_GRP);
			var stLineApprover		= arrApprovalrules[0].getValue(FLD_RULES_LINE_APPROVER, FLD_RULES_RULE_GRP);

			if((stSublist && stLineApprover)){

				stSublist = stSublist.toLowerCase().trim();
				stLineApprover = stLineApprover.toLowerCase().trim();
			}
			var recOld 				= nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			var recNew				= nlapiGetNewRecord();
			var oldItemCount 		= recOld.getLineItemCount(stSublist);
			var newItemCount 		= recNew.getLineItemCount(stSublist);

			if(oldItemCount == newItemCount){
				for(var cnt=0;cnt<newItemCount;cnt++){
					var oldApprover = recOld.getLineItemValue(stSublist,stLineApprover,cnt+1);
					var newApprover = recNew.getLineItemValue(stSublist,stLineApprover,cnt+1);					
					if(isEmpty(oldApprover))
						oldApprover = null;
					if(isEmpty(newApprover))
						newApprover = null;
					if(oldApprover != newApprover){
						return true;						
					}						
				}
			}else{
				if(oldItemCount > 0 && newItemCount > 0)
					return true;		
			}
		}  
	}catch(error){
		defineError('checkIfLineApproversChanged',error);
	}   
	return bChangedApprover;
}
/**
* Workflow Action   : NSTS| GAW - Check Changes Upon Edit WA
*                   : customscript_nsts_gaw_check_tol_limt_wa
* Returns boolean value if within tolerance limit of amount
* @param (null)
* @return the boolean value on the condition if within tolerance limit of between new and old total amount
* @type boolean
* @author Jaime Villafuerte
* @version 1.0
*/
function checkToleranceLimit(PO_TO_VB_TOLER)
{    
    var recTranOld       	= nlapiGetOldRecord();
    var recTranNew       	= nlapiGetNewRecord();
    var bOneWorld 			= isOneWorld();
    if(bOneWorld == 'T')
    	var stSubsidiary = recTranNew.getFieldValue('subsidiary');
    else
    	var stSubsidiary = null;
    var stTranTypeId     	= getTranRecType(stTransRecordType);
    var isWithin         	= true;
    var arrRes           	= null;
    var stTranCurrency 	 	= nlapiGetFieldValue('currency');
    var stTranDate			= nlapiGetFieldValue('trandate');
    
    var arrCol = [new nlobjSearchColumn(FLD_APP_RULE_GRP_PERCENT_TOL),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_AMT_TOL),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_PO_TO_VB_AMT),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_PO_TO_VB_PCT),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_SUBSD),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_TRAN_TYPE),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_DEF_CURR),
                  new nlobjSearchColumn(FLD_APP_RULE_GRP_USE_EXC_RATE)];
    var arrFil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranTypeId),
                  new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F')];
    

    if(bOneWorld == 'T')
    	arrFil.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', stSubsidiary));
    
    arrRes = nlapiSearchRecord(REC_RULE_GRP, null, arrFil, arrCol);

    if (!arrRes)
    {
        var arrFil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranTypeId),
                      new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
                      new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', '@NONE@')];
        arrRes = nlapiSearchRecord(REC_RULE_GRP, null, arrFil, arrCol);
    }

    if (arrRes)
    {
    	var stGrpCurrency = arrRes[0].getValue(FLD_APP_RULE_GRP_DEF_CURR);
    	var stUseTranDate = arrRes[0].getValue(FLD_APP_RULE_GRP_USE_EXC_RATE);
        if (PO_TO_VB_TOLER == 'T'){
            var fTolPct = arrRes[0].getValue(FLD_APP_RULE_GRP_PO_TO_VB_PCT);
            var fTolAmt = arrRes[0].getValue(FLD_APP_RULE_GRP_PO_TO_VB_AMT);

            if (!fTolPct && !fTolAmt)
            {
                return isWithin;
            }
            var myPOId = nlapiGetFieldValue('podocnum');

            if (!myPOId){
                return isWithin;
            }
			//Load the PO record to get accurate total value if different subsidiary is set
			var poTotal = 0;
			if(stGrpCurrency != stTranCurrency){
				var rec = nlapiLoadRecord('purchaseorder', myPOId)
				poTotal = rec.getFieldValue(FLD_TOTAL);
			}else
				poTotal = nlapiLookupField('purchaseorder',myPOId,FLD_TOTAL);
			
            var vbTotal = nlapiGetFieldValue(FLD_TOTAL);
            if((poTotal && vbTotal)){
            	vbTotal = parseFloat(vbTotal);
            	poTotal = parseFloat(poTotal);
            }
            if (fTolPct){
                fTolPct = parseFloat(fTolPct) / 100;
                isWithin = (Math.abs((poTotal - vbTotal)) / poTotal) <= fTolPct;
            }
            var stTranDate = nlapiGetFieldValue('trandate');
            if (fTolAmt){
                fTolAmt = parseFloat(fTolAmt);
                if (stUseTranDate && stTranCurrency && (stGrpCurrency != stTranCurrency)){
                	poTotal = currencyConversion(poTotal, stTranCurrency, stGrpCurrency, stUseTranDate,stTranDate);   
                	vbTotal = currencyConversion(vbTotal, stTranCurrency, stGrpCurrency, stUseTranDate,stTranDate);   
                }
                isWithin = Math.abs((poTotal - vbTotal)) <= fTolAmt;
            }
        }
        else{
			//Get old and new amount through nlapiLookupField instead of nlapiGetFieldValue when context is xedit
			var fOldTotal = nlapiGetFieldValue(FLD_TRANS_ORG_AMT);
        	var fNewTotal = nlapiGetFieldValue(FLD_TOTAL);
        	if (!(fOldTotal && fNewTotal)){
        		var jetotal =  nlapiLookupField(stTransRecordType,nlapiGetRecordId(),[FLD_TOTAL,FLD_TRANS_ORG_AMT]);
                fOldTotal = jetotal[FLD_TRANS_ORG_AMT];
                fNewTotal = jetotal[FLD_TOTAL];
                if(!(fOldTotal && fNewTotal)){
                	return isWithin;
                }
        	}
            if (fOldTotal == fNewTotal){
                return isWithin;
            }
            if((fOldTotal && fNewTotal)){
            	fOldTotal = parseFloat(fOldTotal);
            	fNewTotal = parseFloat(fNewTotal);
            }
            var fTolPct = arrRes[0].getValue(FLD_APP_RULE_GRP_PERCENT_TOL);
            var fTolAmt = arrRes[0].getValue(FLD_APP_RULE_GRP_AMT_TOL);
            if (fTolPct){ 
                fTolPct = parseFloat(fTolPct) / 100;
                isWithin = (Math.abs((fNewTotal - fOldTotal)) / fOldTotal) <= fTolPct;
           }

            if (fTolAmt){
                fTolAmt = parseFloat(fTolAmt);
                var stTranDate = nlapiGetFieldValue('trandate');
                if (stUseTranDate && stTranCurrency && (stGrpCurrency != stTranCurrency)){
                    fNewTotal = currencyConversion(fNewTotal, stTranCurrency, stGrpCurrency, stUseTranDate,stTranDate);   
                	fOldTotal = currencyConversion(fOldTotal, stTranCurrency, stGrpCurrency, stUseTranDate,stTranDate);   
                }
                isWithin = Math.abs((fNewTotal - fOldTotal)) <= fTolAmt;
            }
        }
    }
    return isWithin;
}

//for testing of scheduled workflow action through suitelet
function delegate_temp_trigger_BeforeLoad(request, response){
	 var type = request.getParameter('type');
     var id = request.getParameter('id');
     setDelegateOnScheduled(type,id);
     response.write('okk');
}

/**
* Workflow Action   : NSTS | GAW - Delegation Scheduled WA
*                   : customscript_nsts_gaw_del_sched_wa
* Returns boolean value on the condition if successfully delegated to approver's delegate
* @param (null)
* @return string  boolean value on the condition if successfully delegated to approver's delegate
* @type boolean
* @author Jaime Villafuerte
* @version 1.0
*/
function setDelegateOnScheduled()
{    
	try{
		var result 			= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_set_del_rule_flow');
		var retVal   		= 'false';
		var bGetNewRecord 	= true;
		var record   		= nlapiGetNewRecord();
		
		//If get new record is not working, load then submit record
		if(!record){
			bGetNewRecord 	= false;
			record 			= nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());			
		}
		
		var bIsUpdateRecord 	= false;
		var bDelegateFound		= false;
		var stUpdAppListId 		= null;
		var type 				= nlapiGetRecordType();
		var arrFinalApprovers 	= [];
		var idPO    			= nlapiGetRecordId();
		var recordFields 		= new Object();
		recordFields.creator 	= record.getFieldValue(FLD_CREATED_BY);
		recordFields.employee 	= record.getFieldValue('employee');
		recordFields.type 		= type;
		recordFields.id 		= idPO;
		recordFields.transno 	= record.getFieldValue('transactionnumber');
		var arrApprovers 		= record.getFieldValues(FLD_NXT_APPRVRS); //record.getFieldValue(FLD_NEXT_APPROVER);
		var arrApprovers_dummy 	= arrApprovers;
		var arrChangedApprovers = [];
		var intChangedApprover	= 0;
		var iapvr = 0;
		var arrColumns = [];
		    arrColumns.push(new nlobjSearchColumn(FLD_LIST_ORIG_APPRVR));
		    arrColumns.push(new nlobjSearchColumn(FLD_LIST_TRAN_APPROVER));
		    
		var arrFilters = new Array();
		    arrFilters.push(new nlobjSearchFilter(FLD_LIST_PO, null, 'is', idPO));
		    arrFilters.push(new nlobjSearchFilter(FLD_LIST_HISTORICAL_REJECT,null,'is','F'));
			
		var arrRes = nlapiSearchRecord(REC_APPROVER_LIST, SS_GET_NEXT_APPRVR, arrFilters, arrColumns);
		
		if (!isEmptyVariantVar(arrRes)){
			
		    var recIdApprover = null;
		    var arrProcApprove_placeholding = [];          
		    
		    for(iapvr = 0; iapvr < arrRes.length; iapvr++){
		        var stAppListId     	= arrRes[iapvr].getId();
		        var stOrigApp       	= arrRes[iapvr].getValue(FLD_LIST_ORIG_APPRVR);
		        var stCurApproverid   	= arrRes[iapvr].getValue(FLD_LIST_TRAN_APPROVER);
		        arrFinalApprovers[iapvr] = arrRes[iapvr].getValue(FLD_LIST_TRAN_APPROVER);
		        if (stOrigApp){
		            
		            recIdApprover               = new Object();
		            recIdApprover['fields']     = getApproverDetails(stOrigApp);
		            recIdApprover['id']         = stOrigApp;
		            var objDelegateEmp 			= delegateEmployee(recIdApprover);
		            
		            var stEmpId = (isEmptyVariantVar(objDelegateEmp))? null : objDelegateEmp.id;
		            //If the delegation got expired then it should then be revert back to original approver
		            if (stOrigApp && !stEmpId)
		            {
		                //check if inactive
		                var recEmp = nlapiLookupField('employee',stOrigApp,['isinactive','firstname','lastname']);
		                stInactive = recEmp['isinactive'];

		                if(stInactive == 'T'){
		                	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR,FLD_LIST_APPROVER_LINE_STATUS], ['','',HC_STATUS_INACTIVE]);
		
		                    //set back the original employee on the transaction
		                    //record.setFieldValue(FLD_NXT_APPRVRS, '');
							recIdApprover['approver'] = stOrigApp;
							sendEmailInactive(recordFields,recIdApprover);
	                        arrApprovers = replaceOnArray(arrApprovers,stCurApproverid,'');
		                    record.setFieldValues(FLD_NXT_APPRVRS, []);
		                    record.setFieldValue(FLD_DELEGATE, 'F');
							HC_Inactive_Approver = true;
		                    bIsUpdateRecord = true;							
		                    
		                }else{
		                	if(!checkCreatorIsApprover(recordFields, stOrigApp)){
			                	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR], [stOrigApp,'']);
			                	arrFinalApprovers[iapvr] = stOrigApp;
								arrChangedApprovers[intChangedApprover++] = stOrigApp;
			                    record.setFieldValue(FLD_DELEGATE, 'F');
			                    bIsUpdateRecord = true;
		                	}		                   
		                }
		                retVal = true;
		            }else if (stOrigApp && stEmpId){
		            	//delegate has changed
		            	if(stOrigApp != stEmpId){
		            		//check if inactive
			                var recEmp = nlapiLookupField('employee',stEmpId,['isinactive','firstname','lastname']);
			                stInactive = recEmp['isinactive'];
			                if(stInactive == 'T'){
			                	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR,FLD_LIST_APPROVER_LINE_STATUS], ['','',HC_STATUS_INACTIVE]);
			
			                    //set back the original employee on the transaction
			                    //record.setFieldValue(FLD_NXT_APPRVRS, '');
								recIdApprover['approver'] = stEmpId;
								recIdApprover['fields'] = recEmp;
								sendEmailInactive(recordFields,recIdApprover);
		                        arrApprovers = replaceOnArray(arrApprovers,stCurApproverid,'');
			                    record.setFieldValues(FLD_NXT_APPRVRS, []);
			                    record.setFieldValues(FLD_NXT_APPRVRS, null);
			                    record.setFieldValue(FLD_DELEGATE, 'F');
								HC_Inactive_Approver = true;
			                    bIsUpdateRecord = true;
								
			                    
			                }else if(stCurApproverid != stEmpId){
			                	if(!checkCreatorIsApprover(recordFields, stEmpId)){

				                	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR], [stEmpId, stOrigApp]);
				                	arrFinalApprovers[iapvr] = stEmpId;
									arrChangedApprovers[intChangedApprover++] = stEmpId;
			                        record.setFieldValue(FLD_DELEGATE, 'F');
			                        bIsUpdateRecord = true;
			                	}
			                }
		            	}	            	
		            }
		        }
		        else{
		            if(!isEmptyVariantVar(arrApprovers)){                    
		                var stEmpId                 = stCurApproverid;
		                recIdApprover               = new Object();
		                recIdApprover['fields']     = getApproverDetails(stEmpId);
		                recIdApprover['id']         = stEmpId;
		                
		                var objDelegateEmp 	= delegateEmployee(recIdApprover);
		                var stEmpId 		= (isEmptyVariantVar(objDelegateEmp))? null : objDelegateEmp.id;

		                if (stEmpId != stCurApproverid && stEmpId){       

		                    //check if inactive
		                    var recEmp = nlapiLookupField('employee',stEmpId,['isinactive','firstname','lastname']);
		                    stInactive = recEmp['isinactive'];
		                    if(stInactive == 'T'){
		                    	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR,FLD_LIST_APPROVER_LINE_STATUS], ['', '',HC_STATUS_INACTIVE]);
		                        //set the delegated employee on the transaction								
								recIdApprover['approver'] = stEmpId;
								recIdApprover['fields'] = recEmp;
								sendEmailInactive(recordFields,recIdApprover);
		                        arrApprovers = replaceOnArray(arrApprovers,stCurApproverid,'');
			                    record.setFieldValues(FLD_NXT_APPRVRS, []);
		                        record.setFieldValue(FLD_DELEGATE, 'T');
								bDelegateFound = true;
		                        bIsUpdateRecord = true;
								HC_Inactive_Approver = true;
		                        //sendEmailInactive(idPO,stEmpId);    
		                    }else{
		                    	if(!checkCreatorIsApprover(recordFields, stEmpId)){

			                    	stUpdAppListId = nlapiSubmitField(REC_APPROVER_LIST, stAppListId, [FLD_LIST_TRAN_APPROVER, FLD_LIST_ORIG_APPRVR], [stEmpId, stCurApproverid]);
			                    	arrFinalApprovers[iapvr] = stEmpId;
				                    arrChangedApprovers[intChangedApprover++] = stEmpId;
			                        record.setFieldValue(FLD_DELEGATE, 'T');
									bDelegateFound = true;
			                        bIsUpdateRecord = true;
		                    	}else if(stCurApproverid == stEmpId){
									bDelegateFound = true;
								}
		                    }
		                    retVal = true;//return 'true';
		                }                     
		            }//if(!isEmptyVariantVar(arrApprovers)){
		        } //else          
		        arrApprovers_dummy = arrApprovers;
		    }
		    if(record && bIsUpdateRecord){

        		if(arrFinalApprovers.length > 0){
        			arrFinalApprovers = arrFinalApprovers.filter(onlyUnique);
        		}
				
        		if(arrChangedApprovers.length > 0){
        			arrChangedApprovers = arrChangedApprovers.filter(onlyUnique);
        		}
				
	            record.setFieldValues(FLD_NXT_APPRVRS, arrFinalApprovers);
	            var objResult = JSON.parse(result);
	            var finalResult = objResult;
	            var objTrans = JSON.parse(objResult['trans']);

	            if(HC_Inactive_Approver){
	            	//finalResult['INACTIVEAPPROVERFOUND'] = 'T';
	                record.setFieldValues(FLD_NXT_APPRVRS, []);
	            }
				if(bDelegateFound)
					record.setFieldValue(FLD_DELEGATE, 'T');
	            if(objResult['approverList'] && stUpdAppListId){
	            	
	            	var recAppList				= new Object();
	        	    recAppList['id'] 			= stUpdAppListId;
	        	    
	            	finalResult['approverList'] = recAppList;
	            	if(arrFinalApprovers.length > 0){
		            	finalResult['id'] = arrFinalApprovers[0];
						finalResult['fields'] = getApproverDetails(finalResult['id']);
	        		}
	            }

	            if(objResult['NoOfApprovers']){
	            	if(objTrans){
	            		objTrans['nextapprovers'] = arrFinalApprovers;
	            		finalResult['NoOfApprovers'] = arrFinalApprovers.length;
	            		finalResult['changedapprovers'] = arrChangedApprovers;
	            		finalResult['trans'] = JSON.stringify(objTrans);
	            	}
	            }
				
				//If get new record is not working, load then submit record
				if(!bGetNewRecord)
					nlapiSubmitRecord(record,false,true);
				
	            return JSON.stringify(finalResult);
		    }		    
		}
	}catch(error){
		defineError('setDelegateOnScheduled',error);
	}
	return '';
}

/**
* Workflow Action   : NSTS | GAW - Update Apprvr List WA
*                   : customscript_nsts_gaw_global_upd_wa
* Update approvers list on approve button and returns string id of next approver
* @param (null)
* @return string id of next approver or null
* @type string
* @author Jaime Villafuerte
* @version 1.0
*/
function updateGlobalApprovalList()
{
    try{

        var sToday = nlapiDateToString(new Date(),'datetimetz');
		var result 		= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_apprvr_list_param1');
        var idApprover  = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_globalapprvr');
        var isParallelApproved  = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_is_parallel_apprvd');
        
    	try{
    		var contextName = nlapiGetContext().getName();
    		if (contextName){
    			contextName = contextName.toLowerCase();
    		}
    		if (contextName == '-system-'){
    			idApprover = null;
    		}else{
    			idApprover = nlapiGetContext().getUser();
    		}
    	}catch(error){
    		defineError('updateGlobalApprovalList 1',error);
    	}
        if (result){
        	var objRecord		= JSON.parse(result);
            var recAppListId 	= objRecord['lastapproverlist'];
			var objTrans 		= JSON.parse(objRecord['trans']);
            var idRecApproval 	=  null;

        	var stUser = nlapiGetContext().getUser();
        	if(isParallelApproved == 'T'){
                if((objTrans.approverType == HC_APPRVL_TYPE_LIST_APPRVRS || objTrans.approverType == HC_APPRVL_TYPE_LINE_APPRVRS )){
                	
                	if(!stUser || stUser != -4){
                		var arrList = searchApprovers(nlapiGetRecordId(), stUser);
                		if(arrList){
                    		stNextApprvrs = getMultiApproverList(objTrans['nextapprovers']);
                    		var remApprover = removeUserFromNextApprovers(stUser,stNextApprvrs);
                    		stNextApprvrs = remApprover;
                    		nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,stNextApprvrs);
							
                            //Update approver list, supports multiple approver list
                    		for(var icount=0;icount < arrList.length;icount++){
                                var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrList[icount].getId(), 	[FLD_LIST_APPROVED, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_APPROVER_DATE],['T', HC_STATUS_APPROVED,sToday]);                              		
                    		}
							return (JSON.stringify(stNextApprvrs));
                		}
                	}            		
                }
        	}else{

                if(recAppListId && recAppListId != 'null'){
                	recAppListId = parseInt((JSON.parse(recAppListId)).toString());
                	var recAppList 		= nlapiLoadRecord(REC_APPROVER_LIST, recAppListId);//JSON.parse(recAppList);
                	var idRecApproval 	= recAppList.getId();
                	var idRuleName		= recAppList.getFieldValue(FLD_LIST_RULE_NAME);
                }else if(objRecord['approverList']){
                	recAppListId =  objRecord['approverList']['id']
                	recAppListId = parseInt((recAppListId).toString());
                	var recAppList 		= nlapiLoadRecord(REC_APPROVER_LIST, recAppListId);//JSON.parse(recAppList);
                	var idRecApproval 	= recAppList.getId();
                	var idRuleName		= recAppList.getFieldValue(FLD_LIST_RULE_NAME);
                	
                }
                if(idRecApproval && !(idRuleName ==HC_APPRVL_TYPE_LIST_APPRVRS || idRuleName ==HC_APPRVL_TYPE_LINE_APPRVRS)){
                   if(idApprover && idApprover !=-1){
            			nlapiSubmitField(REC_APPROVER_LIST, idRecApproval, [FLD_LIST_APPROVED, FLD_LIST_APPROVER_DATE, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_TRAN_APPROVER], ['T', sToday, HC_STATUS_APPROVED, idApprover]);
                      	var obj = nlapiLookupField(REC_APPROVER_LIST, idRecApproval, [FLD_LIST_APPROVED, FLD_LIST_APPROVER_DATE, FLD_LIST_APPROVER_LINE_STATUS, FLD_LIST_TRAN_APPROVER]);
                   }else{
                   	nlapiSubmitField(REC_APPROVER_LIST, idRecApproval, [FLD_LIST_APPROVED, FLD_LIST_APPROVER_DATE, FLD_LIST_APPROVER_LINE_STATUS], ['T', sToday, HC_STATUS_APPROVED]);            	
                    
                   }
            	}
            }
        }
    }catch(error){
    	defineError('updateGlobalApprovalList',error);
    	return '';
    }
	return '';
}

/**
* Workflow Action   : NSTS | GAW - Set As Super Approved WA 
*                   : customscript_nsts_gaw_set_super_app_wa 
* Flag Approver List custom record as Super Approved
* @param (null)
* @return null
* @type null
* @author Rachelle Anne Barcelona
* @version 1.0
*/
function setAsSuperApproved() {
    var sToday = nlapiDateToString(new Date(),'datetimetz');
    
	var arrApproverList = searchApprovers(nlapiGetRecordId(), null);
	if(!arrApproverList)
		return null;
	//Update approver list, supports multiple approver list
    for(var icount=0;icount < arrApproverList.length;icount++){
        var stAppListId = nlapiSubmitField(REC_APPROVER_LIST, arrApproverList[icount].getId(),  [FLD_LIST_SUPER_APPROVED,FLD_LIST_APPROVER_DATE,FLD_LIST_APPROVER_LINE_STATUS,FLD_LIST_REJECTION_REASON], 
																								['T', sToday,HC_STATUS_APPROVED,'']);      
    }
}

/**
* Workflow Action   : NSTS | GAW - Global Update Approver WA
*                   : customscript_nsts_gaw_glo_upd_apprvr_wa
* Restart approver list by deleting previous approver list records
* @param (null)
* @return null
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function deleteApproverList()
{    
	if(nlapiGetRecordId()){
	    //delete any approvers associated with this transaction and delete them
	    var currentAppFilter = [new nlobjSearchFilter(FLD_LIST_PO, null, 'is', nlapiGetRecordId())];
	    var currentApprovers = nlapiSearchRecord(REC_APPROVER_LIST, null, currentAppFilter);

	    if (currentApprovers){
	        for (var i = 0; i < currentApprovers.length; i++){
	            nlapiDeleteRecord(REC_APPROVER_LIST, currentApprovers[i].getId());
	        }
	    }
	}
}

/**
* Workflow Action   : NSTS | GAW - Global Needs Approval WA
*                   : customscript_nsts_gaw_needs_apprvl_wa
* This will check at state 0 if the initial approver has authority to approve the po if so proceed to approved and if the total amount of transaction is within the limit
* @param (null)
* @return string boolean 'F' or 'T' 
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function createNeedApprovals()
{
    var bNeedsPO = 'T';
    try{
        var flPOAmt = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_po_totalamt');
        var bOneWorld = isOneWorld();
        flPOAmt = nlapiGetFieldValue(FLD_TOTAL);//(!flPOAmt) ? 0 : parseFloat(flPOAmt);
        
	    //Conversion implementation
	    var stTransCurrency = nlapiGetFieldValue('currency');
	    var stTranDate = nlapiGetFieldValue('trandate');
	    
	    var stEmpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_ini_apprvr');
	    
	    if(stTransRecordType == 'VENDORBILL'){
	        var stPOId = nlapiGetLineItemValue('purchaseorders', 'id', 1);
	        if (stPOId)
	        {
	            return bNeedsPO;
	        }
	    } 

	    if(!stEmpId){
	    	var arrEmpRec 	= nlapiLoadRecord(stTransRecordType,nlapiGetRecordId());
	    	stEmpId 		= arrEmpRec.getFieldValue(FLD_TRAN_REQUESTOR);
	    	flPOAmt			= arrEmpRec.getFieldValue(FLD_TOTAL);
	    	stTransCurrency = arrEmpRec.getFieldValue('currency');
	    	stTranDate 		= arrEmpRec.getFieldValue('trandate');
	    } 

		if (!stEmpId || !FLD_TRAN_LIMIT){
			return bNeedsPO;	
		} 
		var stEmpCurrency 	= null;
		var arrEmpRec  		= null;
	    if(bOneWorld == 'T'){
		    arrEmpRec 		= nlapiLookupField('employee',stEmpId,['subsidiary.currency',FLD_TRAN_LIMIT]);
		    stEmpCurrency 	= arrEmpRec['subsidiary.currency']; 
	    }else{
		    arrEmpRec 		= nlapiLookupField('employee',stEmpId,[FLD_TRAN_LIMIT]);
        	var compRec 		= nlapiLoadConfiguration("companyinformation");
        	stEmpCurrency 		= compRec.getFieldValue("basecurrency");
	    }
	    var flPurchaseLimit = arrEmpRec[FLD_TRAN_LIMIT];
	        flPurchaseLimit = (!flPurchaseLimit) ? 0 : parseFloat(flPurchaseLimit);

		/************************************Check Purchase Limit ***************************************************/
	    try{
			var arrEmpRec = nlapiLoadRecord('employee',stEmpId);
			flPurchaseLimit = arrEmpRec.getFieldValue(FLD_TRAN_LIMIT);
		}catch(error){			
		}  
		/************************************Check Purchase Limit ***************************************************/	        
	    
		if (stTransCurrency && stEmpCurrency && stTransCurrency!=stEmpCurrency){
	        flPOAmt = currencyConversion(flPOAmt, stTransCurrency, stEmpCurrency, 'T',stTranDate);        
	    }

	    if (parseFloat(flPOAmt) <= parseFloat(flPurchaseLimit)){
	        bNeedsPO = 'F';
	    }        
	    return bNeedsPO;
    }catch(error){
    	defineError('createNeedApprovals',error);
	    return bNeedsPO;
    }

}

/**
* Workflow Action   : NSTS |GAW - Global Remove Approver WA
*                   : customscript_nsts_gaw_rem_apprvrs_wa
* Returns integer record id 
* @param (null)
* @return integer or null 
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function removeApproverOnReject()
{
    var idPO = nlapiGetRecordId();
    //delete any rules associated with this po and delete them
    var reccurrentApprovers = searchApprovers(idPO,null);
    if (reccurrentApprovers){
        for (var i = 0; i < reccurrentApprovers.length; i++){
            nlapiDeleteRecord(REC_APPROVER_LIST, reccurrentApprovers[i].getId());
        }
    }
    return idPO;
}

/**
* Workflow Action   : NSTS | GAW - Global Match VB PO WA
*                   : customscript_nsts_gaw_vb_po_match_wa
* Returns boolean value on check if vb matches po
* @param (null)
* @return boolean
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function vendorBillMatchesPO()
{
	//Load Vendor Bill 
    var stVBId = nlapiGetRecordId();    
    var stPOId = nlapiGetFieldValue('podocnum');
    
    if (!stPOId){
        return false;
    }
    var recPO = nlapiLoadRecord('purchaseorder', stPOId);
    
    //Get corresponding item receipt record
    var intIRID = null;
    for (intCnt = 1; intCnt <= recPO.getLineItemCount('links'); intCnt++){
    	var type = recPO.getLineItemValue('links', 'type', intCnt);
    	if(type){
    		type = type.toLowerCase();
    		if(type == 'item receipt'){
    			intIRID =  recPO.getLineItemValue('links', 'id', intCnt);
    			break;
    		}
    	}
    }
    
    if(intIRID ==  null){
    	return false;
    }
    
    var recIR = nlapiLoadRecord('itemreceipt', intIRID);
    
    try{
        //Compare item, quantity and rate per item on each item list on VB, IR and PO
        var intVBItemLines = Number(nlapiGetLineItemCount('item'));
        var intPOItemLines = Number(recPO.getLineItemCount('item'));
        var intIRItemLines = Number(recIR.getLineItemCount('item'));
        
        //check if all lines are equal
        if(!(compareVBMatch(intVBItemLines,intPOItemLines,intIRItemLines)))
        {
        	return false;
        }	
        var boolMatch = true;    

        for (intCnt = 1; intCnt <= intVBItemLines; intCnt++){
        	//get vb line
            var intvbRate   = Number(nlapiGetLineItemValue('item', 'rate', intCnt)).toFixed(2);
            var intvbQty    = Number(nlapiGetLineItemValue('item', 'quantity', intCnt)).toFixed(2);
            var stvbItem   	= nlapiGetLineItemValue('item', 'item', intCnt);
            

            
            //get po order doc and order line
            var stpoOrderDoc = nlapiGetLineItemValue('item', 'orderdoc', intCnt);
            var stpoOrderLine = nlapiGetLineItemValue('item', 'orderline', intCnt);
            
            
            //get ir line
            var stirOrderLine = stpoOrderLine;
            
            if (stpoOrderDoc != null)
            {  
            	//load po item details
                var intpoRate = Number(recPO.getLineItemValue('item', 'rate', intCnt)).toFixed(2);
                var intpoQty  = Number(recPO.getLineItemValue('item', 'quantity', intCnt)).toFixed(2);
                var stpoItem = recPO.getLineItemValue('item', 'item', intCnt);
                
                
                //load ir item details
                var intirRate = Number(recIR.getLineItemValue('item', 'rate', intCnt)).toFixed(2);
                var intirQty  = Number(recIR.getLineItemValue('item', 'quantity', intCnt)).toFixed(2);
                var stirItem = recIR.getLineItemValue('item', 'item', intCnt);
                
                
                if(!isEmptyVariantVar(intirRate)){
					var floatRate = parseFloat(intirRate);
					if(floatRate == 0)
						intirRate = null;
				}
                
                if(isEmptyVariantVar(intirRate)){
					if (!(compareVBMatch(intvbQty, intpoQty , intirQty)&&
							compareVBMatch(stvbItem , stpoItem, stirItem))){

						boolMatch = false;
						break;
					}
				}else{									
					if (!(compareVBMatch(intvbRate, intpoRate, intirRate)&&
							compareVBMatch(intvbQty, intpoQty , intirQty)&&
							compareVBMatch(stvbItem , stpoItem, stirItem))){

						boolMatch = false;
						break;
					}
				}
            }
            else
            { 
            	boolMatch = false;
            	break; 
            }
        }
        
        if (!boolMatch){
        	return false;
        }
        
        //Compare account and amount on each expense list on VB, IR and PO
        var intVBExpLines = nlapiGetLineItemCount('expense');
      
        var intPOExpLines = recPO.getLineItemCount('expense');
        var intIRExpLines = recIR.getLineItemCount('expense');
        if(!(intVBExpLines <= 0 &&  intPOExpLines <= 0 && intIRExpLines <= 0)){

            //check if all lines are equal
            if(!(compareVBMatch(intVBExpLines, intPOExpLines,intIRExpLines))){
            	return false;
            }
       
            for (intCnt = 1; intCnt <= intVBExpLines; intCnt++){
            	//get vb line
                var stvbAct	= (nlapiGetLineItemValue('expense', 'account', intCnt));
                var intvbAmt    = Number(nlapiGetLineItemValue('expense', 'amount', intCnt)).toFixed(2);
                
                
                //get po  order line
                var stpoOrderLine = nlapiGetLineItemValue('expense', 'orderLine', intCnt);
                
                
                //get ir line
                var stirOrderLine = stpoOrderLine;
                
                if (stvbAct != null)
                {  
                	//load po item detailsvar x
                    var stpoAct = (recPO.getLineItemValue('expense', 'account', intCnt));
                    var intpoAmt  = Number(recPO.getLineItemValue('expense', 'amount', intCnt)).toFixed(2);
                    
                    //load ir item details
                    var stirAct = (recPO.getLineItemValue('expense', 'account', intCnt));
                    var intirAmt  = Number(recPO.getLineItemValue('expense', 'amount', intCnt)).toFixed(2);
                    
                    if (!(compareVBMatch(stvbAct , stpoAct , stirAct)&&
                    		compareVBMatch(intvbAmt , intpoAmt , intirAmt)&&
                    		compareVBMatch(stvbItem,stpoItem , stirItem))){
                    	boolMatch = false;
                        break;
                    }
                }
                else{ 
                	boolMatch = false;
                	break; 
                }
            }
            if (!boolMatch){
            	return false;
            }
        }
    }catch(error){
    	myMatch = false;
    	defineError('vendorBillMatchesPO',error);
    }
    
    return boolMatch;
}

/**
* Workflow Action   : NSTS | GAW - Get First Appr Role WA
*                   : customscript_nsts_gaw_get_appr_role_wa
* Returns role id of next approver role
* @param (null)
* @return integer or null
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function getFirstPOApproverRole(stRuleResult)
{
	try{
		var paramResult 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_get_role_param1');

		if(paramResult){
			var role = getRole(paramResult);
			if(role)
				return role;			
		}
		return null;
	}catch(error){
		defineError('getFirstPOApproverRole',error);
		return null;
	}
}
/**
* Workflow Action   : NSTS | GAW - Global Check If Last Seq WA
*                   : customscript_nsts_gaw_chck_last_seq_wa
* Returns checkbox type
* @param (null)
* @return string value of boolean
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function isLastApprovalSequence()
{
    var bisLastSequence = 'T';
	try{
		var result 	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_last_seq_param1');

		if(result){
			var objRecord = JSON.parse(result);
			if(objRecord){
				if(objRecord['approverList']){				
					var lastSequence = objRecord['approverList']['id'];
					if(lastSequence)
						lastSequence = parseInt(lastSequence);
					if(lastSequence)
						return 'F';	
				}
				if(objRecord['NoOfApprovers']){	
					return 'F';
				}
			}
		}
	}catch(error){
		defineError('isLastApprovalSequence',error);
	}
    return bisLastSequence;
}

/**
* Workflow Action   : NSTS | GAW - Set Empty Appr To Null WA
*                   : customscript_nsts_gaw_empty_apprvr_wa
* Sets next approver field to null if detected approver is empty
* @param (null)
* @return null or id of approver
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function setEmptyNextApproverNull()
{
    var recNew = nlapiGetNewRecord();    
    var stNextAppr = recNew.getFieldValue('nextapprover');
    
    if(stNextAppr==-1 || stNextAppr==null || stNextAppr==undefined){
        stNextAppr = null;
    }
    
    return stNextAppr;
}

/**
* Workflow Action   : NSTS | GAW - Set Historical On Reject WA
*                   : customscript_nsts_gaw_set_hist_rej_wa
* Add flag to approver list with rejected status
* @param (null)
* @return null 
* @type null
* @author Jaime Villafuerte
* @version 1.0
*/
function workflowAction_SetHistoricalOnReject()
{
    var idPO = nlapiGetRecordId();
    var sToday = nlapiDateToString(new Date(),'datetimetz');

    var arrcurrentAppFilter = [new nlobjSearchFilter(FLD_LIST_PO, null, 'is', nlapiGetRecordId()),
								new nlobjSearchFilter(FLD_LIST_HISTORICAL_REJECT,null,'anyof','F')];
    var arrCol = [new nlobjSearchColumn(FLD_LIST_APPROVER_DATE)];
    var arrcurrentApprovers = nlapiSearchRecord(REC_APPROVER_LIST, null, arrcurrentAppFilter,arrCol);

    if (arrcurrentApprovers){
        for (var i = 0; i < arrcurrentApprovers.length; i++){        
        	var date = arrcurrentApprovers[i].getValue(FLD_LIST_APPROVER_DATE);
        	if(!date)
        		nlapiSubmitField(REC_APPROVER_LIST, arrcurrentApprovers[i].getId(), [FLD_LIST_HISTORICAL_REJECT,FLD_LIST_APPROVER_DATE], ['T',sToday]);
        	else
        		nlapiSubmitField(REC_APPROVER_LIST, arrcurrentApprovers[i].getId(), [FLD_LIST_HISTORICAL_REJECT], ['T']);
        }
    }
}

/**
* Workflow Action   : NSTS | GAW - Check Within Tax Period WA
*                   : customscript_nsts_gaw_check_tax_pd_wa
* Check if transaction date within tax period
* @param (null)
* @return 'T' or 'F'
* @type null
* @author Rose Ann Ilagan
* @version 1.0
*/
function checkTaxPeriod(){
	try{
		//search tax periodname
		var arrcolumns = new Array();
		arrcolumns.push(new nlobjSearchColumn('internalid')); 
		arrcolumns.push(new nlobjSearchColumn('periodname'));
		arrcolumns.push(new nlobjSearchColumn('allclosed'));
		arrcolumns.push(new nlobjSearchColumn('enddate'));
		arrcolumns.push(new nlobjSearchColumn('startdate').setSort());

		var arrResults =nlapiSearchRecord('taxperiod', null, null, arrcolumns);

		var dateTrans = (nlapiGetFieldValue('trandate'));
		
		if(arrResults && dateTrans){
			var dateStartTaxPeriod = nlapiStringToDate(arrResults[0].getValue('startdate'));
			var dateEndTaxPeriod = nlapiStringToDate(arrResults[arrResults.length-1].getValue('enddate'));
			if(!dateEndTaxPeriod)
				dateEndTaxPeriod = nlapiStringToDate(arrResults[arrResults.length-1].getValue('startdate'));
			dateTrans = nlapiStringToDate(dateTrans);
			if((dateTrans >= dateStartTaxPeriod)&&(dateTrans <= dateEndTaxPeriod)){
				return 'F';
			}else{
				return 'T';
			}			
		}else{
			return 'F';
		}

	}catch(error){
		defineError('checkTaxPeriod',error);
		return 'F';
	}
}
/**
* Workflow Action   : NSTS | GAW - Approved Inline Edit WA
*                   : customscript_nsts_gaw_xedit_apprvd_wa
* Set the following fields on approved state when context is xedit
* @param (null)
* @return null
* @type null
* @author Rose Ann Ilagan
* @version 3.0
*/
function approvedInlineEdit(){
	try{
		var stPeriodParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_post_period');
		var rec = nlapiLoadRecord(stTransRecordType,nlapiGetRecordId());

		if(stTransRecordType == 'JOURNALENTRY' || stTransRecordType == 'INTERCOMPANYJOURNALENTRY'){
			rec.setFieldValue('approved','T');			
		}else if(stTransRecordType == 'SALESORDER'){
			rec.setFieldValue('orderstatus','B');
		}
		if(stPeriodParam)
			rec.setFieldValue('postingperiod', stPeriodParam);
		
		rec.setFieldValue(FLD_APPROVAL_STATUS,HC_STATUS_APPROVED);
		rec.setFieldValue(FLD_DELEGATE,'');
		rec.setFieldValue(FLD_REJECTION_REASON,'');
		rec.setFieldValues(FLD_NXT_APPRVRS,[]);
		rec.setFieldValue(FLD_NXT_ROLE_APPRVRS,'');
		rec.setFieldValue('nextapprover','');
		rec.setFieldValue(FLD_APPRVR_TYPE,'');
		nlapiSubmitRecord(rec,false,true)
		return true;
	    
	}catch(error){
		defineError('approvedInlineEdit',error);
	}
}
// **********************************************************************WORKFLOW ACTION SCRIPT FUNCTIONS - ENDS HERE**********************************************//


//***************************************************************************OTHER SUPPORTING FUNCTIONS - STARTS HERE**********************************************//
//***************************************************************************OTHER SUPPORTING FUNCTIONS - ENDS HERE************************************************//