/**
 * 
 * Date : 17 June 2021
 * Author : Paolo Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  17 June 2021        Paolo Escalona      Initial Version
 *  7 July 2021         Paolo Escalona      Modified to accomodate all approver types (execept Role)
 */

 function bypassDepartmentHeadApprover(context){
    try{

        var arrApprovers = [];
        var currentApprover = [];
        var recId = nlapiGetRecordId();
        var customrecord_nsts_gaw_approver_listSearch = nlapiSearchRecord("customrecord_nsts_gaw_approver_list",null,
            [
            ["custrecord_nsts_gaw_po_rec_type","anyof",recId], 
            ], 
            [
            new nlobjSearchColumn("custrecord_nsts_gaw_rulesequence"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_po_rec_type"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_tran_approver"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_list_date").setSort(false), 
            new nlobjSearchColumn("custrecord_nsts_gaw_approverrole"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_porulename"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_approverlinestatus"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_rej_reason"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_super_approved")
            ]
        );
        if(!isEmpty(customrecord_nsts_gaw_approver_listSearch)){
            if(customrecord_nsts_gaw_approver_listSearch.length > 1) {
                for (var i = 0 ; i < customrecord_nsts_gaw_approver_listSearch.length; i++) {
                    obj = {
                        intApprover: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_tran_approver'),
                        intApproverType: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_porulename'),
                        intApprovalStatus: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_approverlinestatus'),
                    }
                    if(i == customrecord_nsts_gaw_approver_listSearch.length-1){
                        currentApprover.push(obj);
                    }
                    else if(customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_approverlinestatus') == '3'){
                        currentApprover = [];
                    }
                    else{
                        arrApprovers.push(obj);
                    }
                };

                nlapiLogExecution('DEBUG','arrApprovers stringified', JSON.stringify(arrApprovers));
                nlapiLogExecution('DEBUG','arrApprovers stringified', JSON.stringify(currentApprover));

              	if(currentApprover.length > 0){
                  if(!isEmpty(currentApprover[0].intApprover) && isEmpty(currentApprover[0].intApprovalStatus)){
                      for(var x = 0; x < arrApprovers.length;x++){
                          if(arrApprovers[x].intApprover == currentApprover[0].intApprover){
                              return 1;
                              break;
                          }
                      }
                      return 0;
                  }
                  else{
                    return 0;
                  }
                }
                else{
                    return 0;
                }
            }
            else{
                return 0;
            }
        }
        else{
            nlapiLogExecution('DEBUG','NO RESULTS','NO RESULTS');
            return 0;
        }
    }
    catch(e){
        nlapiLogExecution('ERROR','bypassDepartmentHeadApprover',e);
    }

}

function isEmpty(value){
                
    if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
    { 
        return true; 
    }
    return false;
}