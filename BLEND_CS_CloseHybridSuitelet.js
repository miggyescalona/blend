/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

/**
 * 
 * Date : 14 May 2021   
 * Author : Paolo Escalona
 * 
 *  Date Modified       Modified By         Notes
 *  14 May 2021         Paolo Escalona      Initial Version
 *  26 May 2021         Paolo Escalona      Remove customer child and and tenant on Save Record function
 *  14 June 2021	    Paolo Escalona		Filters Sales Orders by Close Hybrid Items
 *  28 October 2021		Paolo Escalona		Exclude Sales Orders that are End Dates are beyond the Date To on the Suitelet filter
 *  11 November 2021	Paolo Escalona		Exclude Sales Orders that are End Dates are before the Date To on the Suitelet filter
 * 16 December 2021		Paolo Escalona		Change get date values from get value to get text
 */


 var CS_OBJ = {
    MAIN: {
        DATEFROM: 'custpage_cwgp_datefrom',
        DATETO: 'custpage_cwgp_dateto'
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
    PARAMS: {
        DATEFROM: 'cwgp_params_datefrom',
        DATETO: 'cwgp_params_dateto',
        HTTPSTYPE: 'params_cwgp_httpstype'
    },
    SEARCH: {
        SALESORDER: 'customsearch_cwgp_script_customersalesor'
    }
}

var LOG_NAME;
var arrSublist = [];
define(['N/currentRecord','N/format','N/url','N/ui/dialog','N/ui/message','N/search','N/runtime'], function(currentRecord,format,url,dialog,message,search,runtime) {

    var rec = currentRecord.get();

    function pageInit(context) {
        LOG_NAME = 'pageInit: ';
        try{
            console.log(LOG_NAME);
            console.log(getParameterFromURL(CS_OBJ.PARAMS.HTTPSTYPE));
            console.log(runtime.getCurrentUser().id)
            if(isEmpty(getParameterFromURL(CS_OBJ.PARAMS.DATEFROM)) && isEmpty(getParameterFromURL(CS_OBJ.PARAMS.DATETO))){
                rec.setValue(CS_OBJ.MAIN.DATEFROM, firstDayInPreviousMonth(new Date));
                rec.setValue(CS_OBJ.MAIN.DATETO, lastDayInPreviousMonth(new Date));
            }
            if(getParameterFromURL(CS_OBJ.PARAMS.HTTPSTYPE) != 'post'){
                var sublistCount = rec.getLineCount({
                    sublistId: CS_OBJ.SUBLIST.ID
                });
                var scriptObj = runtime.getCurrentScript();
                console.log("Remaining usage units before: " + scriptObj.getRemainingUsage());



                var objSO = {};
                var arrSO = [];
                var arrCusParentID = [];

                ////Put all customer IDs into an array
                for(var x = 0;x < sublistCount; x++){
                    var intCusParentID = rec.getSublistValue({
                        sublistId: CS_OBJ.SUBLIST.ID,
                        fieldId: CS_OBJ.SUBLIST.CUSTOMERPARENTID,
                        line: x
                    });

                    if(intCusParentID != ' '){
                        arrCusParentID.push(intCusParentID);
                    }
                }


                ///Get all Sales Orders and put into an object
                var objSearch = search.load({id: CS_OBJ.SEARCH.SALESORDER});   
                objSearch.filters.push(search.createFilter({name: 'name', operator: search.Operator.ANYOF, values: arrCusParentID})); 
                console.log('dateTo: ' + rec.getValue(CS_OBJ.MAIN.DATETO));
                console.log('dateToString: ' + dateToString(rec.getValue(CS_OBJ.MAIN.DATETO)));
              	objSearch.filters.push(search.createFilter({name: 'enddate', operator: search.Operator.AFTER, values: dateToString(rec.getValue(CS_OBJ.MAIN.DATETO))}));
                var searchResultCount = objSearch.runPaged().count;
                objSearch.run().each(function(result){ 
                    objSO = {
                        'intCustomer': result.getValue({name:"entity", summary:"GROUP"}),
                        'intIntId': result.getValue({name:"internalid", summary:"GROUP"}),
                        'intTranId': result.getValue({name:"tranid", summary:"GROUP"})
                    };
                    arrSO.push(objSO);
                    return true;    
                });



                ///Populate select field using the object created to fetch all the SO numbers
                for(var x = 0;x < sublistCount; x++){
                    var soField = rec.getSublistField({
                        sublistId: CS_OBJ.SUBLIST.ID,
                        fieldId: CS_OBJ.SUBLIST.SALESORDER,
                        line: x
                    });

                    var sublistFieldValue = rec.getSublistValue({
                        sublistId: CS_OBJ.SUBLIST.ID,
                        fieldId: CS_OBJ.SUBLIST.CUSTOMERPARENTID,
                        line: x
                    });

                    soField.removeSelectOption({value: null});
                    soField.insertSelectOption({
                        value: '',
                        text: ''
                    });
                    for (var key in arrSO) {
                        if (arrSO.hasOwnProperty(key)) {
                            if(arrSO[key].intCustomer == sublistFieldValue){
                                soField.insertSelectOption({
                                    value: arrSO[key].intIntId,
                                    text: arrSO[key].intTranId
                                });
                            }
                        }
                    }
                }
                console.log("Remaining usage units after: " + scriptObj.getRemainingUsage());
            }
        }
        catch(e){
            console.log(LOG_NAME + e.message);
        }
    }


    function fieldChanged(context) {
        
    }

    function saveRecord(){
        LOG_NAME = 'saveRecord: ';
        try{
            ///Dialog/Warning Submit Filters
              var options = {
                title: "Submit Records",
                message: "Do you want to submit the records?"
            };
            
            function success(result) {
                console.log("Success with value " + result);
                if(result){
                    if (window.onbeforeunload) {
                        window.onbeforeunload = function () {
                            null;
                        };
                    };



                    for(var x = 0;x< rec.getLineCount(CS_OBJ.SUBLIST.ID);x++){
                        var objLines = {
                                customerparent: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.CUSTOMERPARENT,
                                    line: x
                                }),
                                customerparentid: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.CUSTOMERPARENTID,
                                    line: x
                                }),
                               /* customerchild: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.CUSTOMERCHILD,
                                    line: x
                                }),
                                tenant: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.TENANT,
                                    line: x
                                }),*/
                                closetype: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.CLOSETYPE,
                                    line: x
                                }),
                                usagecount: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.USAGECOUNT,
                                    line: x
                                }),
                                salesorder: rec.getSublistText({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.SALESORDER,
                                    line: x
                                }),
                                salesorderid: rec.getSublistValue({
                                    sublistId: CS_OBJ.SUBLIST.ID,
                                    fieldId: CS_OBJ.SUBLIST.SALESORDER,
                                    line: x
                                })

                        };
                        ///If sales order is not populated, push to object
                        if(objLines.salesorder != ''){
                            arrSublist.push(objLines);
                        }
                    }

                    objSublist = {
                        'intSublistCount': rec.getLineCount(CS_OBJ.SUBLIST.ID),
                    }

                    var dateFrom = rec.getText(CS_OBJ.MAIN.DATEFROM);
                    var dateTo = rec.getText(CS_OBJ.MAIN.DATETO);
        
                    if(isEmpty(arrSublist)){
                        myMsg4 = message.create({
                            title: 'Invalid Submission',
                            message: 'No Sales Order has been selected on any row.',
                            type: message.Type.ERROR
                        });
                        myMsg4.show();
                        return false;
                    }
                    else{
                        document.location = url.resolveScript({
                            scriptId: getParameterFromURL('script'),
                            deploymentId: getParameterFromURL('deploy'),
                            params: {
                                'params_cwgp_httpstype': 'post',
                                'params_cwgp_objsublist': JSON.stringify(arrSublist),
                                'cwgp_params_datefrom': dateFrom,
                                'cwgp_params_dateto': dateTo,
                            }
                        });
                    }
                }
            }
            
            function failure(reason) {
                console.log("Failure: " + reason);
            }

            dialog.confirm(options).then(success).catch(failure);

        }
        catch(e){
            console.log(LOG_NAME + e.message);
        }
    }

    function exportSuitelet(fileURL){
        LOG_NAME = 'exportSuitelet: ';
        try{
            window.open('https://4454725-sb1.app.netsuite.com' + fileURL);
        }
        catch(e){
            console.log(LOG_NAME + e);
        }
    }

    function submitFilters(){
        LOG_NAME = 'submitFilters: ';
        try{
            console.log(LOG_NAME);
            var dateFrom = rec.getText(CS_OBJ.MAIN.DATEFROM);
            var dateTo = rec.getText(CS_OBJ.MAIN.DATETO);


            ///Dialog/Warning Submit Filters
            var options = {
                title: "Submit Filters",
                message: "Do you want to submit the filters?"
            };
            
            function success(result) {
                console.log("Success with value " + result);
                if(result){
                    if (window.onbeforeunload) {
                        window.onbeforeunload = function () {
                            null;
                        };
                    };
        
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            'cwgp_params_datefrom': dateFrom,
                            'cwgp_params_dateto': dateTo,
                        }
                    });
                }
            }
            
            function failure(reason) {
                console.log("Failure: " + reason);
            }

            dialog.confirm(options).then(success).catch(failure);


            
        }
        catch(e){
            console.log(LOG_NAME + e.message);
        }
    }

    function goBack(){
        LOG_NAME = 'goBack: '
        try{
            console.log(LOG_NAME);
            var dateFrom = rec.getValue(CS_OBJ.MAIN.DATEFROM);
            var dateTo = rec.getValue(CS_OBJ.MAIN.DATETO);


            ///Dialog/Warning Submit Filters
            var options = {
                title: "Go Back",
                message: "Go back to previous page?"
            };
            
            function success(result) {
                console.log("Success with value " + result);
                if(result){
                    if (window.onbeforeunload) {
                        window.onbeforeunload = function () {
                            null;
                        };
                    };
        
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            'params_cwgp_httpstype': 'get',
                            'cwgp_params_datefrom': (getParameterFromURL(CS_OBJ.PARAMS.DATEFROM)).replaceAll('+', ' '),
                            'cwgp_params_dateto': (getParameterFromURL(CS_OBJ.PARAMS.DATETO)).replaceAll('+', ' '),
                        }
                    });
                }
            }
            
            function failure(reason) {
                console.log("Failure: " + reason);
            }

            dialog.confirm(options).then(success).catch(failure);
        }
        catch(e){
            console.log(LOG_NAME + e.message);
        }
    }


    function getParameterFromURL(param) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == param) {
                return decodeURIComponent(pair[1]);
            }
        }
        return (false);
    }
    

    function isEmpty(value) {

        if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) {
            return true;
        }
        return false;
    }

    function dateToString(dt){
       return ((dt.getMonth() > 8) ? (dt.getMonth() + 1) : ('0' + (dt.getMonth() + 1))) + '/' + ((dt.getDate() > 9) ? dt.getDate() : ('0' + dt.getDate())) + '/' + dt.getFullYear()  
    }


    function firstDayInPreviousMonth(yourDate) {
        var dt = new Date(yourDate.getFullYear(), yourDate.getMonth() - 1, 1);
        return parsedDateStringAsRawDateObject = format.parse({
            value: dt,
            type: format.Type.DATE
          });
          
    }

    function lastDayInPreviousMonth(yourDate) {
        var dt =  new Date(yourDate.getFullYear(), yourDate.getMonth(), 0);
        return parsedDateStringAsRawDateObject = format.parse({
            value: dt,
            type: format.Type.DATE
          });
    }

    


    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        submitFilters: submitFilters,
        goBack: goBack,
        exportSuitelet: exportSuitelet
    }
});