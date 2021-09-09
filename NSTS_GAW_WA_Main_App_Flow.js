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
* 3.0     Edit    29 Dec 2017     Leigh Balboa                          Prevent Skipping if the Requestor is Approver
* 3.01    Edit    14 Sep 2018     Fede Garcia							Custom Logic for JE
*/

//**********************************************************************GLOBAL VARIABLE DECLARATION - STARTS HERE**********************************************//

var HC_Inactive_Approver 		= false;
var HC_Delegate_Inactive_Apprvr = null;
var HC_Admin 					= null;
var HC_SuperApprover 			= null;

//**********************************************************************GLOBAL VARIABLE DECLARATION - ENDS HERE*****************************************************//



//**********************************************************************WORKFLOW ACTION SCRIPT FUNCTIONS - STARTS HERE**********************************************//

/**
* Workflow Action   : NSTS | GAW - Global Rule App Flow WA
*                   : customscript_nsts_gaw_apprvl_flow_wa
* Returns details for the next approver
* @param (null)
* @return the object
* @type 
* @author:  Jaime Villafuerte
* @edited:  rilagan 03/12/2015
* @version 1.0
*/
function processApprovalRuleMain()
{
	 var recPO = null;
	 var recTrans = new Object();
		 recPO = nlapiGetNewRecord();
		//Get record details
		recTrans.id  				= nlapiGetRecordId();    
		recTrans.type				= stTransRecordType;    
		recTrans.amount          	= parseFloat(recPO.getFieldValue(FLD_TOTAL));
		recTrans.creator 			= nlapiGetFieldValue(FLD_CREATED_BY);
		recTrans.employee 			= nlapiGetFieldValue('employee');
		recTrans.requestor			= nlapiGetFieldValue(FLD_TRAN_REQUESTOR);
		recTrans.entity 			= nlapiGetFieldValue('entity');
		recTrans.tranid				= nlapiGetFieldValue('tranid');
		recTrans.transno			= nlapiGetFieldValue('transactionnumber');
		recTrans.currency			= nlapiGetFieldValue('currency');
		recTrans.trandate			= nlapiGetFieldValue('trandate');
		recTrans.department			= nlapiGetFieldValue('department');
		recTrans.nextapprovers		= nlapiGetFieldValues(FLD_NXT_APPRVRS);
		recTrans.approverType		= nlapiGetFieldValue(FLD_APPRVR_TYPE);
		recTrans.roleApprover		= nlapiGetFieldValue(FLD_NXT_ROLE_APPRVRS);
		recTrans.oneworld 			= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_is_one_world'); //'T';
		var stOrigAmt				= nlapiGetFieldValue(FLD_TRANS_ORG_AMT);
		if(recTrans.oneworld == 'T'){
			recTrans.subsidiary       	= recPO.getFieldValue('subsidiary');
			if(!recTrans.subsidiary)
				recTrans.subsidiary			= nlapiGetFieldValue('subsidiary');
		}
		
		//Script parameters
		recTrans.rundelegates    	= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_run_delegate'); 
		HC_Admin        	 		= nlapiGetContext().getPreference(SPARAM_EMAIL_SENDER);
		HC_SuperApprover	 		= nlapiGetContext().getPreference(SPARAM_SUPER_APPROVER);
		
		//Updated Next Approvers, this is for xedit only when nlapiGetNewRecord is null
		var stUpdNextApprovers 		= nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_nxt_apprvrs_xedit'); 
		

		//Set Amount
		if(recTrans.amount && !stOrigAmt){
			nlapiGetNewRecord().setFieldValue(FLD_TRANS_ORG_AMT,recTrans.amount);
		}
		
		//XEDIT: This code will only be executed on xedit context
		if(!recTrans.amount || !recTrans.subsidiary || !recTrans.creator) {
			var rec = nlapiLoadRecord(stTransRecordType, recTrans.id);
			if(recTrans.oneworld == 'T')
				recTrans.subsidiary 		= rec.getFieldValue('subsidiary');
			recTrans.creator		 	= rec.getFieldValue(FLD_CREATED_BY);
			recTrans.amount				= rec.getFieldValue(FLD_TOTAL);
			recTrans.tranid 			= rec.getFieldValue('tranid');
			recTrans.transno 			= rec.getFieldValue('transactionnumber');
			recTrans.currency 			= rec.getFieldValue('currency');
			recTrans.department 		= rec.getFieldValue('department');
			recTrans.trandate 			= rec.getFieldValue('trandate');
			stOrigAmt					= rec.getFieldValue(FLD_TRANS_ORG_AMT);
			recTrans.amount				= rec.getFieldValue(FLD_TOTAL)
			
			
			if(!FLD_EMPLOYEE && FLD_EMPLOYEE_VAL){
				FLD_EMPLOYEE = rec.getFieldValue(FLD_EMPLOYEE_VAL);
			}
			//Set Amount
			if(recTrans.amount && !stOrigAmt){
				nlapiGetNewRecord().setFieldValue(FLD_TRANS_ORG_AMT,rec.getFieldValue(FLD_TOTAL));
			}
			if(!stUpdNextApprovers)
				recTrans.nextapprovers		= getMultiApproverList(rec.getFieldValues(FLD_NXT_APPRVRS));
			else
				recTrans.nextapprovers		= JSON.parse(stUpdNextApprovers);
			recTrans.approverType		=  rec.getFieldValue(FLD_APPRVR_TYPE);
			recTrans.roleApprover		=  rec.getFieldValue(FLD_NXT_ROLE_APPRVRS);						
		}
	//Initialize variables    
	var stBaseCurrency 		= null;    
	var idemployee       	= null;
	var stroleResult 	   	= null;
	var recApprover			= null;    
	var intLastSeq       	= null;
	var bLastInHierarchy 	= false;
	var bParallelLastInHierarchy 	= false;
	var intCurrRule      	= null;
	var bParallelApprovers	= false;
	var origLastSeq			= null;
	
	//get the last sequence that is processed
	var arrAppList       = getLastSequenceCreated();
	var lastApproverList = null;
	try{
		//If there is a previous approver list, get the last approver list info
		if (arrAppList){
			intLastSeq       = arrAppList[0].getValue(FLD_LIST_RULE_SEQ);
			origLastSeq		 = intLastSeq;
			intLastSeq       = Math.floor(intLastSeq);        
			bLastInHierarchy = (arrAppList[0].getValue(FLD_LIST_LAST_H)=='T') ? true : false;
			bParallelLastInHierarchy = (arrAppList[0].getValue(FLD_LIST_LAST_H)=='T') ? true : false;
			intCurrRule      = arrAppList[0].getValue(FLD_LIST_RULE_NAME);  
			lastApproverList = new Object();
			lastApproverList = arrAppList[0].getId();
		}

		//FG 2018-09-14: START	    
		//Get all approval rules for the current rule group
        nlapiLogExecution('DEBUG', 'searchApprovalRules', 'stTransRecordType: ' + stTransRecordType + 'recTrans.subsidiary: ' + recTrans.subsidiary + 'intLastSeq: ' + intLastSeq + 'recTrans.id  ' + recTrans.id  );
        var isCreatedFromPO = false;
        var isSinglePOApproval = false;
      nlapiLogExecution('DEBUG','stTransRecordType1',stTransRecordType);
        if(stTransRecordType == 'VENDORBILL'){
            nlapiLogExecution('DEBUG','isvendorbill','isvendorbill');
            //isCreatedFromPO = nlapiGetFieldValue('podocnum');
            var vbObj = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
            isCreatedFromPO = vbObj.getLineItemValue('purchaseorders','id',1);
        }
        if(stTransRecordType == 'PURCHASEORDER'){
            nlapiLogExecution('DEBUG','ispurchaseorder','ispurchaseorder');
            var poObj = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
            isSinglePOApproval = poObj.getFieldValue('custbody_cwgp_singleapproval');
            if(isSinglePOApproval == 'F'){
              isSinglePOApproval = false;
            }
          else if(isSinglePOApproval == 'T'){
            isSinglePOApproval = true;
          }
             nlapiLogExecution('DEBUG','isSinglePOApproval',isSinglePOApproval)
        }
		var arrApprovalrules =  searchApprovalRules(stTransRecordType, recTrans.subsidiary, intLastSeq, isCreatedFromPO, isSinglePOApproval);
          nlapiLogExecution('DEBUG', 'arrApprovalrules: ', + JSON.stringify(arrApprovalrules));
          nlapiLogExecution('DEBUG', 'arrApprovalrules: ', + arrApprovalrules);
		/*if(recTrans.type == 'JOURNALENTRY'){
			var _JEType_approval_required = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsts_gaw_jetype_appr_req');
			var stJournalEntryType = nlapiGetFieldValue('custbody_blend_je_type');
			nlapiLogExecution('debug', 'processApprovalRuleMain', 'param ' + _JEType_approval_required + ' - ' + stJournalEntryType);
			if(isEmpty(stJournalEntryType) || stJournalEntryType == _JEType_approval_required){
				var stRole = nlapiGetContext().getRole();
				//var arrApprovalrules =  searchApprovalRulesCustom(stTransRecordType, recTrans.subsidiary, intLastSeq, stRole, recTrans.requestor);
				var arrApprovalrules =  searchApprovalRulesCustom(stTransRecordType, recTrans.subsidiary, intLastSeq, stRole, recTrans.creator);
				nlapiLogExecution('debug', 'processApprovalRuleMain', 'arrApprovalrules ' + arrApprovalrules);
			}else{
				var arrApprovalrules = null;
			}
		}else{
			var arrApprovalrules =  searchApprovalRules(stTransRecordType, recTrans.subsidiary, intLastSeq);   
		}*/
		//FG 2018-09-14: END
		
		//Return null if no approval rules
		if (!arrApprovalrules) 
			return null;
	   
		var stPrevApprTypeRuleIdx = 0;
		var stCurrApprTypeRuleIdx = 1;
		var stCurrApprType = null;
		var stPrevApprType = arrApprovalrules[stPrevApprTypeRuleIdx].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
		
		if(intLastSeq){
			stCurrApprType = (arrApprovalrules[stCurrApprTypeRuleIdx]!= undefined || 
							  arrApprovalrules[stCurrApprTypeRuleIdx]!=null) ? arrApprovalrules[stCurrApprTypeRuleIdx].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP) : null;
		}
		
		var startIdx = (!intLastSeq) ? stPrevApprTypeRuleIdx : stCurrApprTypeRuleIdx;		
		
		stBaseCurrency = arrApprovalrules[0].getValue(FLD_APP_RULE_GRP_DEF_CURR);
		
		//Get Company base currency if approval rule group currency not set
		if (!stBaseCurrency){
			var compRec = nlapiLoadConfiguration("companyinformation");
			stBaseCurrency = compRec.getFieldValue("basecurrency");
			recTrans.basecurrency = stBaseCurrency;
		}
		
		for (var ruleIndex = startIdx; ruleIndex <= arrApprovalrules.length; ruleIndex++){			
			if (intLastSeq){
				var stCurrApprType = (arrApprovalrules[ruleIndex]!= undefined || 
				arrApprovalrules[ruleIndex]!=null) ? arrApprovalrules[ruleIndex].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP) : null;		    	
			}
			//initialize role approval type and employee approval type results to null
			stroleResult = null;
			idemployee = null;
			
			var objDetails = {};
				objDetails.ruleSequence = 0;
				objDetails.useTransDate = 'F';

			//This condition will check if the current rule is in employee hierarchy
			if(((stCurrApprType==HC_APPRVL_TYPE_EMP_H && arrAppList) || (stPrevApprType==HC_APPRVL_TYPE_EMP_H && !bLastInHierarchy))){        	
				if(!((recTrans.approverType == HC_APPRVL_TYPE_LIST_APPRVRS || recTrans.approverType == HC_APPRVL_TYPE_LINE_APPRVRS) && checkMultiSelectLength(recTrans.nextapprovers) > 0))
				{
					nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
					var index = (stCurrApprType==HC_APPRVL_TYPE_EMP_H) ? ruleIndex : stPrevApprTypeRuleIdx;
					
					//Get the next rule
					objDetails.approverType    = arrApprovalrules[index].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
					objDetails.approverTypeTxt = arrApprovalrules[index].getText(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
					objDetails.ruleLimit       = arrApprovalrules[index].getValue(FLD_RULES_MINAMT, FLD_RULES_RULE_GRP);
					objDetails.ruleSequence    = arrApprovalrules[index].getValue(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP);
					objDetails.idApproverRole  = arrApprovalrules[index].getValue(FLD_RULES_ROLETYPE, FLD_RULES_RULE_GRP);
					objDetails.approverEmail   = arrApprovalrules[index].getValue(FLD_RULES_ROLE_EMAIL, FLD_RULES_RULE_GRP);
					objDetails.defaultCurrency = arrApprovalrules[index].getValue(FLD_APP_RULE_GRP_DEF_CURR);        
					objDetails.useTransDate    = arrApprovalrules[index].getValue(FLD_APP_RULE_GRP_USE_EXC_RATE);
					objDetails.baseCurrency    = stBaseCurrency;
					
					if (intCurrRule==HC_APPRVL_TYPE_EMP_H){
						var stOrigApprover      = arrAppList[stPrevApprTypeRuleIdx].getValue(FLD_LIST_ORIG_APPRVR);
						objDetails.idApprover   = (stOrigApprover) ? stOrigApprover : arrAppList[stPrevApprTypeRuleIdx].getValue(FLD_LIST_TRAN_APPROVER);
						objDetails.ruleSequence = arrAppList[stPrevApprTypeRuleIdx].getValue(FLD_LIST_RULE_SEQ);
						objDetails.appListId    = arrAppList[stPrevApprTypeRuleIdx].getId();
					}
					else{
						objDetails.idApprover = null;
					}
					//Skip next rule if approver/delegate is creator/requestor
					var inthierarchyIdx = 1;
					recApprover = hierarchyApprovalType(inthierarchyIdx,recTrans,objDetails);   
					if(recApprover){
						idemployee 			= recApprover['id'];
						var stOrigApprover 	= recApprover.origApprover;
						if(idemployee){						
							while(checkCreatorIsApprover(recTrans,idemployee)){
								inthierarchyIdx++;
								if(stOrigApprover)
									objDetails.idApprover = stOrigApprover;
								else
									objDetails.idApprover = idemployee;
								recApprover = hierarchyApprovalType(inthierarchyIdx,recTrans,objDetails);  
								if(recApprover){
									idemployee 		= recApprover['id'];
									stOrigApprover 	= recApprover.origApprover;
									if(!idemployee)
										break;
								}else{
									break;
								}
							}
						}
					}
				}
			}//CHECK IF PARALLEL LIST APPROVAL
			if(!idemployee && !HC_Inactive_Approver){
				if(!((recTrans.approverType == HC_APPRVL_TYPE_LINE_APPRVRS) && checkMultiSelectLength(recTrans.nextapprovers) > 0))
				{
					recApprover = parallelListApprovalType(bParallelLastInHierarchy,origLastSeq,ruleIndex,recTrans,arrApprovalrules);  	
					var arrApprovers = recApprover['arrApprovers'];
					var firstSequence = recApprover['firstSequence'];
					if(recApprover){
						if(recApprover['NoOfApprovers']){
							if(arrApprovers.length > 0)
								arrApprovers = arrApprovers.filter(onlyUnique);
							nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,arrApprovers);
							nlapiGetNewRecord().setFieldValue(FLD_APPRVR_TYPE,HC_APPRVL_TYPE_LIST_APPRVRS);
							nlapiGetNewRecord().setFieldValue(FLD_NXT_ROLE_APPRVRS,null);
							if(arrApprovers.length > 0)
								arrApprovers = arrApprovers.filter(onlyUnique);
							recTrans.nextapprovers		= arrApprovers;
							recTrans.approverType		= HC_APPRVL_TYPE_LIST_APPRVRS;
							recTrans.roleApprover		= null;
							var intApprovers = recApprover['NoOfApprovers'];
							recApprover = new Object();
							recApprover['NoOfApprovers'] = intApprovers;
							recApprover['type']			= HC_APPRVL_TYPE_LIST_APPRVRS;
							recApprover['firstSequence']			= firstSequence;
							break;
						}
					}
				}
			}
			//CHECK IF PARALLEL LINE APPROVAL
			if(!idemployee && !HC_Inactive_Approver){
				if(!((recTrans.approverType == HC_APPRVL_TYPE_LIST_APPRVRS) && checkMultiSelectLength(recTrans.nextapprovers) > 0))
				{
					recApprover = parallelLineApprovalType(bParallelLastInHierarchy,origLastSeq,ruleIndex,recTrans,arrApprovalrules);  	
					var arrApprovers 	= recApprover['arrApprovers'];
					var lineApprover 	= recApprover['lineApprover'];
					var firstSequence 	= recApprover['firstSequence'];
					var sublist 		= recApprover['sublist'];
					//IF approvers are found, set object details
					if(recApprover){
						if(recApprover['NoOfApprovers']){
							if(arrApprovers.length > 0)
								arrApprovers = arrApprovers.filter(onlyUnique);
							nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,arrApprovers);
							nlapiGetNewRecord().setFieldValue(FLD_APPRVR_TYPE,HC_APPRVL_TYPE_LINE_APPRVRS);
							nlapiGetNewRecord().setFieldValue(FLD_NXT_ROLE_APPRVRS,null);
							recTrans.nextapprovers		= arrApprovers;
							recTrans.approverType		= HC_APPRVL_TYPE_LINE_APPRVRS;
							recTrans.roleApprover		= null;
							var intApprovers = recApprover['NoOfApprovers'];
							recApprover = new Object();
							recApprover['NoOfApprovers'] 	= intApprovers;
							recApprover['type']				= HC_APPRVL_TYPE_LINE_APPRVRS;
							recApprover['lineApprover'] 	= lineApprover;
							recApprover['sublist']			= sublist;
							recApprover['firstSequence']	= firstSequence;
							break;
						}else{
							recTrans.nextapprovers = [];
						}
					}else{
						recTrans.nextapprovers = [];
					}
				}
			}
			//If rule is not equal to employee hierarchy/parallel approvals
			if(!idemployee && !HC_Inactive_Approver){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
				var index = (intLastSeq) ? ruleIndex : stPrevApprTypeRuleIdx;
				//check the next rule if null, most probably that this is the last rule
				if(arrApprovalrules[index]==undefined || arrApprovalrules[index]==null){
					//return null;
					recApprover = new Object();
					recApprover['lastapproverlist'] = JSON.stringify(lastApproverList);
					recApprover['trans'] 			= JSON.stringify(recTrans);
					var result = JSON.stringify(recApprover);
					nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,[]);
					return result;
				}
				
				//get the next rule
				objDetails.idApprover      = arrApprovalrules[index].getValue(FLD_RULES_APPRVR,FLD_RULES_RULE_GRP);
				objDetails.approverType    = arrApprovalrules[index].getValue(FLD_RULES_APPRVR_TYPE,FLD_RULES_RULE_GRP);
				objDetails.approverTypeTxt = arrApprovalrules[index].getText (FLD_RULES_APPRVR_TYPE,FLD_RULES_RULE_GRP);
				objDetails.ruleLimit       = arrApprovalrules[index].getValue(FLD_RULES_MINAMT,FLD_RULES_RULE_GRP);
				objDetails.ruleSequence    = arrApprovalrules[index].getValue(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP);
				objDetails.idApproverRole  = arrApprovalrules[index].getValue(FLD_RULES_ROLETYPE,FLD_RULES_RULE_GRP);
				objDetails.approverEmail   = arrApprovalrules[index].getValue(FLD_RULES_ROLE_EMAIL,FLD_RULES_RULE_GRP);
				objDetails.defaultCurrency = arrApprovalrules[index].getValue(FLD_APP_RULE_GRP_DEF_CURR);        
				objDetails.useTransDate    = arrApprovalrules[index].getValue(FLD_APP_RULE_GRP_USE_EXC_RATE);
				objDetails.baseCurrency    = stBaseCurrency;
				objDetails.apprRecType     = arrApprovalrules[index].getValue(FLD_RULES_APPRVR_REC_TYPE,FLD_RULES_RULE_GRP);        
				objDetails.apprRecFld      = arrApprovalrules[index].getValue(FLD_RULES_APPRVR_REC_FLD,FLD_RULES_RULE_GRP);
				objDetails.tranFldId       = arrApprovalrules[index].getValue(FLD_RULES_TRANS_MAPPED_FLD_ID,FLD_RULES_RULE_GRP);
				// nlapiLogExecution('DEBUG','workflowAction_ProcessApprovalRuleMain','objDetails.apprRecType='  + objDetails.apprRecType  + 
				//                                                                   ' objDetails.apprRecFld='   + objDetails.apprRecFld   + 
				//                                                                   ' objDetails.tranFldId='    + objDetails.tranFldId);	            

				if( objDetails.ruleLimit)
					 objDetails.ruleLimit = parseFloat(objDetails.ruleLimit);
				else
					 objDetails.ruleLimit = 0;
				if(recTrans.amount)
					recTrans.amount = parseFloat(recTrans.amount);
				else
					recTrans.amount = 0;

				recApprover = [];
				
				switch(objDetails.approverType)
				{
					case HC_APPRVL_TYPE_DEPT:
						recApprover = departmentApprovalType(recTrans,objDetails);
						break;
					case HC_APPRVL_TYPE_SUPERVISOR:
						objDetails.idApprover = FLD_EMPLOYEE;
						recApprover = supervisorApprovalType(recTrans,objDetails);
						break;
					case HC_APPRVL_TYPE_EMPLOYEE:
						recApprover = employeeApprovalType(recTrans,objDetails);
						break;
					case HC_APPRVL_TYPE_ROLE:
						recApprover = roleApprovalType(recTrans,objDetails);   
						break;
					case HC_APPRVL_TYPE_DYNAMIC:
						recApprover = dynamicRuleApprovalType(recTrans,objDetails);
					break;
				}
			}
			//If inactive approver is found from the above rules, must break from the loop
			if(HC_Inactive_Approver){
				break;
			}
			if(recApprover){
				idemployee = recApprover['id'];
				if(!idemployee){
					idemployee = null;
					stroleResult = recApprover['roleId'];
				}else{
					 recTrans['nextapprovers'] =  [idemployee];					
				}
			}else{
				idemployee = null;
				stroleResult = null;
			}
			if((idemployee)||(stroleResult)){
				if(stroleResult){
					 recApprover['type'] = HC_APPRVL_TYPE_ROLE;
					 recTrans['approverType'] =  HC_APPRVL_TYPE_ROLE;
					 recTrans['roleApprover'] =  stroleResult;
					 recTrans['nextapprovers'] =  null;
					nlapiGetNewRecord().setFieldValue(FLD_NXT_ROLE_APPRVRS,stroleResult);
					break;
				}
				//lbalboa edited 12282017
				// var stCreatedFrom = '';
				// if(nlapiGetRecordType() == 'vendorbill')
				// {
				// 	stCreatedFrom = nlapiLookupField('vendorbill', nlapiGetRecordId(), 'createdfrom');
				// }
				
				// nlapiLogExecution('ERROR', 'TEST', 'stCreatedFrom =' + stCreatedFrom);
				// nlapiLogExecution('ERROR', 'TEST', 'nlapiGetRecordType =' + nlapiGetRecordType() + ' ID :' + nlapiGetRecordId());
				//Check if idemployee result is equal to creator
				// if(checkCreatorIsApprover(recTrans,idemployee)){
				// 	if(!intLastSeq){
				// 		stPrevApprTypeRuleIdx++;
				// 	}
				// }else{
					nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,[idemployee]);
					nlapiGetNewRecord().setFieldValue('nextapprover',idemployee);
					nlapiGetNewRecord().setFieldValue(FLD_NXT_ROLE_APPRVRS,null);
					break;
				 // } 
				 //lbalboa edited 12282017
			}else{
				//If first approval list, adjust/increment stPrevApprTypeRuleIdx to start on next sequence
				if(!intLastSeq){
					stPrevApprTypeRuleIdx++;
				}
			}
			if (arrApprovalrules[stPrevApprTypeRuleIdx] && arrApprovalrules[stPrevApprTypeRuleIdx]!=undefined) {
			   stPrevApprType = arrApprovalrules[stPrevApprTypeRuleIdx].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			}else
			   stPrevApprType = null;
		}
		
		if (HC_Inactive_Approver){

			recApprover['INACTIVEAPPROVERFOUND'] = 'T';
			if(HC_Delegate_Inactive_Apprvr){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
				
			}
			recApprover['type'] = null;
			recTrans['approverType'] =  null;
			recTrans['roleApprover'] =  null;
			recTrans['nextapprovers'] =  null;
			recApprover['id'] = null;
			nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,[]);
			//return null;
		}
		recApprover['lastapproverlist'] = lastApproverList;
		recApprover['trans'] 			= JSON.stringify(recTrans);
		
		if(!recApprover['type'])
			recApprover['type'] 			= objDetails.approverType;
		
		var result = JSON.stringify(recApprover);
		
		return result;
	}catch(error){
		defineError('workflowAction_CreateRulePOApproval',error);
		return null;
	}
}

