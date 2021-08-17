/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

 
  /**
 * 
 * Date : 16 June 2021  
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  16 June 2021        Miggy Escalona      Initial Version
 *  27 June 2021	    Miggy Escalona	    update custrecord_cwgp_parenttenanttext to custrecord_cwgp_parenttenant
 *  9  August 2021      Miggy Escalona      Create adhoc deployment if no available deployment
 */


var MR_OBJ = {
    SEARCH: {
        HYBRID: 'customsearch_cwgp_script_indvclosehybrid',
        PARENTCHILDMAPPING: 'customsearch_cwgp_script_hybridparentchi'
    },
    PARAMS: {
        PARAMARRAY: 'custscript_cwgp_objcsv',
    }
}

var LOG_NAME;
var CSV_FOLDER = 1823567;
define(['N/runtime','N/search','N/record','N/task','N/error','N/format','N/runtime','N/render','N/file'], function(runtime,search,record,task,error,format,runtime,render,file) {

    function getInputData() {
        LOG_NAME = 'getInputData';
        try{
            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);
            log.debug('paramArrayParsed',paramArrayParsed);
            log.debug('paramArrayParsed Length',paramArrayParsed.length);
        
            return paramArrayParsed;
        }
        catch(e){
            log.error(LOG_NAME,e);
        }

    }

    function map(context) {
        LOG_NAME = 'map';
        try{
            log.debug('value',JSON.parse(context.value));
            var arrValues = JSON.parse(context.value);
            var objSearch = search.load({id: MR_OBJ.SEARCH.HYBRID});
            objSearch.filters.push(search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: arrValues.arrCusRec})); ;
            var searchResultCount = objSearch.runPaged().count;
            log.debug('search results count', searchResultCount);
            var csvContents = "";
            csvContents += 'First Sent At' + ',' + 'Close Type' + ',' + 'Loan Reference ID' + ',' + 'Tenant' +','+ 'Parent Name' + '\n';
            objSearch.run().each(function(result){
                csvContents+=removeSymbol(",",result.getValue({name:"custrecord_cwgp_firstsentat"}))+','+removeSymbol(",",result.getValue({name:"custrecord_cwgp_closingtype"}))+','+removeSymbol(",",result.getValue({name:"custrecord_cwgp_loanreferenceid"}))+','+removeSymbol(",",result.getValue({name:"custrecord_cwgp_tenant"}))+','+removeSymbol(",",result.getText({name:"custrecord_cwgp_parenttenant"})) +'\n';
                return true;    
            });
            if(arrValues.hasOwnProperty('intInvId')){ 
                if(!isEmpty(arrValues.intInvId)){
                    var objTranId = search.lookupFields({
                        type: search.Type.INVOICE,
                        id: arrValues.intInvId,
                        columns: ['tranid']
                    });

                    log.debug(objTranId);
                    log.debug(objTranId.tranid);

                    var csvFile = file.create({
                        name:'Invoice Detailed Report_'+objTranId.tranid+'.csv',
                        fileType: file.Type.CSV,
                        contents: csvContents
                    });	

                    csvFile.folder = CSV_FOLDER;
                    var csvId = csvFile.save();
                        record.attach({
                            record: {
                                type: 'file',
                                id: csvId
                            },
                            to: {
                                type: 'invoice',
                                id: arrValues.intInvId
                            }
                        });
                }
            }
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    

    function reduce(context) {
        LOG_NAME = 'reduce';
     
    }

    function summarize(summary) {
   
    }

    


    function isEmpty(value){
        
        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) 
        { 
            return true; 
        }
        return false;
    }

    function removeSymbol(symbol, str){
        var newString = "";
        for(var i = 0; i < str.length; i++) {
            var char = str.charAt(i);
            if(char != symbol){
                newString = newString + char;
            }
        }
        return newString;
    }



    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});