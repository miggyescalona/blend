/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

  /**
 * 
 * Date : 14 May 2021   
 * Author : Miggy Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  14 May 2021         Miggy Escalona      Initial Version
 *  26 May 2021         Miggy Escalona      Removed parent/child search, use parent customer column from grouped search. Removed Customer Child and Tenant columns.
 *  9  August 2021      Miggy Escalona      Exclude Custom Records tagged as 'D' on Close Usage Count
 *  9  August 2021      Miggy Escalona      Fixed dateFrom to dateTo to show correct usage count
 *  9  August 2021      Miggy Escalona      Create adhoc deployment if no available deployment
 *  3  September 2021   Miggy Escalona      Remove invoice number as criteria to show rows
 * 16 December 2021		Miggy Escalona		Load and use user timezone
 */


   var SL_OBJ = {
    MAIN: {
        GETFORM: 'Close Hybrid Suitelet',
        POSTFORM: 'Processing Records',
        FILTERGROUP: 'custpage_cwgp_filtergroup',
        DATEFROM: 'custpage_cwgp_datefrom',
        DATETO: 'custpage_cwgp_dateto',
        POSTMESSAGE: 'custpage_cwgp_postmessage',
        POSTLINKS: 'custpage_cwgp_postlinks'
    },
    SUBLIST: {
        ID: 'custpage_cwgp_sublist',
        INTERNALID: 'custpage_cwgp_internalid',
        CUSTOMERPARENT: 'custpage_cwgp_customerparent',
        CUSTOMERPARENTID: 'custpage_cwgp_customerparentid',
        CUSTOMERCHILD: 'custpage_cwgp_customerchild',
        TENANT: 'custapge_cwgp_tenant',
        CLOSETYPE: 'custpage_cwgp_closetype',
        USAGECOUNT: 'custpage_cwgp_usagecount',
        SALESORDER: 'custpage_cwgp_salesorder',
        TESTDROPDOWN: 'custpage_cwgp_testdropdown'
    },
    SEARCH: {
        HYBRID: 'customsearch_cwgp_script_closehybridsear',
        PARENTCHILDMAPPING: 'customsearch_cwgp_script_hybridparentchi'
    },
    SCRIPTID: {
        SOTOINV: '896',
        UPDATEREC: '897',
        CSVATTACH: '898'
    }
}

