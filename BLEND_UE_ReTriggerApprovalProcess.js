/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */

 /**
 * Author: Paolo Miguel Escalona
 * Date:  2020-01-05
 * 
 * Date         Modified By             Notes
 * 2020-01-05  Paolo Miguel Escalona   Initial script creation
 * 2021-07-02  Paolo Miguel Escalona   Add beforeSubmit condition to check if record is created via Make Copy/Create, if yes, clear out the following fields: Retrigger, Single Approval and Reapproval Notif
 */
  var MAIN_OBJ 	= {
    FIELDS	:	{
        TOTAL: 'total',
        DEPARTMENT: 'department',
        CLASS: 'class',
        LOCATION: 'location',
        TRANDATE: 'trandate',
        QUANTITY: 'quantity',
        STATUS: 'approvalstatus',
        RETRIGGER: 'custbody_cwgp_retriggerapproval',
        SINGLEAPPROVAL: 'custbody_cwgp_singleapproval',
        REAPPROVALNOTIF: 'custbody_cwgp_reapprovalnotification',
        EXPSTARTDATE: 'custcol_cwgp_startdate',
        EXPENDDATE: 'custcol_cwgp_enddate',
        ITEMSTARTDATE: 'custcol_cwgp_startdate',
        ITEMENDDATE: 'custcol_cwgp_enddate'
    },
    SUBLIST : {
        ITEM: 'item',
        EXPENSE: 'expense'
    },
    CONTEXT: {
        EDIT: 'edit',
        DELETE: 'delete'
    },
    STATUS: {
        APPROVED: '2'
    },
    PARAMETERS: {
        THRESHOLD: 'custscript_cwgp_thresholdamt'
    },
    CUSTOMREC: {
        APPROVALLIST: 'customrecord_nsts_gaw_approver_list'
    }
};

var stLogTitle;
var oldRecArr = [];
var newRecArr = [];
var blApproval = false; //Triggers reapproval whole process
var blThreshold = false;