// **********************************************************************WORKFLOW ACTION SCRIPT FUNCTIONS - ENDS HERE**********************************************//


//***************************************************************************OTHER SUPPORTING FUNCTIONS - STARTS HERE**********************************************//

/**
* Rule Department approver, returns string id of next approver
* @param (object record, object approval rule details)
* @return object details of next approver
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function departmentApprovalType(record,objDetails)
{
	try{
		var idApprover 			= null;        
		var recIdApprover 		= new Object();
		var approvalListRes		= new Object();
		var amount				= record['amount'];
		if (record['department']){    	    	
			var stTransCurrency = record['currency']
			//Convert amount if different currency from the rule group
			if (amount!=0 && 
				objDetails.ruleLimit!=0 &&         
				objDetails.baseCurrency && 
				stTransCurrency && 
				stTransCurrency!=objDetails.baseCurrency){
				amount = currencyConversion(amount, stTransCurrency, objDetails.baseCurrency, objDetails.useTransDate,record['trandate']);
			}
			//Check if transaction amount is within approval rule limit
			if (amount >= objDetails.ruleLimit){ //&& isInactive=='F'){
				idApprover = nlapiLookupField('department',record['department'],FLD_DEPT_APPRVR);
				
				if (!idApprover){
					return null;
				}
				
				var origApprover = idApprover;
				
				recIdApprover 				= new Object();
				recIdApprover['fields'] 	= getApproverDetails(idApprover);
				recIdApprover['id'] 		= idApprover;
				approvalListRes['origApprover_fields'] = recIdApprover['fields'];
				
				//Check for the approver delegate if delegation preference is on	
				if (record['rundelegates'] == 'T'){
					var recDelegate = delegateEmployee(recIdApprover);	    	
					if(recDelegate)
						recIdApprover = recDelegate;
				}
				
				approvalListRes['approver']		= recIdApprover['id'];
				approvalListRes['fields']		= recIdApprover['fields'];
				approvalListRes['origApprover']	= origApprover;
				approvalListRes['sequence']		= objDetails.ruleSequence;
				
				//Create approver list
				var recList = createApproverListRecord(record,objDetails,approvalListRes);	        	
				recIdApprover['approverList'] 	= recList;
				
				//If delegated, check the delegated field
				if (origApprover != recIdApprover['id']){
					nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
				}
				else{
					nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
				}  
			}
		}    
		return recIdApprover;
	}catch(error){
		defineError('departmentApprovalType',error);
		return null;
	}
}


/**
* Supervisor approver, returns string id of next approver
* @param (object record, object approval rule details)
* @return object details of next approver
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function supervisorApprovalType(record,objDetails)
{
	try{

		var approvalListRes		= new Object();
		var arrEmpRec    		= nlapiLookupField('employee',objDetails.idApprover,[FLD_TRAN_APPROVER,'supervisor']);            
		var idApprover   		= arrEmpRec['supervisor']; 
		var origApprover 		= idApprover;
		var recIdApprover 		= new Object();
		var amount				= record['amount'];
		if(!objDetails.idApprover)
			return null;
		
		//If both supervisor and transaction approver fields are blank then return as approve for hierarchy type
		if (!idApprover){
			return null;
		}
		var stTransCurrency = record['currency']
		//Convert amount if different currency from the rule group
		if (amount!=0 && 
			objDetails.ruleLimit!=0 &&         
			objDetails.baseCurrency && 
			stTransCurrency && 
			stTransCurrency!=objDetails.baseCurrency){
			amount = currencyConversion(amount, stTransCurrency, objDetails.baseCurrency, objDetails.useTransDate,record['trandate']);
		}
		//Check if transaction amount is within approval rule limit
		if (amount >= objDetails.ruleLimit){
			recIdApprover 							= new Object();
			recIdApprover['fields'] 				= getApproverDetails(idApprover);
			recIdApprover['id'] 					= idApprover;
			approvalListRes['origApprover_fields'] 	= recIdApprover['fields'];
			
			if (record['rundelegates'] == 'T'){
				var recDelegate = delegateEmployee(recIdApprover);
				if(recDelegate)
					recIdApprover = recDelegate;
			}

			approvalListRes['approver']				= recIdApprover['id'];
			approvalListRes['fields']				= recIdApprover['fields'];
			approvalListRes['origApprover']			= origApprover;
			approvalListRes['sequence']				= objDetails.ruleSequence;
			
			//Create approver list
			var recList = createApproverListRecord(record,objDetails,approvalListRes);
			recIdApprover['approverList'] 	= recList; 
		
			//If delegated, check the delegated field
			if (origApprover != recIdApprover['id']){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
			}
			else{
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
			}
		}else{
			return null;
		}
		return recIdApprover;
	}catch(error){
		defineError('supervisorApprovalType',error);
		return null;
	}

}


/**
* Employee approver, returns string id of next approver
* @param (object record, object approval rule details)
* @return object details of next approver
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function employeeApprovalType(record,objDetails)
{        

	try{
		var stTransCurrency = record['currency'];
		var amount			= record['amount'];
		//Convert amount if different currency from the rule group
		if (amount!=0 && 
			objDetails.ruleLimit!=0 &&         
			objDetails.baseCurrency && 
			stTransCurrency && 
			stTransCurrency!=objDetails.baseCurrency){
			amount = currencyConversion(amount, stTransCurrency, objDetails.baseCurrency, objDetails.useTransDate,record['trandate']);
		}
		
		
		var origApprover 							= objDetails.idApprover;
		var approvalListRes							= new Object();	    	
		var recIdApprover 							= new Object();
			recIdApprover['fields'] 				= getApproverDetails(origApprover);
			recIdApprover['id'] 					= origApprover;
			approvalListRes['origApprover_fields'] 	= recIdApprover['fields'];
		
		if (!origApprover){
			return null;
		}
		
		
		if (amount >= objDetails.ruleLimit){
			//Check for the approver delegate if delegation preference is on	
			if (record['rundelegates'] == 'T'){				
				var recDelegate = delegateEmployee(recIdApprover);
				if(recDelegate){
					recIdApprover = recDelegate;
					objDetails.idApprover = recIdApprover['id'];
				}
			}
			approvalListRes['approver']				= recIdApprover['id'];
			approvalListRes['fields']				= recIdApprover['fields'];
			approvalListRes['origApprover']			= origApprover;
			approvalListRes['sequence']				= objDetails.ruleSequence;
			
			//Create approver list
			var recList = createApproverListRecord(record,objDetails,approvalListRes);
			recIdApprover['approverList'] 	= recList; 
			
			//If delegated, check the delegated field
			if (origApprover != objDetails.idApprover){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
			}
			else{
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
			}
		}else{
			return null;
		}
		return recIdApprover;
	}catch(error){
		defineError('employeeApprovalType err',error);
		return null;
	}

}
/**
* Role approver, lets any employee of with the corresponding role on the list approve/reject the transaction
* @param (object record, object approval rule details)
* @return object details of next approver
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function roleApprovalType(record,objDetails)
{
	try{
		var recIdApprover = new Object();
		var amount = record['amount'];
		
		var stTransCurrency = record['currency'];

		nlapiLogExecution('error','role approval', 'amount='+amount+' objDetails.ruleLimit='+objDetails.ruleLimit+ ' objDetails.baseCurrency='+objDetails.baseCurrency+' stTransCurrency='+stTransCurrency);
		if (amount!=0 && 
			objDetails.ruleLimit!=0 &&         
			objDetails.baseCurrency && 
			stTransCurrency && 
			stTransCurrency!=objDetails.baseCurrency){
			amount = currencyConversion(amount, stTransCurrency, objDetails.baseCurrency, objDetails.useTransDate,record['trandate']);
		}

		nlapiLogExecution('error','role approval', 'amount='+amount+' objDetails.ruleLimit='+objDetails.ruleLimit);
		if (amount >= objDetails.ruleLimit){
			var approvalListRes				= new Object();
				approvalListRes['sequence']	= objDetails.ruleSequence;
			
			var recList						= createApproverListRecord(record,objDetails,approvalListRes);
			recIdApprover['approverList'] 	= recList;  
			recIdApprover['roleId']			= objDetails.idApproverRole;
			nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');        
		}else{
			return null;
		}
		return recIdApprover;
	}catch(error){
		defineError(error);
	}
}
/**
* Parallel Approval Line of Approvers
* @param
* @return object
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function parallelLineApprovalType(bLastHierarchy,intLastSeq,curIdx,record,arrApprovalRules)
{
	var recIdApprover 	= new Object();
	var stUser = nlapiGetContext().getUser();
	try{
		var objDetails		= {};
		var amount 			= record['amount'];
		var stNextApprvrs 	= record['nextapprovers'];		
		var stTransCurrency = record['currency'];
		var stBaseCurrency	= null;
		var bProcessed		= false;

		//approval rule on specific index details
		try{

			objDetails.ruleLimit       	= arrApprovalRules[curIdx].getValue(FLD_RULES_MINAMT, FLD_RULES_RULE_GRP);
			objDetails.approverType    	= arrApprovalRules[curIdx].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			objDetails.approverTypeTxt 	= arrApprovalRules[curIdx].getText(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			stBaseCurrency				= arrApprovalRules[curIdx].getValue(FLD_APP_RULE_GRP_DEF_CURR);           
			objDetails.useTransDate    	= arrApprovalRules[curIdx].getValue(FLD_APP_RULE_GRP_USE_EXC_RATE);
			objDetails.ruleSequence    	= arrApprovalRules[curIdx].getValue(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP);
			objDetails.approvers    	= arrApprovalRules[curIdx].getValue(FLD_RULES_MULT_EMP, FLD_RULES_RULE_GRP);
			objDetails.item    			= arrApprovalRules[curIdx].getValue(FLD_RULES_SUBLIST, FLD_RULES_RULE_GRP);
			objDetails.lineApprover    	= arrApprovalRules[curIdx].getValue(FLD_RULES_LINE_APPROVER, FLD_RULES_RULE_GRP);
		}catch(error){
			objDetails.ruleLimit       	= null;
			objDetails.approverType    	= null;
			objDetails.approverTypeTxt 	= null;
			stBaseCurrency				= null;
			objDetails.useTransDate    	= null;
			objDetails.ruleSequence    	= null;
			objDetails.approvers    	= null;
			objDetails.item    			= null;
			objDetails.lineApprover    	= null;
		}
		
		var sequence = null;
		if(!intLastSeq && objDetails.approverType == HC_APPRVL_TYPE_LINE_APPRVRS){//If first sequence
			stNextApprvrs	= getLineApprovers(objDetails.item,objDetails.lineApprover);
			nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,[]);	
			nlapiGetNewRecord().setFieldValue(FLD_DELEGATE,'F');	
			sequence 				= parseFloat(objDetails.ruleSequence);
			recIdApprover['lineApprover'] = objDetails.lineApprover;
			recIdApprover['sublist'] = objDetails.item;
			recIdApprover['firstSequence'] = true;
		}else{
			//get previous created list
			var stPrevApprvrType	= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			var stPrevApprvrSeq		= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP);
			var stPrevApprvrs		= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_MULT_EMP, FLD_RULES_RULE_GRP);
			var stCurrApprvrType	= objDetails.approverType;
			if(stPrevApprvrType != HC_APPRVL_TYPE_LINE_APPRVRS && stCurrApprvrType != HC_APPRVL_TYPE_LINE_APPRVRS)
				return recIdApprover;
			if(stPrevApprvrType == HC_APPRVL_TYPE_LINE_APPRVRS && !bLastHierarchy && checkMultiSelectLength(stNextApprvrs) != 0){
				recIdApprover['NoOfApprovers'] = checkMultiSelectLength(stNextApprvrs);
				recIdApprover['arrApprovers'] = stNextApprvrs;

				recIdApprover['lineApprover'] = arrApprovalRules[curIdx - 1].getValue(FLD_RULES_LINE_APPROVER, FLD_RULES_RULE_GRP);
				recIdApprover['sublist'] = arrApprovalRules[curIdx - 1].getValue(FLD_RULES_SUBLIST, FLD_RULES_RULE_GRP);

			}else if(stCurrApprvrType == HC_APPRVL_TYPE_LINE_APPRVRS){

				stNextApprvrs	= getLineApprovers(objDetails.item,objDetails.lineApprover);
				sequence 						= parseFloat(objDetails.ruleSequence);	
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE,'F');			
				recIdApprover['lineApprover'] 	= objDetails.lineApprover;
				recIdApprover['sublist'] 		= objDetails.item;
				recIdApprover['firstSequence'] 	= true;
			}
		}
		var arrApprovers = getMultiApproverList(stNextApprvrs);
		if(arrApprovers && sequence){
			recIdApprover['approvers'] 	= new Object();
			recIdApprover['arrApprovers'] = [];
			var origApproverFields = new Object();
			var approverIdx 			= 0;
			var arrApproverDetails = getParallelApprovers(arrApprovers);
			for(i=0;i<arrApprovers.length;i++){
				if(!checkCreatorIsApprover(record,arrApprovers[i])){
					recIdApprover['approvers'][approverIdx] 						= new Object();
					recIdApprover['approvers'][approverIdx]['fields']			 	= getApproverDetails(arrApprovers[i],arrApproverDetails);
					origApproverFields												= recIdApprover['approvers'][approverIdx]['fields'];
					recIdApprover['approvers'][approverIdx]['id'] 					= arrApprovers[i];
					if(record.rundelegates == 'T'){
						var recDelegate = delegateEmployee(recIdApprover['approvers'][approverIdx]);
						if(recDelegate){
							recIdApprover['approvers'][approverIdx]			 			= recDelegate;
							recIdApprover['approvers'][approverIdx]['origApprover'] 	= arrApprovers[i];
						}
					}
					var approvalListRes = new Object();
					approvalListRes['approver']				= recIdApprover['approvers'][approverIdx]['id'] 
					approvalListRes['fields']				= recIdApprover['approvers'][approverIdx]['fields']
					approvalListRes['origApprover']			= recIdApprover['approvers'][approverIdx]['origApprover']
					sequence								= (parseFloat(sequence) + 0.1).toFixed(1);
					approvalListRes['sequence']				= sequence;
					approvalListRes['origApprover_fields'] 	= origApproverFields;
					if(!checkCreatorIsApprover(record,approvalListRes['approver']) ){
						var recList = createApproverListRecord(record,objDetails,approvalListRes);
						if(approvalListRes['fields']['isinactive'] == 'F'){
							recIdApprover['arrApprovers'][approverIdx] = approvalListRes['approver'];
							approverIdx++;
							if(approverIdx>=HC_MAX_RULE_APPROVER)
								break;
						}
					}
				} 
			}
			if(approverIdx > 0){
				recIdApprover['NoOfApprovers'] = approverIdx;
				
			}
		}
	}catch(error){
		//defineError('parallelLineApprovalType',error);
	}
	return recIdApprover;
}
/**
* Parallel Approval List of Approvers
* @param
* @return object
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function parallelListApprovalType(bLastHierarchy,intLastSeq,curIdx,record,arrApprovalRules)
{
	var recIdApprover 	= new Object();
	var stUser = nlapiGetContext().getUser();
	try{
		var objDetails		= {};
		var amount 			= record['amount'];
		var stNextApprvrs 	= record['nextapprovers'];		
		var stTransCurrency = record['currency'];
		var stBaseCurrency	= null;
		var bProcessed		= false;

		//approval rule on specific index details
		try{

			objDetails.ruleLimit       	= arrApprovalRules[curIdx].getValue(FLD_RULES_MINAMT, FLD_RULES_RULE_GRP);
			objDetails.approverType    	= arrApprovalRules[curIdx].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			objDetails.approverTypeTxt 	= arrApprovalRules[curIdx].getText(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			stBaseCurrency				= arrApprovalRules[curIdx].getValue(FLD_APP_RULE_GRP_DEF_CURR);           
			objDetails.useTransDate    	= arrApprovalRules[curIdx].getValue(FLD_APP_RULE_GRP_USE_EXC_RATE);
			objDetails.ruleSequence    	= arrApprovalRules[curIdx].getValue(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP);
			objDetails.approvers    	= arrApprovalRules[curIdx].getValue(FLD_RULES_MULT_EMP, FLD_RULES_RULE_GRP);
		}catch(error){
			objDetails.ruleLimit       	= null;
			objDetails.approverType    	= null;
			objDetails.approverTypeTxt 	= null;
			stBaseCurrency				= null;
			objDetails.useTransDate    	= null;
			objDetails.ruleSequence    	= null;
			objDetails.approvers    	= null;
		}
		
		var sequence = null;
		if(!intLastSeq && objDetails.approverType == HC_APPRVL_TYPE_LIST_APPRVRS){//If first sequence
			stNextApprvrs	=  objDetails.approvers;
			nlapiGetNewRecord().setFieldValues(FLD_NXT_APPRVRS,[]);	
			nlapiGetNewRecord().setFieldValue(FLD_DELEGATE,'F');	
			sequence 				= parseFloat(objDetails.ruleSequence);
			recIdApprover['firstSequence'] = true;
		}else{
			//get previous created list
			var stPrevApprvrType	= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_APPRVR_TYPE, FLD_RULES_RULE_GRP);
			var stPrevApprvrSeq		= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_SEQUENCE, FLD_RULES_RULE_GRP);
			var stPrevApprvrs		= arrApprovalRules[curIdx - 1].getValue(FLD_RULES_MULT_EMP, FLD_RULES_RULE_GRP);
			var stCurrApprvrType	= objDetails.approverType;
			if(stPrevApprvrType != HC_APPRVL_TYPE_LIST_APPRVRS && stCurrApprvrType != HC_APPRVL_TYPE_LIST_APPRVRS)
				return recIdApprover;
			if(stPrevApprvrType == HC_APPRVL_TYPE_LIST_APPRVRS && !bLastHierarchy && checkMultiSelectLength(stNextApprvrs) != 0){
				recIdApprover['NoOfApprovers'] = checkMultiSelectLength(stNextApprvrs);
				recIdApprover['arrApprovers'] = stNextApprvrs;
			}else if(stCurrApprvrType == HC_APPRVL_TYPE_LIST_APPRVRS){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE,'F');	
				stNextApprvrs				=  	objDetails.approvers;
				sequence 					= parseFloat(objDetails.ruleSequence);	
				recIdApprover['firstSequence'] = true;		
			}
		}
		var arrApprovers = getMultiApproverList(stNextApprvrs);
		if(arrApprovers && sequence){
			recIdApprover['approvers'] 	= new Object();
			recIdApprover['arrApprovers'] = [];
			var origApproverFields = new Object();
			var approverIdx 			= 0;
			var arrApproverDetails = getParallelApprovers(arrApprovers);
			for(i=0;i<arrApprovers.length;i++){
				if(!checkCreatorIsApprover(record,arrApprovers[i])){
					recIdApprover['approvers'][approverIdx] 						= new Object();
					recIdApprover['approvers'][approverIdx]['fields']			 	= getApproverDetails(arrApprovers[i],arrApproverDetails);
					origApproverFields	= recIdApprover['approvers'][approverIdx]['fields'];
					recIdApprover['approvers'][approverIdx]['id'] 					= arrApprovers[i];
					if(record.rundelegates == 'T'){
						var recDelegate = delegateEmployee(recIdApprover['approvers'][approverIdx]);
						if(recDelegate){
							recIdApprover['approvers'][approverIdx]			 			= recDelegate;
							recIdApprover['approvers'][approverIdx]['origApprover'] 	= arrApprovers[i];
						}
					}
					var approvalListRes = new Object();
					approvalListRes['approver']				= recIdApprover['approvers'][approverIdx]['id']; 
					approvalListRes['fields']				= recIdApprover['approvers'][approverIdx]['fields'];
					approvalListRes['origApprover']			= recIdApprover['approvers'][approverIdx]['origApprover'];
					sequence								= (parseFloat(sequence) + 0.1).toFixed(1);
					approvalListRes['sequence']				= sequence;
					approvalListRes['origApprover_fields'] 	= origApproverFields;

					if(!checkCreatorIsApprover(record,approvalListRes['approver']) ){
						var recList = createApproverListRecord(record,objDetails,approvalListRes);
						if(approvalListRes['fields']['isinactive'] == 'F'){
							recIdApprover['arrApprovers'][approverIdx] = approvalListRes['approver'];
							approverIdx++;
						}
					}
				} 
			}
			
			if(approverIdx > 0)
				recIdApprover['NoOfApprovers'] = approverIdx;
		}
	}catch(error){
		//defineError('parallelListApprovalType',error);
	}
	return recIdApprover;
}
/**
* Employee Hierarchy  approver, This will look for the first person in the employee hierarchy that as a transaction amount is less than the employee approval limit
* @param ( float idx, object record, object rule details)
* @return object
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function hierarchyApprovalType(startIdx,recTrans,objDetails)
{
	var recIdApprover 	= new Object();
	var approvalListRes							= new Object();
	try{
		var intx 		= (parseFloat(objDetails.ruleSequence) + (startIdx*(0.1))).toFixed(1);
		

		var amount		= recTrans['amount']; 
		
		if(!objDetails.idApprover){
			objDetails.idApprover = FLD_EMPLOYEE;
		}

		//check retrieve the requestor - lbalboa
		var stRequestor = recTrans.requestor;
		var stRequestorPurchaseLimit = nlapiLookupField('employee',stRequestor,'purchaseorderlimit');

		if(parseFloat(amount) <= parseFloat(stRequestorPurchaseLimit))
		{
			return null;
		}
		
		//TODO: CHECK IF ONE WORLD
		if(recTrans['oneworld'] == 'T'){
			var arrEmpRec  = nlapiLookupField('employee',objDetails.idApprover,[FLD_TRAN_APPROVER,FLD_TRAN_APPROVER_LIMIT,'supervisor','subsidiary.currency']);
		}else{
			var arrEmpRec  = nlapiLookupField('employee',objDetails.idApprover,[FLD_TRAN_APPROVER,FLD_TRAN_APPROVER_LIMIT,'supervisor']);
		}
		
		var idApprover = arrEmpRec[FLD_TRAN_APPROVER];
		
		if(!idApprover &&  arrEmpRec['supervisor']){
			idApprover 	= arrEmpRec['supervisor'];
			bSupervisor = true;
		}
		
		var origApprover = idApprover;
		
			recIdApprover['fields'] = getApproverDetails(idApprover);
			recIdApprover['id'] 	= idApprover;
			approvalListRes['origApprover_fields'] 	= recIdApprover['fields'];
		
		//if both supervisor and employee approver fields are blank then return as approve for hierarchy type
		if (!origApprover){
			return null;
		}
		else if(origApprover && recTrans.rundelegates == 'T'){
			var recDelegate = delegateEmployee(recIdApprover);
			if(recDelegate){
				recIdApprover = recDelegate;
				recIdApprover.origApprover = origApprover;
				objDetails.idApprover = recIdApprover['id'];
			}
		}
		
		var approverLimit = arrEmpRec[FLD_TRAN_APPROVER_LIMIT];    
		
		if((intx - Math.floor(intx)).toFixed(1) != 0.1){
			var stTransCurrency = recTrans['currency'];
			if(recTrans['oneworld'] == 'T')
				var stEmpCurrency = arrEmpRec['subsidiary.currency'];
			else
				var stEmpCurrency = recTrans['currency'];
			
			if (amount!=0 && 
				approverLimit!=0 && 
				stTransCurrency && 
				stEmpCurrency && 
				stEmpCurrency!=stTransCurrency){
				amount = currencyConversion(recTrans['amount'], stTransCurrency, stEmpCurrency, objDetails.useTransDate,recTrans['trandate']);
			}

			//check if this current approver has the capacity to approve the transaction total amount
			if (parseFloat(amount) <= parseFloat(approverLimit)){
				if(objDetails.appListId){
					nlapiSubmitField(REC_APPROVER_LIST,objDetails.appListId,FLD_LIST_LAST_H,'T');
					return null;
				}
			}
		}

			approvalListRes['approver']				= recIdApprover['id'];
			approvalListRes['fields']				= recIdApprover['fields'];
			approvalListRes['origApprover']			= origApprover;
			approvalListRes['sequence']				= intx;
			
		var recList						= createApproverListRecord(recTrans,objDetails,approvalListRes);
		recIdApprover['approverList'] 	= recList;  
	}catch(error){
		defineError('hierarchyApprovalType',error);
	}
	return recIdApprover;
}
/**
* Dynamic Rule approver, returns string id of next approver
* @param (object record, object rule details)
* @return object
* @type object
* @author Jaime Villafuerte
* @version 1.0
*/
function dynamicRuleApprovalType(record,objDetails)
{
	try{
		var approvalListRes	= new Object();
		
		var stTransCurrency = record['currency'];
		var amount = record['amount'];
		
		if (amount!=0.00 && 
			objDetails.ruleLimit!=0.00 && 
			objDetails.baseCurrency && 
			stTransCurrency &&         
			stTransCurrency!=objDetails.baseCurrency)
		{
			amount = currencyConversion(amount, stTransCurrency, objDetails.baseCurrency, objDetails.useTransDate,record['trandate']);
		}
		
		var stRecType    = objDetails.apprRecType;
		var stRecFld     = objDetails.apprRecFld;    
		var stTranFldId  = objDetails.tranFldId;    
		objDetails.idApprover = null;
		
		try{	
			var stTranFldVal = nlapiGetFieldValue(stTranFldId); 
			//if xedit
			if (!stTranFldVal){
				var objRec 		= nlapiLookupField(record['type'],record['id'],[stTranFldId]);
				stTranFldVal 	= objRec[stTranFldId];
			}       
			objDetails.idApprover = (stTranFldVal) ? nlapiLookupField(stRecType,stTranFldVal,stRecFld) : null;
		}
		catch(e){
			objDetails.idApprover = null;
		}
		
		if (!objDetails.idApprover){
			return null;
		}
		
		var origApprover =  objDetails.idApprover;
		var recIdApprover 			= new Object();
			recIdApprover['fields'] = getApproverDetails(origApprover);
			recIdApprover['id'] 	= origApprover;
		approvalListRes['origApprover_fields'] = recIdApprover['fields'];
			
		if (amount >= objDetails.ruleLimit){
			if (record['rundelegates'] == 'T'){
				var recDelegate = delegateEmployee(recIdApprover);
				if(recDelegate){
					recIdApprover = recDelegate;
					objDetails.idApprover = recIdApprover['id'];
				}
			}    

			approvalListRes['approver']				= recIdApprover['id'];
			approvalListRes['fields']				= recIdApprover['fields'];
			approvalListRes['origApprover']			= origApprover;
			approvalListRes['sequence']				= objDetails.ruleSequence;
			
			var recList = createApproverListRecord(record,objDetails,approvalListRes);
			nlapiLogExecution('ERROR', 'TEST', JSON.stringify(recList));
			recIdApprover['approverList'] 	= recList; 
			
			//If delegated, check the delegated field
			if (origApprover != objDetails.idApprover){
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
			}
			else{
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
			}
		}else{
			return null;
		}
		return recIdApprover;
	}catch(error){
		defineError('dynamicRuleApprovalType',error);
		return null;
	}
}
/**
* Create approver list record for next approver
* @param ( transaction id, employee id, integer sequence, string rule name, string transaction type, string role id, string role email, string original approver id)
* @return string approver list id
* @type string
* @author Jaime Villafuerte
* @version 1.0
*/
function createApproverListRecord(record,objDetails,approvalListRes)
{
	try{
		var stInactive;
		//lbalboa edited 12282017
  //   	var stCreatedFrom = '';
  //   	if(nlapiGetRecordType() == 'vendorbill')
  //   	{
  //   		stCreatedFrom = nlapiLookupField('vendorbill', nlapiGetRecordId(), 'createdfrom');
  //   	}
		// nlapiLogExecution('ERROR', 'TEST 2', 'nlapiGetRecordType =' + record['type']);
		// nlapiLogExecution('ERROR', 'TEST 2', 'stCreatedFrom =' + stCreatedFrom);
		// if(record['type'] == 'vendorbill' && !isEmpty(stCreatedFrom))
		// {
		// 	if(checkCreatorIsApprover(record,approvalListRes['approver'])){
		// 		return null;
		// 	}
		// }
		// } lbalboa edited 12282017
		var recApprovalList = nlapiCreateRecord(REC_APPROVER_LIST);
		
		//recApprovalList.setFieldValue(FLD_LIST_TRAN_APPROVER, stEmpId);
		recApprovalList.setFieldValue(FLD_LIST_PO, record['id']);
		if(objDetails.idApproverRole)
			recApprovalList.setFieldValue(FLD_LIST_APPROVER_ROLE, objDetails.idApproverRole);
		recApprovalList.setFieldValue(FLD_LIST_RULE_SEQ, approvalListRes['sequence']);
		recApprovalList.setFieldValue(FLD_LIST_RULE_NAME, objDetails.approverType);
		recApprovalList.setFieldValue(FLD_LIST_APPR_TRANS_TYPE, record['type']);
		if( objDetails.idApproverRole)
			recApprovalList.setFieldValue(FLD_LIST_ROLE_EMAIL, objDetails.approverEmail);
			
		if (approvalListRes['approver'] != approvalListRes['origApprover'])
		{
			//Check if inactive orig approver
			if(approvalListRes['origApprover']){
				var fields = approvalListRes['origApprover_fields'];
				stInactive = fields['isinactive'];
				if(stInactive != 'T'){
					recApprovalList.setFieldValue(FLD_LIST_ORIG_APPRVR, approvalListRes['origApprover']);
				}
				nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'T');
			}
		}
		else
		{
			recApprovalList.setFieldValue(FLD_LIST_ORIG_APPRVR, null);
			//nlapiGetNewRecord().setFieldValue(FLD_DELEGATE, 'F');
		}                      

		//CHECK IF INACTIVE current approver
		try{
			if (approvalListRes['approver']){
				var fields = approvalListRes['fields'];
				stInactive = fields['isinactive'];
				if(stInactive == 'T'){
					if(!HC_Delegate_Inactive_Apprvr){
						recApprovalList.setFieldValue(FLD_LIST_APPROVER_LINE_STATUS, HC_STATUS_INACTIVE);
						sendEmailInactive(record,approvalListRes);
					}
					HC_Inactive_Approver = true;
				}else{
					recApprovalList.setFieldValue(FLD_LIST_TRAN_APPROVER, approvalListRes['approver']);
				}
			}

		}catch(error){
			defineError('approverListCheckInactive',error);
			return false;			
		}
		var stAppListId = nlapiSubmitRecord(recApprovalList);
		var recAppList	= null;

		recAppList				= new Object();
		recAppList['id'] 		= stAppListId;
		
		return recAppList;
	}catch(error){
		 return null;
	}
}


