const slashrDatabaseQuery = require("./slashrDatabaseQuery");
const slashrDatabaseMySqlQueryExpression = require("./slashrDatabaseMySqlQueryExpression");
export class slashrDatabaseMySqlQueryAdapter extends slashrDatabaseQuery{
	
	// Abbrs
	sel(values){return this.select(values);}
	upd(table){return this.update(table);}
	ins(table){return this.insert(table);}
	frm(table){return this.from(table);}
	whr(expression){return this.where(expression);}
	jn(table, alias, expression){return this.join(table, alias, expression);}
	ljn(table, alias, expression){return this.leftJoin(table, alias, expression);}
	ord(values){return this.orderBy(values);}
	dec(column, value){return this.decrement(column,value);}
	inc(column, value){return this.increment(column,value);}

	// Run will execute the query
	async run(options){
		options = (options) || {};
		
		// Merge given bindings
		if(options && options.bindings) this.addBindings(options.bindings);
		if(options && options.cacheTime) this.setCacheTime(options.cacheTime);
		
		// Create the query
		let qryStr = this.toString(options);
		
		// Get the bindings, for insert / update bindings are created during toString
		options.bindings = this.getBindings();
		options.cacheTime = this.getCacheTime();

		// console.log(qryStr);
		// console.log(options.bindings);
		
		let rslt = await this._metadata.database.executeQuery(qryStr, options);
		
		return rslt;
	}

