/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

 
  /**
 * 
 * Date : 14 May 2021   
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  14 May 2021         Miggy Escalona      Initial Version
 *  9 August 2021       Miggy Escalona      Match Close Type selected to Item's Close Type on SO
 *  9 August 2021      Miggy Escalona      Create adhoc deployment if no available deployment
 */


var MR_OBJ = {
    PARAMS: {
        PARAMARRAY: 'custscript_cwgp_objsublist',
        DATEFROM: 'custscript_cwgp_datefrom',
        DATETO: 'custscript_cwgp_dateto',
        CURRENTUSER: 'custscript_cwgp_currentusersotoinv'
    },
    SEARCH: {
        HYBRID: 'customsearch_cwgp_script_indvclosehybrid',
        PARENTCHILDMAPPING: 'customsearch_cwgp_script_hybridparentchi'
    },
    FIELDS: {
        TFC: 'custbody_cwgp_trmnation_fr_convenience',
    },
    VALUES: {
        TYPE_HYBRID: '2',
        TYPE_RON: '1',
        TYPE_TRADITIONAL:'3'
    },
    SCRIPTID: {
        SOTOINV: '896',
        UPDATEREC: '897',
        CSVATTACH: '898'
    }
}

var LOG_NAME;
var PDF_FOLDER = 1823568;
define(['N/runtime','N/search','N/record','N/task','N/error','N/format','N/runtime','N/render','N/file'], function(runtime,search,record,task,error,format,runtime,render,file) {

    function getInputData() {
        LOG_NAME = 'getInputData';
        try{
            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);
            log.debug('paramArrayParsed',paramArrayParsed);
            log.debug('paramArrayParsed Length',paramArrayParsed.length);
            return JSON.parse(paramArray);
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    function map(context) {
        LOG_NAME = 'map';
        try{
            var dateFrom = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.DATEFROM);
            var dateTo = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.DATETO);

            dateFrom = new Date(dateFrom);
            var month = dateFrom.getUTCMonth() + 1; //months from 1-12
            var day = dateFrom.getUTCDate();
            var year = dateFrom.getUTCFullYear();
            dateFrom = month+'/'+day+'/'+year;

            dateTo =  new Date(dateTo);
            var month = dateTo.getUTCMonth() + 1; //months from 1-12
            var day = dateTo.getUTCDate();
            var year = dateTo.getUTCFullYear();
            dateTo = month+'/'+day+'/'+year;

            var objValue = JSON.parse(context.value);
            log.debug('searchinput', 'objValue.customerparent: ' + objValue.customerparent + '| dateFrom: ' + dateFrom + '| dateTo: ' + dateTo + '| objValue.closetype ' + objValue.closetype + '| objValue.salesorder ' + objValue.salesorder) + '| objValue.salesorderid ' + objValue.salesorderid;
            

            objValue.dateFrom = dateFrom;
            objValue.dateTo = dateTo;

            context.write({
                key: objValue.salesorderid,
                value: objValue
            });
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    

    function reduce(context) {
        LOG_NAME = 'reduce';
        try{
            log.debug(LOG_NAME, 'context.key' + context.key);
            var values = context.values;
            var arrValues = [];

            values.forEach(function (result) {
                log.debug(LOG_NAME,result);
                arrValues.push(JSON.parse(result));
            });

            log.debug(LOG_NAME,arrValues);
            log.debug('arrValues.length',arrValues.length);

            var invId;
            var isProcessed = '1';
            var stErrorMessage = '';
            //var intTFC;
            var arrLineUniqueKey = [];
            try{
                var objSO = record.load({
                    type: record.Type.SALES_ORDER,
                    id: context.key,
                    isDynamic: true,
                });

                /*intTFC = objSO.getValue({
                    fieldId: MR_OBJ.FIELDS.TFC
                });

                log.debug('intTFC',intTFC);*/


                var soItemLineCount = objSO.getLineCount({
                    sublistId: 'item'
                });

                var intUsageCount;
                var arrInsertItems = []

                ////Copy matching RON or HYBRID Items on SO
                for(var x = 0; x < arrValues.length; x++){
                    intUsageCount = arrValues[x].usagecount;
                    for(var z = 0; z < soItemLineCount; z++){
                        objSO.selectLine({
                            sublistId: 'item',
                            line: z
                        });

                        var intItemCloseUsageType = objSO.getCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_cwgp_closeusagetype'
                        });

                        var intItem = objSO.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item'
                        });

                        log.debug('intItem',intItem);
                        
                        log.debug('intItemCloseUsageType | arrValues[x].closetype', intItemCloseUsageType  +'|' + arrValues[x].closetype);


                        if(intItemCloseUsageType == arrValues[x].closetype){
                                var intRate = objSO.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate'
                                });
                          
                          		var stBillingTerm = objSO.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol3'
                                });

                                var objInsertItems = {
                                    'intItem': intItem,
                                    'intRate': intRate,
                                    'intUsageCount' :intUsageCount,
                                    'dateFrom': arrValues[x].dateFrom,
                                    'dateTo': arrValues[x].dateTo,
                                    'stBillingTerm': stBillingTerm
                                }
                                arrInsertItems.push(objInsertItems);
                                break;
                        }
                    }
                }

                if(arrInsertItems.length != arrValues.length){
                    stErrorMessage = 'No matching item for ' + arrValues[0].salesorder;
                    log.error('NO_MATCHING_ITEM', 'No matching item for ' + arrValues[0].salesorder);
                }

                log.debug('arrInsertItems', arrInsertItems);

                ///Add new RON or HYBRID item on SO (with new usage/quantity)
                for(var x = 0; x < arrInsertItems.length;x++){
                    objSO.selectNewLine({
                        sublistId: 'item'
                    });
                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: arrInsertItems[x].intItem
                    });
                    
                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: parseInt(arrInsertItems[x].intUsageCount)
                    });

                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: parseFloat(arrInsertItems[x].intRate)
                    });

    
                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bl_rev_rec_start',
                        value: format.parse({value:arrInsertItems[x].dateFrom, type: format.Type.DATE, timezone : format.Timezone.AMERICA_NEW_YORK })
                        
                    });


                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bl_rev_rec_end',
                        value: format.parse({value:arrInsertItems[x].dateTo, type: format.Type.DATE, timezone : format.Timezone.AMERICA_NEW_YORK })
                    });

                    
    
                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_atlas_contract_start_date',
                        value: format.parse({value:arrInsertItems[x].dateFrom, type: format.Type.DATE, timezone : format.Timezone.AMERICA_NEW_YORK })
                        
                    });


                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_atlas_contract_end_date',
                        value: format.parse({value:arrInsertItems[x].dateTo, type: format.Type.DATE, timezone : format.Timezone.AMERICA_NEW_YORK })
                    });

                    
                    ///Billing Term to Monthly Arrears
                    objSO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol3',
                        value: arrInsertItems[x].stBillingTerm
                    });
                    

                    objSO.commitLine({
                        sublistId: 'item'
                    });
                }

                var soId = objSO.save();

                
                ////Load SO and get lineuniquekeys
                if(!isEmpty(soId)){
                    var objSO2 = record.load({
                        type: record.Type.SALES_ORDER,
                        id: soId,
                        isDynamic: true,
                    });

                    var so2itemLineCount = objSO2.getLineCount({
                        sublistId: 'item'
                    });

                    for(var x = so2itemLineCount-1; x >= so2itemLineCount-arrInsertItems.length;x--){
                        var intLineUniqueKey = objSO2.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'lineuniquekey',
                            line: x
                        });
                        arrLineUniqueKey.push(intLineUniqueKey);
                    } 
                }

                ///Transfer SO to Invoice
                var objInv = record.transform({
                   fromType: record.Type.SALES_ORDER,
                   fromId: context.key,
                   toType: record.Type.INVOICE,
                   isDynamic: true,
                });

                objInv.setValue({
                    fieldId: 'customform',
                    value: '158',
                    ignoreFieldChange: false
                });

    
                // Add lines to the invoice like this, this is the correct way when the record is in "dynamic" mode
                var invItemLineCount = objInv.getLineCount({
                    sublistId: 'item'
                });
                for(var x = invItemLineCount-1; x >= 0; x--){
                    objInv.selectLine({
                        sublistId: 'item',
                        line: x
                    });

                    var intLineUniqueKey = objInv.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'lineuniquekey'
                    });


                    var intItem = objInv.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });

                    
                    var stDateFrom = objInv.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bl_rev_rec_start'
                    });

                    var stDateTo = objInv.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bl_rev_rec_end'
                    });
                  
                    var stBillingTerm = objInv.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol3'
                    });

                            
                    stDateFrom = new Date(stDateFrom);
                    var month = stDateFrom.getUTCMonth() + 1; //months from 1-12
                    var day = stDateFrom.getUTCDate();
                    var year = stDateFrom.getUTCFullYear();
                    stDateFrom = month+'/'+day+'/'+year;

                    stDateTo =  new Date(stDateTo);
                    var month = stDateTo.getUTCMonth() + 1; //months from 1-12
                    var day = stDateTo.getUTCDate();
                    var year = stDateTo.getUTCFullYear();
                    stDateTo = month+'/'+day+'/'+year;

                    
                    log.debug('intItem | stDateFrom | stDateTo',intItem + '|' + stDateFrom + '|' + stDateTo);

                    if(arrLineUniqueKey.includes(intLineUniqueKey) == false){
                        log.debug('Remove Line: ' + x);
                        objInv.removeLine({
                            sublistId: 'item',
                            line: x,
                            ignoreRecalc: false
                        });
                    }
                    else{
                        objInv.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol3',
                            value: stBillingTerm
                        });

                        var stDateFrom = objInv.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_bl_rev_rec_start'
                        });
    
                        var stDateTo = objInv.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_bl_rev_rec_end'
                        });

                        log.debug('stDateFrom | stDateTo', 'stDateFrom: ' + stDateFrom + '| stDateTo: '  + stDateTo);
    

                        objInv.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_inv_startdatestored',
                            value: format.parse({value:stDateFrom, type: format.Type.DATE})
                        });
    
                        objInv.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_inv_enddatestored',
                            value: format.parse({value:stDateTo, type: format.Type.DATE})
                        });
            
                        objInv.commitLine({
                            sublistId: 'item'
                        });
                    }
                }
                // Submit the record       
                invId = objInv.save();
                
                //Create Invoice PDF if Invoice record is created
                if(!isEmpty(invId)){
                    var transactionFile = render.transaction({
                        entityId: invId,
                        printMode: render.PrintMode.PDF,
                        inCustLocale: true
                        });
                    
                    transactionFile.folder = PDF_FOLDER;
                    var pdfId = transactionFile.save();
                        
                    record.attach({
                        record: {
                            type: 'file',
                            id: pdfId
                        },
                        to: {
                            type: 'invoice',
                            id: invId
                        }
                    });
                }

            }
            catch(e){
                invId = null;
                isProcessed = '2';
                stErrorMessage = e.message;

                log.error(LOG_NAME,e);
            }

            log.debug('invId',invId);
            for(var x = 0; x < arrValues.length; x++){
                arrValues[x].paramProcessed = isProcessed;
                arrValues[x].paramInvId = invId;
                arrValues[x].paramErrorMessage = stErrorMessage;
            }

            log.debug('arrValues',arrValues);

            context.write({
                key: arrValues[0].customerparent,
                value: arrValues
            });
        }
        catch(e){
           log.error(LOG_NAME,e);
       }
        
    }

    function summarize(summary) {
        LOG_NAME = 'summarize';
        try{
            log.debug('summary','summary');
            var arrValues = [];
            summary.output.iterator().each(function (key, value)
            {
                log.debug('summary','key: ' + key + '| value: ' + value);
                arrValues.push(JSON.parse(value));
                return true;
            });
            log.debug('summary arr',arrValues);
   
            var params = new Object();
            params['custscript_cwgp_objrec'] = arrValues;
            params['custscript_cwgp_currentuserupdaterec'] = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.CURRENTUSER);


            try{
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_cwgp_mr_clsehybridupdaterec',
                });

                mrTask.params = params;
                mrTaskId = mrTask.submit();
            }
            catch(e){
                ///Catch if first submission failed (no available deployment)
                var rec = record.create ({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    defaultValues: {
                        script: MR_OBJ.SCRIPTID.UPDATEREC//scriptId
                     }
                });
                var recId = rec.save();
    
                if(!isEmpty(recId)){
                    log.debug('No Available Deployment, Entering Retry');
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_cwgp_mr_clsehybridupdaterec',
                    });

                    mrTask.params = params;
                    mrTaskId = mrTask.submit();
                    log.debug('re-try mrTaskId', mrTaskId);
                }
            }
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    


    function isEmpty(value){
        
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    function getAllResults(s) {
        var results = s.run();
        var searchResults = [];
        var searchid = 0;
        do {
            var resultslice = results.getRange({start:searchid,end:searchid+1000});
            resultslice.forEach(function(slice) {
                searchResults.push(slice);
                searchid++;
                }
            );
        } while (resultslice.length >=1000);
        return searchResults;
    }   

    function dateToString(dt){
        return ((dt.getMonth() > 8) ? (dt.getMonth() + 1) : ('0' + (dt.getMonth() + 1))) + '/' + ((dt.getDate() > 9) ? dt.getDate() : ('0' + dt.getDate())) + '/' + dt.getFullYear()    
    }

    
    function formatDate(date) {
        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
    }

    function formatDateToString(date){
        var today = new Date(date);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        return today = mm + '/' + dd + '/' + yyyy;
    }


    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});