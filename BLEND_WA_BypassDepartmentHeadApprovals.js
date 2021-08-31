function bypassDepartmentHeadApprover(context){
    try{

        var arrApprovers = [];
        var recId = nlapiGetRecordId();
        var customrecord_nsts_gaw_approver_listSearch = nlapiSearchRecord("customrecord_nsts_gaw_approver_list",null,
            [
            ["custrecord_nsts_gaw_po_rec_type","anyof",recId], 
            "AND", 
            ["custrecord_nsts_gaw_porulename","anyof","1","2","3"]
            ], 
            [
            new nlobjSearchColumn("custrecord_nsts_gaw_rulesequence"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_po_rec_type"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_tran_approver"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_list_date"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_approverrole"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_porulename"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_approverlinestatus"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_rej_reason"), 
            new nlobjSearchColumn("custrecord_nsts_gaw_super_approved")
            ]
        );
        if(!isEmpty(customrecord_nsts_gaw_approver_listSearch)){
            if(customrecord_nsts_gaw_approver_listSearch.length== 2) {
                for (var i = 0 ; i < customrecord_nsts_gaw_approver_listSearch.length; i++) {
                    obj = {
                        intApprover: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_tran_approver'),
                        intApproverType: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_porulename'),
                        intApprovalStatus: customrecord_nsts_gaw_approver_listSearch[i].getValue('custrecord_nsts_gaw_approverlinestatus'),
                    }
                    arrApprovers.push(obj);
                };

                nlapiLogExecution('DEBUG','arrApprovers',arrApprovers);
                nlapiLogExecution('DEBUG','arrApprovers stringified', JSON.stringify(arrApprovers));

                if(arrApprovers[0].intApprover == arrApprovers[1].intApprover && arrApprovers[0].intApprovalStatus == '2' && arrApprovers[0].intApproverType == '2' && arrApprovers[1].intApproverType == '1'){
                    return 1;
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