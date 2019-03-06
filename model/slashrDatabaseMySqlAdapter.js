const slashrDatabase = require("./slashrDatabase");
export class slashrDatabaseMySqlAdapter extends slashrDatabase{
	constructor(config){
		super(config);
		this._metadata.tables = {};
	}
	connect(config){
		let mysql = require('mysql');
		// Fix the date formatting issues
		config.dateStrings = true;
		let connection = mysql.createPool(config);
		return connection;
	}
	disconnect(){
		console.log("slashr: Disconnecting MySql Connection...");
		if(this.connector) this.connector.end();
		this.connector = null;
	}
	table(name){
		if(! this._metadata.tables[name]){
			let slashrDatabaseTable = require("./slashrDatabaseTable");
			this._metadata.tables[name] = new slashrDatabaseTable(this, name);
		}
		return this._metadata.tables[name]; 
	}
	tbl(name){
		return this.table(name);
	}
	async executeQuery(query, options = {}){
		let self = this;
		let cacheKey = null;
		let model = global.slashr.model();

		// Get the query type
		let queryType = this._getQueryType(query);
		if(! queryType) throw("Could not find query type of query");
		
		let bindings = {};
		let cacheTime = (queryType === "select" && options.cacheTime) ? options.cacheTime : null;
		// Format the bind values and query
		// console.log(options.bindings);
		if(options.bindings){

			// Sort and reverse incase keys start with the same value
			let keys = Object.keys(options.bindings).sort().reverse();
			let utils = global.slashr.utils();
			for(let key of keys){
				let value = options.bindings[key];
				if(typeof value === "string"){
					// Format Like
					if(query.indexOf("%:"+key) !== -1){
						value = '%'+value;
						query = utils.str.replaceAll(query, `%:${key}`, `:${key}`);
					}
					if(query.indexOf(":"+key+"%") !== -1){
						value = value+'%';
						query = utils.str.replaceAll(query, `:${key}%`, `:${key}`);
					}
					bindings[key] = value;
				}
				// Numeric
				else if(typeof value === "number"){
					// Do nothing should be good
					bindings[key] = value;
				}
				// Format IN from array;
				else if(Array.isArray(value)){
					let kIdx = 1;
					let nKeys = [];
					for(let i in value){
						let nKey = "_"+key+kIdx;
						bindings[nKey] = value[i];
						nKeys.push(":"+nKey);
						kIdx++;
					}
					query = query.replace(":"+key, nKeys.join(","));
				}
				else if(value instanceof Date){
					bindings[key] = this.formatColumnInsertValue(value, "datetime");
					// console.log(bindings[key]);
					// throw("SDLKFJSLDKJF");
				}
				else if(value === null){
					bindings[key] = null;
				}
				else{
					throw("Query Error: Unable to parse binding value for key: "+key+".");
				} 
			}
		}
		
		// Check Cache
		if(cacheTime){
			let md5 = require("md5");
			cacheKey = `slashrDatabaseQuery-${md5(JSON.stringify([query,options]))}`;
			let cRslt = await model.cache.get(cacheKey);
			if(cRslt){
				//console.log("FOUND QUERY CACHE!!!!!!!", cacheTime, query);
				let slashrDatabaseQueryResult = require("./slashrDatabaseQueryResult");
				return new slashrDatabaseQueryResult(cRslt, options);
			}
		}
		// console.log("NO QUERY CACHE!!!!!!!");
		// console.log(query);
		// console.log(bindings);

		// Replace bindings with ? and add to ordered array
		var bindArr = [];
		query = query.replace(/:\w+/g, function(match) {
			let key = match.slice(1);
			if(bindings[key] === undefined) throw("Query Error: Query parameter "+match+" not found in bindings.");
			bindArr.push(bindings[key]);
			return "?";
		});	

		let rslt = new Promise(function(resolve, reject){
			self.connector.getConnection(
				function(err, connection) {
					connection.query(query, 
						bindArr,
						async function (error, results, fields) {
							// And done with the connection.
							connection.release();
							
							// Create the result set
							let resultSet = {
								type: queryType,
								error: null,
								rows: [],
								rowCount: 0,
								insertId: null,
								affectedRows: null
							};
							
							let slashrDatabaseQueryResult = require("./slashrDatabaseQueryResult");
							let rslt = null;
							
							// Handle error after the release.
							if (error){
								resultSet.error = {
									code: error.code,
									number: error.errno,
									message: error.sqlMessage,
								};
								rslt = new slashrDatabaseQueryResult(resultSet, options);
								reject(rslt);
								return;
							}
							
							
							switch(queryType){
								case "select":
								case "show":
								case "explain":
									resultSet.rows = JSON.parse(JSON.stringify(results));
									resultSet.rowCount = resultSet.rows.length;
									break;
								case "insert":
									resultSet.insertId = results.insertId;
									resultSet.affectedRows = results.affectedRows;
									break;
								case "update":
								case "delete":
									resultSet.affectedRows = results.affectedRows;
									break;
							}

							if(cacheTime){
								await model.cache.set(cacheKey,resultSet,{
									cacheTime: options.cacheTime
								});
							}
							
							rslt = new slashrDatabaseQueryResult(resultSet, options);
							
							resolve(rslt);
					});
				});
		});
		
		return rslt;
		
	}
	_getQueryType(query){
		query = query.trim().toLowerCase();
		let value =  query.substring(0, query.indexOf(" "));
		let type = null;
		switch(value){
			case "select":
			case "insert":
			case "update":
			case "delete":
			case "show":
			case "explain":
				type = value;
				break;
		}
		return type;
	}
	_getQueryFactory(){
		let slashrDatabaseMySqlQueryAdapter = require("./slashrDatabaseMySqlQueryAdapter");
		return new slashrDatabaseMySqlQueryAdapter(this);
	}
	async getSchema(options){
		if(this._metadata.schema) return this._metadata.schema;
		
		options = options || {};
		let name = options.name || this._metadata.database;
		
		let qry = `
			select * from information_schema.columns
			where table_schema = :name
			order by table_name,ordinal_position
		`;
						
		let rslt = await this.executeQuery(qry, {
			cacheTime: 60,
			bindings: {name: name}
		});

		let ret = {};
		ret.name =  name;
		ret.tables = {};

		for(let row of rslt){
			if(! ret.tables[row.TABLE_NAME]){
				let tbl = {};
				tbl.name = row.TABLE_NAME;
				tbl.columns = {};
				tbl.primaryKey = null;
				tbl.autoIncrement = null;
				ret.tables[row.TABLE_NAME] = tbl;
			}
			let col = {};
			col.type = this._getColumnType(row.COLUMN_TYPE);
			col.length = this._getColumnLength(row.COLUMN_TYPE);
			if(row.COLUMN_DEFAULT) col.COLUMN_DEFAULT = row.COLUMN_DEFAULT;
			ret.tables[row.TABLE_NAME].columns[row.COLUMN_NAME] = col;
			if(row.COLUMN_KEY === "PRI") ret.tables[row.TABLE_NAME].primaryKey = row.COLUMN_NAME;
			if(row.EXTRA === "auto_increment") ret.tables[row.TABLE_NAME].autoIncrement = row.COLUMN_NAME;
		}

		return ret;
	}
	_formatTableName(name){
		return name.trim().replace(/_/g,"").toLowerCase();
	}
	async getTableMetadata(name, options){
		let schema = await this.getSchema();
		if(! name) throw("Could not get table info. No table name provided.");
		if(! schema.tables[name]){
			let nName = this._formatTableName(name);
			//console.log("TODO: Must be a better way for this");
			for(let table in schema.tables){
				if(this._formatTableName(table) === nName) return schema.tables[table]; 
			}
			throw(`Could not get table info for ${name}. Table not found in schema.`);
		}
		return schema.tables[name];
	}
	_getColumnType(type){
		type = type.toLowerCase();
		let ret = false;
		
		if(type.startsWith("varchar") || type.startsWith("char") || type.endsWith("text")){
			ret = "string";
		}
		else if(type === "tinyint(1)"){
			ret = "boolean";
		}
		else if(type.startsWith("int") || type.startsWith("tinyint") || type.startsWith("bigint")){
			ret = "integer";
		}
		else if(type.startsWith("date")){
				ret = "datetime";
		}
		else if(type.startsWith("decimal")){
				ret = "decimal";
		}
		else if(type === "json"){
			ret = "json";
		}
		else if(type === "point"){
			ret = "point";
		}
		
		if(! ret) throw("Database column type '"+type+"' not found");

		return ret;
	}
	_getColumnLength(type){
		let ret = null;
		let pStart = type.indexOf("(");
		let pEnd = type.indexOf(")");

		if(pStart !== -1 && pEnd !== -1){
			pEnd = (pEnd - pStart) - 1;
			let tLen = type.substring((pStart + 1), pEnd);
			if(!isNaN(tLen)) ret = parseint(tLen);
			else if(tLen.indexOf(",") !== -1){
				tLen = tLen.split(",");
				if(tLen.length && tLen.length == 2 && !isNaN(tLen[0]) && !isNaN(tLen[1])){
					tLen[0] = parseint(tLen[0]);
					tLen[1] = parseint(tLen[1]);
					ret = tLen;
				}
			}
		}

		return ret;
	}
	formatColumnSelectValue(value, type){
		let ret = null;
		switch(type){
			case "decimal":
				if(! isNaN(value)) ret = parseFloat(value);
				else ret = null;
				break;
			case "integer":
				
				if(!isNaN(value)) ret = parseInt(value);
				else ret = null;
				
				break;
			case "string":
				if(value) ret = String(value);
				break;
			case "json":
				if(value) ret = JSON.parse(value);
				break;
			case "datetime":
				if(value){
					ret = new Date(value);
				}
				break;
			case "boolean":
				if(isset(value)) ret = (parseInt(value) === 1) ? true : false;
				break;
			
			default:
				ret = value;
				throw new Exception("Error formating column select value, type '{type}' not found.");
		}
		return ret;
	}
	formatColumnInsertValue(value, type){
		let ret = null;
		switch(type){
			case "decimal":
				if(value !== null && !isNaN(value)) ret = parseFloat(value);
				else ret = null;
				break;
			case "integer":
				if(value !== null && !isNaN(value)) ret = parseInt(value);
				else ret = null;
				break;
			case "string":
				if(value) ret = String(value);
				break;
			case "json":
				if(value) ret = JSON.stringify(value);
				break;
			case "datetime":
				if(! value) ret = null;
				else{
					let tDate = null;
					if(value instanceof Date){
						tDate = value;
					}
					else{
						tDate = new Date(value);
					}
					if(tDate) ret = tDate.toISOString().substring(0, 19).replace('T', ' ');
				}
				break;
			case "boolean":
				if(typeof value === "boolean") ret = (value) ? 1 : 0;
				break;
			default:
				ret = value;
				throw new Exception("Error formating column insert value, type '{type}' not found.");
		}
		console.log(type, value, ret);
		return ret;
	}
	async tableExists(name){
		let schema = await this.getSchema();
		return (name in schema.tables) ;
	}
}