define(['N/record','N/format','N/runtime','N/search'], function(record,format,runtime,search) {


    function beforeLoad(context){
      
      /*
        stLogTitle = 'beforeLoad'
        var oldRecord = context.newRecord;
        try{
            log.debug(stLogTitle,context.type);
            if(context.type == 'copy'){
                var blRetrigger = oldRecord.getValue(MAIN_OBJ.FIELDS.RETRIGGER);
                var blSingleApproval = oldRecord.getValue(MAIN_OBJ.FIELDS.SINGLEAPPROVAL);
                var blReapproval= oldRecord.getValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF);

                log.debug(stLogTitle, blRetrigger +'|' + blSingleApproval +'|' + blReapproval);

                oldRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,false);
                oldRecord.setValue(MAIN_OBJ.FIELDS.SINGLEAPPROVAL,false);
                oldRecord.setValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF,false);
            }
        }
        catch(e){
            log.error(stLogTitle,e);
        }*/

    }


    function beforeSubmit(context) {
        stLogTitle = 'beforeSubmit';
        try{
             log.debug(stLogTitle,context.type);
             if(context.type == 'create'){
                  var newRecord = context.newRecord;
                  var blRetrigger = newRecord.getValue(MAIN_OBJ.FIELDS.RETRIGGER);
                  var blSingleApproval = newRecord.getValue(MAIN_OBJ.FIELDS.SINGLEAPPROVAL);
                  var blReapproval= newRecord.getValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF);

                  log.debug(stLogTitle, blRetrigger +'|' + blSingleApproval +'|' + blReapproval);

                  newRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,false);
                  newRecord.setValue(MAIN_OBJ.FIELDS.SINGLEAPPROVAL,false);
                  newRecord.setValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF,false);
           	}

            if(context.type == MAIN_OBJ.CONTEXT.EDIT){
                var oldRecord = context.oldRecord;
                var newRecord = context.newRecord;
              


                if(oldRecord.getValue(MAIN_OBJ.FIELDS.STATUS) == '2'){

                    var intApprovalStatus = oldRecord.getValue(MAIN_OBJ.FIELDS.STATUS);

                    log.debug('record id | intApprovalStatus', newRecord.id + ' | ' + intApprovalStatus);


                    if(context.type == MAIN_OBJ.CONTEXT.EDIT && context.type != MAIN_OBJ.CONTEXT.DELETE && intApprovalStatus == MAIN_OBJ.STATUS.APPROVED){

                         ///Create JSON object for old and new values
                        setOldAndNewValues(context);

 
                        
                        var intThreshold = runtime.getCurrentScript().getParameter(MAIN_OBJ.PARAMETERS.THRESHOLD);
                        log.debug('oldRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM)',oldRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM));
                        log.debug('newRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM)',newRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM));
                        log.debug('oldRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE)',oldRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE));
                        log.debug('newRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE)',newRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE));

                        if((parseFloat(newRecord.getValue('total')) != parseFloat(oldRecord.getValue('total')))){
                            var oldTotal = parseFloat(oldRecord.getValue('total'));
                            var newTotal = parseFloat(newRecord.getValue('total'));
                            var intDiff = diff(oldTotal,newTotal);
                          
                          	log.debug('intDiff',intDiff);
							log.debug('intThreshold',intThreshold);
                            
                            ///If total amount changed and more than threshold, go whole approval process
                            if(intDiff > intThreshold){
                                log.debug('total changed | exceed threshold');
                                blApproval = true;
                                newRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,blApproval);
                            }
                            ///If total amount is changed and less than threshold, go single approval routing
                            else if(intDiff <= intThreshold){
                                log.debug('total changed | within threshold')
                                log.debug('set single approval');
                                newRecord.setValue(MAIN_OBJ.FIELDS.SINGLEAPPROVAL,true);
                                newRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,true);
                                blApproval = true;
                            }
                        } 
                        ///If old and new line count not equal, go whole approval process
                        else if(oldRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM) != newRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM) || oldRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE) != newRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE)){
                            log.debug(stLogTitle,'Line Count Not Equal');
                            blApproval = true;
                            blThreshold = true;
                            newRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,blApproval);
                        }   
                        ///If old and new sublist/main lines and values are not equal
                        else{
                            getOldRec(context);
                            getNewRec(context);

                            log.debug('getOldRec',JSON.stringify(oldRecArr));
                            log.debug('getNewRec',JSON.stringify(newRecArr));
                            
                            var intArrLength = oldRecArr.length;

                            for(var x = 0; x < intArrLength; x++){
                                if(oldRecArr[x][1] !== newRecArr[x][1]){
                                    log.debug(stLogTitle,'fieldName: ' + oldRecArr[x][0] + ' Old Value: ' + oldRecArr[x][1] + '| ' + 'fieldName: ' + newRecArr[x][0] + ' New Value: ' + newRecArr[x][1]);
                                    blApproval = true;
                                    newRecord.setValue(MAIN_OBJ.FIELDS.RETRIGGER,blApproval);
                                    break;
                                }
                            }
                        }

                        if(blApproval == true){
                            var recId = newRecord.id;

                            newRecord.setValue(MAIN_OBJ.FIELDS.REAPPROVALNOTIF,true);

                            var customrecord_nsts_gaw_approver_listSearchObj = search.create({
                                type: "customrecord_nsts_gaw_approver_list",
                                filters:
                                [
                                ["custrecord_nsts_gaw_po_rec_type","anyof",recId]
                                ],
                                columns:
                                [
                                search.createColumn({name: "internalid", label: "Internal ID"}),
                                ]
                            });
                            var arrTransac = [];
                            var searchResultCount = customrecord_nsts_gaw_approver_listSearchObj.runPaged().count;
                            log.debug("customrecord_nsts_gaw_approver_listSearchObj result count",searchResultCount);
                            customrecord_nsts_gaw_approver_listSearchObj.run().each(function(result){
                                arrTransac.push(result.getValue({name:"internalid"}));
                                return true;
                            });

                            var deletedRecs = [];
                            if(deletedRecs){
                                for(var x = 0; x < arrTransac.length; x++){
                                    var recId = record.delete({
                                        type: MAIN_OBJ.CUSTOMREC.APPROVALLIST,
                                        id: arrTransac[x],
                                    });
                                    deletedRecs.push(recId);
                                }
                            }

                            log.debug('Deleted Approval List IDs: ' + deletedRecs)
                        }

                    }
                }
            }
        }
        catch(e){
            log.error(stLogTitle,e);
        }   
    }

    function setOldAndNewValues(context){
        var oldRec = context.oldRecord;
        var newRec = context.newRecord;

        var reqName = oldRec.getText('custbody_nsts_gaw_tran_requestor');
        var vendName = oldRec.getText('entity');
        var poNum= oldRec.getValue('tranid');
        var oTerms = oldRec.getText('terms');
        var totalAmount = oldRec.getValue('total');

        newRec.setValue('custbody_cwgp_old_reqname',reqName);
        newRec.setValue('custbody_cwgp_old_vendname',vendName);
        newRec.setValue('custbody_cwgp_old_ponum',poNum);
        newRec.setValue('custbody_cwgp_old_terms',oTerms);
        newRec.setValue('custbody_cwgp_old_amount',totalAmount);

        ////Get and Push Old Sublist Values
        var oldIntItemCount = oldRec.getLineCount(MAIN_OBJ.SUBLIST.ITEM);
        var oldIntExpenseCount = oldRec.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE);

        
        var oldArr = [];
        if(oldIntItemCount > 0){
            for(var x = 0;x<oldIntItemCount;x++){
                var tempObj = {}
                var intItemDepartment = oldRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.ITEM,
                    fieldId: 'department',
                    line: x
                });

                var intItemAccountId = oldRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.ITEM,
                    fieldId: 'custcol_cwgp_expense_account',
                    line: x
                });



                tempObj = {
                    'department': intItemDepartment,
                    'account': intItemAccountId
                }

                oldArr.push(tempObj);
            }
        }

        
        if(oldIntExpenseCount > 0){
            for(var x = 0;x<oldIntExpenseCount;x++){
                var tempObj = {}
                var intExpDepartment = oldRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                    fieldId: 'department',
                    line: x
                });

                var intExpAccountId = oldRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                    fieldId: 'account',
                    line: x
                });
                tempObj = {
                    'department': intExpDepartment,
                    'account': intExpAccountId
                }

                oldArr.push(tempObj);
            }
        }
        newRec.setValue('custbody_cwgp_oldvalues',JSON.stringify(oldArr));

        ///Get and Push New Sublist Values
        var newIntItemCount = newRec.getLineCount(MAIN_OBJ.SUBLIST.ITEM);
        var newIntExpenseCount = newRec.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE);
        

        var newArr = [];
        if(newIntItemCount > 0){
            for(var x = 0;x<newIntItemCount;x++){
                var tempObj = {}
                var intItemDepartment = newRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.ITEM,
                    fieldId: 'department',
                    line: x
                });

                var intItemAccountId = newRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.ITEM,
                    fieldId: 'custcol_cwgp_expense_account',
                    line: x
                });

                tempObj = {
                    'department': intItemDepartment,
                    'account': intItemAccountId
                }
                newArr.push(tempObj);
            }
        }

        
        if(newIntExpenseCount > 0){
            for(var x = 0;x<newIntExpenseCount;x++){
                var tempObj = {}
                var intExpDepartment = newRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                    fieldId: 'department',
                    line: x
                });

                var intExpAccountId = newRec.getSublistText({
                    sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                    fieldId: 'account',
                    line: x
                });
                tempObj = {
                    'department': intExpDepartment,
                    'account': intExpAccountId
                }
                newArr.push(tempObj);
            }
        }

        newRec.setValue('custbody_cwgp_newvalues',JSON.stringify(newArr));

    }

    function getOldRec(context){
        try{

            var currentRecord = context.oldRecord;
            

            ///Main Fields
            oldRecArr.push([MAIN_OBJ.FIELDS.TOTAL,currentRecord.getValue(MAIN_OBJ.FIELDS.TOTAL)]);
            oldRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,currentRecord.getValue(MAIN_OBJ.FIELDS.DEPARTMENT)]);
            oldRecArr.push([MAIN_OBJ.FIELDS.CLASS,currentRecord.getValue(MAIN_OBJ.FIELDS.CLASS)]);
            oldRecArr.push([MAIN_OBJ.FIELDS.LOCATION,currentRecord.getValue(MAIN_OBJ.FIELDS.LOCATION)]);
            oldRecArr.push([MAIN_OBJ.FIELDS.TRANDATE,currentRecord.getText(MAIN_OBJ.FIELDS.TRANDATE)]);


            ///Line Fields
            var intItemCount = currentRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM);
            var intExpenseCount = currentRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE);

            if(intItemCount > 0){
                for(var x = 0;x<intItemCount;x++){
                    var intQuantity = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.QUANTITY,
                        line: x
                    });

                    var intDepartment = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.DEPARTMENT,
                        line: x
                    });

                    var intClass = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.CLASS,
                        line: x
                    });

                    var intLocation = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.LOCATION,
                        line: x
                    });

                  /*  var itemStartDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.ITEMSTARTDATE,
                        line: x
                        });

                    if(!isEmpty(itemStartDate)){
                        itemStartDate = format.parse({
                            value: new Date(itemStartDate),
                            type: format.Type.DATETIMETZ
                         })

                         itemStartDate = formatDate(itemStartDate);
                    }

                       
                    var itemEndDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.ITEMENDDATE,
                        line: x
                    });

                    if(!isEmpty(itemEndDate)){
                        itemEndDate = format.parse({
                            value: new Date(itemEndDate),
                            type: format.Type.DATETIMETZ
                         })

                         itemEndDate = formatDate(itemEndDate);
                    }*/


                    oldRecArr.push([MAIN_OBJ.FIELDS.QUANTITY,intQuantity]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,intDepartment]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.CLASS,intClass]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.LOCATION,intLocation]);
                    //oldRecArr.push([MAIN_OBJ.FIELDS.ITEMSTARTDATE,itemStartDate]);
                   // oldRecArr.push([MAIN_OBJ.FIELDS.ITEMENDDATE,itemEndDate]);
                }
            }

            if(intExpenseCount > 0){
                for(var x = 0;x<intItemCount;x++){

                    var intDepartment = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.DEPARTMENT,
                        line: x
                    });

                    var intClass = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.CLASS,
                        line: x
                    });

                    var intLocation = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.LOCATION,
                        line: x
                    });

                    /* var expStartDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.EXPSTARTDATE,
                        line: x
                        });

                  if(!isEmpty(expStartDate)){
                        expStartDate = format.parse({
                            value: new Date(expStartDate),
                            type: format.Type.DATETIMETZ
                            })

                            expStartDate = formatDate(expStartDate);
                    }

                    var expEndDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.EXPENDDATE,
                        line: x
                    });

                    
                    if(!isEmpty(expEndDate)){
                        expEndDate = format.parse({
                            value: new Date(expEndDate),
                            type: format.Type.DATETIMETZ
                        })

                        expEndDate = formatDate(expEndDate);
                    }*/


                    oldRecArr.push([MAIN_OBJ.FIELDS.QUANTITY,intQuantity]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,intDepartment]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.CLASS,intClass]);
                    oldRecArr.push([MAIN_OBJ.FIELDS.LOCATION,intLocation]);
                    //oldRecArr.push([MAIN_OBJ.FIELDS.EXPSTARTDATE,expStartDate]);
                   // oldRecArr.push([MAIN_OBJ.FIELDS.EXPENDDATE,expEndDate]);

                    
                }
            }
        }
        catch(e){
            log.error(stLogTitle,e);
        }
    }

    function getNewRec(context){
        try{

            var currentRecord = context.newRecord;

               ///Main Fields
               newRecArr.push([MAIN_OBJ.FIELDS.TOTAL,currentRecord.getValue(MAIN_OBJ.FIELDS.TOTAL)]);
               newRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,currentRecord.getValue(MAIN_OBJ.FIELDS.DEPARTMENT)]);
               newRecArr.push([MAIN_OBJ.FIELDS.CLASS,currentRecord.getValue(MAIN_OBJ.FIELDS.CLASS)]);
               newRecArr.push([MAIN_OBJ.FIELDS.LOCATION,currentRecord.getValue(MAIN_OBJ.FIELDS.LOCATION)]);
               newRecArr.push([MAIN_OBJ.FIELDS.TRANDATE,currentRecord.getText(MAIN_OBJ.FIELDS.TRANDATE)]);

   
               ///Line Fields
               var intItemCount = currentRecord.getLineCount(MAIN_OBJ.SUBLIST.ITEM);
               var intExpenseCount = currentRecord.getLineCount(MAIN_OBJ.SUBLIST.EXPENSE);
   
               if(intItemCount > 0){
                   for(var x = 0;x<intItemCount;x++){
                       var intQuantity = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.ITEM,
                           fieldId: MAIN_OBJ.FIELDS.QUANTITY,
                           line: x
                       });
   
                       var intDepartment = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.ITEM,
                           fieldId: MAIN_OBJ.FIELDS.DEPARTMENT,
                           line: x
                       });
   
                       var intClass = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.ITEM,
                           fieldId: MAIN_OBJ.FIELDS.CLASS,
                           line: x
                       });
   
                       var intLocation = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.ITEM,
                           fieldId: MAIN_OBJ.FIELDS.LOCATION,
                           line: x
                       });

                          
                      /* var itemStartDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.ITEM,
                        fieldId: MAIN_OBJ.FIELDS.ITEMSTARTDATE,
                        line: x
                        });

                        
                    if(!isEmpty(itemStartDate)){
                        itemStartDate = format.parse({
                            value: new Date(itemStartDate),
                            type: format.Type.DATETIMETZ
                         })

                         itemStartDate = formatDate(itemStartDate);
                    }

                       
                       var itemEndDate = currentRecord.getSublistValue({
                            sublistId: MAIN_OBJ.SUBLIST.ITEM,
                            fieldId: MAIN_OBJ.FIELDS.ITEMENDDATE,
                            line: x
                       });

                       
                    if(!isEmpty(itemEndDate)){
                        itemEndDate = format.parse({
                            value: new Date(itemEndDate),
                            type: format.Type.DATETIMETZ
                         })

                         itemEndDate = formatDate(itemEndDate);
                    }*/
   
                       newRecArr.push([MAIN_OBJ.FIELDS.QUANTITY,intQuantity]);
                       newRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,intDepartment]);
                       newRecArr.push([MAIN_OBJ.FIELDS.CLASS,intClass]);
                       newRecArr.push([MAIN_OBJ.FIELDS.LOCATION,intLocation]);
                      // newRecArr.push([MAIN_OBJ.FIELDS.ITEMSTARTDATE,itemStartDate]);
                      // newRecArr.push([MAIN_OBJ.FIELDS.ITEMENDDATE,itemEndDate]);
                   }
               }
   
               if(intExpenseCount > 0){
                   for(var x = 0;x<intItemCount;x++){
   
                       var intDepartment = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                           fieldId: MAIN_OBJ.FIELDS.DEPARTMENT,
                           line: x
                       });
   
                       var intClass = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                           fieldId: MAIN_OBJ.FIELDS.CLASS,
                           line: x
                       });
   
                       var intLocation = currentRecord.getSublistValue({
                           sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                           fieldId: MAIN_OBJ.FIELDS.LOCATION,
                           line: x
                       });

                    /*   var expStartDate = currentRecord.getSublistValue({
                        sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                        fieldId: MAIN_OBJ.FIELDS.EXPSTARTDATE,
                        line: x
                        });

                                               
                    if(!isEmpty(expStartDate)){
                        itemStartDate = format.parse({
                            value: new Date(expStartDate),
                            type: format.Type.DATETIMETZ
                         })

                         expStartDate = formatDate(expStartDate);
                    }

                        var expEndDate = currentRecord.getSublistValue({
                            sublistId: MAIN_OBJ.SUBLIST.EXPENSE,
                            fieldId: MAIN_OBJ.FIELDS.EXPENDDATE,
                            line: x
                        });

                                                                       
                    if(!isEmpty(expEndDate)){
                        itemStartDate = format.parse({
                            value: new Date(expEndDate),
                            type: format.Type.DATETIMETZ
                         })

                         expEndDate = formatDate(expEndDate);
                    }*/

   
                       newRecArr.push([MAIN_OBJ.FIELDS.QUANTITY,intQuantity]);
                       newRecArr.push([MAIN_OBJ.FIELDS.DEPARTMENT,intDepartment]);
                       newRecArr.push([MAIN_OBJ.FIELDS.CLASS,intClass]);
                       newRecArr.push([MAIN_OBJ.FIELDS.LOCATION,intLocation]);
                     //  newRecArr.push([MAIN_OBJ.FIELDS.EXPSTARTDATE,expStartDate]);
                     //  newRecArr.push([MAIN_OBJ.FIELDS.EXPENDDATE,expEndDate]);
                   }
               }
        }
        catch(e){
            log.error(stLogTitle,e);
        }

        
    }

    function diff (num1, num2) {
        if (num1 > num2) {
          return num1 - num2
        } else {
          return num2 - num1
        }
      }

      
    function isEmpty(value){
                
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    function formatDate(date) {
        return (date.getMonth() + 1) + '/' +("0" + date.getDate()).slice(-2) + '/' + date.getFullYear();
    }
    
    

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    }
});