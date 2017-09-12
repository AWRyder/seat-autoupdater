var _ = require("lodash");
var request = require("request");
var suspend = require('suspend');
var Log = require('log');
var jf = require('json-file');

var settings = jf.read('env.json').data;

var log = new Log(settings.logLevel);

var token = settings.token;
var endpointBase = settings.endpointBase;
var expectedCorpID = settings.expectedCorpID;
var roleName = settings.roleName;
var roleId = settings.roleId;

var endpoints = {
    listUsers: '/user',
	userDetail: '/user/{name}',
	keyDetail: '/key/{key_id}',
	roleCheck: '/role/query/role-check/{user_identifier}/{role_identifier}',
    addRole: '/role/grant-user-role/{user_id}/{role_id}',
    revokeRole: '/role/revoke-user-role/{user_id}/{role_id}'
};


//Main body
function main(){

	log.info("Starting...");

    suspend(function*(){
        let data = yield callAPI('listUsers',{},suspend.resume());
        let users = JSON.parse(data.body);

        for(let user of users){
            let data = yield callAPI('userDetail', {name: user.name}, suspend.resume());
            let userDetails = JSON.parse(data.body);

            let userHasCharInCorp = false;
            for(let key of userDetails.keys){
                let data = yield callAPI('keyDetail', {key_id: key.key_id}, suspend.resume());
                let keyDetails = JSON.parse(data.body);

                for(let char of keyDetails.characters){
                    if ( char.corporationID==expectedCorpID ) { userHasCharInCorp = true; break; }
                }
            }

            /*
                // Role Check doesn't seem to be working correctly. Talk with SeAT support about this,

            data = yield callAPI('roleCheck', {user_identifier: user.name, role_identifier: roleName}, suspend.resume());
            let hasRole = JSON.parse(data.body);
            console.log(data.body);
            console.log("[DEBUG]: User "+user.name+ " does "+ (!hasRole?"not ":"") + "have the role and does " + (!userHasCharInCorp?"not ":"") + "have a character in corp." );

            if ( hasRole && !userHasCharInCorp ){
                data = yield callAPI('revokeRole', {user_id: user.id, role_id: roleId}, suspend.resume());
                let success = JSON.parse(data.body);
                if ( success ) console.log("Revoked role "+roleName+" from "+user.name);
            }
            else if ( !hasRole && userHasCharInCorp ) {
                data = yield callAPI('addRole', {user_id: user.id, role_id: roleId}, suspend.resume());
                let success = JSON.parse(data.body);
                if ( success ) console.log("Granted role "+roleName+" to "+user.name);
            }
            */
            if ( !userHasCharInCorp ){
                data = yield callAPI('revokeRole', {user_id: user.id, role_id: roleId}, suspend.resume());
                let success = JSON.parse(data.body);
                if ( success ) log.info("Revoked role "+roleName+" from "+user.name);
            }
            else if ( userHasCharInCorp ) {
                data = yield callAPI('addRole', {user_id: user.id, role_id: roleId}, suspend.resume());
                let success = JSON.parse(data.body);
                if ( success ) log.info("Granted role "+roleName+" to "+user.name);
            }
        }

        log.info("End.");
    })();

}
main();


function callAPI(ep,ops,callback){

	let finalEndpoint = endpoints[ep];

	_.each(ops, (v,k) => finalEndpoint = finalEndpoint.replace('{'+k+'}' ,v) );

    log.debug("[DEBUG]: Called -> "+endpointBase+finalEndpoint);
	var options = {
		url: endpointBase + finalEndpoint,
		headers: {
			'X-Token':token
		}
	};

	//console.log(options.url);
	request(options, callback);
}