	_getQueryExpressionFactory(){
		let slashrDatabaseMySqlQueryExpression = require("./slashrDatabaseMySqlQueryExpression");
		return new slashrDatabaseMySqlQueryExpression(this);
	}
	
	
	toString(){
		let slashrDatabaseMySqlQueryExpression = require("./slashrDatabaseMySqlQueryExpression");
		if(! this._metadata.type) throw("Cannot run query. No query type found. Please call select, update, insert, or delete to start query.");
		let qry = "";
		let hasFrom = false;
		// Get query type
		switch(this._metadata.type){
			case 'select':
				qry = "SELECT ";
				break;
			case 'update':
				qry = "UPDATE ";
				break;
			case 'insert':
				qry = "INSERT INTO ";
				break;
			case 'delete':
				qry = "DELETE FROM ";
				break;
			default:
				throw("Cannot run query. No query type found.");
		}
		// Get the return values / update values
		switch(this._metadata.type){
			case 'select':
				let selectArr = [];
				if(! this._metadata.parts.select) selectArr.push("*");
				else{ 
					// Array, no alias
					if(Array.isArray(this._metadata.parts.select)){
						for(let i in this._metadata.parts.select){
							selectArr.push(this._metadata.parts.select[i]);
						}
					}
					// Object alias
					else if(typeof this._metadata.parts.select === "object"){
						for(let alias in this._metadata.parts.select){
							let val = this._metadata.parts.select[alias]+" AS "+alias;
							selectArr.push(val);
						}
					}
					else if(typeof this._metadata.parts.select === 'string') selectArr.push(this._metadata.parts.select);
					else throw("select values must be array or string");
				}
				
				if(selectArr.length > 0) qry += selectArr.join(", ");
				
				break;
		}
		// Parse FROM
		let fromArr = [];
		if(this._metadata.parts.from){
			for(let i in this._metadata.parts.from){
				if(! this._metadata.parts.from[i].alias) fromArr.push(this._metadata.parts.from[i].table);
				else fromArr.push(this._metadata.parts.from[i].table+" "+this._metadata.parts.from[i].alias);
			}
		}
		switch(this._metadata.type){
			case'select':
				if(! fromArr.length) throw("Cannot build query. From is required for SELECT queries.");
				qry += "\nFROM "+fromArr.join(", ");
				break;
			case 'update':
			case 'insert':
			case 'delete':
				if(! fromArr.length) throw("Cannot build query. Table is required for UPDATE / INSERT / DELETE queries.");
				else if(fromArr.length > 1) throw("Cannot build query. UPDATE / INSERT / DELETE can only be called on one table.");
				qry += fromArr.join(", ");
				break;
		}
		// Parse SET / Values
		let bindName = 'val';
		let bindCount = 0;
		let valueArr = [];
		let paramArr = [];
		let tBindName = "";
		switch(this._metadata.type){
			case 'update':
				if(! this._metadata.parts.values && ! this._metadata.parts.increment && ! this._metadata.parts.decrement) throw("Cannot build query. SET must be called with column name value array, increment, or decrement.");
				bindName = 'val';
				bindCount = 0;
				valueArr = [];
				for(let key in this._metadata.parts.values){
					bindCount++;
					tBindName = bindName+bindCount;
					valueArr.push(key+" = :"+tBindName);					
					this.addBinding(tBindName, this._metadata.parts.values[key]);
				}
				for(let key in this._metadata.parts.increment){
					valueArr.push(`${key} = ${key} + ${this._metadata.parts.increment[key]}`);	
				}
				for(let key in this._metadata.parts.decrement){
					valueArr.push(`${key} = ${key} - ${this._metadata.parts.decrement[key]}`);	
				}	
				
				qry += "\nSET "+valueArr.join(", ");

				break;
			case 'insert':
				if(! this._metadata.parts.values) throw("Cannot build query. SET must be called with column name value array.");
				bindName = 'val';
				bindCount = 0;
				valueArr = [];
				paramArr = [];
				for(let key in this._metadata.parts.values){
					bindCount++;
					tBindName = bindName+bindCount;
					valueArr.push(":"+tBindName);
					paramArr.push(key);
					this.addBinding(tBindName, this._metadata.parts.values[key]);
				}
				qry += " ("+paramArr.join(", ")+") ";
				qry += "\nVALUES ("+valueArr.join(", ")+") ";
				break;
		}
		
		// Parse JOIN WHERE
		switch(this._metadata.type){
			case 'select':
			case 'update':
			case 'delete':
				if(this._metadata.parts.join){
					let tJoinArr = [];
					for(let key in this._metadata.parts.join){
						let value = this._metadata.parts.join[key];
						switch(value.type){
							case 'left':
								qry += "\nLEFT JOIN ";
								break;
							default:
								throw("Join type '"+value.type+"' not available.");
						}
						// Add the table
						let joinTable = false;
						for(let i in value.table){
							joinTable = (value.table[i].alias) ? value.table[i].table + " " + value.table[i].alias : value.table[i].table;
							break;
						}
						
						if(! joinTable) throw("Join table not found for SQL Join");
						
						// Add the on predicate
						// throw("LSKDJF");
						qry += this._expressionToString(joinTable)+" ON "+this._expressionToString(value.expression);
					}
					
				}
				if(this._metadata.parts.where){
					let whereStr = this._expressionToString(this._metadata.parts.where);
					if(whereStr && whereStr != "") qry += "\nWHERE "+whereStr;
				}
				break;
		}
		
		// Order by
		// Limit
		switch(this._metadata.type){
			case 'select':
				if(this._metadata.parts.orderBy){
					let orderByArr = [];
					for(let i in this._metadata.parts.orderBy){
						let col = i;
						let dir = "";
						if(Array.isArray(this._metadata.parts.orderBy[i])){
							if(this._metadata.parts.orderBy[i].length != 2) throw("Database Query Error: Order by should only have nodes of array length 2");
							col = this._metadata.parts.orderBy[i][0];
							dir = this._metadata.parts.orderBy[i][1];
							if(col instanceof slashrDatabaseMySqlQueryExpression){
								col = col.toString();
							}
						}
						else dir = this._metadata.parts.orderBy[col].toUpperCase();

						switch(dir){
							case "ASC_NULLS_LAST":
								dir = "ASC"
								orderByArr.push("ISNULL("+col+") "+dir);
								break;
							case "ASC_NULLS_FIRST":
								dir = "DESC";
								orderByArr.push("ISNULL("+col+") "+dir);
								break;
							case "ASC":
							case "DESC":
								// Do Nothing
								break;
							default:
								throw ("MySql order by direction '"+dir+"' not found.");
						}
						orderByArr.push(col +" "+dir);
					}
					if(orderByArr.length) qry += "\nORDER BY "+orderByArr.join(", ");
				}
				if(this._metadata.parts.limit){
					let limitVal = `${this._metadata.parts.limit.rowCount}`;
					if(this._metadata.parts.limit.offset) limitVal = `${this._metadata.parts.limit.offset},${limitVal}`;
					qry += `\nLIMIT ${limitVal}`;
				}
				break;
		}

		return qry;
	}
	select(values){
		this._metadata.type = 'select';
		this._metadata.parts.select = values;
		return this;
	}

