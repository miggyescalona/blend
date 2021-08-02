/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */

/**
 * 
 * Date : 01 April 2021
 * Author : Paolo Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  01 April 2021       Paolo Escalona      Initial Version
 *  24 May 2021         Paolo Escalona		Include Paid In Full and Pending Approval Bills (previously Open Bills only)
 */

 define(['N/runtime','N/search'], function(runtime,search) {

    function beforeLoad(context) {
        try{
          log.debug(context.type)
            if (runtime.executionContext.toUpperCase() == 'USERINTERFACE' && context.type != 'create') {
                var newRecord = context.newRecord;
                var totalAmt = 0;
                var amountToBeBilled = 0;
                var newAmountToBeBilled = 0;
                   

                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                    [
                       ["type","anyof","PurchOrd"], 
                       "AND", 
                       ["internalid","anyof",newRecord.id], 
                       "AND", 
                       ["billingtransaction.internalidnumber","isnotempty",""],
                       "AND", 
                       ["billingtransaction.status","anyof","VendBill:A","VendBill:B","VendBill:D"]
                    ],
                    columns:
                    [
                       search.createColumn({name: "linesequencenumber", label: "Line Sequence Number"}),
                       search.createColumn({
                          name: "amount",
                          join: "billingTransaction",
                          label: "Amount"
                       }),
                       search.createColumn({
                          name: "internalid",
                          join: "billingTransaction",
                          label: "Internal ID"
                       }),
                       search.createColumn({
                        name: "total",
                        join: "billingTransaction",
                        label: "Amount (Transaction Total)"
                     })
                    ]
                 });
                 var searchResultCount = purchaseorderSearchObj.runPaged().count;
                 log.debug("purchaseorderSearchObj result count",searchResultCount);
                 var arr = [];
                 var temp = [];
                 purchaseorderSearchObj.run().each(function(result){
                    var amt = result.getValue({name:"total", join:"billingTransaction"});
                    var intId = result.getValue({name:"internalid", join:"billingTransaction"});
                    if(!isEmpty(amt)){
                        totalAmt += parseFloat(amt);

                        if (arr.length > 0) {
                            temp = arr.filter(function(arrLines) {
                                return arrLines.intId == intId;
                            });

                            if(temp.length == 0){
                                var objLines = {
                                    intId: result.getValue({name:"internalid", join:"billingTransaction"}),
                                    intAmount: amt
                                };

                                arr.push(objLines);
                            }
                        }

                        if(arr.length == 0){
                            var objLines = {
                                intId: result.getValue({name:"internalid", join:"billingTransaction"}),
                                intAmount: amt
                            };

                            arr.push(objLines);
                        }
                    }
                    return true;
                 });

                 var totalAmount = 0;
                 for(var x = 0; x < arr.length; x++){
                     totalAmount += parseFloat(arr[x].intAmount);
                 }

                 log.debug('Total Amount',totalAmount);

                 

                 var totalBilled = totalAmt;
                 if(!isEmpty(totalBilled)){
                    amountToBeBilled = newRecord.getValue('total') - totalBilled;
                    newAmountToBeBilled = newRecord.getValue('total') - totalAmount;
                 }


                var inline = context.form.addField({
                    id: 'custpage_attachmessage',
                    label: 'not shown',
                    type: 'INLINEHTML',
                });
                var defaultVal = "<script>";
                defaultVal += "jQuery( document ).ready(function() {jQuery('.totallingtable tbody').append('<tr><td><div class=";
                defaultVal += '"uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label"><span id="total_fs_lbl" class="smalltextnolink">Total Amount Billed</span></span><span class="uir-field inputreadonly"><span id="total_fs" class="inputtotalling"><span id="total_val" class="inputtotalling" datatype="currency">'+numberWithCommas(totalAmount.toFixed(2))+'</span></span></span></div></td></tr>';
                defaultVal += "')});";
                defaultVal += "</script>";
                log.debug('jquery string',defaultVal);
                inline.defaultValue = defaultVal;

                
                var inline2 = context.form.addField({
                    id: 'custpage_attachmessage2',
                    label: 'not shown2',
                    type: 'INLINEHTML',
                });
                var defaultVal2 = "<script>";
                defaultVal2 += "jQuery( document ).ready(function() {jQuery('.totallingtable tbody').append('<tr><td><div class=";
                defaultVal2 += '"uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label"><span id="total_fs_lbl" class="smalltextnolink">Remaining Amount To Be Billed</span></span><span class="uir-field inputreadonly"><span id="total_fs" class="inputtotalling"><span id="total_val" class="inputtotalling" datatype="currency">'+numberWithCommas(newAmountToBeBilled.toFixed(2))+'</span></span></span></div></td></tr>';
                defaultVal2 += "')});";
                defaultVal2 += "</script>";
                log.debug('jquery string',defaultVal2);
                inline2.defaultValue = defaultVal2;

                                
            }
        }
        catch(e){
            log.error('beforeLoad',e);
        }
    }

    function isEmpty(value){
                
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return {
        beforeLoad: beforeLoad
    }
});