/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

/**
 * Author: Paolo Miguel Escalona
 * Date:  2020-12-14
 * 
 * Date         Modified By             Notes
 * 2020-12-14  Paolo Miguel Escalona   Initial script creation
 * 2021-03-03  Paolo Miguel Escalona   Add post sourcing of expense account number on line level
 */
 var stLogTitle;
 define(['N/currentRecord','N/log','N/search','N/record'], function(currentRecord,log,search,record) {
 
     function fieldChanged(context) {
        stLogTitle = 'lineInit: ';
        try{
            
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            if ((sublistName === 'item' || sublistName == 'expense') && (sublistFieldName == 'account'|| sublistFieldName == 'item') && currentRecord.type == 'purchaseorder'){
                    var stDepartment = search.lookupFields({
                        type: search.Type.EMPLOYEE,
                        id: currentRecord.getValue('custbody_nsts_gaw_tran_requestor'),
                        columns: ['department']
                    });

                    if(stDepartment){

                        stDepartment = stDepartment.department;
                        stDepartment = stDepartment[0].value;

                        console.log('department:' + stDepartment);

                        currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'department',
                            value: stDepartment
                        });

                        console.log('department set');
                    
                    }
                    else{
                        console.log('department not set');
                    }

            }
        }
        catch(e){
            console.log('stLogTitle ' + e);
        }
     }
 
     function postSourcing(context) {
        try{
         var currentRecord = context.currentRecord;
         var sublistFieldName = context.fieldId;
         var sublistName = context.sublistId;
         
            if(sublistFieldName == 'item' && sublistName == 'item'){
 
                 var intItem = currentRecord.getCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'item'
                 });
 
                if(!isEmpty(intItem)){
                       var intExpenseAccount = search.lookupFields({
                           type: search.Type.ITEM,
                           id: intItem,
                           columns: ['expenseaccount']
                       });
 
                       if(!isEmpty(intExpenseAccount)){
                            var objRecord = record.load({
                                type: record.Type.ACCOUNT,
                                id: intExpenseAccount.expenseaccount[0].value,
                                isDynamic: true,
                            });
    
                            var intAcctNumber = objRecord.getValue('acctnumber')
    
                            if(!isEmpty(intAcctNumber)){
                                    currentRecord.setCurrentSublistValue({
                                        sublistId: sublistName,
                                        fieldId: 'custcol_cwgp_expenseaccountid',
                                        value: intAcctNumber
                                    });
                            }
                        }
                }
            }
        }
        catch(e){
            console.log('stLogTitle: ' + e);
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
         fieldChanged: fieldChanged,
         postSourcing: postSourcing
     }
 });