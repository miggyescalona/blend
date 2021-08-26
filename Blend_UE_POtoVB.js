/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record'], function(record) {

    function beforeLoad(context) {
        var stLogTitle = 'beforeLoad';
        try{
            if(context.type == 'create'){
                var objVB = context.newRecord;

                var intRelatedPO = objVB.getValue({
                    fieldId: 'podocnum'
                })

                var intVBItemLineCount = objVB.getLineCount({
                    sublistId: 'item'
                })

                var intVBExpenseLineCount = objVB.getLineCount({
                    sublistId: 'expense'
                })

                

                log.debug(stLogTitle, 'intRelatedPO ' + intRelatedPO + '| intVBItemLineCount ' + intVBItemLineCount + '| intVBExpenseLineCount ' + intVBExpenseLineCount);

                if(!isEmpty(intRelatedPO)){
                    var objPO = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: intRelatedPO,
                        isDynamic: true,
                    });

                    var intPOItemLineCount = objPO.getLineCount({
                        sublistId: 'item'
                    })
    
                    
                    var intPOExpenseLineCount = objPO.getLineCount({
                        sublistId: 'expense'
                    })
    

                    

                    if(intVBItemLineCount > 0){
                        var intVBLineUnqiueKey;
                        var intPOLineUnqiueKey;
                        
                        for(var x = 0; x < intPOItemLineCount; x++){
                            
                            intPOLineUnqiueKey = objPO.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'lineuniquekey',
                                line: x
                            });

                            for(var y = 0; y < intVBItemLineCount;y++){


                                intVBLineUnqiueKey = objVB.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'lineuniquekey',
                                    line: y
                                });

                                log.debug(stLogTitle,'intVBLineUnqiueKey ' + intVBLineUnqiueKey + '| intPOLineUnqiueKey '+intPOLineUnqiueKey);

                                if(intVBLineUnqiueKey == intPOLineUnqiueKey){
                                    
                                    var stPOItemStartDate = objPO.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_cwgp_startdate',
                                        line: x
                                    });

                                                        
                                    var stPOItemEndtDate = objPO.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_cwgp_enddate',
                                        line: x
                                    });

                                    log.debug(stLogTitle, 'stPOItemStartDate | ' + stPOItemStartDate + ' | stPOItemEndtDate ' + stPOItemEndtDate);

                                    objPO.selectLine({
                                        sublistId: 'item',
                                        line: x
                                    });

                                    if(!isEmpty(stPOItemStartDate)){

                                        objVB.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'amortizstartdate',
                                            line: y,
                                            value: stPOItemStartDate
                                        });
                                    }

                                    if(!isEmpty(stPOItemEndtDate)){

                                        objVB.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'amortizationenddate',
                                            line: y,
                                            value: stPOItemEndtDate
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    if(intVBExpenseLineCount > 0){
                        var intVBLineUnqiueKey;
                        var intPOLineUnqiueKey;

                        for(var x = 0; x < intPOExpenseLineCount; x++){
                            intPOLineUnqiueKey = objPO.getSublistValue({
                                sublistId: 'expense',
                                fieldId: 'lineuniquekey',
                                line: x
                            });

                            for(var y = 0; y < intVBExpenseLineCount;y++){

                                intVBLineUnqiueKey = objVB.getSublistValue({
                                    sublistId: 'expense',
                                    fieldId: 'lineuniquekey',
                                    line: y
                                });

                                
                                if(intVBLineUnqiueKey == intPOLineUnqiueKey){
                                    var stPOExpStartDate = objPO.getSublistValue({
                                        sublistId: 'expense',
                                        fieldId: 'custcol_cwgp_startdate',
                                        line: x
                                    });

                                                        
                                    var stPOExpEndtDate = objPO.getSublistValue({
                                        sublistId: 'expense',
                                        fieldId: 'custcol_cwgp_enddate',
                                        line: x
                                    });

                                    objPO.selectLine({
                                        sublistId: 'expense',
                                        line: x
                                    });

                                    if(!isEmpty(stPOExpStartDate)){
                                        objVB.setSublistValue({
                                            sublistId: 'expense',
                                            fieldId: 'amortizstartdate',
                                            line: y,
                                            value: stPOItemStartDate
                                        });
                                    }

                                    if(!isEmpty(stPOExpEndtDate)){
                                        objVB.setSublistValue({
                                            sublistId: 'expense',
                                            fieldId: 'amortizationenddate',
                                            line: y,
                                            value: stPOItemEndtDate
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch(e){
            log.error(stLogTitle,e);
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
        beforeLoad: beforeLoad
    }
});
