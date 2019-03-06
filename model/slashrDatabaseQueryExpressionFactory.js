export class slashrDatabaseQueryExpressionFactory{
	constructor(database){
		this._metadata = {
			database: database
		};
		let self = this;
		return new Proxy(function(){}, {
			get : function(obj, prop){
				let qry = self._metadata.database._getQueryExpressionFactory();
				return qry[prop];
			},
			apply: function(obj, context, args){
				return self._metadata.database._getQueryExpressionFactory();
			}
		});
	}
}