var LOG_NAME;
var CLIENT_SCRIPT_FILE_ID = 249329;
var CSVFolder = 1823567;
var objFilters = {};
define(['N/ui/serverWidget','N/search','N/task','N/file','N/runtime','N/record','N/config','N/format'], function(ui,search,task,file,runtime,record,config,format) {

    function onRequest(context) {
        log.debug('onRequest');
        var httpsType = context.request.parameters.params_cwgp_httpstype;
        if(context.request.method === 'GET' && httpsType != 'post'){
            LOG_NAME = 'onRequest';
            try{
                objFilters["paramDateFrom"] = context.request.parameters.cwgp_params_datefrom;;
                objFilters["paramDateTo"] = context.request.parameters.cwgp_params_dateto;
                generateRequestForm(context,objFilters);
            }
            catch(e){
                log.error(LOG_NAME,e.message);
            }
 
        }
        else{
            LOG_NAME = 'onPost';
            try{
                generatePostForm(context);
                callMapReduce(context);
            }
            catch(e){
                log.error(LOG_NAME,e.message);
            }
        }
    }

    function generateRequestForm(context,objFilters){
        LOG_NAME = 'generateRequestForm'
        try{


            log.debug('objFilters',objFilters);

            var form = ui.createForm({
                title: SL_OBJ.MAIN.GETFORM
            });

            ///Set Client Script
            form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;

            var fltrGroup = form.addFieldGroup({
                id : SL_OBJ.MAIN.FILTERGROUP,
                label : 'Filters'
            });

            var dateFrom = form.addField({
                id : SL_OBJ.MAIN.DATEFROM,
                type : ui.FieldType.DATE,
                label : 'Date From',
                container: SL_OBJ.MAIN.FILTERGROUP
            });

            dateFrom.updateDisplaySize({
                height : 60,
                width : 250
            });


            if(!isEmpty(objFilters.paramDateFrom)){
                var timezone = config.load({type: config.Type.USER_PREFERENCES}).getValue({fieldId: "TIMEZONE"})
                var paramDateFrom = format.parse({ value : objFilters.paramDateFrom, type : format.Type.DATE, timezone : timezone});
                dateFrom.defaultValue = paramDateFrom;
            }
            

            var dateTo = form.addField({
                id : SL_OBJ.MAIN.DATETO,
                type : ui.FieldType.DATE,
                label : 'Date To',
                container: SL_OBJ.MAIN.FILTERGROUP
            });

            dateTo.updateDisplaySize({
                height : 60,
                width : 250
            });

            
            if(!isEmpty(objFilters.paramDateTo)){
                var timezone = config.load({type: config.Type.USER_PREFERENCES}).getValue({fieldId: "TIMEZONE"})
                var paramDateTo = format.parse({ value : objFilters.paramDateTo, type : format.Type.DATE, timezone : timezone});
                dateTo.defaultValue = paramDateTo;
            }
            
            fltrGroup.isSingleColumn = true;
            

            ///Add Filter and Submit button
           
            form.addButton({
                id : 'custpage_submitfilters',
                label : 'Submit Filters',
                functionName:  "submitFilters()"
            });

            form.addSubmitButton({
                label : 'Submit Records'
            });


            //Add Sublist and Sublist Fields

            var sublist = form.addSublist({
                id : SL_OBJ.SUBLIST.ID,
                type : ui.SublistType.LIST,
                label : 'List of RON/HYBRID Records'
            });

            sublist.addRefreshButton();

            sublist.helpText = "NOTE: Only rows with Sales Order selected will be processed. Once processed, it will be excluded from this list.";
 
                

            sublist.addField({
                id : SL_OBJ.SUBLIST.CUSTOMERPARENT,
                type : ui.FieldType.TEXT,
                label : 'Customer (Parent)'
            });

            sublist.addField({
                id : SL_OBJ.SUBLIST.CUSTOMERPARENTID,
                type : ui.FieldType.TEXT,
                label : 'Customer (Parent) ID'
            });


            sublist.addField({
                id : SL_OBJ.SUBLIST.CLOSETYPE,
                type : ui.FieldType.TEXT,
                label : 'Close Type'
            });


            sublist.addField({
                id : SL_OBJ.SUBLIST.USAGECOUNT,
                type : ui.FieldType.TEXT,
                label : 'Close Usage'
            });

            var soList = sublist.addField({
                id : SL_OBJ.SUBLIST.SALESORDER,
                type : ui.FieldType.SELECT,
                label : 'Sales Order'
            });


           var searchResultsArr =  generateSublistResults(context,objFilters);

           ///sort by parent name
           searchResultsArr.sort(function(a, b){
            if(a.stParentTenant < b.stParentTenant) { return -1; }
            if(a.stParentTenant > b.stParentTenant) { return 1; }
            return 0;
            })


           ///Display sublist results
           var j = 0;
           
           var csvContents = "";
           log.debug('searchResultsArr',searchResultsArr);
           csvContents += 'Customer (Parent)' + ',' + 'Close Type' + ',' + 'Close Usage' + '\n';
           searchResultsArr.forEach(function (result) {



                sublist.setSublistValue({
                        id : SL_OBJ.SUBLIST.CUSTOMERPARENT,
                        line : j,
                        value : result.stParentTenant
               });

                if(isEmpty(result.intParentTenant)){
                    sublist.setSublistValue({
                        id : SL_OBJ.SUBLIST.CUSTOMERPARENTID,
                        line : j,
                        value : ' '
                    });
                }
                else{
                    sublist.setSublistValue({
                        id : SL_OBJ.SUBLIST.CUSTOMERPARENTID,
                        line : j,
                        value : result.intParentTenant
                    });
                }


                sublist.setSublistValue({
                    id : SL_OBJ.SUBLIST.CLOSETYPE,
                    line : j,
                    value : result.stCloseType
                });

                sublist.setSublistValue({
                    id : SL_OBJ.SUBLIST.USAGECOUNT,
                    line : j,
                    value : result.intUsageCount
                });


                
                j++;
                csvContents+=removeSymbol(",",result.stParentTenant)+removeSymbol(",",result.stCloseType)+','+removeSymbol(",",result.intUsageCount) +'\n';
            });

            var csvFile = file.create({
                name:'Close Hybrid Suitelet.csv',
                fileType: file.Type.CSV,
                contents: csvContents
            });	
            
            csvFile.folder = CSVFolder;
            var fileId = csvFile.save();

            var fileObj = file.load({
                id: fileId
            });

            var fileURL = fileObj.url;

             ///Add Export Button

            form.addButton({
                id : 'custpage_exportsuitelet',
                label : 'Export (CSV)',
                functionName:  'exportSuitelet('+JSON.stringify(fileURL)+')'
            });


            return context.response.writePage(form);

        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    function generatePostForm(context){
        LOG_NAME = 'generatePostForm'
        try{
            var form = ui.createForm({
                title: SL_OBJ.MAIN.POSTFORM
            });

            ///Set Client Script
            form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;

            
            var messagegroup = form.addFieldGroup({
                id : 'custpage_messagegroup',
                label : ' '
            });

            var stPostMessage = form.addField({
                id : SL_OBJ.MAIN.POSTMESSAGE,
                type : ui.FieldType.INLINEHTML,
                label : 'Transforming Sales Order to Invoices',
                container: 'custpage_messagegroup'
            });

            stPostMessage.defaultValue = '<p style="font-size:20px;">Processing the following transactions. You should receive an email once completed. Please wait for the process to be completed before subnmitting a new set of records.';

           /* var stPostLinks = form.addField({
                id : SL_OBJ.MAIN.POSTLINKS,
                type : ui.FieldType.INLINEHTML,
                label : 'Links',
                container: 'custpage_messagegroup'
            });

            stPostLinks.defaultValue = '<a href="https://4454725-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=1394&whence=">(GROUPED) Close Hybrid Transactions</a><br><a href="https://4454725-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=1361&saverun=T&whence=">(INDIVIDUAL) Close Hybrid Transactions</a>';*/

            
            messagegroup.isSingleColumn = true;
                       
            form.addButton({
                id : 'custpage_goback',
                label : 'Go Back',
                functionName:  "goBack()"
            });

            
            var sublist = form.addSublist({
                id : SL_OBJ.SUBLIST.ID,
                type : ui.SublistType.LIST,
                label : 'PROCESSING'
            });

            
            sublist.addField({
                id : SL_OBJ.SUBLIST.CUSTOMERPARENT,
                type : ui.FieldType.TEXT,
                label : 'Customer (Parent)'
            });


            sublist.addField({
                id : SL_OBJ.SUBLIST.CLOSETYPE,
                type : ui.FieldType.TEXT,
                label : 'Close Type'
            });


            sublist.addField({
                id : SL_OBJ.SUBLIST.USAGECOUNT,
                type : ui.FieldType.TEXT,
                label : 'Close Usage'
            });

            var soField = sublist.addField({
                id : SL_OBJ.SUBLIST.SALESORDER,
                type : ui.FieldType.TEXT,
                label : 'Sales Order'
            });

            soField.updateDisplaySize({
                height : 10,
                width : 10
            });
            
        ///Gets the sublist results from request to post
        var sublistResults = context.request.parameters.params_cwgp_objsublist;
        sublistResults = JSON.parse(sublistResults);
        log.debug('sublistResults',sublistResults);

           var j = 0;
           for(var x = 0; x < sublistResults.length;x++){
                    sublist.setSublistValue({
                            id : SL_OBJ.SUBLIST.CUSTOMERPARENT,
                            line : x,
                            value : sublistResults[x].customerparent
                    });

                    sublist.setSublistValue({
                        id : SL_OBJ.SUBLIST.CLOSETYPE,
                        line : x,
                        value : sublistResults[x].closetype
                    });

                    sublist.setSublistValue({
                        id : SL_OBJ.SUBLIST.USAGECOUNT,
                        line : x,
                        value : sublistResults[x].usagecount
                    });

                    if(!isEmpty(sublistResults[x].salesorder)){
                        sublist.setSublistValue({
                            id : SL_OBJ.SUBLIST.SALESORDER,
                            line : x,
                            value : sublistResults[x].salesorder
                        });
                    }
            };


            return context.response.writePage(form);
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    function callMapReduce(context){
        ///Gets the sublist results from request to post
        var sublistResults = context.request.parameters.params_cwgp_objsublist;
        var dateFrom = context.request.parameters.cwgp_params_datefrom;
        var dateTo = context.request.parameters.cwgp_params_dateto;
        sublistResults = JSON.parse(sublistResults);
        log.debug('sublistResults M/R',sublistResults);
        log.debug('MR| dateFrom | dateTo M/R', dateFrom + '|' + dateTo);

        var params = new Object();
        params['custscript_cwgp_objsublist'] = sublistResults;
        params['custscript_cwgp_datefrom'] = dateFrom;
        params['custscript_cwgp_dateto'] = dateTo;
        params['custscript_cwgp_currentusersotoinv'] = runtime.getCurrentUser().id;

        try{
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_cwgp_mr_closehybridmapreduc',
            });

            mrTask.params = params;
            mrTaskId = mrTask.submit();
            log.debug('mrTaskId', mrTaskId);
        }
        catch(e){
            ///Catch if first submission failed (no available deployment)
            var rec = record.create ({
                type: record.Type.SCRIPT_DEPLOYMENT,
                defaultValues: {
                    script: SL_OBJ.SCRIPTID.SOTOINV //scriptId
                 }
            });

            var recId = rec.save();

            if(!isEmpty(recId)){
                log.debug('No Available Deployment, Entering Retry');
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_cwgp_mr_closehybridmapreduc',
                });
    
                
                mrTask.params = params;
                mrTaskId = mrTask.submit();
                log.debug('re-try mrTaskId', mrTaskId);

            }
        }
    }

    function generateSublistResults(context,objFilters){
        LOG_NAME = 'generateSublistResults';
        try{
            var arrResults = [];
            var objRes = {};
            var objSearch = search.load({id: SL_OBJ.SEARCH.HYBRID});   
            var paramDateFrom = objFilters.paramDateFrom;
            var paramDateTo = objFilters.paramDateTo;  

            ///Filter sublist results with date range
            if(isEmpty(paramDateFrom) && isEmpty(paramDateTo)){
                var stFirstDay = firstDayInPreviousMonth();
                var stLastDay = lastDayInPreviousMonth();
                log.debug('stFirstDay | stLastDay', stFirstDay +'| ' + stLastDay);
                objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_firstsentatdate', operator: search.Operator.WITHIN, values: [stFirstDay,stLastDay]})); 
            }
            else{
    
                /*var stDateFrom = new Date(paramDateFrom);
                var month = stDateFrom.getUTCMonth() + 1; //months from 1-12
                var day = stDateFrom.getUTCDate();
                var year = stDateFrom.getUTCFullYear();
                stDateFrom = month+'/'+day+'/'+year;

                var stDateTo = new Date(paramDateTo);
                var month = stDateTo.getUTCMonth() + 1; //months from 1-12
                var day = stDateTo.getUTCDate();
                var year = stDateTo.getUTCFullYear();
                stDateTo = month+'/'+day+'/'+year;*/

                var stDateFrom = paramDateFrom;
                var stDateTo = paramDateTo;

                log.debug('stDateFrom | stDateTo', stDateFrom +'| ' + stDateTo);
                objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_firstsentatdate', operator: search.Operator.WITHIN, values: [stDateFrom,stDateTo]})); 
            }
            //objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_invoicenumber', operator: search.Operator.ANYOF, values:"@NONE@"})); 
            objSearch.filters.push(search.createFilter({name: 'custrecord_cwgp_isprocessed', operator: search.Operator.NONEOF, values:"1"}));
            var searchResultCount = objSearch.runPaged().count;
            log.debug('search results count', searchResultCount);
            objSearch.run().each(function(result){
                    objRes = {
                      	'stParentTenant': result.getText({name:"custrecord_cwgp_parenttenant", summary: "GROUP"}),
                        'intParentTenant': result.getValue({name:"custrecord_cwgp_parenttenant", summary: "GROUP"}),
                        'stCloseType': result.getValue({name:"custrecord_cwgp_closingtype", summary: "GROUP"}),
                        'intUsageCount': result.getValue({name:"custrecord_cwgp_closingid", summary: "COUNT"})
                    }
                    arrResults.push(objRes);
                return true;    
            });
            log.debug('arrResults',arrResults);

            return arrResults;
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


    function firstDayInPreviousMonth() {
        var dt = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        var timezone = config.load({type: config.Type.USER_PREFERENCES}).getValue({fieldId: "TIMEZONE"})
        var dt2 = format.format({value: dt, type: format.Type.DATE, timezone: timezone})
        
        return dt2;

        //return ((dt2.getMonth() > 8) ? (dt2.getMonth() + 1) : ('0' + (dt2.getMonth() + 1))) + '/' + ((dt2.getDate() > 9) ? dt2.getDate() : ('0' + dt2.getDate())) + '/' + dt2.getFullYear()    
    }

    function lastDayInPreviousMonth() {
       var dt =  new Date(new Date().getFullYear(), new Date().getMonth(), 0);
       var timezone = config.load({type: config.Type.USER_PREFERENCES}).getValue({fieldId: "TIMEZONE"})
       var dt2 = format.format({value: dt, type: format.Type.DATE, timezone: timezone})

       return dt2;
       
       //return ((dt.getMonth() > 8) ? (dt.getMonth() + 1) : ('0' + (dt.getMonth() + 1))) + '/' + ((dt.getDate() > 9) ? dt.getDate() : ('0' + dt.getDate())) + '/' + dt.getFullYear()    
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
        onRequest: onRequest
    }
});