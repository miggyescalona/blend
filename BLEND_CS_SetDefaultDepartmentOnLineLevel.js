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
 * 2021-06-18  Paolo Miguel Escalona   fieldChanged > Change logic to set department after setting account on expense line, rather than before.
 */
 var stLogTitle;
 define(['N/currentRecord','N/log','N/search','N/record'], function(currentRecord,log,search,record) {
 
    ////Set department on line level 
    function fieldChanged(context) {
        stLogTitle = 'lineInit: ';
        try{
             var currentRecord = context.currentRecord;
             var sublistName = context.sublistId;
             var sublistFieldName = context.fieldId;
              if ((sublistName === 'item' && sublistFieldName == 'item') || (sublistName == 'expense' && sublistFieldName == 'account') && currentRecord.type == 'purchaseorder'){
                    ///Search for requestor department
                    var stDepartment = currentRecord.getValue('department');
                     ///If department exists
                    if(stDepartment){
                         console.log(stDepartment);
                       
                         ///If there is no line currently inserted on expense sublist.
                         if(sublistName == 'expense' && currentRecord.getLineCount('expense') == 0){
                            var intAccountVal = currentRecord.getCurrentSublistValue({
                                 sublistId: 'expense',
                                 fieldId: 'account'
                            });
                            ///If current line has account, set department. If not, dont's set. This prevents the user the need to cancel the initial expense line on create.
                            if(!isEmpty(intAccountVal)){
                                currentRecord.setCurrentSublistValue({
                                    sublistId: sublistName,
                                    fieldId: 'department',
                                    value: stDepartment
                                });
                            }
                         }
                         else{
                           ///Set department on line level, either expense or item.
                           currentRecord.setCurrentSublistValue({
                               sublistId: sublistName,
                               fieldId: 'department',
                               value: stDepartment
                           });
                         }
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
 
     ////Set account id on line level
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
                                 fieldId: 'custcolcustcol_cwgp_expense_accountid',
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