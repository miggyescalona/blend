/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

  
  /**
 * 
 * Date : 17 May 2021   
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  17 May 2021         Miggy Escalona      Initial Version
 *  08 June 2021        Miggy Escalona      Pass input (SO number, error message) to summary stage
 *  27 July 2021        Miggy Escalona	    Update customerparent to customerparentid, update custrecord_cwgp_parenttenanttext to custrecord_cwgp_parenttenant.value
 *  9  August 2021      Miggy Escalona      Create adhoc deployment if no available deployment
 *  3  September 2021   Miggy Escalona      Fixed GetInputData forloop to allow parallel processing of different customers
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
    },
    SCRIPTID: {
        SOTOINV: '896',
        UPDATEREC: '897',
        CSVATTACH: '898'
    }
}

var LOG_NAME;
var CSV_FOLDER = 1823567;
define(['N/runtime','N/search','N/record','N/task','N/runtime','N/email'], function(runtime,search,record,task,runtime,email) {

    function getInputData() {
        LOG_NAME = 'getInputData';
        try{
          	log.debug('===START===');
            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);
            var arrParentId = [];
          	log.debug(LOG_NAME, JSON.stringify(paramArrayParsed));
          	for(var y = 0; y < paramArrayParsed.length; y++){
              for(var x = 0; x <paramArrayParsed[y].length;x++){
                  log.debug(LOG_NAME,'customerparentid: '+ paramArrayParsed[y][x].customerparentid);
                  arrParentId.push(paramArrayParsed[y][x].customerparentid);
              }
            }
          	log.debug(LOG_NAME, JSON.stringify(arrParentId));
            var objSearch = search.load({id: MR_OBJ.SEARCH.HYBRID});
            objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_firstsentatdate', operator: search.Operator.WITHIN, values: [paramArrayParsed[0][0].dateFrom,paramArrayParsed[0][0].dateTo]})); 
            objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_parenttenant', operator: search.Operator.ANYOF, values: arrParentId})); 
            var searchResultCount = objSearch.runPaged().count;
          	log.debug(LOG_NAME,'search count: ' + searchResultCount);
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
            //log.debug('searchValue',JSON.stringify(searchValue));

            var paramArray = runtime.getCurrentScript().getParameter(MR_OBJ.PARAMS.PARAMARRAY);
            var paramArrayParsed = JSON.parse(paramArray);
            //log.debug('paramArrayParsed',JSON.stringify(paramArrayParsed));

            var byParent = filterByProperty(paramArrayParsed, "customerparentid", searchValue.values.custrecord_cwgp_parenttenant.value);

            //log.debug('byParent',byParent);
            var param;
            if(!isEmpty(byParent)){
                  param = byParent.filter(function(param) {
                    return param.closetype == searchValue.values.custrecord_cwgp_closingtype;
                });
            }

           // log.debug('param',param);

            if(!isEmpty(param)){
            //log.debug(param[0].salesorderid + '|' + param[0].paramProcessed + '|' + param[0].paramErrorMessage + '|' + param[0].paramInvId)
                //log.debug(searchValue.id);
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
                        enableSourcing: true,
                        ignoreMandatoryFields : true
                    }
                });
                
              	//log.debug('id',id);
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
              
               	//log.debug('arrKey1',arrKey);

                ///Push invoice id to array
                if(param[0].hasOwnProperty("paramInvId")){
                    arrKey.push(param[0].paramInvId);
                }
              
               // log.debug('arrKey2',arrKey);


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
            //log.debug(LOG_NAME, 'context.key' + context.key);
            var values = context.values;
            var arrValues = [];

            values.forEach(function (result) {
               // log.debug(LOG_NAME,result);
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
              	log.debug('arrKey',arrKey);
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
                body+= '\n' + ' SO: '+ arrValues[x].soNum + '| Customer: ' + arrValues[x].stName+ ' | Successful: ' + arrValues[x].isProcessed + ', Failed: ' + arrValues[x].isFailed + ' Reason: ';
                for(var i = 0; i < arrValues[x].stErrorMessage.length;i++){
                    log.debug(arrValues[x].stErrorMessage[i]);
                    body+= arrValues[x].stErrorMessage[i];
                }
            }
            body = body.replace('undefined','');

            email.send({
                author: 25142,
                recipients: currentUser,
                subject: 'Hi, the close hybrid records you have submitted has been completed.',
                body: body
            });

            var params = new Object();
            params['custscript_cwgp_objcsv'] = arrValues;



            try{
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_cwgp_mr_closehybridcsvattac',
                });

                log.debug('params1',JSON.stringify(params));

                mrTask.params = params;
                mrTaskId = mrTask.submit();
            }
            catch(e){
                ///Catch if first submission failed (no available deployment)
                var rec = record.create ({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    defaultValues: {
                        script: MR_OBJ.SCRIPTID.CSVATTACH //scriptId
                     }
                });
                var recId = rec.save();
    
                if(!isEmpty(recId)){
                    log.debug('No Available Deployment, Entering Retry');
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_cwgp_mr_closehybridcsvattac',
                    });

                    
                    log.debug('params2',JSON.stringify(params));

                    mrTask.params = params;
                    mrTaskId = mrTask.submit();
                    log.debug('re-try mrTaskId', mrTaskId);
                }
            }
          log.debug('===END===');
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