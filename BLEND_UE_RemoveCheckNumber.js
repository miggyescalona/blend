/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */

 
  /**
 * 
 * Date : 12 August 2021   
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  12 August 2021      Miggy Escalona      Initial Version
 *  23 August 2021      Miggy Escalona      Apply to Bill Payments
 *  21 September 2021	Miggy Escalona		If Bill Payment is approved and ACH/EFT is populated, also set To Be Printed to false
 */

 var UE_OBJ = {
    FIELDS: {
        ACH: 'custbody_2663_reference_num',
        TOBEPRINTED: 'tobeprinted',
        CHECKNUMBER: 'tranid'
    },
    RECTYPE:{
        CHECK: 'check',
        BILLPAYMENT: 'vendorpayment'
    }
}

var LOG_NAME;
define(['N/record'], function(record) {


    function beforeSubmit(context) {
        LOG_NAME = 'beforeSubmit';
        try{
            if(context.type != 'delete'){
                var newRec = context.newRecord;
                if(newRec.type == UE_OBJ.RECTYPE.CHECK){
                    if(!isEmpty(newRec.getValue(UE_OBJ.FIELDS.ACH) && isEmptyOrFalse(newRec.getValue(UE_OBJ.FIELDS.TOBEPRINTED)))){
                        log.debug('Clear Check Number');
                        newRec.setValue(UE_OBJ.FIELDS.CHECKNUMBER,null);
                    }
                }
            }
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }
  
    function afterSubmit(context) {
        LOG_NAME = 'afterSubmit';
        try{
            if(context.type != 'delete'){
                var newRec = context.newRecord;
				if(newRec.type == UE_OBJ.RECTYPE.BILLPAYMENT){
                    if(!isEmpty(newRec.getValue(UE_OBJ.FIELDS.ACH))){
                        log.debug('Clear Check Number');
                        record.submitFields({
                          type: record.Type.VENDOR_PAYMENT,
                          id: newRec.id,
                          values: {
                              tranid: null,
                              tobeprinted: false
                          },
                          options: {
                              enableSourcing: false,
                              ignoreMandatoryFields : true
                          }
                       });
                    }
                }
            }
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    function isEmptyOrFalse(value){
        
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0 || value.length == 'false' || value.length == 'F') 
        { 
            return true; 
        }
        return false;
    }

    function isEmpty(value){
        
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    return {
        beforeSubmit: beforeSubmit,
      	afterSubmit: afterSubmit
    }
});
