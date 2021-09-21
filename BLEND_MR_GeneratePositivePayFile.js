/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */

 
 /**
 * Author: Paolo Miguel Escalona
 * Date:  2021-04-13  
 * 
 * Date         Modified By             Notes
 * 2021-04-13   Paolo Miguel Escalona   Initial script creation
 * 2021-09-09	Paolo Miguel Escalona	Set checkbox 'Positve Pay Generated' to true
 */

var MR_OBJ = {
    FIELDS: {
        VENDORNAME: 'custrecord_cwgp_vendorname', //list-record - vendor
    },
    PARAMS: {
        POSITIVEPAY: 'custscript_cwgp_params_positivepaysearch',
    },
}

var LOG_NAME;
var PARENT_FILE = 334307;
var PARENT_FOLDER = 2072408;
define(['N/search','N/runtime','N/file','N/record'], function(search,runtime,file,record) {

    function getInputData() {
        LOG_NAME = 'getInputData';
        try{

            ///Delets contents from the Parent File
            var fileObj = file.create({
                name: 'PARENTFILE_DO_NOT_DELETE.txt',
                fileType: file.Type.PLAINTEXT,
                contents: '',
                description: '',
                encoding: file.Encoding.UTF8,
                folder: PARENT_FOLDER,
                isOnline: true
            });

            fileObj.save();

            var stPositivePaySearch = runtime.getCurrentScript().getParameter({name: MR_OBJ.PARAMS.POSITIVEPAY});
            
        	var objPositivePaySearch = search.load({
        	    id: stPositivePaySearch
        	});

            var positivePayResult = [];
            var count = 0;
            var pageSize = 1000;
            var start = 0;

            do {
                var objResultSet = objPositivePaySearch.run().getRange({
                    start : start,
                    end : start + pageSize
                });
        
                positivePayResult = positivePayResult.concat(objResultSet);
                count = objResultSet.length;
                start += pageSize;
        
            } while (count == pageSize);
        
        	log.debug(LOG_NAME,positivePayResult.length);
            return positivePayResult;

           /*return transactionSearchObj = search.create({
            type: "transaction",
            filters:
            [
               ["mainline","is","T"], 
               "AND", 
               ["type","anyof","Check","VendPymt"], 
               "AND", 
               ["custbody_2663_reference_num","isempty",""], 
               "AND", 
               ["custbody_9997_is_for_ep_eft","is","F"], 
               "AND", 
               ["tobeprinted","is","F"], 
               "AND", 
               ["account","anyof","440","951","1005","1028","1144","1016","1076","1145","1167","1376","1377","1378"], 
               "AND", 
               ["formulanumeric: case when regexp_like({tranid}, '[^a-zA-Z0-9\\-\\@\\<\\>]') then 1 else 0 end","equalto","0"], 
               "AND", 
               ["formulatext: {tranid}","isnotempty",""]
            ],
            columns:
            [
               search.createColumn({
                  name: "formulatext_1",
                  formula: "'321081669'",
                  sort: search.Sort.DESC,
                  label: "Routing Number"
               }),
               search.createColumn({
                  name: "formulatext_2",
                  formula: "Case when {account} = '10012 Cash & Cash Equivalents : Operating Accounts : FRB x4544' Then '80000974544' when {account} ='10015 Cash & Cash Equivalents : Operating Accounts : FRB x4027' then '80006724027' when {account} = '10017 Cash & Cash Equivalents : Operating Accounts : FRB x1207' then '80007791207' when {account} = '10020 Cash & Cash Equivalents : Operating Accounts : FRB x4893' then '80008304893' when {account} = '10022 Cash & Cash Equivalents : Operating Accounts : FRB x4041' then '80009144041' when {account} = '10031 Cash & Cash Equivalents : Operating Accounts : FRB x1277' Then '80009641277' when {account} = '10033 Cash & Cash Equivalents : Operating Accounts : FRB x1418' then '80009641418' when {account} = '10032 Cash & Cash Equivalents : Operating Accounts : FRB x1343' then '80009641343' when {account} = '10026 Cash & Cash Equivalents : Operating Accounts : FRB x6088' then '80009476088' end",
                  sort: search.Sort.DESC,
                  label: "Account Number"
               }),
               search.createColumn({
                  name: "formulatext_3",
                  formula: "LPAD({tranid}, 12, '0')",
                  sort: search.Sort.DESC,
                  label: "Check No. "
               }),
               search.createColumn({
                  name: "formulatext_4",
                  formula: "TO_CHAR(ABS{amount}, 'FM0000000009D00')",
                  sort: search.Sort.DESC,
                  label: "Amount"
               }),
               search.createColumn({
                  name: "formulatext_5",
                  formula: "TO_CHAR({trandate},'MM/DD/YYYY')",
                  sort: search.Sort.DESC,
                  label: "Date"
               }),
               search.createColumn({
                  name: "formulatext_6",
                  formula: "Case when {status}  = 'Voided' then 'V' ELSE 'I' end",
                  sort: search.Sort.DESC,
                  label: "Issued or Void"
               }),
               search.createColumn({
                  name: "formulatext_7",
                  formula: "Replace({name},',' , '')",
                  sort: search.Sort.DESC,
                  label: "Payee"
               }),
              search.createColumn({name: "type", label: "Type"})
                ]
            });*/
        }
        catch(e){
            log.error(LOG_NAME,e);
        }
    }

    function map(context) {
        LOG_NAME = 'map';
        try{
            var objSearchResult = JSON.parse(context.value);
            log.debug('objSearchResult',objSearchResult);

            var stRoutingNum = objSearchResult.values.formulatext;
            var stAccountNum = objSearchResult.values.formulatext_1;
            var stCheckNum = objSearchResult.values.formulatext_2;
            var stAmount = objSearchResult.values.formulatext_3;
            var stDate = objSearchResult.values.formulatext_4;
            var stIssueOrVoid = objSearchResult.values.formulatext_5;
            var stPayee = objSearchResult.values.formulatext_6;
          	var stType = objSearchResult.values.type[0].text;
          	var intId = objSearchResult.id;

            log.debug('variables', 'stRoutingNum: ' + stRoutingNum + ' | stAccountNum: ' + stAccountNum + ' | stCheckNum: ' + stCheckNum + ' | stAmount: ' + stAmount + ' | stDate: ' + stDate + ' | stIssueOrVoid: ' + stIssueOrVoid + ' | stPayee: ' + stPayee + '| stType: ' + stType + '| intId: ' + intId);


          
          	///Load and append values to parent file
            var fileObj = file.load({
                id: PARENT_FILE
            });
            fileObj.appendLine({
                value: stRoutingNum +','+stAccountNum+','+stCheckNum+','+stAmount+','+stDate+','+stIssueOrVoid+','+stPayee
            });

            fileObj.save();
          
            if(stType == 'Bill Payment'){
              record.submitFields({
                  type: record.Type.VENDOR_PAYMENT,
                  id: intId,
                  values: {
                      custbody_cwgp_positivepaygenerated: true
                  },
                  options: {
                      enableSourcing: false,
                      ignoreMandatoryFields : true
                  }
              });
            }
         	else if(stType == 'Check'){
               record.submitFields({
                    type: record.Type.CHECK,
                    id: intId,
                    values: {
                        custbody_cwgp_positivepaygenerated: true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields : true
                    }
                });
          	}


        }
        catch(e){
            log.debug(LOG_NAME,e);
        }
    }

    function reduce(context) {

    }

    function summarize(summary) {
        LOG_NAME = 'summarize'
        try{
            ///Load parent file and get contents
            var fileObj = file.load({
                id: PARENT_FILE
            });

            log.debug(LOG_NAME, 'parentfile size: ' + fileObj.size);

            if(fileObj.size > 0){
                function getDateTime(dt) {
                    var res = "";
                    res += formatdigits(dt.getMonth() + 1);
                    res += formatdigits(dt.getDate());
                    res += formatdigits(dt.getFullYear());
                    res += formatdigits(dt.getHours() > 12 ? dt.getHours() - 12 : dt.getHours());
                    res += formatdigits(dt.getMinutes());
                    res += formatdigits(dt.getSeconds());
                    return res;
                }
                function formatdigits(val) {
                    val = val.toString();
                    return val.length == 1 ? "0" + val : val;
                }
                
                var stDateTime = getDateTime(new Date);

                ///Create new file and append parent contents
                var newfileObj = file.create({
                    name: 'Blendlabs_to_FRB_PositivePay_'+stDateTime+'.txt',
                    fileType: file.Type.PLAINTEXT,
                    contents: fileObj.getContents(),
                    description: '',
                    encoding: file.Encoding.UTF8,
                    folder: PARENT_FOLDER,
                    isOnline: true
                });

                log.debug('file name',newfileObj.name);
                var fileId = newfileObj.save();

                log.debug(LOG_NAME, 'New Positive Pay File Created with id: ' + fileId + 'and file name: ' + newfileObj.name);

            }
            else{
                log.debug(LOG_NAME, 'parentfile has no contents / 0 kb');
            }

        }
        catch(e){
            log.error(LOG_NAME,e)
        }
    }

    

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});