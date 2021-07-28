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
 */
var stLogTitle;
define(['N/currentRecord','N/log','N/search'], function(currentRecord,log,search) {
 
    function fieldChanged(context) {
        var stLogTitle = 'lineInit: ';
        try{
            
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            if (sublistName == 'expense' && sublistFieldName == 'account'){

                var intLocation = currentRecord.getValue({
                    fieldId: 'location'
                });
                console.log('intLocation:' + intLocation);

                    if(intLocation){
                        currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'location',
                            value: intLocation
                        });

                        /*currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cwgp_po_location',
                            value: intLocation
                        });*/

                        console.log('location set');
                   
                    }
                    else{
                        console.log('location not set');
                    }

            }
          

            if(sublistFieldName == 'subsidiary'){
                var intSubsidiary = currentRecord.getValue({
                    fieldId: 'subsidiary'
                });
                var locVal = intSubsidiary == 1 ? 1 : intSubsidiary == 2 ? 4 : intSubsidiary == 6 ? 3 : intSubsidiary == 5 ? 3 : '';;  
                console.log('locVal: ' + locVal);    
                currentRecord.setValue('location', locVal)
            }
        }

        
        catch(e){
           console.log(stLogTitle  + e);
        }
    }

    function postSourcing(context) {
        try{
        var currentRecord = context.currentRecord;
        var sublistName = context.sublistId;
        var sublistFieldName = context.fieldId;
        
            if(sublistFieldName == 'subsidiary'){
                var intSubsidiary = currentRecord.getValue({
                    fieldId: 'subsidiary'
                });
                var locVal = intSubsidiary == 1 ? 1 : intSubsidiary == 2 ? 4 : intSubsidiary == 6 ? 3 : intSubsidiary == 5 ? 3 : '';;  
                console.log('locVal: ' + locVal);    
                currentRecord.setValue('location', locVal)
            }
          
            if (sublistName == 'item' && sublistFieldName == 'item'){

                var intLocation = currentRecord.getValue({
                    fieldId: 'location'
                });
                console.log('intLocation:' + intLocation);

                    if(intLocation){
                        currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'location',
                            value: intLocation
                        });

                        /*currentRecord.setCurrentSublistValue({
                            sublistId: sublistName,
                            fieldId: 'custcol_cwgp_po_location',
                            value: intLocation
                        });*/

                        console.log('location set');
                   
                    }
                    else{
                        console.log('location not set');
                    }

            }
        }
        catch(e){
            console.log(stLogTitle  + e);
        }
    }


    return {
        fieldChanged: fieldChanged,
        postSourcing: postSourcing
    }
});