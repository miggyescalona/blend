/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Reference : [ BLEND_0022 ]
 * Date : 27 Aug 2020
 * Author : Arnold RJ Cruz
 * 
 *  Date Modified       Modified By         Notes
 *  27 Aug 2020        Arnold RJ Cruz      Initial Version
 *  7 July 2021        Miggy Escalona      Added PO# Column on Saved Search
 *  14 July 2021       Miggy Escalona      Added Related POs
 *  16 July 2021       Miggy Escalona	   Added Related PO count
 */

 var VB_OBJ = {
    MAIN : {
        VENDOR : 'entity',
        APPROVALSTATUS : 'approvalstatus',
        RECENTVB : 'custbody_cwgp_recentvendorbill',
        RELATEDPO: 'custbody_cwgp_relatedpurchaseorder',
        RELATEDPOCOUNT: 'custbody_cwgp_relatedpocount',
        INTERNALID: 'id'
    }
};

var __CONFIG = {
    APPROVAL_STATUS : {
        PENDING_APPROVAL : 1,
        OPEN : 2
    },
    EVENT_TYPE : ['create', 'copy']
};

var LOG_NAME;
var objRelatedPO = [];

define(['N/search'],
function(SEARCH) {

function beforeSubmit(scriptContext) {
    LOG_NAME = 'beforeSubmit';
    try {
        var newRec          = scriptContext.newRecord;
        var intVendor       = newRec.getValue(VB_OBJ.MAIN.VENDOR);
        var intApproval     = newRec.getValue(VB_OBJ.MAIN.APPROVALSTATUS);
        var intInternalId   = newRec.getValue(VB_OBJ.MAIN.INTERNALID)

        if(scriptContext.type == 'edit' && (__CONFIG.APPROVAL_STATUS.PENDING_APPROVAL == intApproval || __CONFIG.APPROVAL_STATUS.OPEN == intApproval)){                
                if(!isEmpty(intInternalId)){
                    objRelatedPurchaseOrder = getRelatedPurchaseOrder(intInternalId);
                    log.debug('objRelatedPO',JSON.stringify(objRelatedPO));
                }
                if(isEmpty(objRelatedPO)) { 
                        newRec.setValue(VB_OBJ.MAIN.RELATEDPO, null);
                } 
                else {
                    newRec.setValue(VB_OBJ.MAIN.RELATEDPO, JSON.stringify(objRelatedPO));
                    var intRelatedPOcount = objRelatedPO.map( (value) => value.ponum).filter( (value, index, _arr) => _arr.indexOf(value) == index);
                    newRec.setValue(VB_OBJ.MAIN.RELATEDPOCOUNT,intRelatedPOcount.length);
                }
                
        }

        if(__CONFIG.EVENT_TYPE.indexOf(scriptContext.type) == -1) return;
        

        log.debug('beforeSubmit', 'objParams: ' + 
            JSON.stringify({
                "Vendor Id" : intVendor,
                "Approval Status" : intApproval,
                "Internal ID": intInternalId
            })
        );


        if(__CONFIG.APPROVAL_STATUS.PENDING_APPROVAL != parseInt(intApproval)) return;
        var form = scriptContext.form;
        
        var objParams = {
            'vendorid' : intVendor
        };

        var objRecentVendorBill = getRecentVendorBill(objParams);
        log.debug(LOG_NAME, 'objRecentVendorBill: ' + JSON.stringify(objRecentVendorBill));

        if(isEmpty(objRecentVendorBill)) { 
            newRec.setValue(VB_OBJ.MAIN.RECENTVB, null);
        } else {
            newRec.setValue(VB_OBJ.MAIN.RECENTVB, JSON.stringify(objRecentVendorBill));
        }
      


    } catch(e) {
        log.error('ERROR', 
            JSON.stringify({
                "Error Code"    : e.code,
                "Error Message" : e.message,
                "Error Stack"   : e.stack
            })
        );
    }
}

function getRecentVendorBill(objParams) {
    var objResult = {};
    var objReturn = {};
    var arrReturn = [];
    var objSearch = SEARCH.create({
        type    : "transaction",
        filters :
        [
            ["type","anyof","VendBill"], 
            "AND", 
            ["mainline","is","T"],
            "AND", 
            ["name","anyof", objParams.vendorid],
            "AND", 
            ["status","noneof","VendBill:C"]
         ], 
        columns:
        [
            SEARCH.createColumn({
               name     : "datecreated",
               label    : "Date Created"
            }),
            SEARCH.createColumn({
                name    : "internalid", 
                label   : "Internal ID"
            }),
            SEARCH.createColumn({
                name    : "trandate", 
                sort     : SEARCH.Sort.DESC,
                label   : "Date"
            }),
            SEARCH.createColumn({
                name    : "tranid", 
                label   : "Document Number"
            }),
            SEARCH.createColumn({
                name    : "memomain", 
                label   : "Memo (Main)"
            }),
            SEARCH.createColumn({
                name    : "amount", 
                label   : "Amount"
            }),
            SEARCH.createColumn({
                name    : "statusref", 
                label   : "Status"
            }),
            SEARCH.createColumn({
                name    : "amountpaid", 
                label   : "Amount Paid"
            }),
            SEARCH.createColumn({
                name    : "custbody_cwgp_vbcreatedfrom", 
                label   : "Created From"
            })
        ]
    });

    var objResult = objSearch.run();
    var loop = 0;
    objResult.each(function(element) {
        if(loop != 5) {
            objReturn = {
                id : element.getValue('internalid'),
                trandate : element.getValue('trandate'),
                docnum : element.getValue('tranid'),
                memo : element.getValue('memomain'),
                amount : element.getValue('amount'),
                status : element.getText('statusref'),
                amountpaid : element.getValue('amountpaid'),
                createdfrom: element.getValue('custbody_cwgp_vbcreatedfrom')
            }
            arrReturn.push(objReturn);
            loop++;
            return true;
        } else {
            return;
        }
    });
    
    return arrReturn;
    
}

function getRelatedPurchaseOrder(internalid){
    var objResult = {};
    var objReturn = {};
    var arrReturn = [];
    var objSearch = SEARCH.create({
        type: "transaction",
        filters:
        [
           ["internalid","anyof",internalid], 
           "AND", 
           ["appliedtotransaction.type","anyof","PurchOrd"]
        ],
        columns:
        [
           SEARCH.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"}),
           SEARCH.createColumn({
              name: "formulatext",
              formula: "{appliedToTransaction.tranid}",
              label: "PO #"
           }),
           SEARCH.createColumn({
              name: "item",
              join: "appliedToTransaction",
              label: "Item"
           }),
           SEARCH.createColumn({
              name: "amount",
              join: "appliedToTransaction",
              label: "Amount"
           }),
           SEARCH.createColumn({
              name: "memo",
              join: "appliedToTransaction",
              label: "Memo"
           }),
           SEARCH.createColumn({
              name: "custcol_cwgp_startdate",
              join: "appliedToTransaction",
              label: "Start Date"
           }),
           SEARCH.createColumn({
              name: "custcol_cwgp_enddate",
              join: "appliedToTransaction",
              label: "End Date"
           }),
           SEARCH.createColumn({
              name: "department",
              join: "appliedToTransaction",
              label: "Department"
           }),
           SEARCH.createColumn({
                name: "formulatext_2",
                formula: "case when {status} = 'Open' then {amount} else 0 end",
                label: "Approved Bills [e]"
            }),
           SEARCH.createColumn({
                name: "internalid",
                join: "appliedToTransaction",
                label: "Internal ID"
            }),
        ]
     });
     var searchResultCount = objSearch.runPaged().count;
     log.debug('searchResultCount',searchResultCount);
     if(searchResultCount > 0){
        var objResult = objSearch.run();
        objResult.each(function(element) {
                /*objReturn = {
                    ponum : element.getValue('formulatext'),
                    item : element.getText({name: 'item', join:'appliedToTransaction'}),
                    memo : element.getValue({name: 'memo', join:'appliedToTransaction'}),
                    amount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                    poamount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                    startdate : element.getValue({name: 'custcol_cwgp_startdate', join:'appliedToTransaction'}),
                    enddate : element.getValue({name: 'custcol_cwgp_enddate', join:'appliedToTransaction'}),
                    department: element.getText({name: 'department', join:'appliedToTransaction'}),
                    internalid : element.getValue({name: 'internalid', join:'appliedToTransaction'})
                }*/

                if (objRelatedPO.length > 0) {
                    temp = objRelatedPO.filter(function(arrLines) {
                        return arrLines.internalid == element.getValue({name:"internalid", join:"appliedToTransaction"});
                    });

                    if(temp.length == 0){
                        var objLines = {
                            ponum : element.getValue('formulatext'),
                            item : element.getText({name: 'item', join:'appliedToTransaction'}),
                            memo : element.getValue({name: 'memo', join:'appliedToTransaction'}),
                            amount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                            poamount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                            startdate : element.getValue({name: 'custcol_cwgp_startdate', join:'appliedToTransaction'}),
                            enddate : element.getValue({name: 'custcol_cwgp_enddate', join:'appliedToTransaction'}),
                            department: element.getText({name: 'department', join:'appliedToTransaction'}),
                            approvedbillsamt : element.getValue('formulatext_2'),
                        };

                        objRelatedPO.push(objLines);
                    }
                    else{
                        if(temp[0].internalid == element.getValue({name:"internalid", join:"appliedToTransaction"})){
                            var poamt = parseFloat(temp[0].poamount) + parseFloat(element.getValue({name: 'amount', join:'appliedToTransaction'}));
                            var apprvbill = parseFloat(temp[0].approvedbillsamt) + parseFloat(element.getValue('formulatext_2'));
                            
                            temp[0].poamount = JSON.stringify(poamt - apprvbill);
                            temp[0].approvedbillsamt = JSON.stringify(apprvbill);
                        }
                    }
                }

                if(objRelatedPO.length == 0){
                    var objLines = {
                        ponum : element.getValue('formulatext'),
                        item : element.getText({name: 'item', join:'appliedToTransaction'}),
                        memo : element.getValue({name: 'memo', join:'appliedToTransaction'}),
                        amount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                        poamount : element.getValue({name: 'amount', join:'appliedToTransaction'}),
                        startdate : element.getValue({name: 'custcol_cwgp_startdate', join:'appliedToTransaction'}),
                        enddate : element.getValue({name: 'custcol_cwgp_enddate', join:'appliedToTransaction'}),
                        department: element.getText({name: 'department', join:'appliedToTransaction'}),
                        approvedbillsamt : element.getValue('formulatext_2'),
                    };

                    objRelatedPO.push(objLines);
                }
                //arrReturn.push(objReturn);
                return true;
        });
    }
     //return arrReturn;
}

function isEmpty(stValue) {
    try {
        return ((stValue === '' || stValue == null || stValue == undefined) ||
            (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object && (function(v) { for (var k in v) return false; return true; })(stValue)));
    } catch (e) {
        return true;
    }
}


return {
    beforeSubmit: beforeSubmit
}

});