export class slashrDatabaseQueryResult{
	constructor(results, options) { 
		this._metadata = results;
	}
	[Symbol.iterator]() {
		let index = 0;
		let self = this;
		return {
			next: function() {
				let ret = { value: self._metadata.rows[index], done: ! (index in self._metadata.rows) };
				index++;
				return ret;
			}
		};
	}
	
	get rowCount(){
		return this._metadata.rowCount;
	}
	get affectedRows(){
		return this._metadata.affectedRows;
	}
	get insertId(){
		return this._metadata.insertId;
	}
	get rows(){
		return this._metadata.rows;
	}
	get first(){
		return this.firstRow;
	}
	get firstRow(){
		return (! this.isEmpty()) ? this._metadata.rows[0] : null; 
	}
	get error(){
		return this._metadata.error;
	}
	get errorMessage(){
		return (this._metadata.error) ? this._metadata.error.message : null;
	}
	get errorCode(){
		return (this._metadata.error) ? this._metadata.error.code : null;
	}
	hasError(){
		return (this.error);
	}
	isEmpty(){
		return this._metadata.rows.length === 0;
	}
	size(){
		return this._metadata.rowCount;
	}
	toArray(){
		return this._metadata.rows;
	}
	map(fn){
		return this._metadata.rows.map((value)=>fn(value));
	}
	forEach(fn){
		this._metadata.rows.forEach((value)=>fn(value));
	}
	each(fn){
		return this.map(fn);
	}
	
}




//private $position = 0;
//	private $rows = array();
//	private $rowCount = 0;
//	private $affectedRowCount = null;
//	private $queryType = null;
//	private $insertId = null;
//
//	public function __construct($options){
//		if(! empty($options[blr::ROWS]) && ! ($options[blr::ROWS][0] instanceof stdClass)) throw new frak("Could not create result set. Results must be an array of stdClass");
//		$this->position = 0;
//		$this->rows = (! empty($options[blr::ROWS])) ? $options[blr::ROWS] : array();
//		$this->queryType = (! empty($options[blr::TYPE])) ? $options[blr::TYPE] : null;
//		$this->affectedRowCount = (! empty($options[blr::AFFECTED_ROW_COUNT])) ? $options[blr::AFFECTED_ROW_COUNT] : null;
//		$this->insertId = (! empty($options[blr::INSERT_ID])) ? $options[blr::INSERT_ID] : null;
//		$this->rowCount = count($this->rows);
//	}
//	
//	public function getRowCount(){
//		return $this->rowCount;
//	}
//	
//	public function getAffectedRowCount(){
//		return $this->affectedRowCount;
//	}
//	
//	public function getInsertId(){
//		return $this->insertId;
//	}
//	
//	public function isEmpty(){
//		return empty($this->rows);
//	}
//	
//	public function size(){
//		return $this->getRowCount();
//	}
//	
//	public function toArray(){
//		$ret =  json_decode(json_encode($this->rows), true);
//		return $ret;
//	}