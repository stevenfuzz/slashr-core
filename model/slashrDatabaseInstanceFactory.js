export class slashrDatabaseInstanceFactory{
	constructor(config){
		// this._slashr = slashr;
		this._metadata = {};
		this._metadata.instances = {};
		let self = this;
		return new Proxy(function(){}, {
			get : function(obj, prop){
				let databaseAdapter = self._metadata.instances["default"] || self.factory("default"); 
				
				// Add to instances
				if(! self._metadata.instances["default"]) self._metadata.instances["default"] = databaseAdapter;
				
				return databaseAdapter[prop];
			},
			apply: function(obj, context, args){
				throw "Multiple instances of database N/A";
			}

		});
	}
}