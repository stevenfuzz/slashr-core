export class slashrDatabaseQuery{
	constructor(database){
		this._metadata = {
			database: database,
			bindings: {},
			cacheTime: 0,
			parts: {}
		};
		let slashrDatabaseQueryExpressionFactory = require("./slashrDatabaseQueryExpressionFactory");
		this.expression = this.exp = new slashrDatabaseQueryExpressionFactory(this);
	}

	// Abstract
	run(){throw("slashr database run not found in adapter");}
	
	// Methods
	// factory(database){
	// 	let adapter = this._metadata.database.getAdapter();
	// 	if(! adapter) throw("Error with slashr database query factory, no adapter given.");
	// 	switch(adapter){
	// 		case "mysql":
	// 			return new slashrDatabaseMysSqlQueryAdapter(this._metadata.database);
	// 			break;
	// 		default:
	// 			throw new frak("Database query adapter for '{$adapter}' not found.");
	// 	}
	// }

	addBindings(values){
		for(let key in values){
			this._metadata.bindings[key] = values[key];
		}
		return this;
	}
	bindings(values){
		this.addBindings(values);
		return this;
	}
	bind(name, value){
		let values = {};
		if(typeof name === "object") values = name;
		else values[name] =  value;
		this.addBindings(values);
		return this;
	}
	binding(name, value){
		this.addBinding(name, value);
		return this;
	}
	addBinding(name, value){
		this._metadata.bindings[name] = value;
		return this;
	}
	getBindings(){
		return this._metadata.bindings;
	}
	cache(minutes){
		return this.setCacheTime(minutes);
	}
	cacheTime(minutes){
		return this.setCacheTime(minutes);
	}
	setCacheTime(minutes){
		this._metadata.cacheTime = minutes;
		return this;
	}
	getCacheTime(){
		return this._metadata.cacheTime;
	}
}