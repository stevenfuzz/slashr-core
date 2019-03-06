const md5 = require("md5");
export class slashrDatabaseRow{
	constructor(database, table, options){
		this._metadata = {
			database: database,
			table: table,
			column: {},
			isNew: true
		}
	}
	async load(){
		// Todo move columns to meta data
		let tblMetadata = await this._metadata.database.getTableMetadata(this._metadata.table.getName());
		this._metadata.primaryKey = tblMetadata.primaryKey;
		this._metadata.autoIncrement = tblMetadata.autoIncrement;
		this._metadata.columns = {};
		for(let name in tblMetadata.columns){
			let col = tblMetadata.columns[name];
			let colData = {};
			colData.type = col.type;
			colData.md5 = null;
			colData.default = col.COLUMN_DEFAULT || null;
			this._metadata.columns[name] = colData;
			this._metadata.column[name] = null;
			this._metadata.isNew = true;
		}
		
	}
	hasColumn(name){
		return (this._metadata.columns && this._metadata.columns[name]);
	}
	get(name, options){
		if(! this.hasColumn(name)) throw("Error calling get. Unable to find column '"+name+"' in table '"+this.dbTbl.metadata().name+"'");
		return this._metadata.column[name];
	}
	set(name, value, options){
		if(! this.hasColumn(name)) throw("Error calling set. Unable to find column '"+name+"' in table '"+this.dbTbl.metadata().name+"'");
		this._metadata.column[name] = value;
		return this;
	}
	hash(value){
		if(value === null) return null;
		if(typeof value === "object") value = JSON.stringify(value);
		return md5(value);
	}

	async init(value, options){
		let res = await this._metadata.table.select(value, options);
		if(! res.isEmpty()){
			for(let row of res){
				for(let name in row){
					if(this._metadata.columns[name]){
						this._metadata.column[name] = this.formatSelectValue(row[name], this._metadata.columns[name].type);
						this._metadata.columns[name].md5 = (this._metadata.column[name] === null || this._metadata.column[name] === undefined) ? null : this.hash(this._metadata.column[name]);
						if(this._metadata.primaryKey == name && this._metadata.column[name]) this._metadata.isNew = false;
					}	
				}
				break;
			}
		}
		return this;
	}
	async save(){
		if(! this.isUpdated()) return false;
		// See if there has been any changes
		let updates = false;
		for(let name in this._metadata.columns){
			let state = this._metadata.columns[name];
			let val = (this._metadata.column[name] === null || this._metadata.column[name] === undefined) ? null : this._metadata.column[name];
			
			// See if a default should be set
			// TODO: This is probably mysql dependant
			if(val === null && state.default){
				switch(state.default){
					case "CURRENT_TIMESTAMP":
						val = new Date();
					break;
					default:
						val = state.default;
				}
				this._metadata.column[name] = val;
			}
			let newVal = (val === null) ? null : this.hash(val);
			if(state.md5 != newVal){
				if(this.isNew() && name == this._metadata.autoIncrement) throw("Cannot run query. Auto Increment column '"+name+"' can't be directly set.");
				updates = updates || {};
				updates[name] = this.formatInsertValue(val, this._metadata.columns[name].type);
			}
		}
		if(updates){
			let res = null;
			if(this.isNew()){
				res = await this._metadata.table.insert(updates);
			}
			else{
				let pk = this._metadata.primaryKey;
				if(! pk || ! this._metadata.column[pk]) throw("Error saving row. Primary Key column '"+this._metadata.primaryKey+"' not found.");
				res = await this._metadata.table.update(this._metadata.column[pk], updates);
			}

			// Update state
			if(res && res.affectedRows){
				// Success! 
				if(this.isNew()){
					if(this._metadata.autoIncrement){
						if(! res.insertId) throw("Error saving row. Insert id for autoIncrement column '"+this._metadata.autoIncrement+"' not found.");
						let iK = this._metadata.autoIncrement;
						this._metadata.column[iK] = res.insertId;
						updates[iK] = res.insertId;
					}
					this._metadata.isNew = false;	
				}

				for(let name in updates){
					this._metadata.columns[name].md5 = this.hash(updates[name]);
				}
				return true;
			}
			else if(this.isNew()) throw("Error saving row. No insert was made.");
		}
		else{
			// No changes, return false bcause we did not save.
			return false;
		}
		// Should not get here, return false if we do
		return true;
	}
	async delete(){
		if(this.isNew()){
			return false;
		}
		
		let pk = this._metadata.primaryKey;
		if(! pk || ! this._metadata.column[pk]) throw("Error deleting row. Primary Key column '"+this._metadata.primaryKey+"' not found.");
		let res = await this._metadata.table.delete(this._metadata.column[pk]);
		
		// Update state
		if(res.affectedRows){
			// Success! 
			// Set isNew and set auto increment column to null
			this._metadata.isNew = true;
			let iK = this._metadata.autoIncrement;
			if(iK){
				this._metadata.column[iK] = null;
				if(this._metadata.columns[iK]){
					this._metadata.columns[iK].md5 = null;
				}
			}
			return true;
		}
		// If it does not delete, return false
		return false;
	}
	
	isNew(){
		return this._metadata.isNew;
	}
	isUpdated(){
		for(let name in this._metadata.columns){
			let state = this._metadata.columns[name];

			let newVal = (this._metadata.column[name] === null || this._metadata.column[name] === undefined) ? null :  this.hash(this._metadata.column[name]);
			
			if(state.md5 != newVal){
				return true;
			}
		}
		return false;
	}
	isColumnUpdated(name){
		if(! this.hasColumn(name)) throw("blrDatabaseRow Error: Call to isColumnUpdated failed. Column '"+name+"' does not exist.");
		throw "TODO PLEASE TEST";
		return (this._metadata.columns[name].md5 != this.hash(this._metadata.column[name]));
	}
	formatSelectValue(value, type){
		return this._metadata.database.formatColumnSelectValue(value, type);
	}
	formatInsertValue(value, type){
		return this._metadata.database.formatColumnInsertValue(value, type);
	}
	getPrimaryKeyValue(){
		if(! this._metadata.primaryKey) throw("Cannot get primary key value for databaseTable '"+this._metadata.table.getName()+"'. No primary key found.");
		let pk = this._metadata.primaryKey;
		return this.get(pk);
	}
	getPrimaryKey(){
		if(! this._metadata.primaryKey) throw("Cannot get primary key for databaseTable '"+this._metadata.table.getName()+"'. No primary key found.");
		return this._metadata.primaryKey;
	}
	
}
