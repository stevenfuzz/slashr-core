export class slashrEntity{
	//	protected model, mdl, this.utils, _metadata, databaseRow, dbRow, relatedConfig = array(), properties, props, key;
//	__relatedOrphans = array();
//	public related, rel, name;
	constructor(slashr, name, options){
		this._metadata = {
			name: name,
			doInitMutators : true,
			properties: null,
			slashr: slashr
		}
		//let slashrComponentModel = require("./slashrComponentModel");
		this.model = this.mdl = slashr.app.model;
		this.utils =  slashr.utils;
	}
	setup(){ /*Overload*/ };
	async _load(){
		this._metadata.key = null;
		this._metadata.relatatedKeys = {};
		this._metadata.relationships = {};

		console.log("LOAD LOAD LOAD ENTITY!!!!!!!!");
		
		////console.log("TODO: Add entity in config");
		let entities = {};
		let tblName = null;
		
		// Load the database info
		if(entities[this._metadata.key]){
			if(entities[this._metadata.name].database){
				// TODO: Add instances
				this._metadata.db = {};
				this._metadata.db.name = "default";
				if(entities[this._metadata.name].database.table){
					tblName = entities[this._metadata.name].database.table;
				}
			}
		}
		else{
			// TODO: deal with database instances for entities
			// By default, use a default database and use name as table name
			this._metadata.db = {};
			this._metadata.db.name = "default";

			if(! await this.mdl.db.tableExists(tblName)){
				tblName = null;
				let tTblKey = this._formatPropertyKey(this._metadata.name);
				let schema = await this.mdl.db.getSchema();
				for(let i in schema.tables){
					// Supplied schema can have key as name
					let name = schema.tables[i].name || i;
					console.log("name name nam,e",name);
					if(this._formatPropertyKey(name) == tTblKey){
						tblName = name;
						break;
					} 
				}
			}
			else tblName = this._metadata.name;		
		}

		console.log("TASBLE NAME",this._metadata.name, tblName);

		if(! tblName) throw("Unable to initialize entity by database table name '"+this._metadata.name+"'. Please enter this entity in config.");
		this._metadata.db.tbl = tblName;
		this._metadata.databaseRow = await this.mdl.db.tbl(tblName).row();

		// Get the key
		// TODO: Allow for other types
		if(this.databaseRowExists()){
			let tProp = {};
			tProp.name = this._metadata.databaseRow.getPrimaryKey();
			tProp.val = null;
			this._metadata.key = tProp;
		}
		if(entities[this._metadata.name]){
			// Load the relationships
//			rel = array();
//			if(isset(entities[this._metadata.name].relationships)){
//				foreach(entities[this._metadata.name].relationships as name => val){
//					this._metadata.relationships[name] = new blrComponentMetadata();
//					this._metadata.relationships[name].entity = val[blr::ENTITY];
//					// Has either a child relationship based on the entity, or a property which will be used as a foreign key
//					if(! empty(val[blr::CHILD])) this._metadata.relationships[name].child = val[blr::CHILD];
//					
//					// Has either a child relationship based on the entity, or a property which will be used as a foreign key
//					if(! empty(val[blr::PROPERTY])){
//						tProp = new blrComponentMetadata();
//						tProp.name = val[blr::PROPERTY];
//						// TODO: Use abbr or full?
//						tProp.references = this._metadata.key.name;
//						this._metadata.relationships[name].properties = array(this._formatPropertyKey(val[blr::PROPERTY]) => tProp);
//					}
//
//					// Get type, should either be SET or ENTITY
//					this._metadata.relationships[name].type = (! empty(val[blr::TYPE])) ? val[blr::TYPE] : blr::ENTITY;
//				}
//			}
			
		}
		// Initialize the properties and map the database row
		await this._initProperties();
		this._initMutators();
		this.setup();
	}
//	addRelatedOrphan(name, entity){
//		if(entity.isNew()) return false;
// 		this._relatedOrphans[name] = entity;
//		return true;
//	}
	// TODO: How do we feel about format methods
	_formatPropertyKey(name){
		name = name.toLowerCase().replace(/_/g,"");
		return name;
	}
	_formatPropertyKeyToDatabaseColumn(name){
		name = this._formatPropertyKey(name);
		if(this._metadata.properties[name] && this._metadata.properties[name].type == "column"){
			return this._metadata.properties[name].column;
		}
		return null;
	}
	_formatPropertyKeyToDatabaseTable(name){
		name = this._formatPropertyKey(name);
		if(this._metadata.properties[name] && this._metadata.properties[name].type == "column"){
			return this._metadata.properties[name].column;
		}
		return null;
	}
	_initMutators(){
		for(let key in this._metadata.properties){
			let col = this._metadata.properties[key].column;

			// Add simple property based setters and getters
			let methodName = this.utils.str.toCamelCase(col);
			Object.defineProperty(this, col, {
				get: function() {
					return this.get(col);
				},
				set: function(value) {
					return this.set(col, value);
				}
			});
			// Define camel case get / set
			if(col !== methodName){
				Object.defineProperty(this, methodName, {
					get: function() {
						return this.get(col);
					},
					set: function(value) {
						return this.set(col, value);
					}
				});
			}
			// Get the setter / getter names
			// By Decause is is camelcase, setUserName, getUserName
			// For boolean prefixs (is, has), SHOULD BE would be isActive and setActive, 
			// but that would conflict with the getters an setters above
			methodName = this.utils.str.toUpperCaseWords(methodName);
			this["set"+methodName] = function(value){
				return this.set(col, value);
			}.bind(this);
			this["get"+methodName] = function(){
				return this.get(col);
			}.bind(this);
		}

	}
	async _initProperties(){
		this._metadata.properties = {};

		// Map the table data to properties
		if(this._metadata.databaseRow){
			let tblName = this._metadata.db.tbl;
			let tblSchema = await this.mdl.db.tbl(tblName).getSchema();
			for(let col in tblSchema.columns){
				let data = tblSchema.columns[col];
				let propName = this._formatPropertyKey(col);
				if(this._metadata.properties[propName]) throw("Unable to map entity '"+this._metadata.name+" property for column '"+col+"' using property name '"+propName+"'. Property is already mapped.");
				let prop = {};
				prop.type = "column";
				prop.column = col;
				//prop.dataType = col;
				this._metadata.properties[propName] = prop;
				
				
			
			// Bind the properties to their relationship
//			foreach(this._metadata.relationships as relName => rel){
//				if(isset(rel.properties)){
//					foreach(rel.properties as propName => val){
//						propName = this._formatPropertyKey(propName);
//						if(! empty(this._metadata.properties[propName])){
//							if(! isset(this._metadata.properties[propName].related)) this._metadata.properties[propName].related = array();
//							this._metadata.properties[propName].related[] = relName;
//							this._metadata.properties[propName].value = this.get(propName);
//						}
//					}
//				}
//			}
		}
	}
	}

// TODO: Add related entites in setup
//	getDatabaseRow(){
//		return this._metadata.databaseRow;
//	}
//	addRelatedEntity(name, options = array()){
//		var_dump(name);
//		var_dump(options);
//	}
//	addRelatedEntityByDatabaseTable(name, databaseTableName, foreignKey, options = array()){
//		if(! empty(this.relatedConfig[name])) throw("Entity relationship '"+name+"' already exists for entity '"+this._metadata.name+"'");
//		if(isset(this._metadata.name)) throw("Entity relationship '"+name+"' can't be set. Property already exists for entity '"+this._metadata.name+"'");
//		
//		if(Array.isArray(foreignKey)){
//			// TODO: Validate
//		}
//		else foreignKey = array(databaseTableName => foreignKey);
//				
//		rel = new blrComponentMetadata();
//		rel.type = "database";
//		rel.name = name;
//		rel.databaseTableName = databaseTableName;
//		rel.foreignKey = foreignKey;
//		rel.options = options;
//		this.relatedConfig[name] = rel;
//	}
	// Entity can not be reinitialized
	// TODO: Set values even if it does not initialize?
	async init(key, options){
		if(! this.isNew()) throw("Unable to init entity '"+this._metadata.name+". This entity has already been initialized.");
		
		// TODO: init by properties other than database?
		if(this.databaseRowExists()){
			await this._initDatabaseRow(key, options);
		}
		// Initialize the base related values
//		for(this._metadata.properties as propName => prop){
//			if(empty(prop.related)) continue;
//			this._metadata.properties[propName].value = this.get(propName);
//		}
	}
	/*
	 * Key is either value (primary key) OR an array of properties/values. Bindings will be automatically generated.
	 * If key is not array, pass as primary key, if array parse column names and create bindings
	 */
	async _initDatabaseRow(key, options){
		// TODO: Add database instances
		let row = this._metadata.databaseRow;
		options = options || {};
		options.bindings = {};
		if(typeof key === "object"){
			let nKey = {};
			for(let name in key){
				let col = this._formatPropertyKeyToDatabaseColumn(name);
				let pKey = this._formatPropertyKey(name);
				if(options.bindings[pKey]) throw("Error initializing entity '"+this._metadata.name+"' by database row. A binding key '"+name+"' was given and would be overwritten.");
				options.bindings[pKey] = key[name];
				nKey[col] = ":"+pKey;
			}
			key = nKey;
		}
		await row.init(key, options);

		if(row.isNew() && typeof key === "object"){
			// Set given values except for pk
			for(let col in options.bindings){
				if(col !== row.getPrimaryKey()){
					this.set(col, options.bindings[col]);
				}
			}	
		}
	}
	
//	__call(name, arguments){
//		entities = blr::config(blr::ENTITIES);
//		if(this.this.utils.string.startsWith(name, "get")) type = "get";
//		else if(this.this.utils.string.startsWith(name, "set")) type = "set";
//		else if(this.this.utils.string.startsWith(name, "is")) type = "is";
//		else if(this.this.utils.string.startsWith(name, "has")) type = "has";
//		else if(! empty(entities[this._metadata.name]) && ! empty(entities[this._metadata.name].relationships) && ! empty(entities[this._metadata.name].relationships[name])){
//			return this.syncRelated(name);
//		}
//		else throw("Entity '"+this._metadata.name+"' could not call method type '"+name+"' for method '"+name+"'.");
//		
//		propName = substr(name, strlen(type), strlen(name));
//		propName = this._formatPropertyKey(propName);
//		if(empty(this._metadata.properties[propName])){
//			// Check for boolean
//			switch(type){
//				case "set":
//				case "has":
//				case "is":
//					// TODO: Check that it is actually the boolean data type
//					// Check and fix boolean properties
//					if(! empty(this._metadata.properties["is{propName}"])) propName = "is{propName}";
//					if(! empty(this._metadata.properties["has{propName}"])) propName = "has{propName}";
//					break;
//				default:
//					
//					break;
//			}
//		}
//		if(! this.propertyExists(propName)) throw("Entity '"+this._metadata.name+"' could not find property '"+propName+"' for method '"+name+"'.");
//
//		switch(type){
//			case "get":
//			case "is":
//			case "has":
//				return this.get(propName);
//				break;
//			case "set":
//				if(empty(arguments)) throw("Entity '"+this._metadata.name+"' could not call setter '"+name+"' for mapped column. No value given.");
//				return this.set(propName, arguments[0]);
//				break;
//			default:
//				throw("Entity data access type '"+type+"' not found.");
//		}
//		return this;
//	}
	
	// TODO: Get / Set basically use the same code, move into one method
	get(name){
		// Validate that it exists
		name = this._formatPropertyKey(name);
		if(! this.propertyExists(name)) throw("Get failed. Entity '"+this._metadata.name+"' could not find property '"+name+"'.");
		let prop = this._metadata.properties[name];
		switch(prop.type){
			case "column":
				if(! this.databaseRowExists) throw("Get failed. Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Database row not found.");
				if(! prop.column) throw("Get failed.  Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Column not definced in property.");
				if(! this._metadata.databaseRow.hasColumn(prop.column)) throw("Get failed. Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Column '"+prop.column+"' not found in row.");
				return this._metadata.databaseRow.get(prop.column);
				break;
			default:
				throw("Entity property type '"+prop.type+"' not found.");
		}
		return null;
	}
	
	// Name mixed value as name/value array
	// Will throw frak if the property does not exist
	set(name, value){
		let valueArr = {};
		if(typeof name === "object") valueArr = name;
		else valueArr[name] = value;
		
		for(name in valueArr){
			let value = valueArr[name];
			name = this._formatPropertyKey(name);
			// Validate that it exists
			if(! this.propertyExists(name)) throw("Set failed. Entity '"+this._metadata.name+"' could not find property '"+name+"'.");
			let prop = this._metadata.properties[name];
			
			// Check to see if there are any related dependent on this key
			// if there are, and the key has changed, invalidate the related key
			// Removing the related will take care of all related properties
//			if(! empty(prop.related)){
//				foreach(prop.related as relName){
//					// TODO: entity::set Check parent instance to see if a child key change will need to be removed
//					// for example u.details.setUserId(n), should that remove the current u.details?
//					if(this.related.hasInstance(relName)){
//						// If the key has changed, remove the instance
//						if(this.get(name) != value){
//							this.related.relName.remove();
//						}
//					}
//				}
//			}
			switch(prop.type){
				case "column":
					if(! this.databaseRowExists()) throw("Set failed. Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Database row not found.");
					if(! prop.column) throw("Set failed. Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Column not definced in property.");
					if(! this._metadata.databaseRow.hasColumn(prop.column)) throw("Entity '"+this._metadata.name+"' could not find property '"+name+"' mapped column. Column '"+prop.column+"' not found in row.");
					this._metadata.databaseRow.set(prop.column, value);
					return this;
					break;
				default:
					throw("Entity property type '"+prop.type+"' not found.");
			}
		}
		return this;
	}
	/**
	* Populates an entity / child entities with the given key / value array.
	* If a values key is not a property, it will be ignored.
	* If a primary key is given, the entity will be populated with the database values first, then the data is populated.
	* If the entity has already been populated (isNew === false), it will throw a frak 
	* If a value starts with the child entity key, it will be populated into child,
	* For example, let's say a user (users) has a child details (user_details) with the foriegn key user_details_id: 
	* ID => (users.id)  DETAILS_ID => (users.user_details_id / user_details.id) DETAILS_AGE (user_details.age) 
	* @param {Array} values
	* @returns {Element|Object|Boolean} The input node if acceptable, otherwise a false value
	*/
	populate(values, options = {}){
		// look for the key in the values
		let keyName = this._formatPropertyKey(this._getKeyName());
		let keyVal = this._getKeyValue();
		let vKeyVal = null;
		for(let name in values){
			if(keyName === this._formatPropertyKey(name)){
				vKeyVal = values[name];
			}
		}
		
		// Check if it is a hydrated object, and make sure the keys match
		if(! this.isNew()){
			if(vKeyVal !== keyVal) throw("Error populating values into entity '"+this._metadata.name+"'. Key mismatch between populated entity and values.");
		}
		else if(vKeyVal){
			// Try to initialize the entity
			this.init(vKeyVal);
			if(this.isNew()) throw("Error populating values into entity '"+this._metadata.name+"'. Unable to initialize entity with given key value.");
		}
		for(let name in values){
			if(this.propertyExists(name)){
				if(keyName == this._formatPropertyKey(name)) continue;
				this.set(name, values[name]);
			}
		}
		return this;
	}
	// Inverse of populate, will create a key value array of properties and child properties (prefixed by child name)
	
	extract(options = {}){
		let ret = [];
		for(let key in this._metadata.properties){
			let rKey = key;
			if(options.camelCase){
				rKey = this.utils.str.toCamelCase(this._metadata.properties[key].column);
			}
			ret[rKey] = this.get(key);
		}
		// TODO: Add Children
		return ret;
	}
	toArray(options = {}){
		return this.extract(options);
	}
	_getKeyValue(){
		let key = null;
		if(this.databaseRowExists()){
			key = this._metadata.databaseRow.getPrimaryKeyValue();
		}
		return key;
	}
	_setKeyValue(){
		throw("Entity setKey() method not avialable");
	}
	_getKeyName(){
		return this._metadata.key.name;
	}
	__get(name){
		// Todo update using entities config
		let entities = {};
		if(entities[this._metadata.name] && entities[this._metadata.name].relationships && entities[this._metadata.name].relationships[name]){
			return this.syncRelated(name);
		}
	}
	__set(name, value){
		if(this.relatedConfig[name]){
			throw("Unable to set property '"+name+"' for entity '"+this._metadata.name+"', entity child exists with this name.");
		}
	}
	isNew(){
		let ret = true;
		if(this.databaseRowExists()){
			ret = this._metadata.databaseRow.isNew();
		}
		return ret;
	}
	isPropertyUpdated(name){
		let ret = false;
		if(this.databaseRowExists()){
			name = this._formatPropertyKey(name);
			// Validate that it exists
			if(! this.propertyExists(name)) throw("Error calling isPropertyUpdated. Property '"+name+"' does not exist.");
			prop = this._metadata.properties[name];
			ret = this._metadata.databaseRow.isColumnUpdated(prop.column);
		}
		return ret;
	}
	isUpdated(){
		let ret = false;
		if(this.databaseRowExists()){
			ret = this._metadata.databaseRow.isUpdated();
		}
		return ret;
	}
	propertyExists(name){
		name = this._formatPropertyKey(name);
		return (this._metadata.properties[name]);
	}
	databaseRowExists(){
		return (this._metadata.databaseRow);
	}
	_saveDatabaseRow(){
		if(this.databaseRowExists() && this.isUpdated()){
			return this._metadata.databaseRow.save();
		}
		return false;
	}
	async _deleteDatabaseRow(){
		if(this.databaseRowExists()){
			return await this._metadata.databaseRow.delete();
		}
		return false;
	}
	validateDatabaseColumn(name){
		
	}
//	_syncRelated(name){		
//		// if this instance exists, return the instance
//		if(this.related.hasInstance(name)) return this.related.name;
//
//		// Check the relationships and create an entity
//		ret = null;
//		if(! empty(this._metadata.relationships[name])){
//			entity = this.related.name;
//
//			rel = &this._metadata.relationships[name];
//			prop = null;
//			if(isset(rel.child)){
//				if(empty(entity.metadata().relationships[rel.child].properties)) throw("Error syncing related entity '"+name+"'. Could not find property in child. {rel.ent}");
//				if(count(rel.properties ) > 1) throw("Unable to sync related entity '"+this._metadata.name}.{name+"' with multiple properties. N/A at this time;");
//				
//				// TODO: SyncRelated check cardinality many to one?
//				fKeys = null;
//				if(empty(this._relatedOrphans[name])){
//					fKeys = array();
//					foreach(entity.metadata().relationships[rel.child].properties as key => property){
//						// TODO: Check if this is a column or not, add custom properties
//						// TODO: Validate that this exists?
//						fKeys[key] = this.get(property.references);
//					}
//					entity.init(fKeys);
//				}
//			}
//			else if(! empty(rel.properties)){
//				properties = rel.properties;				
//				fKeys = array();
//				foreach(properties as key => property){
//					// TODO: Fix for multiple properties
//					fn = "get{key}";
//					fKeys[property.references] = this.fn();	
//				}
//
//				entity.init(fKeys);
//			}
//
//			ret = entity;
//		}
//		return ret;
//	}
	async save(options){
		// Sync the child entities
//		if(! empty(this._metadata.relationships)){
//			foreach(this._metadata.relationships as name => rel){
//				if(! empty(rel.properties) && this.related.hasInstance(name)){
//					related = this.related.name;
//					related.save();
//					if(count(rel.properties) > 1) throw("Unable to save related entity '"+this._metadata.name}.{name+"' with multiple parent properties. N/A at this time;");
//					foreach(rel.properties as key => property){
//						if(! this.propertyExists(key)) throw("Error saving related entity '"+this._metadata.name}.{name+"'. Could not find parent property' {key+"'");
//						this.set(key,related.get(property.references));
//					}
//				}
//			}
//		}

		if(this.isUpdated()){
			// Save Entity
			if(this.databaseRowExists()){
				// Save the databasey
				await this._saveDatabaseRow();
			}
		}
//		parentKey = this.getKeyValue();
		// Sync the child entities
		// TODO: Are the property and key values backwards?
//		if(! empty(this._metadata.relationships)){
//			foreach(this._metadata.relationships as name => rel){
//				if(isset(rel.child) && this.related.hasInstance(name)){
//					related = this.related.name;
//					// TODO: Make sure this is already validated
//					relMeta = related.metadata().relationships[rel.child];
//					if(relMeta.entity != this._metadata.name)  throw("Error saving related entity '"+this._metadata.name}.{name+"'. Entity mismatch '"+rel.entity+"'");
//					if(! isset(relMeta.properties)) throw("Error saving related entity '"+this._metadata.name}.{name+"'. Could not find parent properties '"+rel.child+"'");
//					if(count(relMeta.properties ) > 1) throw("Unable to save related ent entity '"+this._metadata.name}.{name+"' with multiple child properties. N/A at this time;");
//					foreach(relMeta.properties as key => property){
//						if(! related.propertyExists(key)) throw("Error saving related child entity '"+this._metadata.name}.{name+"'. Could not find child property' {key+"'");
//						if(related.isNew()){
//							// Make sure that this isn't emtpy object
//							if(related.isUpdated()){
//								// Related Child new object with updated values.
//								var_dump("Save Type: Related Child new object and updated values. '"+this._metadata.name}.{name+"'");
//								related.set(key, this.get(property.references));
//							}
//						}
//						else{
//							// If not new, set property key no matter what.
//							var_dump("Save Type: Save type related child. '"+this._metadata.name}.{name+"'");
//							related.set(key, parentKey);
//
//						}
//						break;
//					}
//					related.save();
//				}
//			}
//			// Check to see if there are orpans
//			this.updateRelatedOrpans();
//		}
		await this._initProperties();
		return this;
	}
//	
//	_updateRelatedOrpans(){
//		// Check to see if there are orpans
//		if(! empty(this._relatedOrphans)){
//			foreach(this._relatedOrphans as entity){
//				var_dump("REMOVE ORPHAN {entity.metadata().name}");
//				entity.save();
//			}
//		}
//		this._relatedOrphans = array();
//	}
	
	async delete(){
		// TODO: Entity delete figure out what to do with state of the object.
		if(! this.isNew()){
			// Remove all relationships
			if(this._metadata.relationships){
				
				for(name in this._metadata.relationships){
					if(this.related.hasInstance(name)){
						throw("TODO: Entity auto delete relationships not complete.");
						this.related.name.remove();
					}
				}
			}
			if(this.databaseRowExists()){
				// Delete the database row
				await this._deleteDatabaseRow();
			}
			// Check to see if there are orpans
			//this.updateRelatedOrpans();
			return true;
		}
		return false;
	}
	
	
	
	
	
	
	
	
	
	
	
}