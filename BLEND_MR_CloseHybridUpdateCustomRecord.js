/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

  
  /**
 * 
 * Date : 17 May 2021   
 * Author : Paolo Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  17 May 2021         Paolo Escalona      Initial Version
 *  08 June 202         Paolo Escalona      Pass input (SO number, error message) to summary stage
 */



var MR_OBJ = {
    PARAMS: {
        PARAMARRAY: 'custscript_cwgp_objrec',
        DATEFROM: 'custscript_cwgp_datefrom',
        DATETO: 'custscript_cwgp_dateto',
        CURRENTUSER: 'custscript_cwgp_currentuserupdaterec'
    },
    SEARCH: {
        HYBRID: 'customsearch_cwgp_script_indvclosehybrid',
        PARENTCHILDMAPPING: 'customsearch_cwgp_script_hybridparentchi',
        SALESORDER: 'customsearch_cwgp_script_customersalesor'
    }
}

var LOG_NAME;
var CSV_FOLDER = 1823567;
define(['N/runtime','N/search','N/record','N/task','N/runtime','N/email','N/file'], function(runtime,search,record,task,runtime,email,file) {

    function getInputData() {
        LOG_NAME = 'getInputData';
        try{
            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);
            var arrParentId = [];
            for(var x = 0; x <paramArrayParsed[0].length;x++){
                arrParentId.push(paramArrayParsed[0][x].customerparentid);
            }
            var objSearch = search.load({id: MR_OBJ.SEARCH.HYBRID});
            objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_firstsentatdate', operator: search.Operator.WITHIN, values: [paramArrayParsed[0][0].dateFrom,paramArrayParsed[0][0].dateTo]})); 
            objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_parenttenant', operator: search.Operator.ANYOF, values: arrParentId})); 
            return objSearch;
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
        
    }

    function map(context) {
        LOG_NAME = 'map';
        try{
            var searchValue = JSON.parse(context.value);
            //log.debug('searchValue',searchValue);

            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);

            var byParent = filterByProperty(paramArrayParsed, "customerparent", searchValue.values.custrecord_cwgp_parenttenanttext);

            //log.debug('byParent',byParent);
            var param;
            if(!isEmpty(byParent)){
                param = byParent.filter(function(param) {
                    return param.closetype == searchValue.values.custrecord_cwgp_closingtype;
                });
            }

            log.debug('param',param);

            if(!isEmpty(param)){
                var id = record.submitFields({
                    type: 'customrecord_cwgp_closehybridinvoicing',
                    id: searchValue.id,
                    values: {
                        custrecord_cwgp_salesordernumber: param[0].salesorderid,
                        custrecord_cwgp_isprocessed: param[0].paramProcessed,
                        custrecord_cwgp_errormessage: param[0].paramErrorMessage,
                        custrecord_cwgp_invoicenumber: param[0].paramInvId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields : true
                    }
                });
                
                var arrKey =[];
                arrKey.push(param[0].salesorderid);

                ///Get Sales Order Trand ID and Entity, push to array
                var objSearch = search.load({id: MR_OBJ.SEARCH.SALESORDER});
                objSearch.filters.push(search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: param[0].salesorderid})); ;
                objSearch.run().each(function(result){
                    arrKey.push(result.getValue({name:"tranid", summary: "GROUP"})),
                    arrKey.push(result.getText({name:"entity", summary: "GROUP"}))
                    return true;    
                });

                ///Push invoice id to array
                if(param[0].hasOwnProperty("paramInvId")){
                    arrKey.push(param[0].paramInvId);
                }


                var objValue = {
                    isProcessed: param[0].paramProcessed,
                    stErrorMessage: param[0].paramErrorMessage,
                    intCusRecId: searchValue.id,
                }
    
                context.write({
                    key: arrKey,
                    value: objValue
                });
            }


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

            context.write({
                key: context.key,
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
            var currentUser = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.CURRENTUSER);
            var arrValues = [];
            var isProcessed = 0;
            var isFailed = 0;

            summary.output.iterator().each(function (key, value)
            {
                var arrKey = JSON.parse(key);
                var val = JSON.parse(value);

                log.debug('val',val);
                var stErrorMessage = [];
                var isError = true;

                var arrCusRec = [];

                //Count number of succesfully and failed updated records and push to array
                for(var x = 0; x < val.length; x++){
                    arrCusRec.push(val[x].intCusRecId);
                    if(val[x].isProcessed == "1"){
                        isProcessed++;
                    }
                    else if(val[x].isProcessed == "2"){
                        isFailed++;
                        isError = stErrorMessage.includes(val[x].stErrorMessage);
                        if(isError == false){
                            stErrorMessage.push(val[x].stErrorMessage);
                        }
                        isError = true;
                    }
                }
                

                arrObj = {
                    'intSoId': arrKey[0],
                    'intInvId': arrKey[3],
                    'isProcessed': isProcessed,
                    'isFailed': isFailed,
                    'stErrorMessage': stErrorMessage,
                    'arrCusRec': arrCusRec,
                    'soNum': arrKey[1],
                    'stName':arrKey[2]
                }
                arrValues.push(arrObj);
                return true;
            });
            log.debug('summary arr',arrValues);

            
            var body = 'Processed the following Sales Order/s: \n';
            for(var x = 0; x < arrValues.length; x++){
                body+= 'SO: '+ arrValues[x].soNum + '| Customer: ' + arrValues[x].stName+ ' | Successful: ' + arrValues[x].isProcessed + ', Failed: ' + arrValues[x].isFailed + ' Reason: ';
                for(var i = 0; i < arrValues[x].stErrorMessage.length;i++){
                    log.debug(arrValues[x].stErrorMessage[i]);
                    body+= arrValues[x].stErrorMessage[i];
                }
                body+= +'\n';
            }
            body = body.replace('undefined','');

            email.send({
                author: -5,
                recipients: currentUser,
                subject: 'Hi, the close hybrid records you have submitted has been completed.',
                body: body
            });

            var params = new Object();
            params['custscript_cwgp_objcsv'] = arrValues;


            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_cwgp_mr_closehybridcsvattac',
            });

            mrTask.params = params;
            mrTaskId = mrTask.submit();
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

    function filterByProperty(array, prop, value){
        var filtered = [];
        for(var i = 0; i < array.length; i++){
    
            var obj = array[i];
    
            for(var key in obj){
                if(typeof(obj[key] == "object")){
                    var item = obj[key];
                    if(item[prop] == value){
                        filtered.push(item);
                    }
                }
            }
    
        }    
    
        return filtered;
    
    }


    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
