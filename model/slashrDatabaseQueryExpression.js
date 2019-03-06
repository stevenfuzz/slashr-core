export class slahsrDatabaseQueryExpression{
	constructor(query){
		this._metadata = {
			query: query,
			parts: []
		}

	}
	toString(options){throw("database expression error, must define toString");}
	static factory(database){
		let adapter = database.getAdapter();
		if(! adapter) throw("Error with slashr database query expression factory, no adapter given.");
		switch(adapter){
			case "mysql":
				return new slashrDatabaseQueryExpressionMySqlAdapter(this._metadata.query);
				break;
			default:
				throw new frak("Database query expression adapter for '"+adapter+"' not found.");
		}
	}
	addPart(expression, type = "and", options){
		let part = {
			type: type,
			expression: expression,
		};
		if(options) part.options = options;
		this._metadata.parts.push(part);
	}

	get parts(){
		return this._metadata.parts;
	}
	isEmpty(){
		return (this._metadata.parts.length);
	}
	getExpressionCount(){
		return this._metadata.parts.length;
	}
}