	orderBy(value, direction){
		let values = {};
		if(typeof value === "object") values = value;
		else{
			values[value] = direction;
		}
		this._metadata.type = 'select';
		this._metadata.parts.orderBy = values;
		return this;
	}
	page(page, resultsPerPage = 20){
		if(page == 1) this.limit(resultsPerPage);
		else{
			this.limit((page - 1) * resultsPerPage, resultsPerPage);
		}
	}
	pageRange(startPage, endPage, resultsPerPage){
		if(startPage > endPage) throw("Query Error: Page range error, start page greater than end page")
		let offset = (startPage - 1) * resultsPerPage;
		resultsPerPage = ((endPage - startPage) + 1) * resultsPerPage;
		// console.log("pageRange",offset, resultsPerPage);
		// throw("SDLKFJLKSDJFH");
		if(startPage == 1) this.limit(resultsPerPage);
		else{
			this.limit(offset, resultsPerPage);
		}
	}
	limit(offset, rowCount = 0){
		if(! rowCount){
			rowCount = offset;
			offset = 0;
		}
		this._metadata.type = 'select';
		this._metadata.parts.limit = {
			offset: offset,
			rowCount: rowCount
		};
		return this;
	}
	top(rowCount){
		this.limit(rowCount);
	}
	update(table, alias){
		this._metadata.type = 'update';
		this._metadata.parts.from = this._parseParameterTable(table, alias);
		return this;
	}
	// Will increment / decrement like column = column + column so that an incremented value is no overwritten
	// Can be a simple column, or an array of columns, or an object or columns and values
	increment(column, value){
		return this._incDec(column, value, "increment")
	}
	decrement(column, value){
		return this._incDec(column, value, "decrement");
	}
	_incDec(column,value, type){
		let val = {};
		if(Array.isArray(column)){
			for(let i in column){
				val[column[i]] = 1;
			}
		}
		else if(typeof column === "object") val = column;
		else val[column] = value || 1;
		this._metadata.type = 'update';
		this._metadata.parts[type] = val;
		return this;
	}
	
	insert(table, alias){
		this._metadata.type = 'insert';
		this._metadata.parts.from = this._parseParameterTable(table, alias);
		return this;
	}
	// Can add from to delete, or add with from
	delete(table, alias){
		this._metadata.type = 'delete';
		if(table) this._metadata.parts.from = this._parseParameterTable(table, alias);
		return this;
	}
	from(table, alias){
		this._metadata.parts.from = this._parseParameterTable(table, alias);
		return this;
	}
	where(expression){
		this._metadata.parts.where = expression;
		return this;
	}
	join(table, alias, expression){
		if(! expression){
			expression = alias;
			alias = false;
		}
		table = this._parseParameterTable(table, alias);
		return this;
	}
	leftJoin(table, alias, expression){
		if(! expression){
			expression = alias;
			alias = false;
		}
	
		if(! this._metadata.parts.join) this._metadata.parts.join = [];
		
		this._metadata.parts.join.push({
			type: "left",
			expression: expression,
			table: this._parseParameterTable(table, alias)
		});
		
		return this;
	}
	set(values){
		if(typeof values !== "object") throw("Query Set Error: Values must be an object.");
		if(this._metadata.type != 'update') throw("Set can only be called on update queries.");
		this._metadata.parts.values = values;
		return this;
	}
	values(values){
		if(this._metadata.type != 'insert') throw("Values can only be called on insert queries.");
		this._metadata.parts.values = values;
		return this;
	}
	_parseParameterTable(table, alias){
		let ret = [];
		if(table instanceof slashrDatabaseQuery){
			this.addBindings(table.getBindings());
			table = `(${table.toString()})`;
		}
		if(typeof table === 'object'){
			for(let alias in table){
				ret.push({
					alias: alias,
					table: table[alias]
				});
				break;
			}
		}
		else{
			ret.push({
				table: table,
				alias: alias || null
			});
		}
		return ret;
	}
	_expressionToString(expression){
		//console.log("TODO: Should expressions be escaped? Inforce bind?");
		let mysql = require('mysql');

		if(expression instanceof slashrDatabaseMySqlQueryExpression){
			return expression.toString();
		}
		else if(expression instanceof slashrDatabaseQuery){
			return expression.toString();
		}
		else if(typeof expression === "string") return expression;
		else if(typeof expression !== "object") throw("Expression must be expression, string, or name/value array");

		// Get the bindings to check for syntax
		let bindings = this.getBindings();
		
		// simple for now
		let tPredicateArr = [];
		for(let key in expression){
			
			// check if bindings
			let op = "=";
			let value = expression[key];

			if(typeof value === 'string'){

				// Check for like
				let pre = "";
				let post = "";
				value = value.trim();
				if(value.startsWith("%") || value.endsWith("%")){
					op = "LIKE";
					if(value.startsWith("%")){
						pre = "%";
						value = value.slice(1, value.length).trim();
					}
					if(value.endsWith("%")){
						post = "%";
						value = value.slice(0, value.length - 1).trim();
					}
					throw("SLDKJFLKSJDFHF");
				}
 				if(value.startsWith(":")){
					let tBind = value.slice(1, value.length).trim();
					if(bindings[tBind] === undefined){
						throw("Could not find bind variable '"+value+"'.");
					} 
					if(bindings[tBind] === null){
						op = "IS";
					}
					else if(Array.isArray(bindings[tBind])){
						op = "IN";
						value = `(${value})`;
					}
				}
				//else value = mysql.escape(value);

				// Add the pre and post values
				value = pre+value+post;
			}
			//else value = mysql.escape(value);
			tPredicateArr.push(key+" "+op+" "+value);
		}
		return tPredicateArr.join(" AND ");
	}
}