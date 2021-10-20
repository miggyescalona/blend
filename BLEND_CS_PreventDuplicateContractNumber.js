/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

   /**
 * 
 * Date : 8 Oct 2021  
 * Author : Miggy Escalona
 * 
 *  Date Modified      Modified By         Notes
 *  8 Oct 2021         Miggy Escalona      Initial Version
 */

 var CS_OBJ = {
    FIELDS: {
        CONTRACTNUMBER: 'custbody_cwgp_contractnumber'
    }
 }

define(['N/currentRecord','N/search','N/ui/message'], function(currentRecord,search,message) {

    var rec = currentRecord.get();

    function saveRecord(context) {
        try{
            var stContractNumber = rec.getValue(CS_OBJ.FIELDS.CONTRACTNUMBER);
            console.log('Contract Number: ' + stContractNumber);

            if(!isEmpty(stContractNumber)){


                //// Create Search Filters
                var filters = [];
                filters[0] = search.createFilter({
                    name: 'type',
                    operator: search.Operator.ANYOF,
                    values: 'PurchOrd'
                });
                filters[1] = search.createFilter({
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: 'T'
                });
                filters[2] = search.createFilter({
                    name: 'custbody_cwgp_contractnumber',
                    operator: search.Operator.STARTSWITH,
                    values: stContractNumber
                });

                
                ///To exclude current record from search
                var intId = rec.getValue('id');
                console.log('Rec ID: ' + intId);
                if(!isEmpty(intId)){
                    filters[3] = search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.NONEOF,
                        values: intId
                    });
                }

                ///Search records that has the same contract number
                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters: filters,
                    columns:
                    [
                        search.createColumn({name: "internalid", label: "Internal ID"}),
                        search.createColumn({name: "custbody_cwgp_contractnumber", label: "Contract Number"})
                    ]
                });
                var searchResultCount = purchaseorderSearchObj.runPaged().count;
                console.log('searchResultCount: ' + searchResultCount + '| record id: ' +  intId);

                ///If more than 0, meaning there is an existing record with the same contract number
                if(searchResultCount > 0){
                    var myMsg4 = message.create({
                        title: 'Invalid Contract Number',
                        message: 'The Contract Number you entered is already existing.',
                        type: message.Type.ERROR
                    });
                    myMsg4.show();
                    return false;
                }
                else{
                    return true;
                }

            }
            else{
                return true;
            }
        }
        catch(e){
            console.log('error: ' + e);
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
        saveRecord: saveRecord
    }
});