// FG 2018-09-14: START
function searchApprovalRulesCustom(stTranType, stSubsidiary, intLastSeq, stRole, stRequestor){

	try{

		nlapiLogExecution('debug', '', 'stRole ' + stRole);

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
		
		var fil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
				   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
				   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
				   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq),
				   new nlobjSearchFilter('custrecord_nsts_gaw_role_type_created', FLD_RULES_RULE_GRP, 'anyof', stRole)				   
				   ];

		if(stRequestor)
			fil.push(new nlobjSearchFilter('custrecord_nsts_gaw_emp_type_created', FLD_RULES_RULE_GRP, 'anyof', stRequestor));
		
		if(stSubsidiary)
			fil.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', stSubsidiary));
		
		var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
		
		if (!res){
			var fil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', '@NONE@'),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
					   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
					   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq),
					   new nlobjSearchFilter('custrecord_nsts_gaw_role_type_created', FLD_RULES_RULE_GRP, 'anyof', stRole)
					   ];

			if(stRequestor)
				fil.push(new nlobjSearchFilter('custrecord_nsts_gaw_emp_type_created', FLD_RULES_RULE_GRP, 'anyof', stRequestor));

			var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
		}

		if (!res){
			var fil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', '@NONE@'),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
					   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
					   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq),
					   new nlobjSearchFilter('custrecord_nsts_gaw_role_type_created', FLD_RULES_RULE_GRP, 'anyof', stRole)
					   ];
			if(stSubsidiary)
				fil.push(new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', stSubsidiary));
			
			var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
		}

		if (!res){
			var fil = [new nlobjSearchFilter(FLD_APP_RULE_GRP_TRAN_TYPE, null, 'anyof', stTranType),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_SUBSD, null, 'anyof', '@NONE@'),
					   new nlobjSearchFilter(FLD_APP_RULE_GRP_IS_INACTIVE, null, 'is', 'F'),
					   new nlobjSearchFilter(FLD_RULES_INC_IN_WF, FLD_RULES_RULE_GRP, 'is', 'T'),
					   new nlobjSearchFilter(FLD_RULES_SEQUENCE,FLD_RULES_RULE_GRP,'greaterthanorequalto',intLastSeq),
					   new nlobjSearchFilter('custrecord_nsts_gaw_role_type_created', FLD_RULES_RULE_GRP, 'anyof', stRole)
					   ];
			var res = nlapiSearchRecord(REC_RULE_GRP, null, fil, col);
		}
		return res;

	}catch(e){
		nlapiLogExecution('error', 'searchApprovalRulesCustom', e);
	}
}
// FG 2018-09-14: END


function isEmpty(stValue)
{
	return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
	{
		for ( var k in v)
			return false;
		return true;
	})(stValue)));
};