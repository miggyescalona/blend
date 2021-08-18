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
 *  01 April 2021       Miggy Escalona      Initial Version
 *  24 May 2021         Miggy Escalona		Include Paid In Full, Open, and Pending Approval Bills on Billed Amount
 */

 define(['N/runtime','N/search'], function(runtime,search) {

    function beforeLoad(context) {
        try{
          log.debug(context.type)
            if (runtime.executionContext.toUpperCase() == 'USERINTERFACE' && context.type != 'create') {
                var newRecord = context.newRecord;
                var totalBilled = 0;
                var remainingAmountToBilled = 0;
                   

                 var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                    [
                       ["internalid","anyof",newRecord.id], 
                       "AND", 
                       ["type","anyof","PurchOrd"]
                    ],
                    columns:
                    [
                       search.createColumn({name: "transactionname", label: "Transaction Name"}),
                       search.createColumn({name: "internalid", label: "Internal ID"}),
                       search.createColumn({
                          name: "formulanumeric",
                          formula: "case when {applyingtransaction.status} = 'Open' OR  {applyingtransaction.status} = 'Pending Approval' OR {applyingtransaction.status} = 'Paid In Full' then {applyingtransaction.amount} else 0 end",
                          label: "Approved Bill Amount"
                       }),
                       search.createColumn({
                          name: "internalid",
                          join: "applyingTransaction",
                          label: "Internal ID"
                       })
                    ]
                 });

                 var searchResultCount = purchaseorderSearchObj.runPaged().count;
                 log.debug("purchaseorderSearchObj result count",searchResultCount);
                 purchaseorderSearchObj.run().each(function(result){
                    var billedamt = result.getValue({name:"formulanumeric"});
                    if(!isEmpty(billedamt)){
                        totalBilled += parseFloat(billedamt);
                    }
                    return true;
                 });


                 log.debug('Total Amount',totalBilled);

                 
                 if(!isEmpty(totalBilled)){
                    remainingAmountToBilled = newRecord.getValue('total') - totalBilled;
                 }


                var inline = context.form.addField({
                    id: 'custpage_attachmessage',
                    label: 'not shown',
                    type: 'INLINEHTML',
                });
                var defaultVal = "<script>";
                defaultVal += "jQuery( document ).ready(function() {jQuery('.totallingtable tbody').append('<tr><td><div class=";
                defaultVal += '"uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label"><span id="total_fs_lbl" class="smalltextnolink">Total Amount Billed</span></span><span class="uir-field inputreadonly"><span id="total_fs" class="inputtotalling"><span id="total_val" class="inputtotalling" datatype="currency">'+numberWithCommas(totalBilled.toFixed(2))+'</span></span></span></div></td></tr>';
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
                defaultVal2 += '"uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label"><span id="total_fs_lbl" class="smalltextnolink">Remaining Amount To Be Billed</span></span><span class="uir-field inputreadonly"><span id="total_fs" class="inputtotalling"><span id="total_val" class="inputtotalling" datatype="currency">'+numberWithCommas(remainingAmountToBilled.toFixed(2))+'</span></span></span></div></td></tr>';
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