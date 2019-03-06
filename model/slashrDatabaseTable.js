import {slashrDatabaseRow} from './slashrDatabaseRow';
export class slashrDatabaseTable{
	constructor(database, name, options){
		// name = this._parseTableName(name);
		this._metadata = {
			database: database,
			name: name,
			schema : null
		};
	}
	
	async getSchema(){
		if(! this._metadata.schema) this._metadata.schema = await this._metadata.database.getTableMetadata(this._metadata.name);
		return this._metadata.schema;
	}
	
	metadata(){
		return this._metadata;
	}

	// async _parseTableName(name){
	// 	let schema = await this.getSchema();
	// }
	
	async row(key){
		let row = new slashrDatabaseRow(this._metadata.database, this);
		await row.load();
		if(key) await row.init(key);
		return row;
	}
	get name(){
		return this.getName();
	}
	getName(){
		return this._metadata.name;
	}
	/* Query Methods */
	/**
	  * @return blrDatabaseQueryResult Indicates the number of items.
	  */
	async select(expression, options = {}){
		let schema = await this.getSchema();
		let whr = null;
		let bindings = options.bindings || {};
		if(typeof expression === "object"){
			whr = expression;
		}
		else{
			// This is a primary key
			if(! schema.primaryKey) throw("Cannot select by primary key on table '"+this._metadata.name+"'. No primary key found.");
			else{
				if(bindings.primaryKey) throw("Cannot select by primary key, binding ':primarykey' is already in use.");
				whr = {};
				whr[schema.primaryKey] = ":primaryKey";
				bindings.primaryKey = expression;
			}
		}
		options.bindings = bindings;
		
		//console.log("TODO: figure out where query is not working without calling as fn");
		return await this._metadata.database.query()
				.select("*")
				.from(this._metadata.name)
				.where(whr)
				.run(options);
	}
	async update(expression, values, options = {}){
		let schema = await this.getSchema();
		let whr = {};
		let bindings = options.bindings || {};
		if(typeof expression === "object"){
			whr = expression;
		}
		else{
			// This is a primary key
			if(! schema.primaryKey) throw("Cannot update by primary key on table '"+this._metadata.name+"'. No primary key found.");
			else{
				if(bindings.primaryKey) throw("Cannot update by primary key, binding ':primarykey' is already in use.");
				whr[schema.primaryKey] = ":primaryKey";
				bindings.primaryKey = expression;
			}
		}
		options.bindings = bindings;
		return await this._metadata.database.query()
				.update(this._metadata.name)
				.set(values)
				.where(whr)
				.run(options);
	}
	async insert(values, options = {}){
		options.bindings = {};
		return await this._metadata.database.query()
			.insert(this._metadata.name)
			.values(values)
			.run(options);
	}
	async delete(expression, options = {}){
		let schema = await this.getSchema();
		let whr = {};
		let bindings = (options.bindings) ? options.bindings : {};
		if(typeof expression === "object"){
			whr = expression;
		}
		else{
			// This is a primary key
			if(! schema.primaryKey) throw("Cannot delete by primary key on table '"+this._metadata.name+"'. No primary key found.");
			else{
				if(bindings[schema.primaryKey]) throw("Cannot delete by primary key, binding ':primarykey' is already in use.");
				whr[schema.primaryKey] = ":primaryKey";
				bindings.primaryKey = expression;
			}
		}
		options.bindings = bindings;
		return await this._metadata.database.query()
			.delete(this._metadata.name)
			.where(whr)
			.run(options);
	}
}
